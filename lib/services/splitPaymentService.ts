/**
 * splitPaymentService.ts — Split Payment Engine
 * Contrato: docs/contracts/FINANCE_RULES.md §2 (Ordens de Serviço e Pagamentos)
 *
 * Responsabilidade:
 *   - Validar e processar MÚLTIPLOS métodos de pagamento em uma única OS
 *   - Garantir que a soma dos splits === total da OS
 *   - Criar Transaction para cada split vinculada à OS
 *   - Marcar isPaid na OS quando não há pendências
 *   - Disparar comissões para splits liquidados
 *
 * Regras de negócio (FINANCE_RULES.md):
 *   - Soma dos splits ≠ total → INVALID_PAYMENT_SPLIT
 *   - Total da OS < 0 → INVALID_TOTAL
 *   - CREDIARIO → isPending: true (parcelas geradas depois via installmentService)
 *   - OS só isPaid quando TODOS os splits estão liquidados
 */

import { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logChange } from "@/lib/audit";
import {
  AppError,
  ERR_INVALID_PAYMENT_SPLIT,
  ERR_INVALID_TOTAL,
  ERR_NOT_FOUND,
  ERR_CREDIARIO_BLOCKED,
} from "@/lib/errors";
import { OrderActor } from "@/lib/services/orderService";
import { ensureCommissionForSettledTransaction } from "@/lib/services/commissionService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SplitPaymentItem {
  /** Método de pagamento: PIX, CARTAO_CREDITO, CREDIARIO, etc. */
  method: PaymentMethod;
  /** Valor deste split */
  amount: number;
  /** Número de parcelas (para cartão/crediário). Default: 1 */
  installmentsCount?: number;
  /** Observação opcional */
  notes?: string;
  /** % de comissão para este split (herda config do tenant se omitido) */
  commissionPct?: number;
}

export interface ProcessSplitPaymentInput {
  /** ID da OS a ser paga */
  orderId: string;
  /** Lista de splits de pagamento */
  splits: SplitPaymentItem[];
}

export interface SplitPaymentResult {
  orderId: string;
  orderNumber: string;
  total: number;
  isPaid: boolean;
  transactions: Array<{
    id: string;
    method: PaymentMethod;
    amount: number;
    isPending: boolean;
  }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Tolerância para comparação de floats (centavo) */
const SPLIT_TOLERANCE = 0.01;

/** Limite de parcelas de crediário em atraso para bloquear novo crediário */
const CREDIARIO_OVERDUE_LIMIT = 3;

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Processa um pagamento split (múltiplos métodos) para uma OS existente.
 *
 * Fluxo:
 * 1. Busca a OS e valida existência + tenant
 * 2. Valida que a soma dos splits === total da OS
 * 3. Se houver CREDIARIO, verifica se o cliente está bloqueado
 * 4. Dentro de uma transação atômica:
 *    a. Busca o caixa ativo
 *    b. Cria uma Transaction por split
 *    c. Determina se a OS é isPaid (sem pendências)
 *    d. Atualiza a OS
 * 5. Dispara comissões para splits já liquidados
 * 6. Registra audit trail
 */
export async function processSplitPayment(
  actor: OrderActor,
  input: ProcessSplitPaymentInput,
): Promise<SplitPaymentResult> {
  // ── 1. Buscar a OS ──────────────────────────────────────────────────────
  const order = await prisma.serviceOrder.findFirst({
    where: { id: input.orderId, tenantId: actor.tenantId },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      isPaid: true,
      customerId: true,
      sellerId: true,
    },
  });

  if (!order) {
    throw new AppError(
      "Ordem de Serviço não encontrada",
      ERR_NOT_FOUND,
      404,
    );
  }

  const orderTotal = Number(order.total);

  // ── 2. Validar total da OS ──────────────────────────────────────────────
  if (orderTotal < 0) {
    throw new AppError(
      "Total da OS é negativo — operação inválida",
      ERR_INVALID_TOTAL,
      400,
    );
  }

  // ── 3. Validar que não há pagamentos anteriores ────────────────────────
  if (order.isPaid) {
    throw new AppError(
      "Esta OS já está totalmente paga",
      "ORDER_ALREADY_PAID",
      409,
    );
  }

  // ── 4. Validar splits vazios ───────────────────────────────────────────
  if (!input.splits || input.splits.length === 0) {
    throw new AppError(
      "É necessário informar ao menos um split de pagamento",
      ERR_INVALID_PAYMENT_SPLIT,
      400,
    );
  }

  // ── 5. Validar valores individuais ──────────────────────────────────────
  for (const split of input.splits) {
    if (!Number.isFinite(split.amount) || split.amount <= 0) {
      throw new AppError(
        `Valor inválido no split: ${split.amount} (${split.method})`,
        ERR_INVALID_PAYMENT_SPLIT,
        400,
      );
    }
  }

  // ── 6. Validar soma dos splits === total da OS ──────────────────────────
  const splitTotal = input.splits.reduce((sum, s) => sum + s.amount, 0);

  if (Math.abs(splitTotal - orderTotal) > SPLIT_TOLERANCE) {
    throw new AppError(
      `Soma dos splits (R$${splitTotal.toFixed(2)}) difere do total da OS (R$${orderTotal.toFixed(2)})`,
      ERR_INVALID_PAYMENT_SPLIT,
      400,
    );
  }

  // ── 7. Se houver CREDIÁRIO, verificar bloqueio do cliente ──────────────
  const hasCrediario = input.splits.some(
    (s) => s.method === PaymentMethod.CREDIARIO,
  );

