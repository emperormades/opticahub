import { prisma } from "@/lib/db";
import { AnalyticsRangeQuery } from "@/lib/validation/analyticsPayload";

export async function getAnalyticsOverview(
  tenantId: string,
  query: AnalyticsRangeQuery,
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - query.days);
  startDate.setHours(0, 0, 0, 0);

  const transactions = await prisma.transaction.findMany({
    where: {
      tenantId,
      isPending: false,
      paidAt: { gte: startDate },
    },
    select: {
      type: true,
      amount: true,
      paidAt: true,
      method: true,
      orderId: true,
    },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  let osTransactionCount = 0;

  const dailyDataMap: Record<string, { date: string; income: number; expense: number }> = {};

  for (let i = 0; i < query.days; i += 1) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dayKey = date.toISOString().split("T")[0];
    dailyDataMap[dayKey] = {
      date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      income: 0,
      expense: 0,
    };
  }

  for (const transaction of transactions) {
    if (!transaction.paidAt) {
      continue;
    }

    const amount = Number(transaction.amount);
    const dayKey = transaction.paidAt.toISOString().split("T")[0];

    if (!dailyDataMap[dayKey]) {
      dailyDataMap[dayKey] = {
        date: transaction.paidAt.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        income: 0,
        expense: 0,
      };
    }

    if (transaction.type === "ENTRADA") {
      totalIncome += amount;
      dailyDataMap[dayKey].income += amount;
      if (transaction.orderId) {
        osTransactionCount += 1;
      }
    } else {
      totalExpense += amount;
      dailyDataMap[dayKey].expense += amount;
    }
  }

  const netProfit = totalIncome - totalExpense;
  const averageTicket = osTransactionCount > 0 ? totalIncome / osTransactionCount : 0;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const methodBreakdown = transactions
    .filter((transaction) => transaction.type === "ENTRADA")
    .reduce<Record<string, number>>((acc, transaction) => {
      acc[transaction.method] = (acc[transaction.method] || 0) + Number(transaction.amount);
      return acc;
    }, {});

  return {
    kpis: {
      totalIncome,
      totalExpense,
      netProfit,
      profitMargin,
      averageTicket,
      ordersPaid: osTransactionCount,
    },
    charts: {
      dailyFlux: Object.values(dailyDataMap).sort((a, b) => a.date.localeCompare(b.date)),
      methods: Object.entries(methodBreakdown)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    },
  };
}
