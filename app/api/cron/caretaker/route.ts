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
    const elevenMonthsAgo = new Date(
      now.getTime() - 11 * 30 * 24 * 60 * 60 * 1000,
    );
    const twelveMonthsAgo = new Date(
      now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000,
    );

    const expiringPrescriptions = await prisma.prescription.findMany({
      where: {
        isActive: true,
        prescribedAt: {
          lte: elevenMonthsAgo,
          gt: twelveMonthsAgo,
        },
      },
      include: {
        customer: true,
      },
      take: 100,
    });

    if (expiringPrescriptions.length === 0) {
      return NextResponse.json({
        message: "Nenhuma receita vence em breve (janela de 11 meses).",
      });
    }

    let careCount = 0;

    for (const rx of expiringPrescriptions) {
      await prisma.customer.update({
        where: { id: rx.customerId },
        data: {
          notes: `[Caretaker] Receita vencendo em breve. Contatar cliente para agendar refracao. Ultimo aviso: ${now.toLocaleDateString()}`,
        },
      });

      careCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Rotina Caretaker executada. ${careCount} clientes marcados para renovacao de grau.`,
    });
  } catch (error) {
    console.error("[CRON Caretaker] Erro na execucao:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
