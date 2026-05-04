import { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { FinancialSummaryQuery } from "@/lib/validation/financialPayload";

export async function getFinancialSummary(
  tenantId: string,
  query: FinancialSummaryQuery,
) {
  const targetDate = query.date ? new Date(query.date) : new Date();

  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const monthEnd = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth() + 1,
    0,
    23,
    59,
    59,
  );

  const [
    todayTransactions,
    monthEntradas,
    monthSaidas,
    pendingReceivables,
    overdueReceivables,
    openCash,
    recentTransactions,
    payablesOverdue,
    payablesDue,
    ordersByStatus,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        tenantId,
        createdAt: { gte: dayStart, lte: dayEnd },
        isPending: false,
      },
      select: { type: true, amount: true, method: true },
    }),
    prisma.transaction.aggregate({
      where: {
        tenantId,
        type: "ENTRADA",
        isPending: false,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        tenantId,
        type: "SAIDA",
        isPending: false,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { tenantId, isPending: true, type: "ENTRADA" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: {
        tenantId,
        isPending: true,
        type: "ENTRADA",
        dueDate: { lt: new Date() },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.cashRegister.findFirst({
      where: { tenantId, openedAt: { gte: dayStart }, closedAt: null },
      include: { openedBy: { select: { name: true } } },
    }),
    prisma.transaction.findMany({
      where: { tenantId },
      include: {
        user: { select: { name: true } },
        order: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.accountsPayable.aggregate({
      where: {
        tenantId,
        isPaid: false,
        dueDate: { lt: new Date() },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.accountsPayable.findMany({
      where: {
        tenantId,
        isPaid: false,
        dueDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.serviceOrder.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    }),
  ]);

  const todayEntradas = todayTransactions
    .filter((transaction) => transaction.type === "ENTRADA")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const todaySaidas = todayTransactions
    .filter((transaction) => transaction.type === "SAIDA")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const paymentBreakdown = todayTransactions
    .filter((transaction) => transaction.type === "ENTRADA")
    .reduce(
      (acc, transaction) => {
        acc[transaction.method] = (acc[transaction.method] || 0) + Number(transaction.amount);
        return acc;
      },
      {} as Partial<Record<PaymentMethod, number>>,
    );

  return {
    date: targetDate.toISOString(),
    today: {
      entradas: todayEntradas,
      saidas: todaySaidas,
      liquido: todayEntradas - todaySaidas,
      transactionCount: todayTransactions.length,
      paymentBreakdown,
    },
    month: {
      entradas: Number(monthEntradas._sum.amount || 0),
      saidas: Number(monthSaidas._sum.amount || 0),
      liquido: Number(monthEntradas._sum.amount || 0) - Number(monthSaidas._sum.amount || 0),
    },
    receivables: {
      total: Number(pendingReceivables._sum.amount || 0),
      count: pendingReceivables._count,
      overdue: Number(overdueReceivables._sum.amount || 0),
      overdueCount: overdueReceivables._count,
    },
    payables: {
      overdue: Number(payablesOverdue._sum.amount || 0),
      overdueCount: payablesOverdue._count,
      upcoming: payablesDue,
    },
    openCash,
    recentTransactions,
    ordersByStatus,
  };
}
