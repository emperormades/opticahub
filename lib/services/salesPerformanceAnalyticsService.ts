import { prisma } from "@/lib/db";
import { MonthlyAnalyticsQuery } from "@/lib/validation/analyticsPayload";

type TicketByTypeEntry = {
  totalRevenue: number;
  count: number;
  ticketMedio: number;
};

export async function getSalesPerformanceAnalytics(
  tenantId: string,
  query: MonthlyAnalyticsQuery,
) {
  const periodStart = new Date(query.year, query.month - 1, 1);
  const periodEnd = new Date(query.year, query.month, 0, 23, 59, 59);

  const orders = await prisma.serviceOrder.findMany({
    where: {
      tenantId,
      createdAt: { gte: periodStart, lte: periodEnd },
      status: { not: "CANCELLED" },
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              categoryId: true,
              lensTreatment: true,
              lensDesign: true,
              brand: true,
            },
          },
        },
      },
      seller: { select: { id: true, name: true } },
    },
  });

  const totalOrders = orders.length;
  const paidOrders = orders.filter(
    (order) => order.status === "DELIVERED" || order.status === "DELIVERY_READY",
  );
  const grossRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const ticketMedioGlobal = paidOrders.length > 0 ? grossRevenue / paidOrders.length : 0;

  const byType = paidOrders.reduce<Record<string, { total: number; count: number }>>(
    (acc, order) => {
      for (const item of order.items) {
        if (!acc[item.itemType]) {
          acc[item.itemType] = { total: 0, count: 0 };
        }
        acc[item.itemType].total += Number(item.total);
        acc[item.itemType].count += 1;
      }
      return acc;
    },
    {},
  );

  const ticketMedioPorTipo = Object.entries(byType).reduce<Record<string, TicketByTypeEntry>>(
    (acc, [type, data]) => {
      acc[type] = {
        totalRevenue: parseFloat(data.total.toFixed(2)),
        count: data.count,
        ticketMedio: parseFloat((data.total / data.count).toFixed(2)),
      };
      return acc;
    },
    {},
  );

  const ordersWithUpgrade = paidOrders.filter((order) =>
    order.items.some(
      (item) => item.product?.lensTreatment && item.product.lensTreatment !== "NENHUM",
    ),
  );

  const penetracaoTratamentos =
    paidOrders.length > 0
      ? parseFloat(((ordersWithUpgrade.length / paidOrders.length) * 100).toFixed(2))
      : 0;

  const treatmentBreakdown = ordersWithUpgrade.reduce<Record<string, number>>((acc, order) => {
    for (const item of order.items) {
      const treatment = item.product?.lensTreatment;
      if (treatment && treatment !== "NENHUM") {
        acc[treatment] = (acc[treatment] || 0) + 1;
      }
    }
    return acc;
  }, {});

  const prescriptionLeads = orders.filter((order) => order.isPrescriptionLead);
  const prescriptionConversions = prescriptionLeads.filter(
    (order) => order.status !== "DRAFT" && order.status !== "CANCELLED",
  );

  const taxaConversaoReceitas =
    prescriptionLeads.length > 0
      ? parseFloat(
          ((prescriptionConversions.length / prescriptionLeads.length) * 100).toFixed(2),
        )
      : null;

  const sellerMap = paidOrders.reduce<Record<string, { name: string; total: number; count: number }>>(
    (acc, order) => {
      if (!acc[order.sellerId]) {
        acc[order.sellerId] = {
          name: order.seller?.name || order.sellerId,
          total: 0,
          count: 0,
        };
      }

      acc[order.sellerId].total += Number(order.total);
      acc[order.sellerId].count += 1;
      return acc;
    },
    {},
  );

  const sellerRanking = Object.entries(sellerMap)
    .map(([sellerId, data]) => ({
      sellerId,
      sellerName: data.name,
      totalRevenue: parseFloat(data.total.toFixed(2)),
      ordersCount: data.count,
      ticketMedio: parseFloat((data.total / data.count).toFixed(2)),
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  return {
    period: { month: query.month, year: query.year },
    summary: {
      totalOrders,
      paidOrders: paidOrders.length,
      grossRevenue: parseFloat(grossRevenue.toFixed(2)),
      ticketMedioGlobal: parseFloat(ticketMedioGlobal.toFixed(2)),
    },
    ticketMedioPorTipo,
    lensPerformance: {
      penetracaoTratamentos,
      ordersWithUpgrade: ordersWithUpgrade.length,
      treatmentBreakdown,
    },
    prescriptionConversion: {
      leads: prescriptionLeads.length,
      converted: prescriptionConversions.length,
      taxaConversao: taxaConversaoReceitas,
    },
    sellerRanking,
  };
}
