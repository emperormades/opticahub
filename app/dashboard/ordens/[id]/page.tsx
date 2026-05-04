"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import s from "../../shared.module.css";
import k from "../ordens.module.css";
import {
  calculateMinDiameter,
  simulateEdgeThickness,
  checkBaseCurveConflict,
} from "@/lib/optical/calculations";
import { GenerateCarneModal } from "@/components/financial/GenerateCarneModal";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type OSStatus =
  | "DRAFT"
  | "VALIDATING"
  | "LAB_SENT"
  | "IN_PRODUCTION"
  | "QUALITY_CHECK"
  | "DELIVERY_READY"
  | "DELIVERED"
  | "CANCELLED";

interface OSEvent {
  id: string;
  fromStatus: OSStatus | null;
  toStatus: OSStatus;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface OrderProduct {
  id: string;
  frameModel?: string | null;
  frameDma?: number | null;
  frameBridge?: number | null;
  lensBaseCurve?: number | null;
  lensIndex?: number | null;
}

interface OSItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  itemType: string;
  product?: OrderProduct | null;
}

interface PrescriptionData {
  odDnpMono?: number | null;
  oeDnpMono?: number | null;
  odSphere?: number | null;
}

interface InstallmentData {
  id: string;
  number: number;
  dueDate: string;
  amount: number | string;
  isPaid: boolean;
}

interface OrderTransaction {
  id: string;
  method: string;
  amount: number | string;
  installmentsCount?: number | null;
  installments?: InstallmentData[];
}

interface ServiceOrder {
  id: string;
  orderNumber: string;
  status: OSStatus;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
  };
  seller: { id: string; name: string; email: string };
  prescription: PrescriptionData | null;
  items: OSItem[];
  events: OSEvent[];
  transactions?: OrderTransaction[];
  total: number;
  subtotal: number;
  discount: number;
  isPaid: boolean;
  reworkCount: number;
  reworkCause: string | null;
  labName: string | null;
  labOrderCode: string | null;
  labSentAt: string | null;
  labDeadline: string | null;
  labDeliveredAt: string | null;
  deliveredAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OSStatus,
  { label: string; icon: string; color: string }
> = {
  DRAFT: { label: "Orçamento", icon: "📝", color: "#6366f1" },
  VALIDATING: { label: "Validação Técnica", icon: "🔍", color: "#f59e0b" },
  LAB_SENT: { label: "Enviado ao Lab", icon: "📦", color: "#3b82f6" },
  IN_PRODUCTION: { label: "Em Produção", icon: "⚙️", color: "#8b5cf6" },
  QUALITY_CHECK: { label: "Conferência", icon: "🔬", color: "#ec4899" },
  DELIVERY_READY: { label: "Pronto p/ Entrega", icon: "✅", color: "#10b981" },
  DELIVERED: { label: "Entregue", icon: "🎉", color: "#10b981" },
  CANCELLED: { label: "Cancelada", icon: "❌", color: "#ef4444" },
};

const NEXT_TRANSITIONS: Record<
  OSStatus,
  { to: OSStatus; label: string; type: "advance" | "back" | "cancel" }[]
