import { whatsapp } from "../integrations/whatsapp";
import type { Job } from "./runner";

export const abandonedCartRecovery: Job = {
  id: "abandonedCartRecovery",
  name: "The Closer",
  description: "Resgate de orcamentos abandonados",
  run: async (prisma) => {
    const today = new Date();
    const limitInferior = new Date(today.getTime() - 72 * 60 * 60 * 1000);
    const limitSuperior = new Date(today.getTime() - 48 * 60 * 60 * 1000);

    const drafts = await prisma.serviceOrder.findMany({
      where: {
        status: "DRAFT",
        createdAt: {
          gte: limitInferior,
          lte: limitSuperior,
        },
        isArchived: false,
      },
      include: {
        customer: { select: { name: true, phone: true, whatsapp: true } },
        seller: { select: { name: true } },
        items: { select: { description: true } },
      },
      take: 100,
    });

    if (drafts.length === 0) {
      return {
        status: "skipped",
        message: "Nenhum orcamento abandonado na janela >48h.",
        affected: 0,
      };
    }

    let recovered = 0;

    for (const order of drafts) {
      const phone = order.customer.whatsapp || order.customer.phone;
      if (!phone) {
        continue;
      }

      const itemName =
        order.items.length > 0 ? order.items[0].description : "seus novos oculos";

      const text =
        `Ola, ${order.customer.name}!\n\n` +
        `Aqui e ${order.seller.name} da otica. Vi que o orcamento para ${itemName} ainda esta aberto.\n\n` +
        "Ficou alguma duvida tecnica sobre as lentes ou podemos negociar uma condicao de pagamento para fechar a producao hoje?";

      try {
        await whatsapp.sendMessage({ to: phone, text });

        await prisma.serviceOrder.update({
          where: { id: order.id },
          data: {
            notes:
              (order.notes || "") +
              `\n[AUTOMATION: Follow-up The Closer enviado em ${new Date().toLocaleDateString("pt-BR")}]`,
          },
        });

        recovered += 1;
      } catch (error) {
        console.error("[JOBS][abandonedCartRecovery] Falha no envio WhatsApp:", error);
      }
    }

    return {
      status: "success",
      message: `${recovered} mensagens de recuperacao enviadas.`,
      affected: recovered,
      meta: {
        scanned: drafts.length,
      },
    };
  },
};
