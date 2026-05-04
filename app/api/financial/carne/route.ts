import { NextRequest, NextResponse } from "next/server";
import {
  FINANCIAL_ROLES,
  hasAnyRole,
  requireTenantContext,
} from "@/lib/session";
import {
  createInstallments,
  listInstallments,
} from "@/lib/services/installmentService";
import {
  parseCarneListQuery,
  parseCreateCarnePayload,
} from "@/lib/validation/financialPayload";

// POST /api/financial/carne
// Body: { transactionId, installmentsCount, firstDueDate, penaltyPct?, interestPctMonth? }
export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext();
    if (!hasAnyRole(context, FINANCIAL_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = parseCreateCarnePayload(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const result = await createInstallments(context.tenantId, parsed.data);

    if ("error" in result) {
      if (result.error === "TRANSACTION_NOT_FOUND") {
        return NextResponse.json(
          { error: "Transacao nao encontrada" },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: "Carne ja gerado para esta transacao" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { success: true, installments: result.data },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[CARNE_POST] Error:", error);
    return NextResponse.json({ error: "Erro ao gerar carne" }, { status: 500 });
  }
}

// GET /api/financial/carne?transactionId=xxx
export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext();
    if (!hasAnyRole(context, FINANCIAL_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = parseCarneListQuery(searchParams);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const installments = await listInstallments(context.tenantId, parsed.data);

    return NextResponse.json(installments);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[CARNE_GET] Error:", error);
    return NextResponse.json(
      { error: "Erro ao listar carnes" },
      { status: 500 },
    );
  }
}