> = {
  DRAFT: [
    { to: "VALIDATING", label: "→ Enviar para Validação", type: "advance" },
    { to: "CANCELLED", label: "↩ Estorno / Devolucao", type: "cancel" },
  ],
  VALIDATING: [
    { to: "LAB_SENT", label: "→ Enviar ao Laboratório", type: "advance" },
    { to: "DRAFT", label: "← Voltar ao Orçamento", type: "back" },
    { to: "CANCELLED", label: "↩ Estorno / Devolucao", type: "cancel" },
  ],
  LAB_SENT: [
    { to: "IN_PRODUCTION", label: "→ Confirmar Produção", type: "advance" },
    { to: "CANCELLED", label: "↩ Estorno / Devolucao", type: "cancel" },
  ],
  IN_PRODUCTION: [
    { to: "QUALITY_CHECK", label: "→ Pronta — Conferência", type: "advance" },
    { to: "LAB_SENT", label: "↩ Retrabalho no Lab", type: "back" },
  ],
  QUALITY_CHECK: [
    { to: "DELIVERY_READY", label: "→ Aprovado — Notificar", type: "advance" },
    { to: "IN_PRODUCTION", label: "↩ Retrabalho — Reprod.", type: "back" },
  ],
  DELIVERY_READY: [
    { to: "DELIVERED", label: "🎉 Confirmar Entrega", type: "advance" },
    { to: "CANCELLED", label: "↩ Estorno / Devolucao", type: "cancel" },
  ],
  DELIVERED: [],
  CANCELLED: [],
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v,
  );

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function OrdemDetalhePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState<{
    to: OSStatus;
    label: string;
  } | null>(null);
  const [transitionNotes, setTransitionNotes] = useState("");
  const [labName, setLabName] = useState("");
  const [showCarneModal, setShowCarneModal] = useState<{
    id: string;
    amount: number;
  } | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setOrder(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, refreshCount]);

  const handleTransition = async () => {
    if (!showTransitionModal || !order) return;
    setTransitioning(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toStatus: showTransitionModal.to,
          notes: transitionNotes || null,
          metadata: labName ? { labName } : null,
        }),
      });
      if (res.ok) {
        const updated = await fetch(`/api/orders/${id}`).then((r) => r.json());
        setOrder(updated);
        if (showTransitionModal.to === "CANCELLED") {
          setUiMessage({
            type: "success",
            text:
              `OS cancelada. Estoque de ${stockReturnItemsCount} item(ns) retornado, ` +
              `${estimatedRefundValue > 0 ? `estorno de ${formatCurrency(estimatedRefundValue)} registrado, ` : ""}` +
              `${openInstallmentsCount > 0 ? `${openInstallmentsCount} parcela(s) em aberto encerrada(s), ` : ""}` +
              "e comissoes pendentes bloqueadas.",
          });
        } else {
          setUiMessage({
            type: "success",
            text: `OS atualizada para ${STATUS_CONFIG[showTransitionModal.to].label}.`,
          });
        }
        setShowTransitionModal(null);
        setTransitionNotes("");
        setLabName("");
      } else {
        const errorData = await res.json().catch(() => null);
        setUiMessage({
          type: "error",
          text:
            errorData?.error || "Nao foi possivel atualizar o status da OS.",
        });
      }
    } finally {
      setTransitioning(false);
    }
  };

  if (loading)
    return (
      <div className={s.page}>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>⏳</div>
          <p className={s.emptyText}>Carregando OS...</p>
        </div>
      </div>
    );

  if (!order)
    return (
      <div className={s.page}>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>❌</div>
          <p className={s.emptyTitle}>OS não encontrada</p>
          <button
            className={s.btnSecondary}
            onClick={() => router.push("/dashboard/ordens")}
          >
            ← Voltar
          </button>
        </div>
      </div>
    );

  const cfg = STATUS_CONFIG[order.status];
  const transitions = NEXT_TRANSITIONS[order.status] || [];
  const isTerminal =
    order.status === "DELIVERED" || order.status === "CANCELLED";
  const pendingCarneTransaction = (order.transactions || []).find(
    (transaction) =>
      transaction.method === "CREDIARIO" &&
      (!transaction.installments || transaction.installments.length === 0),
  );
  const hasCrediarioTransaction = (order.transactions || []).some(
    (transaction) => transaction.method === "CREDIARIO",
  );
  const paidInstallmentsValue = (order.transactions || []).reduce(
    (sum, transaction) => {
      const installments = transaction.installments || [];
      if (transaction.method !== "CREDIARIO" || installments.length === 0)
        return sum;

      return (
        sum +
        installments
          .filter((installment) => installment.isPaid)
          .reduce(
            (installmentSum, installment) =>
              installmentSum + Number(installment.amount),
            0,
          )
      );
    },
    0,
  );
  const settledDirectPaymentsValue = (order.transactions || []).reduce(
    (sum, transaction) => {
      const installments = transaction.installments || [];
      if (transaction.method === "CREDIARIO" && installments.length > 0)
        return sum;
      return sum + Number(transaction.amount);
    },
    0,
  );
  const estimatedRefundValue =
    paidInstallmentsValue + settledDirectPaymentsValue;
  const openInstallmentsCount = (order.transactions || []).reduce(
    (sum, transaction) => {
      const installments = transaction.installments || [];
      return (
        sum + installments.filter((installment) => !installment.isPaid).length
      );
    },
    0,
  );
  const stockReturnItemsCount = order.items.reduce(
    (sum, item) => sum + (item.product ? Number(item.quantity) : 0),
    0,
  );

  const handleBillingAction = () => {
    if (pendingCarneTransaction) {
      setShowCarneModal({
        id: pendingCarneTransaction.id,
        amount: Number(pendingCarneTransaction.amount),
      });
      setUiMessage({
        type: "success",
        text: "Abra o crediario desta OS para configurar as parcelas antes de concluir o recebimento.",
      });
      return;
    }

    if (hasCrediarioTransaction) {
      router.push("/dashboard/financeiro/carne");
      return;
    }

    router.push("/dashboard/financeiro");
  };

  // ─── LÓGICA DE VALIDAÇÃO ÓPTICA (FASE 5) ─────────────────────────────────
  let opticalWarnings: React.ReactNode[] = [];
  if (order.status === "VALIDATING" || order.status === "DRAFT") {
    const frame = order.items.find(
      (i) => i.itemType === "ARMACOES" && i.product,
    );
    const lens = order.items.find((i) => i.itemType === "LENTES" && i.product);
    const rx = order.prescription;

    // 1. Conflito de Base
    if (
      frame?.product?.frameModel?.toUpperCase() === "ESPORTIVO" &&
      lens?.product?.lensBaseCurve
    ) {
      const conflict = checkBaseCurveConflict(
        true,
        Number(lens.product.lensBaseCurve),
      );
      if (conflict.hasConflict)
        opticalWarnings.push(
          <div
            key="base"
            style={{
              color: "#ef4444",
              fontSize: 13,
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <span>⚠️</span> {conflict.warning}
          </div>,
        );
    }

    // 2. Diâmetro Mínimo e Borda
    if (
      frame?.product?.frameDma &&
      frame?.product?.frameBridge &&
      rx?.odDnpMono &&
      rx?.odDnpMono
    ) {
      // Assumimos oeDnpMono usando um fallback se estiver ausente no mock ou OE é simétrico
      const oeDnp = rx.oeDnpMono || rx.odDnpMono;

      const calc = calculateMinDiameter({
        dma: Number(frame.product.frameDma),
        aro: 50, // Mock ou se existir frameSize
        ponte: Number(frame.product.frameBridge),
        dnpOd: Number(rx.odDnpMono),
        dnpOe: Number(oeDnp),
      });

      opticalWarnings.push(
        <div
          key="dia"
          style={{
            color: "var(--status-info)",
            fontSize: 13,
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <span>📐</span> <strong>Ø Mínimo Útil (Estimado):</strong>{" "}
          {calc.diameterMin}mm (Descentração: {calc.decentration}mm).
        </div>,
      );

      if (lens?.product?.lensIndex && rx?.odSphere) {
        const thick = simulateEdgeThickness({
          sphere: Number(rx.odSphere),
          index: Number(lens.product.lensIndex),
          diameter: calc.diameterMin,
        });
        if (thick.recommendEdgeThickening) {
          opticalWarnings.push(
            <div
              key="thick"
              style={{
                color: "#f59e0b",
                fontSize: 13,
                display: "flex",
                gap: 6,
                alignItems: "start",
              }}
            >
              <span>✂️</span>{" "}
              <span>
                Espessura de borda estimada muito alta (
                {thick.estimatedThickness}mm). Recomendamos sugerir serviço de{" "}
                <strong>Rebaixamento de Borda</strong>.
              </span>
            </div>,
          );
        }
      }
    }
  }

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.pageHeader}>
        <div className={s.pageTitleArea}>
          <button
            className={s.btnGhost}
            onClick={() => router.push("/dashboard/ordens")}
          >
            ← Ordens de Serviço
          </button>
          <h1 className={s.pageTitle} style={{ marginTop: 4 }}>
            {order.orderNumber}
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              marginTop: 4,
            }}
          >
            <span
              className={s.badge}
              style={{
                background: cfg.color + "22",
                color: cfg.color,
                border: `1px solid ${cfg.color}44`,
                fontSize: 12,
              }}
            >
              {cfg.icon} {cfg.label}
            </span>
            {order.reworkCount > 0 && (
              <span className={`${s.badge} ${s.badgeError}`}>
                ↩ {order.reworkCount} retrabalho
                {order.reworkCount > 1 ? "s" : ""}
              </span>
            )}
            {order.isPaid && (
              <span className={`${s.badge} ${s.badgeSuccess}`}>✓ Pago</span>
            )}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            alignItems: "center",
          }}
        >
          {!order.isPaid && order.status !== "CANCELLED" && (
            <button
              className={s.btnPrimary}
              style={{ padding: "8px 16px", fontSize: 13 }}
              onClick={handleBillingAction}
              title={
                pendingCarneTransaction
                  ? "Abrir configuracao de parcelas desta OS"
                  : hasCrediarioTransaction
                    ? "Abrir o painel de contas a receber desta OS"
                    : "Ir para o painel financeiro para concluir o recebimento"
              }
            >
              <span style={{ fontSize: 13 }}>
                {pendingCarneTransaction
                  ? "Configurar Crediario"
                  : hasCrediarioTransaction
                    ? "Abrir Contas a Receber"
                    : "Abrir Recebimento"}
              </span>
            </button>
          )}
          <Link
            id="btn-imprimir"
            href={`/dashboard/ordens/${id}/imprimir`}
            target="_blank"
            className={s.btnSecondary}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            🖨️ Imprimir Via
          </Link>
          <Link
            id="btn-imprimir-lab"
            href={`/dashboard/ordens/${id}/imprimir-lab`}
            target="_blank"
            className={s.btnSecondary}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            🔬 Ficha Lab
          </Link>
          {!isTerminal && (
            <button
              className={s.btnDanger}
              style={{ padding: "8px 16px", fontSize: 13 }}
              onClick={() =>
                setShowTransitionModal({
                  to: "CANCELLED",
                  label: "↩ Estorno / Devolucao",
                })
              }
            >
              Estorno / Devolucao
            </button>
          )}
        </div>
      </div>

      <div className={s.nextActionBanner}>
        <div>
          <div className={s.nextActionLabel}>⚡ Próxima Ação</div>
          <div className={s.nextActionText}>
            {isTerminal
              ? "OS encerrada — consulte o cliente ou volte para a fila."
              : !order.isPaid
              ? "Conclua o recebimento ou avance o status desta OS."
              : "OS paga — avance o status ou consulte o histórico do cliente."}
          </div>
        </div>
        <div className={s.nextActionActions}>
          <Link
            href={`/dashboard/clientes/${order.customer.id}`}
            className={s.btnSecondary}
            style={{ textDecoration: "none" }}
          >
            Abrir Cliente →
          </Link>
          <Link
            href="/dashboard/ordens"
            className={s.btnSecondary}
            style={{ textDecoration: "none" }}
          >
            Voltar à Fila →
          </Link>
          {!order.isPaid && order.status !== "CANCELLED" && (
            <button
              className={s.btnPrimary}
              onClick={handleBillingAction}
              style={{ padding: "8px 14px", fontSize: 12 }}
            >
              Receber Agora
            </button>
          )}
        </div>
      </div>


      {uiMessage && (
        <div
          className={s.card}
          style={{
            marginBottom: "var(--space-3)",
            borderLeft: `4px solid ${uiMessage.type === "error" ? "var(--status-error)" : "var(--status-success)"}`,
            color:
              uiMessage.type === "error"
                ? "var(--status-error)"
                : "var(--status-success)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {uiMessage.text}
            </span>
            <button
              type="button"
              className={s.btnSecondary}
              onClick={() => setUiMessage(null)}
              style={{ padding: "4px 10px" }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={k.detailGrid}>
        {/* Left column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          {/* VALIDAÇÃO ÓPTICA (Se houver alertas) */}
          {opticalWarnings.length > 0 && (
            <div
              className={s.card}
              style={{ border: "1px solid #f59e0b44", background: "#f59e0b08" }}
            >
              <div className={s.cardHeader} style={{ background: "#f59e0b11" }}>
                <span
                  className={s.cardTitle}
                  style={{
                    color: "#b45309",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  🔬 Análise de Engenharia Óptica
                </span>
              </div>
              <div
                style={{
                  padding: "var(--space-4)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                }}
              >
                {opticalWarnings}
              </div>
            </div>
          )}

          {/* Cliente & Vendedor */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>👤 Cliente & Atendimento</span>
            </div>
            <div
              style={{
                padding: "var(--space-4)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--space-3)",
              }}
            >
              {[
                ["Cliente", order.customer.name],
                ["Vendedor", order.seller.name],
                [
                  "Telefone",
                  order.customer.phone || order.customer.whatsapp || "—",
                ],
                ["Abertura", formatDateTime(order.createdAt)],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Itens */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>📋 Itens da OS</span>
              <span className={s.cardCount}>{order.items.length} itens</span>
            </div>
            <table className={s.table}>
              <thead className={s.tableHead}>
                <tr>
                  <th>Descrição</th>
                  <th>Qtd</th>
                  <th>Unit.</th>
                  <th>Desc.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr
                    key={item.id}
                    className={s.tableRow}
                    style={{ cursor: "default" }}
                  >
                    <td className={s.cellName}>{item.description}</td>
                    <td style={{ textAlign: "center" }}>{item.quantity}x</td>
                    <td>{formatCurrency(Number(item.unitPrice))}</td>
                    <td style={{ color: "var(--status-warning)" }}>
                      {Number(item.discount) > 0
                        ? `-${formatCurrency(Number(item.discount))}`
                        : "—"}
                    </td>
                    <td
                      style={{ fontWeight: 700, color: "var(--brand-primary)" }}
                    >
                      {formatCurrency(Number(item.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumo Financeiro Isolado */}
          <div
            className={s.card}
            style={{
              borderTop: "4px solid var(--brand-primary)",
              background: "var(--surface-secondary)",
            }}
          >
            <div
              style={{
                padding: "var(--space-4)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: "var(--space-6)", flex: 1 }}>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                    }}
                  >
                    Subtotal
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>
                    {formatCurrency(Number(order.subtotal))}
                  </span>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                    }}
                  >
                    Desconto
                  </span>
                  <span
                    style={{ fontSize: 14, color: "var(--status-warning)" }}
                  >
                    {Number(order.discount) > 0
                      ? `-${formatCurrency(Number(order.discount))}`
                      : "—"}
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                  }}
                >
                  Total da OS
                </span>
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: "var(--brand-primary)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {formatCurrency(Number(order.total))}
                </span>
              </div>
            </div>
          </div>

          {/* Laboratório */}
          {(order.labName || order.labSentAt) && (
            <div className={s.card}>
              <div className={s.cardHeader}>
                <span className={s.cardTitle}>🔬 Laboratório</span>
              </div>
              <div
                style={{
                  padding: "var(--space-4)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "var(--space-3)",
                }}
              >
                {[
                  ["Lab", order.labName || "—"],
                  ["Pedido no Lab", order.labOrderCode || "—"],
                  [
                    "Enviado em",
                    order.labSentAt ? formatDateTime(order.labSentAt) : "—",
                  ],
                  [
                    "Prazo",
                    order.labDeadline
                      ? new Date(order.labDeadline).toLocaleDateString("pt-BR")
                      : "—",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label as string}
                    style={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {label}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico de Eventos (Event Sourcing) */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>📜 Histórico de Eventos</span>
              <span className={s.cardCount}>{order.events.length} eventos</span>
            </div>
            <div className={k.timeline}>
              {[...order.events].reverse().map((ev, idx) => {
                const toCfg = STATUS_CONFIG[ev.toStatus];
                return (
                  <div key={ev.id} className={k.timelineItem}>
                    <div
                      className={k.timelineDot}
                      style={{
                        background: toCfg.color + "22",
                        color: toCfg.color,
                      }}
                    >
                      {toCfg.icon}
                    </div>
                    <div className={k.timelineContent}>
                      <div className={k.timelineTitle}>
                        {ev.fromStatus
                          ? `${STATUS_CONFIG[ev.fromStatus].label} → ${toCfg.label}`
                          : `OS criada como: ${toCfg.label}`}
                      </div>
                      <div className={k.timelineDate}>
                        {formatDateTime(ev.createdAt)}
                      </div>
                      {ev.notes && (
                        <div className={k.timelineNote}>{ev.notes}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SEÇÃO DE CREDIÁRIO / CARNÊ (Pilar 8) */}
          {order.transactions?.some((t) => t.method === "CREDIARIO") && (
            <div className={s.card} style={{ borderTop: "4px solid #6366f1" }}>
              <div className={s.cardHeader}>
                <span className={s.cardTitle}>
                  💳 Gestão de Crediário Próprio
                </span>
              </div>
              <div style={{ padding: "var(--space-4)" }}>
                {order.transactions
                  ?.filter((t) => t.method === "CREDIARIO")
                  .map((t) => {
                    const installments = t.installments ?? [];
                    const hasCarne = installments.length > 0;
                    return (
                      <div
                        key={t.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "var(--space-4)",
                        }}
                      >
                        {!hasCarne ? (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "var(--space-4)",
                              background: "#6366f10a",
                              border: "1px dashed #6366f144",
                              borderRadius: "var(--radius-lg)",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: "#4338ca",
                                  fontSize: 14,
                                }}
                              >
                                ⚠️ Carnê Não Configurado
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-secondary)",
                                  marginTop: 2,
                                }}
                              >
                                Esta OS possui um pagamento de{" "}
                                <strong>
                                  {formatCurrency(Number(t.amount))}
                                </strong>{" "}
                                em crediário pendente de parcelamento.
                              </div>
                            </div>
                            <button
                              className={s.btnPrimary}
                              style={{ background: "#6366f1" }}
                              onClick={() =>
                                setShowCarneModal({
                                  id: t.id,
                                  amount: Number(t.amount),
                                })
                              }
                            >
                              ⚙️ Gerar Parcelas
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "var(--space-3)",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "var(--text-primary)",
                                }}
                              >
                                📋 Plano de Parcelamento
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "var(--text-tertiary)",
                                }}
                              >
                                {t.installmentsCount || installments.length}{" "}
                                parcelas geradas
                              </span>
                            </div>
                            <div style={{ overflowX: "auto" }}>
                              <table
                                className={s.table}
                                style={{
                                  border: "1px solid var(--border-subtle)",
                                  borderRadius: "var(--radius-md)",
                                }}
                              >
                                <thead className={s.tableHead}>
                                  <tr>
                                    <th style={{ fontSize: 10 }}>Parc.</th>
                                    <th style={{ fontSize: 10 }}>Vencimento</th>
                                    <th
                                      style={{
                                        fontSize: 10,
                                        textAlign: "right",
                                      }}
                                    >
                                      Valor
                                    </th>
                                    <th
                                      style={{
                                        fontSize: 10,
                                        textAlign: "center",
                                      }}
                                    >
                                      Status
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {installments.map((inst) => (
                                    <tr
                                      key={inst.id}
                                      className={s.tableRow}
                                      style={{ height: 40, cursor: "default" }}
                                    >
                                      <td style={{ fontWeight: 600 }}>
                                        {inst.number}ª
                                      </td>
                                      <td style={{ fontSize: 12 }}>
                                        {new Date(
                                          inst.dueDate + "T12:00:00",
                                        ).toLocaleDateString("pt-BR")}
                                      </td>
                                      <td
                                        style={{
                                          textAlign: "right",
                                          fontWeight: 700,
                                        }}
                                      >
                                        {formatCurrency(Number(inst.amount))}
                                      </td>
                                      <td style={{ textAlign: "center" }}>
                                        <span
                                          style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            padding: "2px 8px",
                                            borderRadius: 10,
                                            background: inst.isPaid
                                              ? "var(--status-success-bg)"
                                              : "var(--bg-elevated)",
                                            color: inst.isPaid
                                              ? "var(--status-success)"
                                              : "var(--text-tertiary)",
                                          }}
                                        >
                                          {inst.isPaid ? "PAGO" : "ABERTO"}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div
                              style={{
                                marginTop: "var(--space-3)",
                                textAlign: "right",
                              }}
                            >
                              <Link
                                href="/dashboard/financeiro/carne"
                                className={s.btnGhost}
                                style={{ fontSize: 11 }}
                              >
                                Ir para Gestão Geral de Carnês →
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Right column — State Machine */}
        <div
          style={{
            position: "sticky",
            top: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>⚙️ Máquina de Estados</span>
            </div>
            <div className={k.stateMachine}>
              <div className={k.currentState}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: cfg.color + "22",
                    color: cfg.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                  }}
                >
                  {cfg.icon}
                </div>
                <div>
                  <div className={k.currentStateLabel}>Estado Atual</div>
                  <div className={k.currentStateValue}>{cfg.label}</div>
                </div>
              </div>

              {!isTerminal && transitions.length > 0 && (
                <div className={k.transitionBtns}>
                  {transitions.map((t) => (
                    <button
                      key={t.to}
                      className={`${k.transitionBtn} ${k[t.type]}`}
                      onClick={() =>
                        setShowTransitionModal({ to: t.to, label: t.label })
                      }
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {isTerminal && (
                <div
                  style={{
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-elevated)",
                    textAlign: "center",
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                  }}
                >
                  {order.status === "DELIVERED"
                    ? "🎉 OS concluída com sucesso."
                    : "❌ OS cancelada."}
                </div>
              )}

              {order.status === "CANCELLED" && (
                <div
                  style={{
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    fontSize: 12,
                    color: "#991b1b",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ fontWeight: 800 }}>
                    Impacto do estorno aplicado
                  </div>
                  <div>
                    Estoque previsto em retorno: {stockReturnItemsCount}{" "}
                    item(ns)
                  </div>
                  <div>
                    Recebimentos revertidos:{" "}
                    {estimatedRefundValue > 0
                      ? formatCurrency(estimatedRefundValue)
                      : "sem valor estornado"}
                  </div>
                  <div>Parcelas encerradas: {openInstallmentsCount}</div>
                </div>
              )}

              {order.notes && (
                <div
                  style={{
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-elevated)",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  📝 {order.notes}
                </div>
              )}
            </div>
          </div>

          {/* Resumo financeiro */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>💰 Financeiro</span>
            </div>
            <div
              style={{
                padding: "var(--space-4)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              {[
                {
                  label: "Total",
                  value: formatCurrency(Number(order.total)),
                  highlight: true,
                },
                {
                  label: "Pagamento",
                  value: order.isPaid ? "✓ Pago" : "⏳ Pendente",
                },
              ].map(({ label, value, highlight }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: highlight ? 16 : 13,
                      fontWeight: highlight ? 700 : 500,
                      color: highlight
                        ? "var(--brand-primary)"
                        : order.isPaid
                          ? "var(--status-success)"
                          : "var(--status-warning)",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── TRANSITION MODAL ────────────────────────────────────── */}
      {showTransitionModal && (
        <div
          className={s.modalOverlay}
          onClick={(e) =>
            e.target === e.currentTarget && setShowTransitionModal(null)
          }
        >
          <div className={s.modal} style={{ maxWidth: 480 }}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>{showTransitionModal.label}</h2>
              <button
                className={s.modalClose}
                onClick={() => setShowTransitionModal(null)}
              >
                ×
              </button>
            </div>
            <div className={s.modalBody}>
              {showTransitionModal.to === "CANCELLED" && (
                <div
                  className={s.formSection}
                  style={{
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-3)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#991b1b",
                      marginBottom: 6,
                    }}
                  >
                    Este cancelamento aplica estorno operacional
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#7f1d1d",
                      display: "grid",
                      gap: 4,
                    }}
                  >
                    <div>
                      • Retorna ao estoque: {stockReturnItemsCount} item(ns) com
                      produto vinculado
                    </div>
                    <div>
                      • Estorna recebimentos liquidados:{" "}
                      {estimatedRefundValue > 0
                        ? formatCurrency(estimatedRefundValue)
                        : "nenhum valor liquidado ate agora"}
                    </div>
                    <div>
                      • Encerra parcelas em aberto: {openInstallmentsCount}
                    </div>
                    <div>• Remove comissoes pendentes ligadas a esta OS</div>
                  </div>
                </div>
              )}
              {showTransitionModal.to === "LAB_SENT" && (
                <div className={s.formSection}>
                  <div className={s.formSectionTitle}>Laboratório</div>
                  <div className={s.fieldGroup}>
                    <label className={s.fieldLabel}>Nome do Laboratório</label>
                    <input
                      className={s.fieldInput}
                      placeholder="Essilor, Zeiss, Hoya..."
                      value={labName}
                      onChange={(e) => setLabName(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div className={s.formSection}>
                <div className={s.formSectionTitle}>Observação (opcional)</div>
                <div className={s.fieldGroup}>
                  <textarea
                    className={s.fieldTextarea}
                    placeholder={
                      showTransitionModal.to === "IN_PRODUCTION" &&
                      order.status === "QUALITY_CHECK"
                        ? "Motivo do retrabalho (ex: eixo incorreto)..."
                        : "Observação sobre esta transição..."
                    }
                    value={transitionNotes}
                    onChange={(e) => setTransitionNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button
                className={s.btnSecondary}
                onClick={() => setShowTransitionModal(null)}
              >
                Cancelar
              </button>
              <button
                id="btn-confirmar-transicao"
                className={s.btnPrimary}
                onClick={handleTransition}
                disabled={transitioning}
              >
                {transitioning
                  ? "Processando..."
                  : showTransitionModal.to === "CANCELLED"
                    ? "✓ Confirmar Estorno"
                    : "✓ Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CARNE GENERATION MODAL ─────────────────────────────── */}
      {showCarneModal && (
        <GenerateCarneModal
          transactionId={showCarneModal.id}
          totalAmount={showCarneModal.amount}
          onClose={() => setShowCarneModal(null)}
          onSuccess={() => setRefreshCount((c) => c + 1)}
        />
      )}
    </div>
  );
}
