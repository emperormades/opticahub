import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logChange } from "@/lib/audit";
import { requireTenantContext } from "@/lib/session";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const tenantContext = await requireTenantContext();
    const { id } = await context.params;
    const body = await req.json();

    if (typeof body.isArchived !== "boolean") {
      return NextResponse.json(
        { error: "Nenhuma alteracao valida fornecida." },
        { status: 400 },
      );
    }

    const product = await prisma.product.findFirst({
      where: { id, tenantId: tenantContext.tenantId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produto nao encontrado" },
        { status: 404 },
      );
    }

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { isArchived: body.isArchived },
    });

    await logChange({
      tenantId: tenantContext.tenantId,
      userId: tenantContext.userId,
      entityType: "Product",
      entityId: id,
      action: "UPDATE",
      field: "isArchived",
      oldValue: product.isArchived,
      newValue: body.isArchived,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    return NextResponse.json({ product: updated });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
