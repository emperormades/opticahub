import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/session";
import { runUniversalSearch } from "@/lib/services/universalSearchService";
import { parseUniversalSearchQuery } from "@/lib/validation/searchPayload";

export async function GET(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = parseUniversalSearchQuery(searchParams);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await runUniversalSearch(context.tenantId, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[UNIVERSAL_SEARCH]", error);
    return NextResponse.json(
      { error: "Erro ao executar busca universal" },
      { status: 500 },
    );
  }
}
