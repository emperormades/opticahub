import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/session";

// GET /api/products/[id]/label
// Retorna uma etiqueta em HTML/CSS pronta para impressao
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireTenantContext();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const count = Math.min(parseInt(searchParams.get("count") || "1", 10), 30);

    const product = await prisma.product.findFirst({
      where: { id, tenantId: context.tenantId },
      include: { category: { select: { name: true } } },
    });

    if (!product) return new NextResponse("Not found", { status: 404 });

    const price = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(product.salePrice));

    const barcodeStr = product.barcode || product.sku || id.slice(-8);
    const generateBars = (code: string): string => {
      const bars: string[] = [];
      for (let i = 0; i < Math.min(code.length * 4, 60); i++) {
        const charCode = code.charCodeAt(i % code.length);
        const isWide = (charCode + i) % 3 === 0;
        bars.push(
          `<div style="width:${isWide ? "3" : "1.5"}px;height:48px;background:#000;display:inline-block;margin:0 0.5px"></div>`,
        );
      }
      return bars.join("");
    };

    const labels = Array.from({ length: count })
      .map(
        () => `
        <div class="label">
            <div class="label-brand">RUPTA OS</div>
            <div class="label-category">${product.category.name}</div>
            <div class="label-name">${product.name.slice(0, 40)}${product.name.length > 40 ? "..." : ""}</div>
            ${product.brand ? `<div class="label-brand-name">${product.brand}</div>` : ""}
            <div class="barcode">
                <div class="bars">${generateBars(barcodeStr)}</div>
                <div class="barcode-text">${barcodeStr}</div>
            </div>
            <div class="price">${price}</div>
            <div class="sku">SKU: ${product.sku}</div>
        </div>
    `,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Etiquetas - ${product.name}</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .grid { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-start; }
    .label {
        width: 160px; height: 90px; background: white;
        border: 1px solid #ccc; border-radius: 4px;
        padding: 6px 8px; display: flex; flex-direction: column;
        justify-content: space-between; page-break-inside: avoid;
        break-inside: avoid;
    }
    .label-brand { font-size: 7px; color: #6366f1; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
    .label-category { font-size: 7px; color: #888; text-transform: uppercase; }
    .label-name { font-size: 9px; font-weight: 700; color: #111; line-height: 1.2; margin-top: 2px; }
    .label-brand-name { font-size: 7px; color: #555; }
    .barcode { text-align: center; margin: 2px 0; }
    .bars { display: flex; justify-content: center; align-items: flex-end; height: 24px; overflow: hidden; }
    .barcode-text { font-size: 6px; font-family: monospace; color: #333; letter-spacing: 1px; margin-top: 1px; }
    .price { font-size: 14px; font-weight: 900; color: #6366f1; text-align: right; }
    .sku { font-size: 6px; color: #aaa; font-family: monospace; text-align: right; }
    @media print {
        body { background: white; padding: 0; }
        .no-print { display: none !important; }
        .label { border: 0.5pt solid #999; }
    }
</style>
</head>
<body>
    <div class="no-print" style="margin-bottom:16px;display:flex;gap:12px;align-items:center">
        <span style="font-family:Arial;font-size:14px;font-weight:700">🏷️ ${count} etiqueta${count > 1 ? "s" : ""} - ${product.name}</span>
        <button onclick="window.print()" style="padding:8px 20px;background:#6366f1;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">🖨️ Imprimir</button>
    </div>
    <div class="grid">${labels}</div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }
}
