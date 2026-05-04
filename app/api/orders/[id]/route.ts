import { NextRequest, NextResponse } from "next/server";
import { OSStatus } from "@prisma/client";
import { requireTenantContext } from "@/lib/session";
import { getOrderDetails, transitionOrder } from "@/lib/services/orderService";
import { AppError } from "@/lib/errors";

// GET /api/orders/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const order = await getOrderDetails(id, context.tenantId);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(order);
}

// POST /api/orders/[id]/transition
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { toStatus, notes, metadata } = body;

  if (!toStatus || !Object.values(OSStatus).includes(toStatus)) {
    return NextResponse.json({ error: "toStatus invalido" }, { status: 400 });
  }

  let result;

  try {
    result = await transitionOrder(
      id,
      { tenantId: context.tenantId, userId: context.userId },
      { toStatus, notes, ...(metadata !== undefined ? { metadata } : {}) },
    );
  } catch (error) {
    if (error instanceof AppError) {
      const appError = error as AppError & { details?: string[] };

      return NextResponse.json(
        {
          error: appError.message,
          ...(appError.details ? { details: appError.details } : {}),
        },
        { status: appError.statusCode },
      );
    }

    throw error;
  }

  if ("error" in result) {
    if (result.error === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: result.message || "Transicao invalida" },
      { status: 400 },
    );
  }

  return NextResponse.json(result.data);
}
