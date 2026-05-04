import { NextRequest, NextResponse } from "next/server";
import { getSellerAnalytics } from "@/lib/services/sellerAnalyticsService";
import { requireTenantContext } from "@/lib/session";
import { parseSellerAnalyticsQuery } from "@/lib/validation/analyticsPayload";

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
  const parsed = parseSellerAnalyticsQuery(searchParams);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await getSellerAnalytics(tenantId, parsed.data);
  return NextResponse.json(result);
}
