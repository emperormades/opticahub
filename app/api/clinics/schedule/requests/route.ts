import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/session";

function getString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function formatPreferredPeriod(value: string | null) {
  if (value === "MORNING") return "manha";
  if (value === "AFTERNOON") return "tarde";
  if (value === "EVENING") return "noite";
  return null;
}

export async function GET() {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await prisma.agentTask.findMany({
    where: {
      tenantId: context.tenantId,
      type: "AGENDAMENTO_WEB",
      status: "PENDING",
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  const requests = tasks.map((task) => {
    const payload = (task.payload ?? {}) as Record<string, unknown>;
    const requestedDate = getString(payload.requestedDate);
    const preferredPeriod = formatPreferredPeriod(
      getString(payload.preferredPeriod),
    );

    return {
      id: task.id,
      createdAt: task.createdAt,
      requestedDate,
      preferredPeriod,
      notes: getString(payload.notes),
      leadName: getString(payload.leadName) || "Paciente sem nome",
      leadPhone: getString(payload.leadPhone),
      source: getString(payload.source),
      priority: task.priority,
    };
  });

  return NextResponse.json({
    requests,
    summary: {
      total: requests.length,
      today: requests.filter((item) => {
        if (!item.requestedDate) return false;
        const date = new Date(item.requestedDate);
        const today = new Date();
        return (
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate()
        );
      }).length,
      highPriority: requests.filter((item) => item.priority === "HIGH").length,
    },
  });
}

export async function PATCH(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  const action = typeof body.action === "string" ? body.action : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  if (!taskId || !["CONFIRM", "DISMISS"].includes(action)) {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
  }

  const task = await prisma.agentTask.findFirst({
    where: {
      id: taskId,
      tenantId: context.tenantId,
      type: "AGENDAMENTO_WEB",
      status: "PENDING",
    },
  });

  if (!task) {
    return NextResponse.json(
      { error: "Solicitacao nao encontrada" },
      { status: 404 },
    );
  }

  const nextStatus = action === "CONFIRM" ? "COMPLETED" : "CANCELLED";

  await prisma.agentTask.update({
    where: { id: task.id },
    data: {
      status: nextStatus,
      completedAt: new Date(),
      result: {
        handledByClinic: true,
        action,
        notes: notes || null,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
