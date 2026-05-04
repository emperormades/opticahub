import { prisma } from "../db";
import { whatsapp } from "../integrations/whatsapp";

export class InvoicingService {
    /**
     * Simula a emissão de nota fiscal (NF-e) ou de um Gateway de pagamento
     */
    static async generateInvoice(orderId: string, _tenantId: string) {
        try {
            const order = await prisma.serviceOrder.findUnique({
                where: { id: orderId },
                include: { customer: true }
            });

            if (!order) throw new Error("OS não encontrada");

            console.log(`[Invoicing] Gerando NF-e / Link Pagamento para a OS ${order.orderNumber}...`);

            // ─── INTEGRAÇÃO REAL COM GATEWAY AQUI ─────────────────────────────────
            // Ex: const paymentLink = await pagseguro.createLink(order.total)
            const mockPaymentLink = `https://pagar.me/teste/${order.id}`;

            // Gerar Transação Pendente no Banco se não houver
            // Simulando a criação...

            // Enviar WhatsApp se houver telefone
            const phone = order.customer.whatsapp || order.customer.phone;
            if (phone && !order.isPaid) {
                await whatsapp.sendPaymentLink(phone, mockPaymentLink, order.total.toString());
            }

            return { success: true, link: mockPaymentLink };
        } catch (error) {
            console.error("[Invoicing] Falha na faturação inteligente", error);
            return { success: false, error: "Falha ao gerar o faturamento" };
        }
    }
}
