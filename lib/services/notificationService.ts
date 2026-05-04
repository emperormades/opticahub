import { prisma } from "../db";
import { whatsapp } from "../integrations/whatsapp";

export type NotificationType =
    | 'ORDER_READY'
    | 'INSTALLMENT_CREATED'
    | 'DUE_DATE_REMINDER'
    | 'OVERDUE_NOTICE'
    | 'PAYMENT_CONFIRMED';

export interface NotificationPayload {
    customerId: string;
    orderNumber?: string;
    amount?: number;
    installmentCount?: number;
    installmentNumber?: number;
    dueDate?: string;
    daysLate?: number;
    penaltyAmount?: number;
    link?: string;
}

export class NotificationService {
    /**
     * Envia uma notificação inteligente filtrando por consentimento (LGPD).
     */
    static async notify(type: NotificationType, payload: NotificationPayload, tenantId: string) {
        try {
            // 1. Buscar cliente e consentimento
            const customer = await prisma.customer.findFirst({
                where: { id: payload.customerId, tenantId },
                select: { name: true, whatsapp: true, phone: true, consentWhatsapp: true }
            });

            if (!customer) {
                console.warn(`[NotificationService] Cliente ${payload.customerId} não encontrado.`);
                return { success: false, error: 'Customer not found' };
            }

            // 2. Verificar Consentimento LGPD (Pilar 4)
            if (!customer.consentWhatsapp) {
                console.info(`[NotificationService] Cliente ${customer.name} não consentiu envio de WhatsApp. Notificação ignorada.`);
                return { success: false, error: 'Consent denied' };
            }

            const phone = customer.whatsapp || customer.phone;
            if (!phone) {
                console.warn(`[NotificationService] Cliente ${customer.name} sem telefone cadastrado.`);
                return { success: false, error: 'No phone' };
            }

            // 3. Formatar valores
            const fmt = (v?: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

            // 4. Encaminhar para o canal correto (WhatsApp)
            let result;
            switch (type) {
                case 'ORDER_READY':
                    result = await whatsapp.sendOrderReadyNotification(phone, payload.orderNumber || '—', customer.name);
                    break;
                case 'INSTALLMENT_CREATED':
                    result = await whatsapp.sendInstallmentCreated(phone, customer.name, fmt(payload.amount), payload.installmentCount || 1);
                    break;
                case 'DUE_DATE_REMINDER':
                    result = await whatsapp.sendDueDateReminder(phone, customer.name, fmt(payload.amount), payload.dueDate || '—', payload.link || '—');
                    break;
                case 'OVERDUE_NOTICE':
                    result = await whatsapp.sendOverdueNotice(phone, customer.name, fmt(payload.amount), payload.daysLate || 0, fmt(payload.penaltyAmount));
                    break;
                case 'PAYMENT_CONFIRMED':
                    result = await whatsapp.sendPaymentConfirmation(phone, customer.name, fmt(payload.amount), payload.installmentNumber || 1);
                    break;
            }

            // 5. Registrar no log de auditoria
            if (result?.success) {
                console.info(`[NotificationService] Sucesso ao notificar ${customer.name} do tipo ${type}.`);
                // Futuro: Registrar no histórico do cliente
            }

            return result;
        } catch (error) {
            console.error(`[NotificationService] Falha crítica ao enviar notificação ${type}:`, error);
            return { success: false, error: 'Critical failure' };
        }
    }
}
