import { NextRequest, NextResponse } from "next/server";
import { getDreAnalytics } from "@/lib/services/dreAnalyticsService";
import { requireTenantContext } from "@/lib/session";
import { parseMonthlyAnalyticsQuery } from "@/lib/validation/analyticsPayload";

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

  const { searchParams } = new URL(req.url);
  const parsed = parseMonthlyAnalyticsQuery(searchParams);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await getDreAnalytics(tenantId, parsed.data);
  return NextResponse.json(result);
}
