import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logChange } from "@/lib/audit";
import { requireTenantContext } from "@/lib/session";

// PATCH /api/stock/[productId] - ajustar quantidade
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await params;
  const body = await req.json();
  const { delta, reason } = body;

  if (delta === undefined || delta === 0) {
    return NextResponse.json(
      { error: "delta e obrigatorio e diferente de zero" },
      { status: 400 },
    );
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId: context.tenantId },
    include: { stockItems: { where: { tenantId: context.tenantId } } },
  });

  if (!product)
    return NextResponse.json(
      { error: "Produto nao encontrado" },
      { status: 404 },
    );

  const oldQty = product.stockItems[0]?.quantity || 0;

  const stockItem = await prisma.stockItem.upsert({
    where: { tenantId_productId: { tenantId: context.tenantId, productId } },
    create: {
      tenantId: context.tenantId,
      productId,
      quantity: Math.max(0, delta),
    },
    update: { quantity: { increment: delta } },
  });

  if (stockItem.quantity < 0) {
    const reset = await prisma.stockItem.update({
      where: { tenantId_productId: { tenantId: context.tenantId, productId } },
      data: { quantity: 0 },
    });

    await logChange({
      tenantId: context.tenantId,
      userId: context.userId,
      entityType: "Product",
      entityId: productId,
      action: "UPDATE",
      field: "stock",
      oldValue: oldQty,
      newValue: 0,
      reason: reason || "Ajuste forcado para zero (negativo nao permitido)",
    });

    return NextResponse.json({
      ...reset,
      warning: "Estoque zerado (nao pode ficar negativo)",
    });
  }

  await logChange({
    tenantId: context.tenantId,
    userId: context.userId,
    entityType: "Product",
    entityId: productId,
    action: "UPDATE",
    field: "stock",
    oldValue: oldQty,
    newValue: stockItem.quantity,
    reason: reason || "Ajuste manual de estoque",
  });

  return NextResponse.json(stockItem);
}

// GET /api/stock/[productId] - detalhe de um produto com estoque
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await params;

  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId: context.tenantId },
    include: {
      category: true,
      stockItems: { where: { tenantId: context.tenantId } },
    },
  });

  if (!product)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}
