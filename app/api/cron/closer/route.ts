import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateCronRequest } from "@/lib/cron";

export async function GET(req: Request) {
  try {
    const auth = validateCronRequest(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const staleDrafts = await prisma.serviceOrder.findMany({
      where: {
        status: "DRAFT",
        createdAt: {
          lte: fortyEightHoursAgo,
        },
        events: {
          none: {
            notes: {
              contains: "[Closer]",
            },
          },
        },
      },
      include: {
        customer: true,
        tenant: true,
      },
      take: 100,
    });

    if (staleDrafts.length === 0) {
      return NextResponse.json({
        message: "Nenhum orçamento pendente para resgate.",
      });
    }

    let rescuedCount = 0;

    for (const order of staleDrafts) {
      await prisma.serviceOrderEvent.create({
        data: {
          orderId: order.id,
          tenantId: order.tenantId,
          userId: null,
          fromStatus: "DRAFT",
          toStatus: "DRAFT",
          notes: `[Closer] Orçamento expirando. Notificação de resgate gerada para o cliente ${order.customer.name.split(" ")[0]}.`,
        },
      });

      rescuedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Rotina Closer executada. ${rescuedCount} orçamentos mapeados para resgate.`,
    });
  } catch (error) {
    console.error("[CRON Closer] Erro na execucao:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
