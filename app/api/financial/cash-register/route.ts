import { NextRequest, NextResponse } from "next/server";
import {
  FINANCIAL_ROLES,
  hasAnyRole,
  requireTenantContext,
} from "@/lib/session";
import {
  getActiveCashRegisterDetails,
  listRecentCashRegisters,
  openCashRegister,
} from "@/lib/services/cashRegisterService";
import { parseCashMutationPayload } from "@/lib/validation/financialPayload";

// GET: Recupera o caixa aberto atual do usuario ou lista de caixas
export async function GET(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAnyRole(context, FINANCIAL_ROLES)) {
    return NextResponse.json({ error: "Permissao negada" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("activeOnly") === "true";

  if (activeOnly) {
    const activeCash = await getActiveCashRegisterDetails(context.tenantId);

    return NextResponse.json(activeCash || null);
  }

  const registers = await listRecentCashRegisters(context.tenantId);

  return NextResponse.json(registers);
}

// POST: Abre um novo caixa
export async function POST(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAnyRole(context, FINANCIAL_ROLES)) {
    return NextResponse.json({ error: "Permissao negada" }, { status: 403 });
  }

  const parsed = parseCashMutationPayload(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (parsed.data.action !== "open") {
    return NextResponse.json({ error: "Acao invalida" }, { status: 400 });
  }

  const result = await openCashRegister(
    { tenantId: context.tenantId, userId: context.userId },
    {
      openAmount: parsed.data.openAmount,
      notes: parsed.data.notes,
    },
  );

  if ("error" in result) {
    return NextResponse.json(
      { error: "Ja existe um caixa aberto na loja." },
      { status: 400 },
    );
  }

  return NextResponse.json(result.data, { status: 201 });
}
