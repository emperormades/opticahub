export type WhatsAppTemplateId =
  | 'installment_reminder'
  | 'overdue_collection'
  | 'abandoned_quote'
  | 'prescription_expiring'
  | 'schedule_confirmation';

export type WhatsAppTemplatePayloadMap = {
  installment_reminder: {
    customerName: string;
    installmentNumber: number;
    orderNumber: string;
    amount: string;
    dueDate: string;
  };
  overdue_collection: {
    customerName: string;
    overdueCount: number;
    estimatedTotal: string;
  };
  abandoned_quote: {
    customerName: string;
    sellerName: string;
    orderNumber: string;
    leadItem: string;
  };
  prescription_expiring: {
    customerName: string;
    statusLabel: string;
  };
  schedule_confirmation: {
    customerName: string;
    requestedDate: string;
    preferredPeriod?: string | null;
  };
};

function sanitizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  const withoutCountry = digits.startsWith('55') ? digits.slice(2) : digits;
  if (withoutCountry.length < 10 || withoutCountry.length > 11) return null;

  return `55${withoutCountry}`;
}

const templateBuilders: {
  [K in WhatsAppTemplateId]: (payload: WhatsAppTemplatePayloadMap[K]) => string;
} = {
  installment_reminder: (payload) =>
    `Ola, ${payload.customerName}! ` +
    `Lembrando da parcela ${payload.installmentNumber} da OS ${payload.orderNumber} ` +
    `no valor de ${payload.amount}, com vencimento em ${payload.dueDate}.`,
  overdue_collection: (payload) =>
    `Ola, ${payload.customerName}! ` +
    `Identificamos ${payload.overdueCount} parcela(s) em atraso no seu crediario, ` +
    `totalizando ${payload.estimatedTotal}. Posso te ajudar a regularizar hoje?`,
  abandoned_quote: (payload) =>
    `Ola, ${payload.customerName}! ` +
    `Aqui e ${payload.sellerName} da otica. Seu orcamento ${payload.orderNumber} ` +
    `para ${payload.leadItem} continua em aberto. Quer que eu finalize agora para voce?`,
  prescription_expiring: (payload) =>
    `Ola, ${payload.customerName}! ` +
    `Sua receita esta ${payload.statusLabel}. Quer ajuda para revisar sua graduacao e atualizar seu atendimento?`,
  schedule_confirmation: (payload) =>
    `Ola, ${payload.customerName}! ` +
    `Recebemos sua solicitacao para ${payload.requestedDate}` +
    `${payload.preferredPeriod ? ` (${payload.preferredPeriod})` : ''}. ` +
    `Estamos entrando em contato para confirmar a melhor disponibilidade.`,
};

export function buildOperationalWhatsAppMessage<T extends WhatsAppTemplateId>(
  templateId: T,
  payload: WhatsAppTemplatePayloadMap[T],
) {
  const builder = templateBuilders[templateId] as (input: WhatsAppTemplatePayloadMap[T]) => string;
  return builder(payload);
}

export function buildOperationalWhatsAppUrl(
  phone: string | null | undefined,
  message: string,
) {
  if (!phone) return null;

  const normalizedPhone = sanitizePhone(phone);
  if (!normalizedPhone) return null;

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
