import { logChange } from "@/lib/audit";
import { prisma } from "@/lib/db";

export interface CashRegisterActor {
  tenantId: string;
  userId: string;
}

export type OpenCashRegisterInput = {
  openAmount?: number;
  notes?: string | null;
};

export type CloseCashRegisterInput = {
  cashId: string;
  closeAmount?: number;
  notes?: string | null;
};

export type WithdrawCashInput = {
  cashId?: string | null;
  withdrawAmount: number;
  notes: string;
};

export async function openCashRegister(
  actor: CashRegisterActor,
  input: OpenCashRegisterInput,
) {
  const hasOpen = await prisma.cashRegister.findFirst({
    where: { tenantId: actor.tenantId, closedAt: null },
  });

  if (hasOpen) {
    return { error: "CASH_ALREADY_OPEN" as const };
  }

  const register = await prisma.cashRegister.create({
    data: {
      tenantId: actor.tenantId,
      openedById: actor.userId,
      openAmount: input.openAmount ?? 0,
      notes: input.notes || "",
    },
  });

  await logChange({
    tenantId: actor.tenantId,
    userId: actor.userId,
    entityType: "CashRegister",
    entityId: register.id,
    action: "CREATE",
    newValue: { action: "OPEN", amount: register.openAmount },
  });

  return { data: register };
}

export async function getActiveCashRegisterDetails(tenantId: string) {
  return prisma.cashRegister.findFirst({
    where: { tenantId, closedAt: null },
    include: {
      openedBy: { select: { id: true, name: true } },
      transactions: {
        where: { isPending: false },
        include: {
          user: { select: { name: true } },
          order: {
            select: {
              orderNumber: true,
              customer: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { openedAt: "desc" },
  });
}

export async function listRecentCashRegisters(tenantId: string) {
  return prisma.cashRegister.findMany({
    where: { tenantId },
    include: {
      openedBy: { select: { name: true } },
      _count: { select: { transactions: true } },
    },
    orderBy: { openedAt: "desc" },
    take: 30,
  });
}

export async function getCashRegisterById(tenantId: string, cashId: string) {
  return prisma.cashRegister.findFirst({
    where: { id: cashId, tenantId },
    include: { openedBy: { select: { name: true } } },
  });
}

export async function getCashDashboard(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [openCash, lastCashes] = await Promise.all([
    prisma.cashRegister.findFirst({
      where: { tenantId, openedAt: { gte: today }, closedAt: null },
      include: {
        openedBy: { select: { name: true } },
        transactions: {
          where: { isPending: false },
          select: { type: true, amount: true, method: true },
        },
      },
    }),
    prisma.cashRegister.findMany({
      where: { tenantId, closedAt: { not: null } },
      orderBy: { openedAt: "desc" },
      take: 7,
      select: {
        id: true,
        openedAt: true,
        closedAt: true,
        totalEntradas: true,
        totalSaidas: true,
        totalLiquido: true,
        openedBy: { select: { name: true } },
      },
    }),
  ]);

  if (!openCash) {
    return { openCash: null, lastCashes };
  }

  const entradas = openCash.transactions
    .filter((transaction) => transaction.type === "ENTRADA")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const saidas = openCash.transactions
    .filter((transaction) => transaction.type === "SAIDA")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  return {
    openCash: {
      ...openCash,
      summary: {
        entradas,
        saidas,
        liquido: entradas - saidas + Number(openCash.openAmount),
      },
    },
    lastCashes,
  };
}

export async function closeCashRegister(
  actor: CashRegisterActor,
  input: CloseCashRegisterInput,
) {
  const register = await prisma.cashRegister.findFirst({
    where: { id: input.cashId, tenantId: actor.tenantId },
    include: { transactions: true },
  });

  if (!register) {
    return { error: "CASH_NOT_FOUND" as const };
  }

  if (register.closedAt) {
    return { error: "CASH_ALREADY_CLOSED" as const };
  }

  const validTransactions = register.transactions.filter((transaction) => !transaction.isPending);

  const totalEntradas = validTransactions
    .filter((transaction) => transaction.type === "ENTRADA")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const totalSaidas = validTransactions
    .filter((transaction) => transaction.type === "SAIDA")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const entradasDinheiro = validTransactions
    .filter(
      (transaction) =>
        transaction.type === "ENTRADA" && transaction.method === "DINHEIRO",
    )
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const saidasDinheiro = validTransactions
    .filter(
      (transaction) => transaction.type === "SAIDA" && transaction.method === "DINHEIRO",
    )
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const totalLiquido = Number(register.openAmount) + totalEntradas - totalSaidas;
  const gavetaEsperada =
    Number(register.openAmount) + entradasDinheiro - saidasDinheiro;
  const actualCloseAmount = input.closeAmount ?? gavetaEsperada;
  const quebra = parseFloat((actualCloseAmount - gavetaEsperada).toFixed(2));

  const notesFinal =
    quebra !== 0
      ? `${input.notes || register.notes || ""}\n[AUDITORIA] Quebra de Caixa: ${quebra > 0 ? "+" : ""}${quebra}`
      : input.notes || register.notes;

  const updated = await prisma.cashRegister.update({
    where: { id: register.id },
    data: {
      closedAt: new Date(),
      closedById: actor.userId,
      closeAmount: actualCloseAmount,
      totalEntradas,
      totalSaidas,
      totalLiquido,
      notes: notesFinal,
    },
  });

  await logChange({
    tenantId: actor.tenantId,
    userId: actor.userId,
    entityType: "CashRegister",
    entityId: register.id,
    action: "UPDATE",
    newValue: {
      action: "CLOSE",
      expectedDrawer: gavetaEsperada,
      actualDrawer: actualCloseAmount,
      discrepancy: quebra,
    },
  });

  return { data: updated };
}

export async function withdrawCashFromRegister(
  actor: CashRegisterActor,
  input: WithdrawCashInput,
) {
  const register = input.cashId
    ? await prisma.cashRegister.findFirst({
        where: {
          id: input.cashId,
          tenantId: actor.tenantId,
          closedAt: null,
        },
      })
    : await prisma.cashRegister.findFirst({
        where: {
          tenantId: actor.tenantId,
          closedAt: null,
        },
        orderBy: { openedAt: "desc" },
      });

  if (!register) {
    return { error: "CASH_NOT_FOUND" as const };
  }

  const transaction = await prisma.transaction.create({
    data: {
      tenantId: actor.tenantId,
      userId: actor.userId,
      cashRegisterId: register.id,
      type: "SAIDA",
      method: "DINHEIRO",
      amount: input.withdrawAmount,
      description: "Sangria de caixa",
      installmentsCount: 1,
      isPending: false,
      paidAt: new Date(),
      notes: input.notes.trim(),
    },
  });

  await logChange({
    tenantId: actor.tenantId,
    userId: actor.userId,
    entityType: "CashRegister",
    entityId: register.id,
    action: "UPDATE",
    newValue: {
      action: "WITHDRAWAL",
      amount: input.withdrawAmount,
      transactionId: transaction.id,
      notes: input.notes.trim(),
    },
  });

  return { data: transaction };
}
