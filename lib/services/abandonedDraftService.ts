import { prisma } from "@/lib/db";

export interface AbandonedDraftsQuery {
  minAgeHours?: number;
  maxAgeHours?: number;
}

export async function listAbandonedDraftOrders(
  tenantId: string,
  query: AbandonedDraftsQuery = {},
) {
  const minAgeHours = Math.min(Math.max(query.minAgeHours || 48, 1), 24 * 30);
  const maxAgeHours = Math.min(
    Math.max(query.maxAgeHours || 24 * 7, minAgeHours + 1),
    24 * 60,
  );

  const now = new Date();
  const newerThan = new Date(now.getTime() - minAgeHours * 60 * 60 * 1000);
  const olderThan = new Date(now.getTime() - maxAgeHours * 60 * 60 * 1000);

  const orders = await prisma.serviceOrder.findMany({
    where: {
      tenantId,
      status: "DRAFT",
      isArchived: false,
      createdAt: {
        lte: newerThan,
        gte: olderThan,
      },
    },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      createdAt: true,
      updatedAt: true,
      notes: true,
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          whatsapp: true,
        },
      },
      seller: {
        select: {
          id: true,
          name: true,
        },
      },
      items: {
        select: {
          id: true,
          description: true,
          total: true,
        },
        take: 3,
      },
      events: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          createdAt: true,
          notes: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  const mapped = orders.map((order) => {
    const ageHours = Math.floor(
      (now.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60),
    );

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      ageHours,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      notes: order.notes,
      customer: order.customer,
      seller: order.seller,
      items: order.items.map((item) => ({
        ...item,
        total: Number(item.total),
      })),
      lastEvent: order.events[0] || null,
    };
  });

  return {
    summary: {
      total: mapped.length,
      olderThan72h: mapped.filter((order) => order.ageHours >= 72).length,
      olderThan120h: mapped.filter((order) => order.ageHours >= 120).length,
      pipelineValue: mapped.reduce((sum, order) => sum + order.total, 0),
    },
    orders: mapped,
  };
}
