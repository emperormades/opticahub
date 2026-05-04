import { NextRequest, NextResponse } from "next/server";
import {
  FINANCIAL_ROLES,
  hasAnyRole,
  requireTenantContext,
} from "@/lib/session";
import { FinancialOfxImportService } from "@/lib/services/financialOfxImportService";

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext();
    if (!hasAnyRole(context, FINANCIAL_ROLES)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await FinancialOfxImportService.importFile(
      context.tenantId,
      await file.text(),
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      error instanceof Error &&
      error.message === "Arquivo ja importado anteriormente."
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("OFX Import Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar arquivo OFX/XML",
      },
      { status: 500 },
    );
  }
}
