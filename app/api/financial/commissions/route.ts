import { NextRequest, NextResponse } from "next/server";
import {
  FINANCIAL_ROLES,
  hasAnyRole,
  requireTenantContext,
} from "@/lib/session";
import { listFinancialCommissions } from "@/lib/services/financialCommissionService";
import { parseFinancialDateRangeQuery } from "@/lib/validation/financialPayload";

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext();
    if (!hasAnyRole(context, FINANCIAL_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = parseFinancialDateRangeQuery(searchParams);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const result = await listFinancialCommissions(
      context.tenantId,
      parsed.data,
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[COMMISSIONS_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao buscar comissoes" },
      { status: 500 },
    );
  }
}
