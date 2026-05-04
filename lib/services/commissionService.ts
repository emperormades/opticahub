import { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { readTenantFinanceConfig } from "@/lib/finance/settlement";

export async function ensureCommissionForSettledTransaction(
  tenantId: string,
  transactionId: string,
  explicitPct?: number,
  installmentId?: string,
) {
  const existingCommission = await prisma.commission.findFirst({
    where: { 
      transactionId, 
      installmentId: installmentId ?? null 
    },
    select: { id: true },
  });

  if (existingCommission) {
    return { status: "already_exists" as const };
  }

  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, tenantId },
    include: {
      order: {
        select: {
          id: true,
          total: true,
          sellerId: true,
        },
      },
    },
  });

  if (!transaction || transaction.type !== TransactionType.ENTRADA || !transaction.order) {
    return { status: "not_eligible" as const };
  }

  // Se não foi passado `installmentId`, mas a transação tem parcelas em aberto, bloqueamos o comissionamento full
  if (!installmentId) {
    if (transaction.isPending) {
      return { status: "pending_payment" as const };
    }

    const openInstallments = await prisma.installment.count({
      where: {
        transactionId: transaction.id,
        isPaid: false,
      },
    });

    if (openInstallments > 0) {
      return { status: "pending_payment" as const };
    }
  }

  let commissionPct = explicitPct;

  if (commissionPct === undefined) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { config: true },
    });

    commissionPct = readTenantFinanceConfig(tenant?.config).defaultCommissionPct;
  }

  if (!commissionPct || commissionPct <= 0) {
    return { status: "disabled" as const };
  }

  let baseAmount: number;

  if (installmentId) {
    const installment = await prisma.installment.findUnique({
      where: { id: installmentId },
      select: { amount: true },
    });
    if (!installment) {
      return { status: "not_eligible" as const };
    }
    // Recebe comissão apenas sobre o valor base da parcela, sem multa e juros
    baseAmount = Number(installment.amount);
  } else {
    // Transação à vista ou comissionamento full
    baseAmount = Number(transaction.order.total);
  }

  const commissionAmount = Math.round(baseAmount * (commissionPct / 100) * 100) / 100;

  if (commissionAmount <= 0) {
    return { status: "disabled" as const };
  }

  await prisma.commission.create({
    data: {
      tenantId,
      sellerId: transaction.order.sellerId,
      transactionId: transaction.id,
      installmentId,
      orderId: transaction.order.id,
      baseAmount,
      pct: commissionPct,
      amount: commissionAmount,
      isPaid: false, // isPaid é controlado pelo fluxo de contas a pagar (já nascer pago só se o config de tenant mandar)
    },
  });

  return { status: "created" as const };
}
