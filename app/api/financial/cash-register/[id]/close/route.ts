import { NextRequest, NextResponse } from "next/server";
import {
  FINANCIAL_ROLES,
  hasAnyRole,
  requireTenantContext,
} from "@/lib/session";
import { closeCashRegister } from "@/lib/services/cashRegisterService";

// PATCH: Fecha o caixa contabilizando todas as transacoes atreladas a ele
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

  if (!hasAnyRole(context, FINANCIAL_ROLES)) {
    return NextResponse.json({ error: "Permissao negada" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const closeAmount =
    body.closeAmount === undefined
      ? undefined
      : typeof body.closeAmount === "number"
        ? body.closeAmount
        : typeof body.closeAmount === "string" && body.closeAmount.trim() !== ""
          ? Number(body.closeAmount)
          : NaN;

  if (closeAmount !== undefined && !Number.isFinite(closeAmount)) {
    return NextResponse.json(
      { error: "closeAmount invalido" },
      { status: 400 },
    );
  }
  const result = await closeCashRegister(
    { tenantId: context.tenantId, userId: context.userId },
    {
      cashId: id,
      closeAmount,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    },
  );

  if ("error" in result) {
    if (result.error === "CASH_NOT_FOUND") {
      return NextResponse.json(
        { error: "Caixa nao encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "Caixa ja esta fechado" },
      { status: 400 },
    );
  }

  return NextResponse.json(result.data);
}
