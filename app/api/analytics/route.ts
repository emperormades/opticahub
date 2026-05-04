import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsOverview } from "@/lib/services/analyticsOverviewService";
import { requireTenantContext } from "@/lib/session";
import { parseAnalyticsRangeQuery } from "@/lib/validation/analyticsPayload";

export async function GET(req: NextRequest) {
  let tenantId: string;

  try {
    const context = await requireTenantContext();
    tenantId = context.tenantId;
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }

  const url = new URL(req.url);
  const parsed = parseAnalyticsRangeQuery(url.searchParams);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const analytics = await getAnalyticsOverview(tenantId, parsed.data);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("[ANALYTICS_OVERVIEW_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to generate analytics" },
      { status: 500 },
    );
  }
}
