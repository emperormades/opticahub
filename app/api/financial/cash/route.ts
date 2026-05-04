import { NextRequest, NextResponse } from "next/server";
import {
  FINANCIAL_ROLES,
  hasAnyRole,
  requireTenantContext,
} from "@/lib/session";
import {
  closeCashRegister,
  getCashRegisterById,
  getCashDashboard,
  openCashRegister,
  withdrawCashFromRegister,
} from "@/lib/services/cashRegisterService";
import { parseCashMutationPayload } from "@/lib/validation/financialPayload";

// GET /api/financial/cash - Retorna caixa aberto e historico
export async function GET() {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAnyRole(context, FINANCIAL_ROLES)) {
    return NextResponse.json({ error: "Permissao negada" }, { status: 403 });
  }

  const result = await getCashDashboard(context.tenantId);

  return NextResponse.json(result);
}

// POST /api/financial/cash - Abre ou fecha o caixa
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

  const { action, openAmount, closeAmount, notes, cashId } = parsed.data;

  if (action === "open") {
    const result = await openCashRegister(
      { tenantId: context.tenantId, userId: context.userId },
      { openAmount, notes },
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: "Ja existe um caixa aberto hoje." },
        { status: 400 },
      );
    }

    const cash = await getCashRegisterById(context.tenantId, result.data.id);

    return NextResponse.json(cash || result.data, { status: 201 });
  }

  if (action === "close") {
    const targetCashId = cashId;
    if (!targetCashId) {
      return NextResponse.json({ error: "cashId invalido." }, { status: 400 });
    }

    const result = await closeCashRegister(
      { tenantId: context.tenantId, userId: context.userId },
      {
        cashId: targetCashId,
        closeAmount,
        notes,
      },
    );

    if ("error" in result) {
      if (result.error === "CASH_NOT_FOUND") {
        return NextResponse.json(
          { error: "Caixa nao encontrado." },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: "Caixa ja esta fechado." },
        { status: 400 },
      );
    }

    return NextResponse.json(result.data);
  }

  if (action === "withdrawal") {
    const result = await withdrawCashFromRegister(
      { tenantId: context.tenantId, userId: context.userId },
      {
        cashId,
        withdrawAmount: parsed.data.withdrawAmount ?? 0,
        notes: parsed.data.notes || "",
      },
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: "Nenhum caixa aberto para registrar a sangria." },
        { status: 404 },
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  }

  return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
}
