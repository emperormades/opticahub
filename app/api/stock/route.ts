import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/session";

// GET /api/stock - lista todos os produtos com estoque atual
export async function GET(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const subcategoryId = searchParams.get("subcategoryId") || "";
  const brand = searchParams.get("brand") || "";
  const supplierName = searchParams.get("supplierName") || "";
  const frameColor = searchParams.get("frameColor") || "";
  const frameSize = searchParams.get("frameSize") || "";
  const frameModel = searchParams.get("frameModel") || "";
  const archived = searchParams.get("archived") === "true";
  const alert = searchParams.get("alert");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const products = await prisma.product.findMany({
    where: {
      tenantId: context.tenantId,
      isActive: true,
      isArchived: archived,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { brand: { contains: search, mode: "insensitive" } },
              { barcode: { contains: search, mode: "insensitive" } },
              { supplierCode: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(subcategoryId ? { subcategoryId } : {}),
      ...(brand ? { brand: { contains: brand, mode: "insensitive" } } : {}),
      ...(supplierName
        ? { supplierName: { contains: supplierName, mode: "insensitive" } }
        : {}),
      ...(frameColor
        ? { frameColor: { contains: frameColor, mode: "insensitive" } }
        : {}),
      ...(frameSize
        ? { frameSize: { contains: frameSize, mode: "insensitive" } }
        : {}),
      ...(frameModel
        ? { frameModel: { contains: frameModel, mode: "insensitive" } }
        : {}),
      ...(startDate && endDate
        ? {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }
        : {}),
    },
    include: {
      category: { select: { name: true, type: true } },
      subcategory: { select: { name: true } },
      stockItems: { where: { tenantId: context.tenantId }, take: 1 },
    },
    orderBy: { name: "asc" },
    take: 300,
  });

  const mapped = products.map((product) => {
    const stock = product.stockItems[0];
    const quantity = stock?.quantity ?? 0;
    const minStock = stock?.minStock ?? 0;

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      brand: product.brand,
      isArchived: product.isArchived,
      barcode: product.barcode,
      supplierCode: product.supplierCode,
      category: product.category,
      subcategory: product.subcategory,
      salePrice: product.salePrice,
      costPrice: product.costPrice,
      lensIndex: product.lensIndex,
      lensTreatment: product.lensTreatment,
      lensDesign: product.lensDesign,
      quantity,
      minStock,
      stockStatus: quantity === 0 ? "OUT" : quantity <= minStock ? "LOW" : "OK",
    };
  });

  const result =
    alert === "low"
      ? mapped.filter((product) => product.stockStatus !== "OK")
      : mapped;

  return NextResponse.json(result);
}
