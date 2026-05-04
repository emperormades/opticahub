import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ADMIN_ROLES, hasAnyRole, requireTenantContext } from "@/lib/session";

// POST /api/orders/[id]/request-discount
// Body: { discountAmount, discountPct, reason }
// Cria um AgentTask de DISCOUNT_APPROVAL para o gerente aprovar
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
  const discountAmount =
    typeof body.discountAmount === "number"
      ? body.discountAmount
      : Number(body.discountAmount);
  const discountPct =
    typeof body.discountPct === "number"
      ? body.discountPct
      : Number(body.discountPct);
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (
    Number.isNaN(discountAmount) ||
    discountAmount < 0 ||
    Number.isNaN(discountPct) ||
    discountPct < 0
  ) {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
  }

  const order = await prisma.serviceOrder.findFirst({
    where: { id, tenantId: context.tenantId },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      subtotal: true,
      discount: true,
      status: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "OS nao encontrada" }, { status: 404 });
  }

  const existingRequest = await prisma.agentTask.findFirst({
    where: {
      tenantId: context.tenantId,
      status: "PENDING",
      payload: { path: ["orderId"], equals: id },
    },
  });

  if (existingRequest) {
    return NextResponse.json(
      {
        error: "Ja existe uma solicitacao de desconto pendente para esta OS",
        taskId: existingRequest.id,
      },
      { status: 409 },
    );
  }

  const requester = await prisma.user.findFirst({
    where: { id: context.userId, tenantId: context.tenantId },
    select: { name: true, email: true },
  });

  const task = await prisma.agentTask.create({
    data: {
      tenantId: context.tenantId,
      type: "DISCOUNT_APPROVAL",
      status: "PENDING",
      priority: "HIGH",
      payload: {
        orderId: id,
        orderNumber: order.orderNumber,
        currentTotal: Number(order.total),
        subtotal: Number(order.subtotal),
        discountRequested: discountAmount,
        discountPct,
        reason,
        requestedById: context.userId,
        requestedByName: requester?.name,
        requestedAt: new Date().toISOString(),
      },
    },
  });

  return NextResponse.json(
    {
      success: true,
      taskId: task.id,
      message: "Solicitacao de aprovacao de desconto enviada ao gerente.",
    },
    { status: 201 },
  );
}

// PATCH /api/orders/[id]/request-discount - Gerente aprova ou rejeita
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAnyRole(context, ADMIN_ROLES)) {
    return NextResponse.json(
      {
        error:
          "Permissao negada. Apenas ADMIN ou GERENTE podem aprovar descontos.",
      },
      { status: 403 },
    );
  }

  const { id } = await params;
  const body = await req.json();
  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  const approved = Boolean(body.approved);
  const rejectionReason =
    typeof body.rejectionReason === "string" ? body.rejectionReason.trim() : "";

  if (!taskId) {
    return NextResponse.json({ error: "taskId obrigatorio" }, { status: 400 });
  }

  const task = await prisma.agentTask.findFirst({
    where: { id: taskId, tenantId: context.tenantId, status: "PENDING" },
  });

  if (!task) {
    return NextResponse.json(
      { error: "Solicitacao nao encontrada ou ja processada" },
      { status: 404 },
    );
  }

  const payload =
    task.payload &&
    typeof task.payload === "object" &&
    !Array.isArray(task.payload)
      ? (task.payload as Prisma.JsonObject)
      : null;

  if (!payload) {
    return NextResponse.json(
      { error: "Payload da solicitacao invalido" },
      { status: 400 },
    );
  }

  const payloadOrderId =
    typeof payload.orderId === "string" ? payload.orderId : "";
  const payloadDiscountRequested = Number(payload.discountRequested || 0);
  const payloadSubtotal = Number(payload.subtotal || 0);

  if (payloadOrderId !== id) {
    return NextResponse.json(
      { error: "Solicitacao invalida para esta OS" },
      { status: 400 },
    );
  }

  if (approved) {
    const order = await prisma.serviceOrder.findFirst({
      where: { id, tenantId: context.tenantId },
      select: { id: true },
    });

    if (!order) {
      return NextResponse.json({ error: "OS nao encontrada" }, { status: 404 });
    }

    const newDiscount = payloadDiscountRequested;
    const newTotal = payloadSubtotal - newDiscount;

    await prisma.serviceOrder.update({
      where: { id: order.id },
      data: {
        discount: newDiscount,
        total: Math.max(0, newTotal),
      },
    });

    await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        result: { approved: true, appliedAt: new Date().toISOString() },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Desconto aprovado e aplicado a OS.",
    });
  }

  await prisma.agentTask.update({
    where: { id: taskId },
    data: {
      status: "FAILED",
      result: {
        approved: false,
        reason: rejectionReason,
        rejectedAt: new Date().toISOString(),
      },
    },
  });

  return NextResponse.json({
    success: true,
    message: "Solicitacao de desconto rejeitada.",
  });
}
