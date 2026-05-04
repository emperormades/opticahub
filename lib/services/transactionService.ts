import { Prisma } from "@prisma/client";
import { logChange } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { ensureCommissionForSettledTransaction } from "@/lib/services/commissionService";
import { OrderActor } from "@/lib/services/orderService";
import {
  CreateTransactionPayload,
  ListTransactionsQuery,
} from "@/lib/validation/financialPayload";

export async function listFinancialTransactions(
  tenantId: string,
  query: ListTransactionsQuery,
) {
  const where: Prisma.TransactionWhereInput = {
    tenantId,
    ...(query.type ? { type: query.type } : {}),
    ...(query.isPending !== undefined ? { isPending: query.isPending } : {}),
    ...(query.search
      ? { description: { contains: query.search, mode: "insensitive" } }
      : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(`${query.to}T23:59:59`) } : {}),
          },
        }
      : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        user: { select: { name: true } },
        order: { select: { orderNumber: true, customer: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions,
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function createFinancialTransaction(
  actor: OrderActor,
  input: CreateTransactionPayload,
) {
  let linkedOrder: { id: string; total: Prisma.Decimal; sellerId: string } | null = null;

  if (input.orderId) {
    linkedOrder = await prisma.serviceOrder.findFirst({
      where: { id: input.orderId, tenantId: actor.tenantId },
      select: { id: true, total: true, sellerId: true },
    });

    if (!linkedOrder) {
      return { error: "ORDER_NOT_FOUND" as const };
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const openCash = await prisma.cashRegister.findFirst({
    where: { tenantId: actor.tenantId, openedAt: { gte: today }, closedAt: null },
  });

  const transaction = await prisma.transaction.create({
    data: {
      tenantId: actor.tenantId,
      userId: actor.userId,
      cashRegisterId: openCash?.id || null,
      orderId: linkedOrder?.id || null,
      type: input.type,
      method: input.method,
      amount: input.amount,
      description: input.description,
      installmentsCount: input.installments || 1,
      isPending: input.isPending ?? false,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      paidAt: input.isPending ? null : new Date(),
      notes: input.notes || null,
    },
    include: {
      user: { select: { name: true } },
      order: { select: { orderNumber: true } },
    },
  });

  if (linkedOrder && input.type === "ENTRADA" && !input.isPending) {
    await prisma.serviceOrder.update({
      where: { id: linkedOrder.id },
      data: { isPaid: true },
    });
  }

  if (linkedOrder && input.type === "ENTRADA") {
    await ensureCommissionForSettledTransaction(
      actor.tenantId,
      transaction.id,
      input.commissionPct,
    );
  }

  await logChange({
    tenantId: actor.tenantId,
    userId: actor.userId,
    entityType: "Transaction",
    entityId: transaction.id,
    action: "CREATE",
    newValue: { type: input.type, amount: input.amount, method: input.method },
  });

  return { data: transaction };
}
