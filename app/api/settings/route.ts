import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ADMIN_ROLES, hasAnyRole, requireTenantContext } from "@/lib/session";

// GET /api/settings - retorna as configuracoes do tenant atual
export async function GET() {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: context.tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      isActive: true,
      config: true,
      createdAt: true,
    },
  });

  if (!tenant) {
    return NextResponse.json(
      { error: "Tenant nao encontrado" },
      { status: 404 },
    );
  }

  return NextResponse.json(tenant);
}

// PATCH /api/settings - atualiza configuracoes do tenant
export async function PATCH(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAnyRole(context, ADMIN_ROLES)) {
    return NextResponse.json({ error: "Permissao negada" }, { status: 403 });
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const config =
    body.config &&
    typeof body.config === "object" &&
    !Array.isArray(body.config)
      ? body.config
      : undefined;

  const updated = await prisma.tenant.update({
    where: { id: context.tenantId },
    data: {
      ...(name ? { name } : {}),
      ...(config ? { config } : {}),
    },
    select: { id: true, name: true, slug: true, plan: true, config: true },
  });

  return NextResponse.json(updated);
}
