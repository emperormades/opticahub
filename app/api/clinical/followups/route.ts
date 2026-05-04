import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/session";

const PROTOCOL_INTERVALS: Record<string, number> = {
  CONTROLE_MIOPIA: 180,
  ORTOCERATOLOGIA: 90,
  TERAPIA_VISUAL: 60,
  MULTIFOCAL_ADAPTACAO: 30,
  OUTROS: 365,
};

/**
 * GET /api/clinical/followups
 * Retorna proximos agendamentos de retorno clinico.
 */
export async function GET(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "PENDING";
  const daysAhead = parseInt(searchParams.get("daysAhead") || "30", 10);

  const from = new Date();
  const to = new Date(from.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const followUps = await prisma.clinicalFollowUp.findMany({
    where: {
      tenantId: context.tenantId,
      status,
      scheduledDate: { lte: to },
    },
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      order: {
        select: {
          id: true,
          orderNumber: true,
          isSpecialTreatment: true,
          treatmentProtocol: true,
        },
      },
    },
    orderBy: { scheduledDate: "asc" },
  });

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const overdue = followUps.filter((followUp) => followUp.scheduledDate < now);
  const thisWeek = followUps.filter(
    (followUp) =>
      followUp.scheduledDate >= now && followUp.scheduledDate <= weekAhead,
  );
  const upcoming = followUps.filter(
    (followUp) => followUp.scheduledDate > weekAhead,
  );

  return NextResponse.json({
    overdue,
    thisWeek,
    upcoming,
    total: followUps.length,
  });
}

/**
 * POST /api/clinical/followups
 * Cria ou recria um agendamento de retorno.
 */
export async function POST(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { orderId, protocol, scheduledDate, notes } = body;

  if (!orderId || !protocol) {
    return NextResponse.json(
      { error: "orderId e protocol sao obrigatorios" },
      { status: 400 },
    );
  }

  const order = await prisma.serviceOrder.findFirst({
    where: { id: orderId, tenantId: context.tenantId },
    select: { id: true, customerId: true, isSpecialTreatment: true },
  });

  if (!order)
    return NextResponse.json({ error: "OS nao encontrada" }, { status: 404 });

  const intervalDays = PROTOCOL_INTERVALS[protocol] || 180;
  const date = scheduledDate
    ? new Date(scheduledDate)
    : new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

  await prisma.serviceOrder.update({
    where: { id: order.id },
    data: { isSpecialTreatment: true, treatmentProtocol: protocol },
  });

  const followUp = await prisma.clinicalFollowUp.create({
    data: {
      tenantId: context.tenantId,
      orderId: order.id,
      customerId: order.customerId,
      protocol,
      scheduledDate: date,
      intervalDays,
      notes,
    },
  });

  return NextResponse.json(followUp, { status: 201 });
}

/**
 * PATCH /api/clinical/followups
 * Conclui ou remarca um agendamento existente.
 */
export async function PATCH(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { followUpId, action, notes, nextDate } = await req.json();

  if (!followUpId || !action) {
    return NextResponse.json(
      { error: "followUpId e action sao obrigatorios" },
      { status: 400 },
    );
  }

  const followUp = await prisma.clinicalFollowUp.findFirst({
    where: { id: followUpId, tenantId: context.tenantId },
  });

  if (!followUp) {
    return NextResponse.json(
      { error: "Agendamento nao encontrado" },
      { status: 404 },
    );
  }

  if (action === "COMPLETE") {
    await prisma.clinicalFollowUp.update({
      where: { id: followUpId },
      data: { status: "COMPLETED", completedAt: new Date(), notes },
    });

    const next = new Date(
      Date.now() + followUp.intervalDays * 24 * 60 * 60 * 1000,
    );
    await prisma.clinicalFollowUp.create({
      data: {
        tenantId: context.tenantId,
        orderId: followUp.orderId,
        customerId: followUp.customerId,
        protocol: followUp.protocol,
        scheduledDate: nextDate ? new Date(nextDate) : next,
        intervalDays: followUp.intervalDays,
      },
    });
  } else if (action === "RESCHEDULE") {
    if (!nextDate) {
      return NextResponse.json(
        { error: "nextDate e obrigatorio" },
        { status: 400 },
      );
    }

    await prisma.clinicalFollowUp.update({
      where: { id: followUpId },
      data: { status: "RESCHEDULED", scheduledDate: new Date(nextDate), notes },
    });
  } else if (action === "MISSED") {
    await prisma.clinicalFollowUp.update({
      where: { id: followUpId },
      data: { status: "MISSED", notes },
    });
  } else {
    return NextResponse.json({ error: "Acao invalida" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
