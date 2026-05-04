import { NextRequest, NextResponse } from "next/server";
import {
  FINANCIAL_ROLES,
  hasAnyRole,
  requireTenantContext,
} from "@/lib/session";
import {
  getInstallmentById,
  payInstallment,
} from "@/lib/services/installmentService";
import { parsePayInstallmentPayload } from "@/lib/validation/financialPayload";

// PATCH /api/financial/carne/[installmentId]
// Body: { paid: true }  - marca como paga, calcula juros/multa se vencida
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ installmentId: string }> },
) {
  try {
    const context = await requireTenantContext();
    if (!hasAnyRole(context, FINANCIAL_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { installmentId } = await params;
    const parsed = parsePayInstallmentPayload(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const result = await payInstallment(context.tenantId, installmentId);

    if ("error" in result) {
      if (result.error === "INSTALLMENT_NOT_FOUND") {
        return NextResponse.json(
          { error: "Parcela nao encontrada" },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: "Parcela ja esta paga" },
        { status: 400 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[CARNE_INSTALLMENT_PATCH] Error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar parcela" },
      { status: 500 },
    );
  }
}

// GET /api/financial/carne/[installmentId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ installmentId: string }> },
) {
  try {
    const context = await requireTenantContext();
    if (!hasAnyRole(context, FINANCIAL_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { installmentId } = await params;

    const installment = await getInstallmentById(
      context.tenantId,
      installmentId,
    );
    if (!installment)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(installment);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[CARNE_INSTALLMENT_GET] Error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar parcela" },
      { status: 500 },
    );
  }
}
