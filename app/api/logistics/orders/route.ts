import { NextRequest, NextResponse } from "next/server";
import { OSStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/session";

/**
 * GET /api/logistics/orders
 * Retorna as OSs em pré-lab, produção e controle de qualidade p/ o Dashboard Logístico.
 * Painel Kanban: VALIDATING → LAB_SENT → IN_PRODUCTION → QUALITY_CHECK → DELIVERY_READY
 */
export async function GET(req: NextRequest) {
  let tenantId: string;
  try {
    const context = await requireTenantContext();
    tenantId = context.tenantId;
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }

  const { searchParams } = new URL(req.url);
  const labFilter = searchParams.get("lab") || undefined;

  const where: Prisma.ServiceOrderWhereInput = {
    tenantId,
    status: {
      in: [
        "VALIDATING",
        "LAB_SENT",
        "IN_PRODUCTION",
        "QUALITY_CHECK",
        "DELIVERY_READY",
      ],
    },
    isArchived: false,
  };
  if (labFilter) where.labName = labFilter;

  const orders = await prisma.serviceOrder.findMany({
    where,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      labName: true,
      labOrderCode: true,
      labSentAt: true,
      labDeadline: true,
      labDeliveredAt: true,
      reworkCount: true,
      reworkCause: true,
      isSpecialTreatment: true,
      treatmentProtocol: true,
      createdAt: true,
      customer: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { labDeadline: "asc" },
  });

  // Calcular SLA para cada OS que está no lab
  const now = new Date();
  const enriched = orders.map((o) => {
    const slaStatus = (() => {
      if (!o.labDeadline) return "NO_DEADLINE";
      const diff = o.labDeadline.getTime() - now.getTime();
      const hoursLeft = diff / (1000 * 60 * 60);
      if (hoursLeft < 0) return "OVERDUE";
      if (hoursLeft <= 24) return "CRITICAL";
      if (hoursLeft <= 72) return "WARNING";
      return "ON_TRACK";
    })();

    const leadTimeDays = o.labSentAt
      ? ((o.labDeliveredAt || now).getTime() - o.labSentAt.getTime()) /
        (1000 * 60 * 60 * 24)
      : null;

    return {
      ...o,
      slaStatus,
      leadTimeDays: leadTimeDays ? parseFloat(leadTimeDays.toFixed(1)) : null,
    };
  });

  // Agrupar por coluna de status para o Kanban
  const kanban: Record<string, typeof enriched> = {};
  for (const o of enriched) {
    if (!kanban[o.status]) kanban[o.status] = [];
    kanban[o.status].push(o);
  }

  // SLA Analytics
  const overdue = enriched.filter((o) => o.slaStatus === "OVERDUE").length;
  const critical = enriched.filter((o) => o.slaStatus === "CRITICAL").length;
  const avgLeadTime = (() => {
    const delivered = enriched.filter((o) => o.leadTimeDays !== null);
    if (!delivered.length) return null;
    return parseFloat(
      (
        delivered.reduce((s, o) => s + (o.leadTimeDays as number), 0) /
        delivered.length
      ).toFixed(1),
    );
  })();

  return NextResponse.json({
    kanban,
    summary: {
      total: orders.length,
      overdue,
      critical,
      avgLeadTimeDays: avgLeadTime,
    },
  });
}

/**
 * PATCH /api/logistics/orders/:id
 * Atualiza status logístico e dados de laboratório da OS.
 */
export async function PATCH(req: NextRequest) {
  let tenantId: string;
  try {
    const context = await requireTenantContext();
    tenantId = context.tenantId;
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }

  const { orderId, labName, labOrderCode, labDeadline, newStatus } =
    await req.json();
  if (!orderId)
    return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const updateData: Prisma.ServiceOrderUpdateInput = {};
  if (labName !== undefined) updateData.labName = labName;
  if (labOrderCode !== undefined) updateData.labOrderCode = labOrderCode;
  if (labDeadline !== undefined) updateData.labDeadline = new Date(labDeadline);
  if (newStatus === "LAB_SENT") updateData.labSentAt = new Date();
  if (newStatus === "DELIVERY_READY") updateData.labDeliveredAt = new Date();

  if (newStatus !== undefined) {
    if (!Object.values(OSStatus).includes(newStatus)) {
      return NextResponse.json(
        { error: "newStatus invalido" },
        { status: 400 },
      );
    }
    updateData.status = newStatus;
  }

  const updated = await prisma.serviceOrder.update({
    where: { id: orderId, tenantId },
    data: updateData,
    select: { id: true, status: true, labName: true, labDeadline: true },
  });

  return NextResponse.json(updated);
}
