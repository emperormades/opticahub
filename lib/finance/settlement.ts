import { PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "../db";

type SettledOrder = Prisma.ServiceOrderGetPayload<{
  include: {
    transactions: true;
    seller: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

type TenantFinanceConfig = {
  defaultCommissionPct: number;
};

function parseNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function readTenantFinanceConfig(rawConfig: Prisma.JsonValue | null | undefined): TenantFinanceConfig {
  if (!rawConfig || typeof rawConfig !== "object" || Array.isArray(rawConfig)) {
    return { defaultCommissionPct: 5 };
  }

  const config = rawConfig as Prisma.JsonObject;

  return {
    defaultCommissionPct: parseNumber(config.defaultCommissionPct, 5),
  };
}

export class SettlementService {
  static async settle(orderId: string, tenantId: string): Promise<void> {
    const order = await prisma.serviceOrder.findFirst({
      where: { id: orderId, tenantId },
      include: {
        transactions: true,
        seller: { select: { id: true, name: true } },
      },
    });

    if (!order || !order.isPaid) {
      return;
    }

    await Promise.all([
      this.generateInstallments(order),
      this.calculateCommission(order, tenantId),
      this.updateCreditUsed(order),
    ]);

    console.info(`[Settlement] OS ${order.orderNumber} liquidada.`);
  }

  private static async generateInstallments(order: SettledOrder): Promise<void> {
    const crediarioTransactions = order.transactions.filter(
      (transaction) => transaction.method === PaymentMethod.CREDIARIO,
    );

    for (const transaction of crediarioTransactions) {
      const existing = await prisma.installment.count({
        where: { transactionId: transaction.id },
      });

      if (existing > 0) {
        continue;
      }

      const installmentsCount = transaction.installmentsCount || 1;
      if (installmentsCount <= 1) {
        continue;
      }

      const totalAmount = Number(transaction.amount);
      const installmentValue =
        Math.round((totalAmount / installmentsCount) * 100) / 100;
      const lastInstallmentValue =
        Math.round(
          (totalAmount - installmentValue * (installmentsCount - 1)) * 100,
        ) / 100;

      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + 30);

      const installmentsData = Array.from({ length: installmentsCount }, (_, index) => {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(dueDate.getMonth() + index);

        return {
          tenantId: order.tenantId,
          transactionId: transaction.id,
          number: index + 1,
          dueDate,
          amount: index === installmentsCount - 1 ? lastInstallmentValue : installmentValue,
          isPaid: false,
          penaltyAmount: 0,
          interestAmount: 0,
        };
      });

      await prisma.installment.createMany({ data: installmentsData });
      console.info(
        `[Settlement] Carne gerado: ${installmentsCount}x para transacao ${transaction.id}.`,
      );
    }
  }

  private static async calculateCommission(
    order: SettledOrder,
    tenantId: string,
  ): Promise<void> {
    const mainTransaction = order.transactions[0];
    if (!mainTransaction) {
      return;
    }

    const existingCommission = await prisma.commission.findFirst({
      where: { transactionId: mainTransaction.id },
    });
    if (existingCommission) {
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { config: true },
    });

    const financeConfig = readTenantFinanceConfig(tenant?.config);
    const commissionPct = financeConfig.defaultCommissionPct;
    const baseAmount = Number(order.total);
    const commissionAmount = Math.round(baseAmount * (commissionPct / 100) * 100) / 100;

    if (commissionAmount <= 0) {
      return;
    }

    await prisma.commission.create({
      data: {
        tenantId,
        sellerId: order.sellerId,
        transactionId: mainTransaction.id,
        orderId: order.id,
        baseAmount,
        pct: commissionPct,
        amount: commissionAmount,
        isPaid: false,
      },
    });

    console.info(
      `[Settlement] Comissao: R$ ${commissionAmount} para ${order.seller.name} (${commissionPct}%).`,
    );
  }

  private static async updateCreditUsed(order: SettledOrder): Promise<void> {
    const crediarioTransactions = order.transactions.filter(
      (transaction) => transaction.method === PaymentMethod.CREDIARIO,
    );

    if (crediarioTransactions.length === 0) {
      return;
    }

    const crediarioTotal = crediarioTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount),
      0,
    );

    await prisma.customer.update({
      where: { id: order.customerId },
      data: { creditUsed: { increment: crediarioTotal } },
    });

    console.info(
      `[Settlement] creditUsed +R$ ${crediarioTotal} para cliente ${order.customerId}.`,
    );
  }
}
