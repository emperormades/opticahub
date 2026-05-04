import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "UNMATCHED";

    const statements = await prisma.bankStatementTransaction.findMany({
      where: {
        tenantId: context.tenantId,
        matchStatus: status,
      },
      orderBy: {
        date: "desc",
      },
      take: 100,
      include: {
        matchAction: {
          select: {
            id: true,
            orderId: true,
            description: true,
            amount: true,
          },
        },
      },
    });

    return NextResponse.json(statements);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao buscar extratos OFX",
      },
      { status: 500 },
    );
  }
}
