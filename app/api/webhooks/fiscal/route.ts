import { NextRequest, NextResponse } from "next/server";
import { validateWebhookSignature } from "@/lib/webhooks";

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get("x-fiscal-signature");
    const signatureCheck = validateWebhookSignature({
      bodyText,
      signature,
      secretEnvKey: "FISCAL_WEBHOOK_SECRET",
    });

    if (!signatureCheck.valid) {
      if (signatureCheck.reason === "missing_secret") {
        console.error("[WEBHOOK: FISCAL] FISCAL_WEBHOOK_SECRET ausente.");
        return NextResponse.json(
          { error: "Webhook misconfigured" },
          { status: 503 },
        );
      }

      console.warn("[WEBHOOK: FISCAL] Assinatura invalida.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(bodyText);
    const { accessKey } = body;

    if (!accessKey) {
      return NextResponse.json({ error: "Missing accessKey" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      status: "ISSUED",
      message: "NFC-e emitida provisoriamente com sucesso (Simulador Webhook)",
      xmlUrl: `https://sefaz-simulador.gov.br/nfce/${accessKey}/xml`,
      pdfUrl: `https://sefaz-simulador.gov.br/nfce/${accessKey}/danfe`,
      accessKey,
      issuedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
