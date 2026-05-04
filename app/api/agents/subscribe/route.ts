import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/session";

// POST /api/agents/subscribe - Assinar um agente
export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext();
    const body = await req.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID requerido" },
        { status: 400 },
      );
    }

    const existing = await prisma.tenantAgent.findUnique({
      where: { tenantId_agentId: { tenantId: context.tenantId, agentId } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Agente ja contratado" },
        { status: 400 },
      );
    }

    const agent = await prisma.aIAgent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return NextResponse.json(
        { error: "Agente nao encontrado no catalogo" },
        { status: 404 },
      );
    }

    const tenantAgent = await prisma.tenantAgent.create({
      data: {
        tenantId: context.tenantId,
        agentId,
        status: "CONFIGURING",
        customPrompt: agent.basePrompt,
        config: agent.configSchema || {},
      },
      include: { agent: true },
    });

    return NextResponse.json(tenantAgent, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
