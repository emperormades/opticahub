import {
  OSStatus,
  PaymentMethod,
  Prisma,
  ProductType,
  ReworkCause,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { logChange } from "@/lib/audit";
import { OSMachine } from "@/lib/os/machine";
import { SettlementService } from "@/lib/finance/settlement";
import { decryptOptionalPii } from "@/lib/pii";
import { BillingEngine } from "@/lib/services/billingEngine";
import { OpticalEngine } from "@/lib/services/opticalEngine";
import { AppError, ERR_LAB_DATA_INCOMPLETE } from "@/lib/errors";

const VALID_TRANSITIONS: Record<OSStatus, OSStatus[]> = {
  DRAFT: [OSStatus.VALIDATING, OSStatus.CANCELLED],
  VALIDATING: [OSStatus.LAB_SENT, OSStatus.DRAFT, OSStatus.CANCELLED],
  LAB_SENT: [OSStatus.IN_PRODUCTION, OSStatus.CANCELLED],
  IN_PRODUCTION: [OSStatus.QUALITY_CHECK, OSStatus.LAB_SENT],
  QUALITY_CHECK: [OSStatus.DELIVERY_READY, OSStatus.IN_PRODUCTION],
  DELIVERY_READY: [OSStatus.DELIVERED, OSStatus.CANCELLED],
  DELIVERED: [],
  CANCELLED: [],
};

export interface OrderActor {
  tenantId: string;
  userId: string;
}

export interface OrderTransitionInput {
  toStatus: OSStatus;
  notes?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export interface CreateOrderItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  itemType?: ProductType;
  productId?: string;
}

export interface CreateOrderPaymentInput {
  method?: PaymentMethod;
  amount: number;
  installmentsCount?: number;
}

export interface CreateOrderInput {
  customerId: string;
  prescriptionId?: string | null;
  notes?: string | null;
  labName?: string | null;
  labDeadline?: string | null;
  discount?: number;
  items: CreateOrderItemInput[];
  transactions?: CreateOrderPaymentInput[];
}

async function generateOrderNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.serviceOrder.count({ where: { tenantId } });
  return `OS-${year}-${String(count + 1).padStart(6, "0")}`;
}

