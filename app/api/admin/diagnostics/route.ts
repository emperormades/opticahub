import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext();

    const lowStock = await prisma.stockItem.count({
      where: { tenantId: context.tenantId, quantity: { lte: 0 } },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const overduePayments = await prisma.transaction.count({
      where: {
        tenantId: context.tenantId,
        isPending: true,
        dueDate: { lt: thirtyDaysAgo },
      },
    });

    const incompleteCustomers = await prisma.customer.count({
      where: {
        tenantId: context.tenantId,
        OR: [{ phone: null }, { cpf: null }],
      },
    });

    const health = await prisma.systemHealth.findMany({
      where: { tenantId: context.tenantId },
      orderBy: { lastCheck: "desc" },
      take: 5,
    });

    return NextResponse.json({
      summary: {
        lowStock,
        overduePayments,
        incompleteCustomers,
      },
      services: health,
      timestamp: new Date(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[DIAGNOSTICS_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao gerar diagnostico" },
      { status: 500 },
    );
  }
}
