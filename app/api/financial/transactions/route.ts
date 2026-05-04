import { NextRequest, NextResponse } from "next/server";
import {
  FINANCIAL_ROLES,
  hasAnyRole,
  requireTenantContext,
} from "@/lib/session";
import {
  createFinancialTransaction,
  listFinancialTransactions,
} from "@/lib/services/transactionService";
import {
  parseCreateTransactionPayload,
  parseListTransactionsQuery,
} from "@/lib/validation/financialPayload";

// GET /api/financial/transactions - Lista transacoes com filtros
export async function GET(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAnyRole(context, FINANCIAL_ROLES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = parseListTransactionsQuery(searchParams);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await listFinancialTransactions(context.tenantId, parsed.data);
  return NextResponse.json(result);
}

// POST /api/financial/transactions - Registra nova transacao
export async function POST(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAnyRole(context, FINANCIAL_ROLES)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = parseCreateTransactionPayload(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const body = parsed.data;
  const result = await createFinancialTransaction(
    { tenantId: context.tenantId, userId: context.userId },
    body,
  );
  if ("error" in result) {
    return NextResponse.json({ error: "OS nao encontrada" }, { status: 404 });
  }

  return NextResponse.json(result.data, { status: 201 });
}