export async function getOrderDetails(orderId: string, tenantId: string) {
  const order = await prisma.serviceOrder.findFirst({
    where: { id: orderId, tenantId },
    include: {
      customer: true,
      seller: { select: { id: true, name: true, email: true } },
      prescription: true,
      items: true,
      events: {
        orderBy: { createdAt: "asc" },
      },
      transactions: {
        include: {
          installments: {
            orderBy: { number: "asc" },
          },
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  const productIds = order.items
    .map((item) => item.productId)
    .filter((productId): productId is string => Boolean(productId));

  const productsById =
    productIds.length > 0
      ? new Map(
          (
            await prisma.product.findMany({
              where: { id: { in: productIds }, tenantId },
            })
          ).map((product) => [product.id, product]),
        )
      : new Map<string, never>();

  return {
    ...order,
    customer: order.customer
      ? {
          ...order.customer,
          cpf: decryptOptionalPii(order.customer.cpf),
          rg: decryptOptionalPii(order.customer.rg),
        }
      : order.customer,
    items: order.items.map((item) => ({
      ...item,
      product: item.productId ? productsById.get(item.productId) || null : null,
    })),
  };
}

export async function createOrder(actor: OrderActor, input: CreateOrderInput) {
  const orderNumber = await generateOrderNumber(actor.tenantId);

  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, tenantId: actor.tenantId },
    select: { id: true },
  });

  if (!customer) {
    return { error: "CUSTOMER_NOT_FOUND" as const };
  }

  if (input.prescriptionId) {
    const prescription = await prisma.prescription.findFirst({
      where: {
        id: input.prescriptionId,
        tenantId: actor.tenantId,
        customerId: input.customerId,
      },
      select: { id: true },
    });

    if (!prescription) {
      return { error: "INVALID_PRESCRIPTION" as const };
    }
  }

  if (input.items.length === 0) {
    return { error: "EMPTY_ITEMS" as const };
  }

  const productIds = input.items
    .map((item) => item.productId)
    .filter((productId): productId is string => Boolean(productId));

  if (productIds.length > 0) {
    const validProducts = await prisma.product.count({
      where: {
        tenantId: actor.tenantId,
        id: { in: productIds },
      },
    });

    if (validProducts !== new Set(productIds).size) {
      return { error: "INVALID_PRODUCT" as const };
    }
  }

  const items = [...input.items];
  const automatedFees = await BillingEngine.generateAutomatedFees(
    actor.tenantId,
    items,
  );
  items.push(...automatedFees);

  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const totalDiscount =
    items.reduce((sum, item) => sum + (item.discount || 0), 0) +
    (input.discount || 0);
  const total = subtotal - totalDiscount;
  const paymentSplit = input.transactions || [];

  if (total < 0) {
    return { error: "INVALID_TOTAL" as const };
  }

  if (paymentSplit.length > 0) {
    const splitTotal = paymentSplit.reduce((sum, payment) => sum + payment.amount, 0);
    if (Math.abs(splitTotal - total) > 0.01) {
      return { error: "INVALID_PAYMENT_SPLIT" as const };
    }
  }

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.serviceOrder.create({
      data: {
        orderNumber,
        tenantId: actor.tenantId,
        customerId: input.customerId,
        sellerId: actor.userId,
        prescriptionId: input.prescriptionId || null,
        notes: input.notes || null,
        labName: input.labName || null,
        labDeadline: input.labDeadline ? new Date(input.labDeadline) : null,
        subtotal,
        discount: totalDiscount,
        total,
        status: "DRAFT",
        items: {
          create: items.map((item) => ({
            tenantId: actor.tenantId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            total: item.unitPrice * item.quantity - (item.discount || 0),
            itemType: item.itemType || ProductType.SERVICOS,
            productId: item.productId || null,
          })),
        },
        events: {
          create: {
            tenantId: actor.tenantId,
            userId: actor.userId,
            toStatus: "DRAFT",
            notes: "OS criada via Frente de Loja (PDV)",
          },
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        items: true,
        events: true,
      },
    });

    for (const item of items) {
      if (item.productId) {
        await tx.stockItem.updateMany({
          where: { productId: item.productId, tenantId: actor.tenantId },
          data: { quantity: { decrement: item.quantity } },
        });
      }
    }

    if (paymentSplit.length > 0) {
      const activeCash = await tx.cashRegister.findFirst({
        where: { tenantId: actor.tenantId, closedAt: null },
        orderBy: { openedAt: "desc" },
      });

      await tx.transaction.createMany({
        data: paymentSplit.map((payment) => ({
          tenantId: actor.tenantId,
          orderId: newOrder.id,
          userId: actor.userId,
          cashRegisterId: activeCash ? activeCash.id : null,
          type: "ENTRADA",
          method: payment.method || PaymentMethod.DINHEIRO,
          amount: payment.amount,
          installmentsCount: payment.installmentsCount || 1,
          description: `Pagamento referente a OS ${orderNumber}`,
          isPending: payment.method === PaymentMethod.CREDIARIO,
          dueDate:
            payment.method === PaymentMethod.CREDIARIO ? undefined : new Date(),
        })),
      });
    }

    return newOrder;
  });

  await logChange({
    tenantId: actor.tenantId,
    userId: actor.userId,
    entityType: "ServiceOrder",
    entityId: order.id,
    action: "CREATE",
    newValue: {
      orderNumber,
      customerId: input.customerId,
      total,
      items: items.length,
      splits: paymentSplit.length,
    },
  });

  return { data: order };
}

export async function transitionOrder(
  orderId: string,
  actor: OrderActor,
  input: OrderTransitionInput,
) {
  const order = await prisma.serviceOrder.findFirst({
    where: { id: orderId, tenantId: actor.tenantId },
    include: {
      items: {
        select: {
          id: true,
          productId: true,
          quantity: true,
        },
      },
      transactions: {
        include: {
          installments: {
            select: {
              id: true,
              amount: true,
              penaltyAmount: true,
              interestAmount: true,
              isPaid: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return { error: "NOT_FOUND" as const };
  }

  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(input.toStatus)) {
    return {
      error: "INVALID_TRANSITION" as const,
      message: `Transicao invalida: ${order.status} -> ${input.toStatus}`,
    };
  }

  const isRework =
    order.status === "QUALITY_CHECK" && input.toStatus === "IN_PRODUCTION";
  const labSentNow = input.toStatus === "LAB_SENT";
  const transitionMetadata =
    input.metadata &&
    typeof input.metadata === "object" &&
    !Array.isArray(input.metadata)
      ? input.metadata
      : null;
  const rawReworkCause =
    transitionMetadata && "reworkCause" in transitionMetadata
      ? String(transitionMetadata.reworkCause || "")
      : undefined;
  const reworkCause =
    rawReworkCause &&
    Object.values(ReworkCause).includes(rawReworkCause as ReworkCause)
      ? (rawReworkCause as ReworkCause)
      : undefined;
  const labName =
    transitionMetadata && "labName" in transitionMetadata
      ? String(transitionMetadata.labName || "")
      : undefined;

  if (labSentNow) {
    const opticalValidation = await OpticalEngine.validateServiceOrder(
      orderId,
      actor.tenantId,
    );

    if (!opticalValidation.valid) {
      const opticalError = new AppError(
        "Falha na Validacao Optica",
        ERR_LAB_DATA_INCOMPLETE,
        400,
      ) as AppError & { details?: string[] };

      opticalError.details = opticalValidation.errors;

      throw opticalError;
    }
  }

  const isCancellation = input.toStatus === "CANCELLED";
  const updated = await prisma.$transaction(async (tx) => {
    if (isCancellation) {
      const productReturns = new Map<string, number>();

      for (const item of order.items) {
        if (!item.productId) continue;
        productReturns.set(
          item.productId,
          (productReturns.get(item.productId) || 0) + item.quantity,
        );
      }

      for (const [productId, quantity] of productReturns.entries()) {
        await tx.stockItem.updateMany({
          where: {
            tenantId: actor.tenantId,
            productId,
          },
          data: {
            quantity: { increment: quantity },
          },
        });
      }

      let refundedAmount = 0;

      for (const transaction of order.transactions) {
        if (transaction.type !== "ENTRADA") {
          continue;
        }

        if (transaction.method === PaymentMethod.CREDIARIO) {
          const paidInstallments = transaction.installments.filter(
            (installment) => installment.isPaid,
          );
          refundedAmount += paidInstallments.reduce((sum, installment) => {
            return (
              sum +
              Number(installment.amount) +
              Number(installment.penaltyAmount) +
              Number(installment.interestAmount)
            );
          }, 0);

          await tx.installment.deleteMany({
            where: {
              transactionId: transaction.id,
              isPaid: false,
            },
          });

          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              isPending: false,
              notes: transaction.notes
                ? `${transaction.notes}\nRecebivel encerrado por cancelamento da OS.`
                : "Recebivel encerrado por cancelamento da OS.",
            },
          });
        } else if (!transaction.isPending) {
          refundedAmount += Number(transaction.amount);
        }
      }

      if (refundedAmount > 0) {
        const activeCash = await tx.cashRegister.findFirst({
          where: { tenantId: actor.tenantId, closedAt: null },
          orderBy: { openedAt: "desc" },
        });

        await tx.transaction.create({
          data: {
            tenantId: actor.tenantId,
            userId: actor.userId,
            orderId,
            cashRegisterId: activeCash?.id || null,
            type: "SAIDA",
            method: PaymentMethod.DINHEIRO,
            amount: Math.round(refundedAmount * 100) / 100,
            description: `Estorno da OS ${order.orderNumber}`,
            isPending: false,
            paidAt: new Date(),
            notes: input.notes || "Estorno automatico por cancelamento da OS.",
          },
        });
      }

      await tx.commission.deleteMany({
        where: {
          tenantId: actor.tenantId,
          orderId,
          isPaid: false,
        },
      });
    }

    return tx.serviceOrder.update({
      where: { id: orderId },
      data: {
        status: input.toStatus,
        ...(isRework
          ? {
              reworkCount: { increment: 1 },
              reworkCause: reworkCause || undefined,
            }
          : {}),
        ...(labSentNow
          ? { labSentAt: new Date(), labName: labName || order.labName }
          : {}),
        ...(input.toStatus === "DELIVERED"
          ? { deliveredAt: new Date(), isPaid: true }
          : {}),
        ...(isCancellation ? { isPaid: false } : {}),
        updatedAt: new Date(),
        events: {
          create: {
            tenantId: actor.tenantId,
            userId: actor.userId,
            fromStatus: order.status,
            toStatus: input.toStatus,
            notes: input.notes || null,
            ...(input.metadata !== undefined && input.metadata !== null
              ? { metadata: input.metadata }
              : {}),
          },
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        events: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  });

  if (labSentNow) {
    await OpticalEngine.auditAndLog(orderId, actor.tenantId, actor.userId);
  }

  await logChange({
    tenantId: actor.tenantId,
    userId: actor.userId,
    entityType: "ServiceOrder",
    entityId: orderId,
    action: "UPDATE",
    field: "status",
    oldValue: order.status,
    newValue: input.toStatus,
    reason: input.notes || undefined,
  });

  await OSMachine.triggerAutomations(updated, order.status, input.toStatus);

  if (input.toStatus === "DELIVERED") {
    SettlementService.settle(orderId, actor.tenantId).catch((err) =>
      console.error("[Settlement] Erro na liquidacao automatica:", err),
    );
  }

  return { data: updated };
}
