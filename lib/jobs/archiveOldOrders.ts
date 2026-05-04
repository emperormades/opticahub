import type { Job } from "./runner";

export const archiveOldOrders: Job = {
  id: "archiveOldOrders",
  name: "Archive Old Orders",
  description: "Arquiva ordens de servico entregues ha mais de 90 dias",
  run: async (prisma) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const oldOrders = await prisma.serviceOrder.findMany({
      where: {
        status: "DELIVERED",
        isPaid: true,
        updatedAt: { lt: cutoffDate },
        isArchived: false,
      },
      select: { id: true },
      take: 500,
    });

    if (oldOrders.length === 0) {
      return {
        status: "skipped",
        message: "Nenhuma OS elegivel para arquivamento.",
        affected: 0,
      };
    }

    const ids = oldOrders.map((order) => order.id);
    const result = await prisma.serviceOrder.updateMany({
      where: { id: { in: ids } },
      data: { isArchived: true },
    });

    return {
      status: "success",
      message: `${result.count} OS arquivadas.`,
      affected: result.count,
    };
  },
};
