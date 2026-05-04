import { prisma } from "@/lib/db";
import { SellerAnalyticsQuery } from "@/lib/validation/analyticsPayload";

function resolvePeriodRange(period: SellerAnalyticsQuery["period"]) {
  const now = new Date();

  if (period === "lastMonth") {
    return {
      startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      endDate: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
    };
  }

  if (period === "thisYear") {
    return {
      startDate: new Date(now.getFullYear(), 0, 1),
      endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
    };
  }

  return {
    startDate: new Date(now.getFullYear(), now.getMonth(), 1),
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
  };
}

export async function getSellerAnalytics(
  tenantId: string,
  query: SellerAnalyticsQuery,
) {
  const { startDate, endDate } = resolvePeriodRange(query.period);

  const orders = await prisma.serviceOrder.findMany({
    where: {
      tenantId,
      status: { in: ["DELIVERED", "DELIVERY_READY"] },
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      seller: { select: { id: true, name: true, email: true } },
    },
  });

  const sellerMap = orders.reduce<
    Record<
      string,
      {
        sellerId: string;
        name: string;
        email: string;
        totalSold: number;
        orderCount: number;
        paidCount: number;
      }
    >
  >((acc, order) => {
    const seller = order.seller;

    if (!acc[seller.id]) {
      acc[seller.id] = {
        sellerId: seller.id,
        name: seller.name,
        email: seller.email,
        totalSold: 0,
        orderCount: 0,
        paidCount: 0,
      };
    }

    const total = Number(order.total);
    acc[seller.id].totalSold += total;
    acc[seller.id].orderCount += 1;
    if (order.isPaid) {
      acc[seller.id].paidCount += 1;
    }

    return acc;
  }, {});

  const commissions = await prisma.commission.findMany({
    where: {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
    },
    select: { sellerId: true, amount: true },
  });

  const commissionBySeller = commissions.reduce<Record<string, number>>((acc, commission) => {
    acc[commission.sellerId] = (acc[commission.sellerId] || 0) + Number(commission.amount);
    return acc;
  }, {});

  return {
    ranking: Object.values(sellerMap)
      .map((seller) => ({
        sellerId: seller.sellerId,
        name: seller.name,
        email: seller.email,
        totalSold: seller.totalSold,
        orderCount: seller.orderCount,
        paidCount: seller.paidCount,
        avgTicket: seller.orderCount > 0 ? seller.totalSold / seller.orderCount : 0,
        commission: commissionBySeller[seller.sellerId] || 0,
        conversionRate:
          seller.orderCount > 0
            ? Math.round((seller.paidCount / seller.orderCount) * 100)
            : 0,
      }))
      .sort((a, b) => b.totalSold - a.totalSold),
    period: query.period,
    startDate,
    endDate,
  };
}
