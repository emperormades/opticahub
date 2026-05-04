import { OSStatus, ServiceOrder } from "@prisma/client";
import { prisma } from "../db";
import { NotificationService } from "../services/notificationService";
import { InvoicingService } from "../finance/invoicing";

export type OSEvent =
    | "APPROVE_DRAFT"
    | "SEND_TO_LAB"
    | "RECEIVE_FROM_LAB"
    | "FINISH_QUALITY_CHECK"
    | "DELIVER_TO_CUSTOMER"
    | "CANCEL";

// Matriz de transições permitidas
const transitions: Record<OSStatus, Partial<Record<OSEvent, OSStatus>>> = {
    DRAFT: {
        APPROVE_DRAFT: OSStatus.VALIDATING,
        CANCEL: OSStatus.CANCELLED
    },
    VALIDATING: {
        SEND_TO_LAB: OSStatus.LAB_SENT,
        CANCEL: OSStatus.CANCELLED
    },
    LAB_SENT: {
        RECEIVE_FROM_LAB: OSStatus.QUALITY_CHECK,
        CANCEL: OSStatus.CANCELLED
    },
    IN_PRODUCTION: {
        FINISH_QUALITY_CHECK: OSStatus.QUALITY_CHECK
    },
    QUALITY_CHECK: {
        DELIVER_TO_CUSTOMER: OSStatus.DELIVERY_READY
    },
    DELIVERY_READY: {
        DELIVER_TO_CUSTOMER: OSStatus.DELIVERED
    },
    DELIVERED: {},
    CANCELLED: {}
};

export class OSMachine {

    /**
     * Transita o estado de uma OS baseado no evento disparado.
     * Regista o evento de transição ("ServiceOrderEvent") e dispara efeitos colaterais.
     */
    static async transition(orderId: string, event: OSEvent, userId: string, notes?: string) {
        // 1. Buscar a OS atual
        const order = await prisma.serviceOrder.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            throw new Error(`Ordem de serviço não encontrada: ${orderId}`);
        }

        // 2. Validar transição
        const currentStatus = order.status;
        const stateTransitions = transitions[currentStatus] as Record<string, OSStatus | undefined>;
        const nextStatus = stateTransitions[event];

        if (!nextStatus) {
            throw new Error(`Transição inválida: Não é possível aplicar evento ${event} no estado ${currentStatus}.`);
        }

        // 3. Efetuar transição e registrar evento atomicamente
        const updatedOrder = await prisma.$transaction(async (tx: any) => {
            const db = tx as typeof prisma
            // Atualizar OS
            const updated = await db.serviceOrder.update({
                where: { id: orderId },
                data: {
                    status: nextStatus,
                    // Efeitos de data
                    labSentAt: event === "SEND_TO_LAB" ? new Date() : undefined,
                    labDeliveredAt: event === "RECEIVE_FROM_LAB" ? new Date() : undefined,
                    deliveredAt: event === "DELIVER_TO_CUSTOMER" ? new Date() : undefined
                }
            });

            // Registrar evento
            await db.serviceOrderEvent.create({
                data: {
                    orderId: orderId,
                    tenantId: order.tenantId,
                    userId: userId,
                    fromStatus: currentStatus,
                    toStatus: nextStatus,
                    notes: notes || `Transição de ${currentStatus} para ${nextStatus} via evento ${event}`
                }
            });

            return updated;
        });

        // 4. Disparar efeitos colaterais (Side effects / Integrações) Automáticos
        await this.triggerAutomations(updatedOrder, currentStatus, nextStatus);

        return updatedOrder;
    }

    /**
     * Lida com side-effects como envio de WhatsApp, faturamento inteligente, etc.
     */
    static async triggerAutomations(order: ServiceOrder, oldStatus: OSStatus, newStatus: OSStatus) {
        try {
            if (newStatus === "DELIVERY_READY") {
                console.log(`[OSMachine] Disparando WhatsApp para cliente da OS: ${order.orderNumber}`);

                await NotificationService.notify('ORDER_READY', {
                    customerId: order.customerId,
                    orderNumber: order.orderNumber
                }, order.tenantId);
            }

            if (newStatus === "VALIDATING" && oldStatus === "DRAFT") {
                console.log(`[OSMachine] Verificação do laboratório ou geração de Nota...`);
                // Dispara a geração inteligente de cobrança / NF
                await InvoicingService.generateInvoice(order.id, order.tenantId);

                // [NOVO] Auditoria de Engenharia Óptica
                const { OpticalEngine } = require('../services/opticalEngine');
                await OpticalEngine.auditAndLog(order.id, order.tenantId);
            }
            // Aqui entram outros Agentes e Faturamento Inteligente Automático
        } catch (error) {
            console.error("[OSMachine] Erro ao disparar efeitos colaterais:", error);
            // Aqui idealmente registramos num log de erros para reconectar depois
        }
    }
}
