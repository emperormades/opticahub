import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateCronRequest } from "@/lib/cron";

export async function GET(req: Request) {
  try {
    const auth = validateCronRequest(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const now = new Date();

    const overdueInstallments = await prisma.installment.findMany({
      where: {
        isPaid: false,
        dueDate: {
          lt: now,
        },
      },
      include: {
        transaction: {
          select: {
            orderId: true,
          },
        },
      },
      take: 100,
    });

    if (overdueInstallments.length === 0) {
      return NextResponse.json({
        message: "Nenhuma parcela vencida para cobranca ativa.",
      });
    }

    let collectedCount = 0;

    for (const inst of overdueInstallments) {
      const daysOverdue = Math.floor(
        (now.getTime() - inst.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysOverdue > 3 && inst.transaction?.orderId) {
        await prisma.serviceOrderEvent.create({
          data: {
            orderId: inst.transaction.orderId,
            tenantId: inst.tenantId,
            userId: null,
            fromStatus: "DELIVERED",
            toStatus: "DELIVERED",
            notes: `[Collector] Parcela #${inst.number} vencida ha ${daysOverdue} dias. Iniciar protocolo de contato com cliente.`,
          },
        });

        collectedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Rotina Collector executada. ${collectedCount} cobrancas geradas.`,
    });
  } catch (error) {
    console.error("[CRON Collector] Erro na execucao:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