  if (hasCrediario) {
    const overdueCount = await prisma.installment.count({
      where: {
        tenantId: actor.tenantId,
        transaction: {
          order: { customerId: order.customerId },
        },
        isPaid: false,
        dueDate: { lt: new Date() },
      },
    });

    if (overdueCount >= CREDIARIO_OVERDUE_LIMIT) {
      throw new AppError(
        `Cliente possui ${overdueCount} parcelas em atraso — crediário bloqueado`,
        ERR_CREDIARIO_BLOCKED,
        403,
      );
    }
  }

  // ── 8. Processar splits em transação atômica ──────────────────────────
  const result = await prisma.$transaction(async (tx) => {
    // Buscar caixa ativo
    const activeCash = await tx.cashRegister.findFirst({
      where: { tenantId: actor.tenantId, closedAt: null },
      orderBy: { openedAt: "desc" },
    });

    const createdTransactions: Array<{
      id: string;
      method: PaymentMethod;
      amount: number;
      isPending: boolean;
      commissionPct?: number;
    }> = [];

    // Criar uma Transaction por split
    for (const split of input.splits) {
      const isCrediario = split.method === PaymentMethod.CREDIARIO;
      const isPending = isCrediario; // CREDIARIO sempre pendente até carnê ser quitado

      const transaction = await tx.transaction.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.userId,
          cashRegisterId: activeCash?.id ?? null,
          orderId: order.id,
          type: "ENTRADA",
          method: split.method,
          amount: split.amount,
          description: `Split pagamento OS ${order.orderNumber} — ${split.method}`,
          installmentsCount: split.installmentsCount || 1,
          isPending,
          dueDate: isCrediario ? undefined : undefined,
          paidAt: isPending ? null : new Date(),
          notes: split.notes || null,
        },
      });

      createdTransactions.push({
        id: transaction.id,
        method: split.method,
        amount: Number(transaction.amount),
        isPending: transaction.isPending,
        commissionPct: split.commissionPct,
      });
    }

    // Determinar isPaid: true SOMENTE se nenhum split é pendente
    const hasPending = createdTransactions.some((t) => t.isPending);
    const orderIsPaid = !hasPending;

    // Atualizar a OS
    await tx.serviceOrder.update({
      where: { id: order.id },
      data: { isPaid: orderIsPaid },
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: orderTotal,
      isPaid: orderIsPaid,
      transactions: createdTransactions,
    };
  });

  // ── 9. Comissões (fora da transação principal para não bloquear) ──────
  for (const txn of result.transactions) {
    if (!txn.isPending) {
      // Split já liquidado → disparar comissão
      await ensureCommissionForSettledTransaction(
        actor.tenantId,
        txn.id,
        txn.commissionPct,
      );
    }
  }

  // ── 10. Audit trail ────────────────────────────────────────────────────
  await logChange({
    tenantId: actor.tenantId,
    userId: actor.userId,
    entityType: "ServiceOrder",
    entityId: result.orderId,
    action: "UPDATE",
    field: "payment",
    newValue: {
      splitCount: input.splits.length,
      methods: input.splits.map((s) => s.method),
      total: splitTotal,
      isPaid: result.isPaid,
      transactionIds: result.transactions.map((t) => t.id),
    },
  });

  return result;
}

/**
 * Consulta o status de pagamento de uma OS com detalhe dos splits.
 * Útil para o front exibir o resumo de pagamentos parciais.
 */
export async function getOrderPaymentStatus(
  tenantId: string,
  orderId: string,
) {
  const order = await prisma.serviceOrder.findFirst({
    where: { id: orderId, tenantId },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      isPaid: true,
      transactions: {
        where: { type: "ENTRADA" },
        select: {
          id: true,
          method: true,
          amount: true,
          isPending: true,
          paidAt: true,
          installmentsCount: true,
          installments: {
            select: {
              id: true,
              number: true,
              amount: true,
              dueDate: true,
              isPaid: true,
              paidAt: true,
            },
            orderBy: { number: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) {
    throw new AppError(
      "Ordem de Serviço não encontrada",
      ERR_NOT_FOUND,
      404,
    );
  }

  const totalPaid = order.transactions
    .filter((t) => !t.isPending)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalPending = order.transactions
    .filter((t) => t.isPending)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderTotal: Number(order.total),
    isPaid: order.isPaid,
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalPending: Math.round(totalPending * 100) / 100,
    splitCount: order.transactions.length,
    splits: order.transactions.map((t) => ({
      transactionId: t.id,
      method: t.method,
      amount: Number(t.amount),
      isPending: t.isPending,
      paidAt: t.paidAt,
      installmentsCount: t.installmentsCount,
      installments: t.installments,
    })),
  };
}

/**
 * Recalcula o isPaid de uma OS olhando TODAS as suas transactions ENTRADA.
 * Chamado depois que parcelas individuais são pagas (via installmentService).
 *
 * Regra (FINANCE_RULES.md §2):
 *   isPaid = true QUANDO:
 *   - Todas as transações não-crediário têm isPending: false
 *   - Todas as parcelas de crediário estão isPaid: true
 */
export async function recalculateOrderPaidStatus(
  tenantId: string,
  orderId: string,
): Promise<boolean> {
  const pendingEntries = await prisma.transaction.count({
    where: {
      tenantId,
      orderId,
      type: "ENTRADA",
      isPending: true,
    },
  });

  const isPaid = pendingEntries === 0;

  await prisma.serviceOrder.updateMany({
    where: { id: orderId, tenantId },
    data: { isPaid },
  });

  return isPaid;
}
