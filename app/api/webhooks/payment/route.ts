import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { payInstallment } from "@/lib/services/installmentService";
import { validateWebhookSignature } from "@/lib/webhooks";

// POST /api/webhooks/payment
// Recebe atualizacoes de gateways de pagamento (ex: Stone, PagSeguro, Stripe, Asaas)
export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get("x-payment-signature");
    const signatureCheck = validateWebhookSignature({
      bodyText,
      signature,
      secretEnvKey: "PAYMENT_WEBHOOK_SECRET",
    });

    if (!signatureCheck.valid) {
      if (signatureCheck.reason === "missing_secret") {
        console.error("[WEBHOOK: PAYMENT] PAYMENT_WEBHOOK_SECRET ausente.");
        return NextResponse.json(
          { error: "Webhook misconfigured" },
          { status: 503 },
        );
      }

      console.warn("[WEBHOOK: PAYMENT] Assinatura invalida.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(bodyText);
    const { externalId, status, amount } = payload;

    if (!externalId || !status) {
      return NextResponse.json({ error: "Bad payload" }, { status: 400 });
    }

    if (status === "PAID") {
      const installment = await prisma.installment.findUnique({
        where: { id: externalId },
        include: { transaction: { include: { order: true } } },
      });

      if (installment && !installment.isPaid) {
        await payInstallment(installment.tenantId, installment.id);

        console.log(
          `[WEBHOOK: PAYMENT] Parcela ${installment.number} (OS ${installment.transaction.order?.orderNumber}) paga via webhook. Valor: R$ ${amount}`,
        );

        const {
          NotificationService,
        } = require("@/lib/services/notificationService");
        if (installment.transaction.order?.customerId) {
          await NotificationService.notify(
            "PAYMENT_CONFIRMED",
            {
              customerId: installment.transaction.order.customerId,
              amount: Number(amount) || Number(installment.amount),
              installmentNumber: installment.number,
            },
            installment.transaction.tenantId,
          );
        }
      } else {
        console.log(
          `[WEBHOOK: PAYMENT] Parcela nao encontrada ou ja paga. ID: ${externalId}`,
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[WEBHOOK: PAYMENT] Falha grave.", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
