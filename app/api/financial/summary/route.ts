import { NextRequest, NextResponse } from "next/server";
import {
  FINANCIAL_ROLES,
  hasAnyRole,
  requireTenantContext,
} from "@/lib/session";
import { getFinancialSummary } from "@/lib/services/financialSummaryService";
import { parseFinancialSummaryQuery } from "@/lib/validation/financialPayload";

// GET /api/financial/summary - Resumo financeiro do dia/periodo
export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext();
    if (!hasAnyRole(context, FINANCIAL_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = parseFinancialSummaryQuery(searchParams);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const summary = await getFinancialSummary(context.tenantId, parsed.data);

    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
