import { NextRequest, NextResponse } from "next/server";
import { ProductType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext();

    const categories = await prisma.productCategory.findMany({
      where: { tenantId: context.tenantId, isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext();
    const { name, type } = await req.json();

    if (!name || !type) {
      return NextResponse.json(
        { error: "Nome e Tipo sao obrigatorios" },
        { status: 400 },
      );
    }

    if (!Object.values(ProductType).includes(type)) {
      return NextResponse.json(
        { error: "Tipo de categoria invalido" },
        { status: 400 },
      );
    }

    const category = await prisma.productCategory.create({
      data: {
        tenantId: context.tenantId,
        name,
        type,
      },
    });

    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
