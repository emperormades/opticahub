import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/session";
import { AppError } from "@/lib/errors";
import { StockImportService } from "@/lib/services/stockImportService";

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext();
    const { xml } = await req.json();

    if (!xml) {
      return NextResponse.json(
        { error: "XML content is required" },
        { status: 400 },
      );
    }

    const preview = await StockImportService.buildPreview(
      context.tenantId,
      xml,
    );
    return NextResponse.json(preview);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    console.error("[IMPORT_XML] Error parsing XML:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro ao processar XML",
      },
      { status: 500 },
    );
  }
}
