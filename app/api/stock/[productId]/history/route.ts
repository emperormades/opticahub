import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const context = await requireTenantContext();
    const { productId } = await params;

    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId: context.tenantId,
        entityType: "Product",
        entityId: productId,
        field: "stock",
      },
      orderBy: { timestamp: "desc" },
      include: {
        user: { select: { name: true } },
      },
    });

    return NextResponse.json(logs);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
