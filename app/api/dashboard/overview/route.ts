import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/session";
import { getDashboardOverview } from "@/lib/services/dashboardOverviewService";

export async function GET() {
  try {
    const context = await requireTenantContext();
    const overview = await getDashboardOverview(
      context.tenantId,
      context.tenantName,
    );

    return NextResponse.json(overview);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Erro ao buscar dashboard overview:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
