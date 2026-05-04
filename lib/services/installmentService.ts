import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureCommissionForSettledTransaction } from "@/lib/services/commissionService";
import {
  CarneListQuery,
  CreateCarnePayload,
} from "@/lib/validation/financialPayload";

export async function createInstallments(
  tenantId: string,
  input: CreateCarnePayload,
) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: input.transactionId, tenantId },
  });

  if (!transaction) {
    return { error: "TRANSACTION_NOT_FOUND" as const };
  }

  const existingInstallments = await prisma.installment.count({
    where: { transactionId: input.transactionId },
  });

  if (existingInstallments > 0) {
    return { error: "INSTALLMENTS_ALREADY_EXIST" as const };
  }

  const totalAmount = Number(transaction.amount);
  const installmentValue =
    Math.round((totalAmount / input.installmentsCount) * 100) / 100;
  const lastInstallmentValue =
    Math.round(
      (totalAmount - installmentValue * (input.installmentsCount - 1)) * 100,
    ) / 100;

  const installmentsData: Prisma.InstallmentCreateManyInput[] = [];
  const baseDate = new Date(input.firstDueDate);

  for (let index = 0; index < input.installmentsCount; index += 1) {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + index);

    installmentsData.push({
      tenantId,
      transactionId: input.transactionId,
      number: index + 1,
      dueDate,
      amount:
        index === input.installmentsCount - 1 ? lastInstallmentValue : installmentValue,
      isPaid: false,
      penaltyAmount: 0,
      interestAmount: 0,
    });
  }

  await prisma.installment.createMany({ data: installmentsData });

  await prisma.transaction.update({
    where: { id: input.transactionId },
    data: { installmentsCount: input.installmentsCount },
  });

  const created = await prisma.installment.findMany({
    where: { transactionId: input.transactionId },
    orderBy: { number: "asc" },
  });

  return { data: created };
}

export async function listInstallments(
  tenantId: string,
  query: CarneListQuery,
) {
  const where: Prisma.InstallmentWhereInput = { tenantId };

  if (query.transactionId) {
    where.transactionId = query.transactionId;
  }

  if (query.status === "overdue") {
    where.isPaid = false;
    where.dueDate = { lt: new Date() };
  } else if (query.status === "pending") {
    where.isPaid = false;
    where.dueDate = { gte: new Date() };
  } else if (query.status === "paid") {
    where.isPaid = true;
  }

  return prisma.installment.findMany({
    where,
    include: {
      transaction: {
        include: {
          order: {
            select: {
              orderNumber: true,
              customerId: true,
              customer: { select: { name: true, whatsapp: true, phone: true } },
            },
          },
        },
      },
    },
    orderBy: [{ isPaid: "asc" }, { dueDate: "asc" }],
    take: 100,
  });
}

export async function getInstallmentById(
  tenantId: string,
  installmentId: string,
) {
  return prisma.installment.findFirst({
    where: { id: installmentId, tenantId },
    include: {
      transaction: {
        include: {
          order: {
            select: {
              orderNumber: true,
              customer: { select: { name: true, whatsapp: true, phone: true } },
            },
          },
        },
      },
    },
  });
}

export async function payInstallment(
  tenantId: string,
  installmentId: string,
) {
  const installment = await prisma.installment.findFirst({
    where: { id: installmentId, tenantId },
  });

  if (!installment) {
    return { error: "INSTALLMENT_NOT_FOUND" as const };
  }

  if (installment.isPaid) {
    return { error: "INSTALLMENT_ALREADY_PAID" as const };
  }

  const today = new Date();
  const isOverdue = today > installment.dueDate;

  let penaltyAmount = 0;
  let interestAmount = 0;

  if (isOverdue) {
    const daysLate = Math.ceil(
      (today.getTime() - installment.dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const penaltyRate = 0.02;
    const interestDaily = 0.01 / 30;

    penaltyAmount =
      Math.round(Number(installment.amount) * penaltyRate * 100) / 100;
    interestAmount =
      Math.round(Number(installment.amount) * interestDaily * daysLate * 100) / 100;
  }

  const transaction = await prisma.transaction.findFirst({
    where: { id: installment.transactionId, tenantId },
    select: {
      id: true,
      orderId: true,
      isPending: true,
      paidAt: true,
      type: true,
    },
  });

  const updated = await prisma.installment.update({
    where: { id: installmentId },
    data: {
      isPaid: true,
      paidAt: today,
      penaltyAmount,
      interestAmount,
    },
  });

  const remainingOpenInstallments = await prisma.installment.count({
    where: {
      transactionId: installment.transactionId,
      isPaid: false,
    },
  });

  if (transaction && remainingOpenInstallments === 0) {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        isPending: false,
        paidAt: transaction.paidAt ?? today,
      },
    });

    if (transaction.orderId) {
      const pendingOrderEntries = await prisma.transaction.count({
        where: {
          tenantId,
          orderId: transaction.orderId,
          type: "ENTRADA",
          isPending: true,
        },
      });

      if (pendingOrderEntries === 0) {
        await prisma.serviceOrder.updateMany({
          where: { id: transaction.orderId, tenantId },
          data: { isPaid: true },
        });
      }
    }
  }

  // Aciona a comissão proporcional para a parcela que acabou de ser paga
  if (transaction) {
    await ensureCommissionForSettledTransaction(tenantId, transaction.id, undefined, installmentId);
  }

  return { data: updated };
}
