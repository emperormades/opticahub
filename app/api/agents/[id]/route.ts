import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/session";

// GET /api/agents/[id] - Retorna detalhes do agente contratado (TenantAgent ID)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireTenantContext();
    const { id } = await params;

    const tenantAgent = await prisma.tenantAgent.findFirst({
      where: { id, tenantId: context.tenantId },
      include: {
        agent: true,
        logs: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        tasks: {
          orderBy: { scheduledAt: "desc" },
          take: 10,
        },
      },
    });

    if (!tenantAgent) {
      return NextResponse.json(
        { error: "Agente nao encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(tenantAgent);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// PATCH /api/agents/[id] - Atualiza config/prompt/status do agente
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireTenantContext();
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.tenantAgent.findFirst({
      where: { id, tenantId: context.tenantId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Agente nao encontrado" },
        { status: 404 },
      );
    }

    const updated = await prisma.tenantAgent.update({
      where: { id },
      data: {
        status: body.status !== undefined ? body.status : existing.status,
        customPrompt:
          body.customPrompt !== undefined
            ? body.customPrompt
            : existing.customPrompt,
        config: body.config !== undefined ? body.config : existing.config,
      },
      include: { agent: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// DELETE /api/agents/[id] - Cancela assinatura do agente
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireTenantContext();
    const { id } = await params;

    const existing = await prisma.tenantAgent.findFirst({
      where: { id, tenantId: context.tenantId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Agente nao encontrado" },
        { status: 404 },
      );
    }

    await prisma.agentLog.deleteMany({ where: { tenantAgentId: id } });
    await prisma.agentTask.deleteMany({ where: { tenantAgentId: id } });
    await prisma.tenantAgent.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
