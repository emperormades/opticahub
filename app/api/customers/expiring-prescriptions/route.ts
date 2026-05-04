import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/session";
import { listExpiringPrescriptions } from "@/lib/services/expiringPrescriptionService";

export async function GET(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const daysAheadParam = searchParams.get("daysAhead");
  const daysAhead = daysAheadParam ? Number(daysAheadParam) : undefined;

  if (status !== null && status !== "expiring" && status !== "overdue") {
    return NextResponse.json({ error: "status invalido" }, { status: 400 });
  }

  if (
    daysAhead !== undefined &&
    (!Number.isInteger(daysAhead) || daysAhead <= 0)
  ) {
    return NextResponse.json({ error: "daysAhead invalido" }, { status: 400 });
  }

  try {
    const result = await listExpiringPrescriptions(context.tenantId, {
      status: status === null ? undefined : status,
      daysAhead,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[EXPIRING_PRESCRIPTIONS]", error);
    return NextResponse.json(
      { error: "Erro ao listar receitas a expirar" },
      { status: 500 },
    );
  }
}
