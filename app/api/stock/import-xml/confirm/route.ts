import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/session";
import { AppError } from "@/lib/errors";
import { StockImportService } from "@/lib/services/stockImportService";

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext();
    const body = await req.json();
    const { parsedData, itemsToImport } = body;

    if (!parsedData || !itemsToImport) {
      return NextResponse.json(
        { error: "Missing import data" },
        { status: 400 },
      );
    }

    const results = await StockImportService.confirmImport(
      context.tenantId,
      context.userId,
      { parsedData, itemsToImport },
    );

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error("[IMPORT_XML_CONFIRM] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao confirmar importacao",
      },
      { status: 500 },
    );
  }
}
