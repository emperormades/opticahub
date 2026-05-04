import type { Job } from "./runner";
import { whatsapp } from "../integrations/whatsapp";

export const checkPrescriptionExpirations: Job = {
  id: "checkPrescriptionExpirations",
  name: "The Caretaker",
  description:
    "Verifica clientes em janela de 1 ano da ultima compra e envia lembrete de revisao visual.",
  run: async (prisma) => {
    const today = new Date();

    const rangeStart = new Date(today);
    rangeStart.setFullYear(today.getFullYear() - 1);
    rangeStart.setDate(rangeStart.getDate() - 3);

    const rangeEnd = new Date(today);
    rangeEnd.setFullYear(today.getFullYear() - 1);
    rangeEnd.setDate(rangeEnd.getDate() + 3);

    const customers = await prisma.customer.findMany({
      where: {
        lastOrderAt: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        consentWhatsapp: true,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        whatsapp: true,
        phone: true,
      },
      take: 200,
    });

    let notified = 0;

    for (const customer of customers) {
      const phone = customer.whatsapp || customer.phone;
      if (!phone) {
        continue;
      }

      const text =
        `Ola, ${customer.name}! Faz cerca de 1 ano da sua ultima revisao visual na Rupta. ` +
        "Recomendamos uma nova consulta para manter sua saude ocular em dia. Deseja agendar um horario?";

      await whatsapp.sendMessage({ to: phone, text });
      notified += 1;
    }

    return {
      status: "success",
      message: `${notified} clientes notificados pelo The Caretaker.`,
      affected: notified,
      meta: {
        scanned: customers.length,
      },
    };
  },
};
