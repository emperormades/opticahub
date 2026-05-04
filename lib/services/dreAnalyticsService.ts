import { prisma } from "@/lib/db";
import { MonthlyAnalyticsQuery } from "@/lib/validation/analyticsPayload";

export async function getDreAnalytics(
  tenantId: string,
  query: MonthlyAnalyticsQuery,
) {
  const periodStart = new Date(query.year, query.month - 1, 1);
  const periodEnd = new Date(query.year, query.month, 0, 23, 59, 59);

  const entriesRaw = await prisma.transaction.findMany({
    where: {
      tenantId,
      type: "ENTRADA",
      isPending: false,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    select: { amount: true, method: true, description: true },
  });

  const faturamentoBruto = entriesRaw.reduce((sum, transaction) => {
    return sum + Number(transaction.amount);
  }, 0);

  const deducoesRaw = await prisma.transaction.findMany({
    where: {
      tenantId,
      type: "SAIDA",
      description: { contains: "CANCELAMENTO", mode: "insensitive" },
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    select: { amount: true },
  });

  const deducoes = deducoesRaw.reduce((sum, transaction) => {
    return sum + Number(transaction.amount);
  }, 0);
  const receitaLiquida = faturamentoBruto - deducoes;

  const ordersInPeriod = await prisma.serviceOrder.findMany({
    where: {
      tenantId,
      isPaid: true,
      status: { in: ["DELIVERED", "DELIVERY_READY"] },
      updatedAt: { gte: periodStart, lte: periodEnd },
    },
    select: {
      id: true,
      total: true,
      labCost: true,
      items: {
        select: {
          quantity: true,
          unitCostAtSale: true,
          unitPrice: true,
          itemType: true,
        },
      },
    },
  });

  let cmvTotal = 0;
  let labCostTotal = 0;

  for (const order of ordersInPeriod) {
    const orderCMV = order.items.reduce((sum, item) => {
      return sum + Number(item.unitCostAtSale || 0) * item.quantity;
    }, 0);

    cmvTotal += orderCMV;
    labCostTotal += Number(order.labCost || 0);
  }

  const commissionsRaw = await prisma.commission.findMany({
    where: {
      tenantId,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    select: { amount: true },
  });

  const comissoesTotal = commissionsRaw.reduce((sum, commission) => {
    return sum + Number(commission.amount);
  }, 0);

  const cardFeeRate = 0.03;
  const cardEntries = entriesRaw.filter((transaction) => {
    return (
      transaction.method === "CARTAO_CREDITO" ||
      transaction.method === "CARTAO_DEBITO"
    );
  });
  const taxasCartao = cardEntries.reduce((sum, transaction) => {
    return sum + Number(transaction.amount) * cardFeeRate;
  }, 0);

  const custosVariaveis = cmvTotal + labCostTotal + comissoesTotal + taxasCartao;
  const margemContribuicao = receitaLiquida - custosVariaveis;
  const margemContribuicaoPct =
    receitaLiquida > 0 ? (margemContribuicao / receitaLiquida) * 100 : 0;

  const fixedExpenses = await prisma.fixedExpense.findMany({
    where: { tenantId, month: query.month, year: query.year },
  });

  const custosFixosTotal = fixedExpenses.reduce((sum, expense) => {
    return sum + Number(expense.amount);
  }, 0);

  const custosFixosByCategory = fixedExpenses.reduce<Record<string, number>>(
    (acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
      return acc;
    },
    {},
  );

  const ebitda = margemContribuicao - custosFixosTotal;
  const ebitdaMarginPct = faturamentoBruto > 0 ? (ebitda / faturamentoBruto) * 100 : 0;

  const depreciationAssets = await prisma.depreciationAsset.findMany({
    where: { tenantId, isActive: true },
  });

  const depreciacaoTotal = depreciationAssets.reduce((sum, asset) => {
    return sum + Number(asset.monthlyDepreciation);
  }, 0);

  const lucroLiquido = ebitda - depreciacaoTotal;
  const lucroLiquidoMarginPct =
    faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0;

  const breakEven =
    margemContribuicaoPct > 0 ? custosFixosTotal / (margemContribuicaoPct / 100) : null;
  const margemSegurancaAbs = breakEven !== null ? faturamentoBruto - breakEven : null;
  const margemSegurancaPct =
    breakEven !== null && faturamentoBruto > 0
      ? ((faturamentoBruto - breakEven) / faturamentoBruto) * 100
      : null;

  return {
    period: { month: query.month, year: query.year },
    dre: {
      faturamentoBruto,
      deducoes,
      receitaLiquida,
      custosMercadoria: {
        cmvTotal,
        labCostTotal,
        comissoesTotal,
        taxasCartao,
        total: custosVariaveis,
      },
      margemContribuicao,
      margemContribuicaoPct: parseFloat(margemContribuicaoPct.toFixed(2)),
      custosFixos: {
        total: custosFixosTotal,
        byCategory: custosFixosByCategory,
        items: fixedExpenses,
      },
      ebitda,
      ebitdaMarginPct: parseFloat(ebitdaMarginPct.toFixed(2)),
      depreciacao: {
        total: depreciacaoTotal,
        assets: depreciationAssets.map((asset) => ({
          name: asset.name,
          monthly: Number(asset.monthlyDepreciation),
        })),
      },
      lucroLiquido,
      lucroLiquidoMarginPct: parseFloat(lucroLiquidoMarginPct.toFixed(2)),
    },
    indicators: {
      breakEven: breakEven !== null ? parseFloat(breakEven.toFixed(2)) : null,
      margemSegurancaAbs:
        margemSegurancaAbs !== null ? parseFloat(margemSegurancaAbs.toFixed(2)) : null,
      margemSegurancaPct:
        margemSegurancaPct !== null ? parseFloat(margemSegurancaPct.toFixed(2)) : null,
      ordersCount: ordersInPeriod.length,
      ticketMedio:
        ordersInPeriod.length > 0
          ? parseFloat((faturamentoBruto / ordersInPeriod.length).toFixed(2))
          : 0,
    },
  };
}
