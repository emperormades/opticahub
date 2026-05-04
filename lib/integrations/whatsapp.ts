export interface WhatsAppMessage {
  to: string;
  text: string;
}

type WhatsAppSendResult = {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Erro desconhecido";
}

export class WhatsAppClient {
  private apiUrl: string;
  private token: string;
  private phoneNumberId: string;

  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v19.0";
    this.token = process.env.WHATSAPP_TOKEN || "test_token_staging";
    this.phoneNumberId = process.env.WHATSAPP_PHONE_ID || "test_phone_id";
  }

  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    try {
      console.log(`[WhatsAppClient] Simulando envio real Meta Cloud API para ${message.to}...`);
      console.log(`[WhatsAppClient] Mensagem: "${message.text}"`);

      /*
      const response = await fetch(`${this.apiUrl}/${this.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: message.to,
          type: "text",
          text: {
            preview_url: false,
            body: message.text
          }
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(`Erro na WhatsApp API: ${JSON.stringify(err)}`);
      }

      const data = await response.json() as Record<string, unknown>;
      return { success: true, data };
      */

      return { success: true, data: { message_id: "wamid.TEST_ID_12345" } };
    } catch (error) {
      console.error("[WhatsAppClient] Falha ao enviar mensagem:", error);
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async sendOrderReadyNotification(to: string, orderNumber: string, customerName: string) {
    const text = `Ola, ${customerName}! Otimas noticias: Seus oculos (OS ${orderNumber}) ja passaram pelo controle de qualidade e estao prontos para retirada na nossa loja.`;
    return this.sendMessage({ to, text });
  }

  async sendInstallmentCreated(
    to: string,
    customerName: string,
    totalAmount: string,
    installmentCount: number,
  ) {
    const text =
      `Ola, ${customerName}!\n\nSeu crediario na Rupta Optics foi aprovado com sucesso.\n` +
      `O valor total de R$ ${totalAmount} foi parcelado em ${installmentCount}x.`;
    return this.sendMessage({ to, text });
  }

  async sendDueDateReminder(
    to: string,
    customerName: string,
    amount: string,
    dueDate: string,
    link: string,
  ) {
    const text =
      `Ola, ${customerName}!\n\nSua parcela de R$ ${amount} vence em ${dueDate}.\n` +
      `Pagamento rapido: ${link}`;
    return this.sendMessage({ to, text });
  }

  async sendOverdueNotice(
    to: string,
    customerName: string,
    amount: string,
    daysLate: number,
    penalty: string,
  ) {
    const text =
      `Ola, ${customerName}. Sua parcela de R$ ${amount} esta atrasada ha ${daysLate} dias.\n\n` +
      `No momento, ha acrescimo de R$ ${penalty} referente a multa e juros.`;
    return this.sendMessage({ to, text });
  }

  async sendPaymentConfirmation(
    to: string,
    customerName: string,
    amount: string,
    installmentNumber: number,
  ) {
    const text =
      `Recebemos seu pagamento.\n\n${customerName}, confirmamos o recebimento de R$ ${amount} referente a ${installmentNumber}a parcela.`;
    return this.sendMessage({ to, text });
  }

  async sendPaymentLink(to: string, link: string, amount: string) {
    const text =
      `Ola!\n\nAqui esta o seu link de pagamento no valor de R$ ${amount}: ${link}`;
    return this.sendMessage({ to, text });
  }
}

export const whatsapp = new WhatsAppClient();
