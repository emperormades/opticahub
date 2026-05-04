import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/session";

// GET /api/agents - Lista agentes disponiveis no catalogo e os contratados pelo tenant
export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext();

    const [catalog, myAgents] = await Promise.all([
      prisma.aIAgent.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.tenantAgent.findMany({
        where: { tenantId: context.tenantId },
        include: { agent: true },
      }),
    ]);

    return NextResponse.json({ catalog, myAgents });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
