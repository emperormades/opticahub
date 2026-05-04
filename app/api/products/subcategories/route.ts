import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");

    const subcategories = await prisma.productSubcategory.findMany({
      where: {
        tenantId: context.tenantId,
        ...(categoryId ? { categoryId } : {}),
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ subcategories });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext();
    const { categoryId, name } = await req.json();

    if (!categoryId || !name) {
      return NextResponse.json(
        { error: "Categoria e Nome sao obrigatorios" },
        { status: 400 },
      );
    }

    const category = await prisma.productCategory.findFirst({
      where: { id: categoryId, tenantId: context.tenantId, isActive: true },
      select: { id: true },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoria invalida" },
        { status: 400 },
      );
    }

    const subcategory = await prisma.productSubcategory.create({
      data: {
        tenantId: context.tenantId,
        categoryId: category.id,
        name,
      },
    });

    return NextResponse.json({ subcategory });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
