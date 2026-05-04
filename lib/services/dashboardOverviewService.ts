import { prisma } from "@/lib/db";

/**
 * getDashboardOverview — Command Center data in a single call.
 *
 * Returns three sections:
 *   pulse   → "Como estou agora?"   (4 KPIs with Δ%)
 *   trends  → "Pra onde estou indo?" (7-day sparkline + OS pipeline)
 *   actions → "Onde preciso agir?"   (receivables, churn, smart actions)
 */
export async function getDashboardOverview(
  tenantId: string,
  _tenantName?: string | null,
) {
  const now = new Date();

  // ─── Date ranges ──────────────────────────────────────────────────────
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayStart);
  yesterdayEnd.setMilliseconds(-1);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  // ─── Parallel queries ─────────────────────────────────────────────────
  const [
    todayTx,
    yesterdayTx,
    monthRevenue,
    lastMonthRevenue,
    monthOrders,
    lastMonthOrders,
    sevenDayTx,
    pipelineCounts,
    overdueOS,
    openCash,
    pendingReceivables,
    overdueReceivables,
    churnRiskCustomers,
    recentOrders,
  ] = await Promise.all([
    // Today's transactions
    prisma.transaction.aggregate({
      where: { tenantId, type: "ENTRADA", isPending: false, createdAt: { gte: todayStart, lte: todayEnd } },
      _sum: { amount: true },
      _count: true,
    }),
    // Yesterday's transactions (for Δ%)
    prisma.transaction.aggregate({
      where: { tenantId, type: "ENTRADA", isPending: false, createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
      _sum: { amount: true },
    }),
    // This month revenue
    prisma.transaction.aggregate({
      where: { tenantId, type: "ENTRADA", isPending: false, createdAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    // Last month revenue (full month)
    prisma.transaction.aggregate({
      where: { tenantId, type: "ENTRADA", isPending: false, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum: { amount: true },
    }),
    // This month order count (for ticket médio)
    prisma.serviceOrder.count({
      where: { tenantId, isPaid: true, createdAt: { gte: monthStart } },
    }),
    // Last month order count
    prisma.serviceOrder.count({
      where: { tenantId, isPaid: true, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
    }),
    // Last 7 days transactions (for sparkline)
    prisma.transaction.findMany({
      where: { tenantId, isPending: false, createdAt: { gte: sevenDaysAgo } },
      select: { type: true, amount: true, createdAt: true },
    }),
    // OS pipeline by status
    prisma.serviceOrder.groupBy({
      by: ["status"],
      where: { tenantId, status: { notIn: ["DELIVERED", "CANCELLED"] } },
      _count: { id: true },
    }),
    // Overdue OS (lab deadline passed)
    prisma.serviceOrder.count({
      where: {
        tenantId,
        status: { in: ["LAB_SENT", "IN_PRODUCTION", "QUALITY_CHECK"] },
        labDeadline: { lt: now },
      },
    }),
    // Cash register open today?
    prisma.cashRegister.findFirst({
      where: { tenantId, openedAt: { gte: todayStart }, closedAt: null },
      select: { id: true },
    }),
    // Pending receivables
    prisma.transaction.aggregate({
      where: { tenantId, isPending: true, type: "ENTRADA" },
      _sum: { amount: true },
      _count: true,
    }),
    // Overdue receivables
    prisma.transaction.aggregate({
      where: { tenantId, isPending: true, type: "ENTRADA", dueDate: { lt: now } },
      _sum: { amount: true },
      _count: true,
    }),
    // Churn risk: prescriptions expiring in 30 days
    prisma.customer.count({
      where: {
        tenantId,
        isActive: true,
        prescriptionExpiresAt: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    // Recent 5 orders for context
    prisma.serviceOrder.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        customer: { select: { name: true } },
      },
    }),
  ]);

  // ─── PULSE ────────────────────────────────────────────────────────────
  const revenueToday = Number(todayTx._sum.amount || 0);
  const revenueYesterday = Number(yesterdayTx._sum.amount || 0);
  const revenueMonth = Number(monthRevenue._sum.amount || 0);
  const revenueLastMonth = Number(lastMonthRevenue._sum.amount || 0);

  const ticketMedio = monthOrders > 0 ? revenueMonth / monthOrders : 0;
  const ticketMedioPrev = lastMonthOrders > 0 ? revenueLastMonth / lastMonthOrders : 0;

  const pipelineMap = pipelineCounts.reduce<Record<string, number>>((acc, g) => {
    acc[g.status] = g._count.id;
    return acc;
  }, {});

  const osInProduction =
    (pipelineMap["LAB_SENT"] || 0) +
    (pipelineMap["IN_PRODUCTION"] || 0) +
    (pipelineMap["QUALITY_CHECK"] || 0);

  function deltaPercent(current: number, previous: number): number | null {
    if (previous === 0) return current > 0 ? 100 : null;
    return parseFloat((((current - previous) / previous) * 100).toFixed(1));
  }

  const pulse = {
    revenueToday: round(revenueToday),
    revenueTodayDelta: deltaPercent(revenueToday, revenueYesterday),
    ticketMedio: round(ticketMedio),
    ticketMedioDelta: deltaPercent(ticketMedio, ticketMedioPrev),
    osInProduction,
    osOverdue: overdueOS,
    revenueMonth: round(revenueMonth),
    revenueMonthDelta: deltaPercent(revenueMonth, revenueLastMonth),
    caixaAberto: openCash !== null,
  };

  // ─── TRENDS ───────────────────────────────────────────────────────────
  // Build 7-day sparkline
  const dailyMap: Record<string, { date: string; income: number; expense: number }> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    dailyMap[key] = {
      date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      income: 0,
      expense: 0,
    };
  }

  for (const tx of sevenDayTx) {
    const key = tx.createdAt.toISOString().split("T")[0];
    if (!dailyMap[key]) continue;
    const amount = Number(tx.amount);
    if (tx.type === "ENTRADA") {
      dailyMap[key].income += amount;
    } else {
      dailyMap[key].expense += amount;
    }
  }

  const dailyFlux = Object.values(dailyMap);

  // Pipeline funnel: 4 stages
  const pipeline = {
    orcamento: pipelineMap["DRAFT"] || 0,
    validacao: (pipelineMap["VALIDATING"] || 0),
    laboratorio: (pipelineMap["LAB_SENT"] || 0) + (pipelineMap["IN_PRODUCTION"] || 0) + (pipelineMap["QUALITY_CHECK"] || 0),
    pronto: pipelineMap["DELIVERY_READY"] || 0,
  };

  const totalPipeline = pipeline.orcamento + pipeline.validacao + pipeline.laboratorio + pipeline.pronto;

  const trends = {
    dailyFlux,
    pipeline,
    totalPipeline,
    marginPct: revenueMonth > 0
      ? parseFloat(
          (((revenueMonth - dailyFlux.reduce((s, d) => s + d.expense, 0)) / revenueMonth) * 100).toFixed(1),
        )
      : null,
  };

  // ─── ACTIONS ──────────────────────────────────────────────────────────
  const receivablesTotal = Number(pendingReceivables._sum.amount || 0);
  const receivablesOverdue = Number(overdueReceivables._sum.amount || 0);
  const receivablesOverdueCount = overdueReceivables._count;

  // Smart actions — generated from data
  type SmartAction = {
    icon: string;
    text: string;
    href: string;
    urgency: "high" | "medium" | "low";
  };

  const smartActions: SmartAction[] = [];

  if (overdueOS > 0) {
    smartActions.push({
      icon: "⚠️",
      text: `${overdueOS} OS atrasada${overdueOS > 1 ? "s" : ""} no laboratório`,
      href: "/dashboard/ordens",
      urgency: "high",
    });
  }

  if (receivablesOverdueCount > 0) {
    smartActions.push({
      icon: "💸",
      text: `R$ ${formatCompact(receivablesOverdue)} a receber vencido`,
      href: "/dashboard/financeiro/carne",
      urgency: "high",
    });
  }

  if (!openCash) {
    smartActions.push({
      icon: "🔒",
      text: "Caixa não foi aberto hoje",
      href: "/dashboard/financeiro/caixa",
      urgency: "medium",
    });
  }

  if (churnRiskCustomers > 0) {
    smartActions.push({
      icon: "👤",
      text: `${churnRiskCustomers} cliente${churnRiskCustomers > 1 ? "s" : ""} com receituário vencendo em 30 dias`,
      href: "/dashboard/analytics/crm",
      urgency: "medium",
    });
  }

  if (pipeline.pronto > 0) {
    smartActions.push({
      icon: "✅",
      text: `${pipeline.pronto} OS pronta${pipeline.pronto > 1 ? "s" : ""} para entrega ao cliente`,
      href: "/dashboard/ordens",
      urgency: "low",
    });
  }

  const actions = {
    receivables: {
      total: round(receivablesTotal),
      count: pendingReceivables._count,
      overdue: round(receivablesOverdue),
      overdueCount: receivablesOverdueCount,
    },
    churnRisk: churnRiskCustomers,
    smartActions,
  };

  return { pulse, trends, actions, recentOrders };
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function round(v: number): number {
  return parseFloat(v.toFixed(2));
}

function formatCompact(v: number): string {
  if (v >= 1000) {
    return `${(v / 1000).toFixed(1).replace(".", ",")}k`;
  }
  return v.toFixed(2).replace(".", ",");
}
