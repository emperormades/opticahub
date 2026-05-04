import { Prisma, ReworkCause } from "@prisma/client";
import { logChange } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { OrderActor } from "@/lib/services/orderService";

export interface OrderReworkInput {
  reason: ReworkCause;
  notes?: string | null;
  itemsToRectify?: string[];
}

export async function requestOrderRework(
  orderId: string,
  actor: OrderActor,
  input: OrderReworkInput,
) {
  const order = await prisma.serviceOrder.findFirst({
    where: { id: orderId, tenantId: actor.tenantId },
  });

  if (!order) {
    return { error: "NOT_FOUND" as const };
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const updated = await tx.serviceOrder.update({
      where: { id: orderId },
      data: {
        reworkCount: { increment: 1 },
        reworkCause: input.reason,
        status: "LAB_SENT",
      },
    });

    await tx.serviceOrderEvent.create({
      data: {
        orderId: order.id,
        tenantId: actor.tenantId,
        userId: actor.userId,
        fromStatus: order.status,
        toStatus: "LAB_SENT",
        notes: `Retificacao/Devolucao solicitada. Motivo: ${input.reason}. Observacao: ${input.notes || "N/A"}`,
      },
    });

    if (input.itemsToRectify && input.itemsToRectify.length > 0) {
      const existingItems = await tx.serviceOrderItem.findMany({
        where: { id: { in: input.itemsToRectify }, tenantId: actor.tenantId },
      });

      const clonedItems: Prisma.ServiceOrderItemCreateManyInput[] =
        existingItems.map((item) => ({
          orderId,
          tenantId: actor.tenantId,
          productId: item.productId,
          itemType: item.itemType,
          description: `[GARANTIA/RETIFICACAO] ${item.description}`,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(0),
          discount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(0),
        }));

      if (clonedItems.length > 0) {
        await tx.serviceOrderItem.createMany({
          data: clonedItems,
        });
      }
    }

    return updated;
  });

  await logChange({
    tenantId: actor.tenantId,
    userId: actor.userId,
    entityType: "ServiceOrder",
    entityId: orderId,
    action: "UPDATE",
    field: "status",
    oldValue: order.status,
    newValue: "LAB_SENT",
    reason: `Retrabalho: ${input.reason}`,
  });

  return { data: updatedOrder };
}

export function parseReworkCause(value: unknown): ReworkCause | null {
  if (typeof value !== "string") {
    return null;
  }

  return Object.values(ReworkCause).includes(value as ReworkCause)
    ? (value as ReworkCause)
    : null;
}
