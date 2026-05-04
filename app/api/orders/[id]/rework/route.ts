import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/session";
import { requestOrderRework } from "@/lib/services/orderReworkService";
import { parseReworkPayload } from "@/lib/validation/reworkPayload";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let context;
  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orderId } = await params;
  const parsed = parseReworkPayload(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await requestOrderRework(orderId, context, parsed.data);

    if ("error" in result) {
      return NextResponse.json({ error: "OS nao encontrada" }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Erro na retificacao da OS:", error);
    return NextResponse.json(
      { error: "Erro ao processar retificacao de lentes" },
      { status: 500 },
    );
  }
}
