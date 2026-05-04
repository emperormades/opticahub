import { AgentStatus, AgentType, TaskPriority, TaskStatus } from "@prisma/client";
import { NotificationService } from "../services/notificationService";
import type { Job } from "./runner";

export const checkOverdueInstallments: Job = {
  id: "checkOverdueInstallments",
  name: "The Collector",
  description: "Verifica parcelas vencidas e agenda tarefas de cobranca",
  run: async (prisma) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueInstallments = await prisma.installment.findMany({
      where: {
        isPaid: false,
        dueDate: { lt: today },
      },
      include: {
        transaction: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                customerId: true,
                tenantId: true,
                customer: {
                  select: {
                    name: true,
                    whatsapp: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
      take: 200,
    });

    if (overdueInstallments.length === 0) {
      return {
        status: "skipped",
        message: "Nenhuma parcela vencida encontrada.",
        affected: 0,
      };
    }

    let created = 0;
    let skipped = 0;

    for (const installment of overdueInstallments) {
      const order = installment.transaction?.order;
      if (!order) {
        skipped += 1;
        continue;
      }

      const daysLate = Math.ceil(
        (today.getTime() - new Date(installment.dueDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const existingTask = await prisma.agentTask.findFirst({
        where: {
          tenantId: order.tenantId,
          type: "COLLECT_DEBT",
          payload: {
            path: ["installmentId"],
            equals: installment.id,
          },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (existingTask) {
        skipped += 1;
        continue;
      }

      const collectorAgent = await prisma.tenantAgent.findFirst({
        where: {
          tenantId: order.tenantId,
          status: AgentStatus.ACTIVE,
          agent: {
            type: AgentType.COLLECTOR,
            isActive: true,
          },
        },
        select: { id: true },
      });

      await prisma.agentTask.create({
        data: {
          tenantId: order.tenantId,
          tenantAgentId: collectorAgent?.id || null,
          type: "COLLECT_DEBT",
          status: TaskStatus.PENDING,
          priority:
            daysLate > 30
              ? TaskPriority.HIGH
              : daysLate > 7
                ? TaskPriority.MEDIUM
                : TaskPriority.LOW,
          payload: {
            installmentId: installment.id,
            installmentNumber: installment.number,
            amount: Number(installment.amount),
            dueDate: installment.dueDate.toISOString(),
            daysLate,
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerId: order.customerId,
            customerName: order.customer.name,
            customerWhatsapp: order.customer.whatsapp,
            customerPhone: order.customer.phone,
          },
        },
      });

      const baseAmount = Number(installment.amount);
      const penalty = baseAmount * 0.02;
      const monthlyInterestRate = 0.01;
      const totalInterest = (baseAmount * monthlyInterestRate * daysLate) / 30;

      await prisma.installment.update({
        where: { id: installment.id },
        data: {
          penaltyAmount: penalty,
          interestAmount: totalInterest,
        },
      });

      await NotificationService.notify(
        "OVERDUE_NOTICE",
        {
          customerId: order.customerId,
          amount: baseAmount,
          daysLate,
          penaltyAmount: penalty + totalInterest,
        },
        order.tenantId,
      );

      created += 1;
    }

    return {
      status: "success",
      message: `${created} tarefas de cobranca criadas. ${skipped} itens ignorados.`,
      affected: created,
      meta: {
        skipped,
        scanned: overdueInstallments.length,
      },
    };
  },
};
