import { NextRequest, NextResponse } from "next/server";
import { OSStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/session";
import { createOrder } from "@/lib/services/orderService";
import { parseCreateOrderPayload } from "@/lib/validation/orderPayload";

// GET /api/orders - Lista OS do tenant com filtros
export async function GET(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const status =
    statusParam && Object.values(OSStatus).includes(statusParam as OSStatus)
      ? (statusParam as OSStatus)
      : null;
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const skip = (page - 1) * limit;

  const where = {
    tenantId: context.tenantId,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: "insensitive" as const } },
            {
              customer: {
                name: { contains: search, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.serviceOrder.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, phone: true, whatsapp: true },
        },
        seller: { select: { id: true, name: true } },
        items: {
          select: { id: true, description: true, total: true, itemType: true },
        },
        _count: { select: { events: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.serviceOrder.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, limit });
}

// POST /api/orders - Cria nova OS com baixa de estoque e split de pagamento
export async function POST(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = parseCreateOrderPayload(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await createOrder(
      { tenantId: context.tenantId, userId: context.userId },
      parsed.data,
    );

    if ("error" in result) {
      if (result.error === "CUSTOMER_NOT_FOUND") {
        return NextResponse.json(
          { error: "Cliente nao encontrado" },
          { status: 404 },
        );
      }

      if (result.error === "INVALID_PRESCRIPTION") {
        return NextResponse.json(
          { error: "Receita invalida para este cliente" },
          { status: 400 },
        );
      }

      if (result.error === "EMPTY_ITEMS") {
        return NextResponse.json(
          { error: "A OS precisa ter ao menos um item" },
          { status: 400 },
        );
      }

      if (result.error === "INVALID_PAYMENT_SPLIT") {
        return NextResponse.json(
          { error: "O split de pagamento nao fecha com o total da venda" },
          { status: 400 },
        );
      }

      if (result.error === "INVALID_TOTAL") {
        return NextResponse.json(
          { error: "O total da OS ficou invalido apos descontos" },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: "Produto invalido na OS" },
        { status: 400 },
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("[CreateOrderPDV] Erro transacional:", error);
    return NextResponse.json(
      {
        error:
          "Erro ao processar a venda. Rollback de estoque e caixa acionado.",
      },
      { status: 500 },
    );
  }
}
