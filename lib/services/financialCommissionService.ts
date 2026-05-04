import { FinancialDateRangeQuery } from "@/lib/validation/financialPayload";
import { prisma } from "@/lib/db";

interface CommissionRankingEntry {
  name: string;
  totalVendas: number;
  totalComissao: number;
  count: number;
}

export async function listFinancialCommissions(
  tenantId: string,
  query: FinancialDateRangeQuery,
) {
  const commissions = await prisma.commission.findMany({
    where: {
      tenantId,
      createdAt: {
        gte: query.startDate ? new Date(query.startDate) : undefined,
        lte: query.endDate ? new Date(query.endDate) : undefined,
      },
    },
    include: {
      seller: { select: { name: true } },
      transaction: {
        include: {
          order: {
            select: { orderNumber: true, customer: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const ranking = commissions.reduce<Record<string, CommissionRankingEntry>>(
    (acc, commission) => {
      if (!acc[commission.sellerId]) {
        acc[commission.sellerId] = {
          name: commission.seller.name,
          totalVendas: 0,
          totalComissao: 0,
          count: 0,
        };
      }

      acc[commission.sellerId].totalVendas += Number(commission.baseAmount);
      acc[commission.sellerId].totalComissao += Number(commission.amount);
      acc[commission.sellerId].count += 1;

      return acc;
    },
    {},
  );

  return {
    commissions,
    ranking: Object.values(ranking).sort((a, b) => b.totalVendas - a.totalVendas),
  };
}
