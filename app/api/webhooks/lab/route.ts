import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { OSEvent, OSMachine } from "@/lib/os/machine";
import { validateWebhookSignature } from "@/lib/webhooks";

// POST /api/webhooks/lab
// Recebe atualizacoes de status do laboratorio
export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get("x-lab-signature");
    const signatureCheck = validateWebhookSignature({
      bodyText,
      signature,
      secretEnvKey: "LAB_WEBHOOK_SECRET",
    });

    if (!signatureCheck.valid) {
      if (signatureCheck.reason === "missing_secret") {
        console.error("[WEBHOOK: LAB] LAB_WEBHOOK_SECRET ausente.");
        return NextResponse.json(
          { error: "Webhook misconfigured" },
          { status: 503 },
        );
      }

      console.warn("[WEBHOOK: LAB] Assinatura invalida.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(bodyText);
    const { orderNumber, status, notes } = payload;

    if (!orderNumber || !status) {
      return NextResponse.json(
        { error: "Missing orderNumber or status" },
        { status: 400 },
      );
    }

    const order = await prisma.serviceOrder.findFirst({
      where: { orderNumber },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    let event: OSEvent | null = null;
    if (status === "PRODUCED") {
      event = "RECEIVE_FROM_LAB";
    }

    if (event) {
      const SYSTEM_USER_ID = "system-webhook";
      await OSMachine.transition(
        order.id,
        event,
        SYSTEM_USER_ID,
        `Atualizacao do lab: ${notes || "Status atualizado"}`,
      );
      console.log(
        `[WEBHOOK: LAB] OS ${orderNumber} transitou via evento ${event}`,
      );
    } else {
      console.log(
        `[WEBHOOK: LAB] OS ${orderNumber} recebeu status informacional: ${status}`,
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[WEBHOOK: LAB] Falha ao processar.", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
