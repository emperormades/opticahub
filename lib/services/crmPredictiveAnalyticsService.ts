import { prisma } from "@/lib/db";
import { MonthlyAnalyticsQuery } from "@/lib/validation/analyticsPayload";

function calcRfmScore({
  ltv,
  totalOrders,
  lastOrderAt,
  now,
}: {
  ltv: number;
  totalOrders: number;
  lastOrderAt: Date | null;
  now: Date;
}) {
  if (totalOrders === 0) {
    return "SEM_HISTORICO";
  }

  const daysSinceLast = lastOrderAt
    ? Math.floor((now.getTime() - lastOrderAt.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const recency = daysSinceLast < 90 ? 3 : daysSinceLast < 365 ? 2 : 1;
  const frequency = totalOrders >= 5 ? 3 : totalOrders >= 2 ? 2 : 1;
  const monetary = ltv >= 2000 ? 3 : ltv >= 500 ? 2 : 1;

  const score = recency + frequency + monetary;

  if (score >= 8) {
    return "CAMPIAO";
  }
  if (score >= 6) {
    return "FIEL";
  }
  if (score >= 4) {
    return "EM_RISCO";
  }
  return "PERDIDO";
}

export async function getCrmPredictiveAnalytics(
  tenantId: string,
  query: MonthlyAnalyticsQuery,
) {
  const periodStart = new Date(query.year, query.month - 1, 1);
  const periodEnd = new Date(query.year, query.month, 0, 23, 59, 59);

  const customers = await prisma.customer.findMany({
    where: { tenantId, isActive: true },
    include: {
      orders: {
        where: { isPaid: true },
        select: { total: true, createdAt: true, deliveredAt: true },
      },
      prescriptions: {
        where: { isActive: true },
        orderBy: { prescribedAt: "desc" },
        take: 1,
        select: { prescribedAt: true },
      },
    },
  });

  const now = new Date();
  let totalLtv = 0;
  let customersWithOrders = 0;

  const updatePromises = customers.map(async (customer) => {
    const ltv = customer.orders.reduce((sum, order) => sum + Number(order.total), 0);
    const totalOrders = customer.orders.length;
    const sortedOrderDates = customer.orders
      .map((order) => order.createdAt)
      .sort((a, b) => a.getTime() - b.getTime());

    const firstOrderAt = sortedOrderDates[0] || null;
    const lastOrderAt = sortedOrderDates[sortedOrderDates.length - 1] || null;

    const lastPrescription = customer.prescriptions[0];
    const prescriptionExpiresAt = lastPrescription
      ? new Date(lastPrescription.prescribedAt.getTime() + 365 * 24 * 60 * 60 * 1000)
      : null;

    const rfmScore = calcRfmScore({ ltv, totalOrders, lastOrderAt, now });

    if (ltv > 0) {
      totalLtv += ltv;
      customersWithOrders += 1;
    }

    return prisma.customer
      .update({
        where: { id: customer.id },
        data: {
          lifetimeValue: ltv,
          totalOrders,
          firstOrderAt,
          lastOrderAt,
          rfmScore,
          prescriptionExpiresAt,
        },
      })
      .catch(() => null);
  });

  await Promise.all(updatePromises);

  const avgLtv = customersWithOrders > 0 ? totalLtv / customersWithOrders : 0;

  const [commissionsTotal, marketingExpenses, newCustomers] = await Promise.all([
    prisma.commission.aggregate({
      where: { tenantId, createdAt: { gte: periodStart, lte: periodEnd } },
      _sum: { amount: true },
    }),
    prisma.fixedExpense.aggregate({
      where: { tenantId, month: query.month, year: query.year, category: "MARKETING" },
      _sum: { amount: true },
    }),
    prisma.customer.count({
      where: { tenantId, createdAt: { gte: periodStart, lte: periodEnd } },
    }),
  ]);

  const totalAcquisitionCost =
    Number(commissionsTotal._sum.amount || 0) + Number(marketingExpenses._sum.amount || 0);
  const cac = newCustomers > 0 ? totalAcquisitionCost / newCustomers : null;

  const churnCutoff = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const churnRiskCustomers = await prisma.customer.findMany({
    where: {
      tenantId,
      isActive: true,
      prescriptionExpiresAt: { gte: now, lte: churnCutoff },
    },
    select: {
      id: true,
      name: true,
      whatsapp: true,
      prescriptionExpiresAt: true,
      rfmScore: true,
      lifetimeValue: true,
    },
  });

  const rfmSummary = await prisma.customer.groupBy({
    by: ["rfmScore"],
    where: { tenantId },
    _count: { id: true },
  });

  return {
    period: { month: query.month, year: query.year },
    ltv: {
      average: parseFloat(avgLtv.toFixed(2)),
      total: parseFloat(totalLtv.toFixed(2)),
      customersWithRevenue: customersWithOrders,
      totalCustomers: customers.length,
    },
    cac: {
      total: parseFloat(totalAcquisitionCost.toFixed(2)),
      newCustomers,
      cacPerCustomer: cac !== null ? parseFloat(cac.toFixed(2)) : null,
      ltvCacRatio: cac && cac > 0 ? parseFloat((avgLtv / cac).toFixed(2)) : null,
    },
    churnRisk: {
      count: churnRiskCustomers.length,
      customers: churnRiskCustomers,
    },
    rfmDistribution: rfmSummary.reduce<Record<string, number>>((acc, score) => {
      acc[score.rfmScore || "SEM_HISTORICO"] = score._count.id;
      return acc;
    }, {}),
  };
}
