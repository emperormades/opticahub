import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/session";
import { listAbandonedDraftOrders } from "@/lib/services/abandonedDraftService";

export async function GET(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const minAgeHoursParam = searchParams.get("minAgeHours");
  const maxAgeHoursParam = searchParams.get("maxAgeHours");

  const minAgeHours =
    minAgeHoursParam !== null ? Number(minAgeHoursParam) : undefined;
  const maxAgeHours =
    maxAgeHoursParam !== null ? Number(maxAgeHoursParam) : undefined;

  if (
    minAgeHours !== undefined &&
    (!Number.isInteger(minAgeHours) || minAgeHours <= 0)
  ) {
    return NextResponse.json(
      { error: "minAgeHours invalido" },
      { status: 400 },
    );
  }

  if (
    maxAgeHours !== undefined &&
    (!Number.isInteger(maxAgeHours) || maxAgeHours <= 0)
  ) {
    return NextResponse.json(
      { error: "maxAgeHours invalido" },
      { status: 400 },
    );
  }

  try {
    const result = await listAbandonedDraftOrders(context.tenantId, {
      minAgeHours,
      maxAgeHours,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ABANDONED_DRAFTS]", error);
    return NextResponse.json(
      { error: "Erro ao listar orcamentos abandonados" },
      { status: 500 },
    );
  }
}
