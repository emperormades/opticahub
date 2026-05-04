"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import s from "../shared.module.css";
import f from "./financeiro.module.css";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type PaymentMethod =
  | "DINHEIRO"
  | "PIX"
  | "CARTAO_DEBITO"
  | "CARTAO_CREDITO"
  | "BOLETO"
  | "CREDIARIO"
  | "TRANSFERENCIA";
type TransactionType = "ENTRADA" | "SAIDA";

interface Transaction {
  id: string;
  type: TransactionType;
  method: PaymentMethod;
  amount: number;
  description: string;
  isPending: boolean;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  user: { name: string };
  order: { orderNumber: string; customer: { name: string } } | null;
}

interface PayablePreview {
  id: string;
  amount: number;
  dueDate: string;
  description: string;
  supplier?: string | null;
}

interface OpenCashData {
  id: string;
  openedAt: string;
  openAmount: number;
  openedBy?: { name: string } | null;
  summary?: { entradas: number; saidas: number; liquido: number };
}

interface Summary {
  date: string;
  today: {
    entradas: number;
    saidas: number;
    liquido: number;
    transactionCount: number;
    paymentBreakdown: Record<string, number>;
  };
  month: { entradas: number; saidas: number; liquido: number };
  receivables: {
    total: number;
    count: number;
    overdue: number;
    overdueCount: number;
  };
  payables: {
    overdue: number;
    overdueCount: number;
    upcoming: PayablePreview[];
  };
  openCash: OpenCashData | null;
  recentTransactions: Transaction[];
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<
  PaymentMethod,
  { label: string; icon: string; color: string }
> = {
  DINHEIRO: { label: "Dinheiro", icon: "💵", color: "#10b981" },
  PIX: { label: "PIX", icon: "⚡", color: "#6366f1" },
  CARTAO_DEBITO: { label: "Débito", icon: "💳", color: "#3b82f6" },
  CARTAO_CREDITO: { label: "Crédito", icon: "💳", color: "#8b5cf6" },
  BOLETO: { label: "Boleto", icon: "📄", color: "#f59e0b" },
  CREDIARIO: { label: "Crediário", icon: "📅", color: "#ec4899" },
  TRANSFERENCIA: { label: "Transferência", icon: "🔄", color: "#14b8a6" },
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v,
  );

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon: string;
}) {
  return (
    <div className={f.statCard}>
      <div
        className={f.statIcon}
        style={{
          background: (color || "#E35336") + "1a",
          color: color || "#E35336",
        }}
      >
        {icon}
      </div>
      <div className={f.statBody}>
        <div className={f.statLabel}>{label}</div>
        <div className={f.statValue} style={{ color: color }}>
          {value}
        </div>
        {sub && <div className={f.statSub}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── DEFAULT FORM ─────────────────────────────────────────────────────────────

const defaultTx = {
  type: "ENTRADA" as TransactionType,
  method: "PIX" as PaymentMethod,
  amount: "",
  description: "",
  isPending: false,
  dueDate: "",
  installments: 1,
  notes: "",
};

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"resumo" | "extrato" | "caixa">(
    "resumo",
  );
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  // Extrato
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txFilter, setTxFilter] = useState<
    "all" | "ENTRADA" | "SAIDA" | "pending"
  >("all");
  const [txSearch, setTxSearch] = useState("");

  // Caixa
  const [cashLoading, setCashLoading] = useState(false);
  const [openCashData, setOpenCashData] = useState<OpenCashData | null>(null);
  const [openAmount, setOpenAmount] = useState("");

  // Modal nova transação
  const [showTxModal, setShowTxModal] = useState(false);
  const [txForm, setTxForm] = useState(defaultTx);
  const [saving, setSaving] = useState(false);

  // Caixa — modal fechar
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeAmount, setCloseAmount] = useState("");

  const showError = (text: string) => setUiMessage({ type: "error", text });
  const showSuccess = (text: string) => setUiMessage({ type: "success", text });

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/financial/summary");
      const data = await res.json();
      if (!res.ok) {
        showError(
          data.error || "Nao foi possivel carregar o resumo financeiro.",
        );
        return;
      }
      setSummary(data);
      setOpenCashData(data.openCash || null);
    } catch {
      showError("Falha ao carregar o resumo financeiro.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    const params = new URLSearchParams();
    if (txFilter === "ENTRADA") params.set("type", "ENTRADA");
    if (txFilter === "SAIDA") params.set("type", "SAIDA");
    if (txFilter === "pending") params.set("isPending", "true");
    if (txSearch) params.set("search", txSearch);
    params.set("limit", "50");
    try {
      const res = await fetch(`/api/financial/transactions?${params}`);
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Nao foi possivel carregar o extrato.");
        return;
      }
      setTransactions(data.transactions || []);
    } catch {
      showError("Falha ao carregar o extrato.");
    } finally {
      setTxLoading(false);
    }
  }, [txFilter, txSearch]);

  const fetchCash = useCallback(async () => {
    setCashLoading(true);
    try {
      const res = await fetch("/api/financial/cash");
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Nao foi possivel carregar o caixa.");
        return;
      }
      setOpenCashData(data.openCash || null);
    } catch {
      showError("Falha ao carregar o caixa.");
    } finally {
      setCashLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);
  useEffect(() => {
    if (activeTab === "extrato") fetchTransactions();
  }, [activeTab, fetchTransactions]);
  useEffect(() => {
    if (activeTab === "caixa") fetchCash();
  }, [activeTab, fetchCash]);

  const handleOpenCash = async () => {
    if (openAmount && Number.isNaN(Number(openAmount))) {
      showError("Informe um valor inicial valido para abrir o caixa.");
      return;
    }
    const res = await fetch("/api/financial/cash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "open",
        openAmount: parseFloat(openAmount) || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showError(data.error || "Nao foi possivel abrir o caixa.");
      return;
    }
    setOpenAmount("");
    showSuccess("Caixa aberto com sucesso.");
    fetchCash();
    fetchSummary();
  };

  const handleCloseCash = async () => {
    if (!openCashData?.id) return;
    if (closeAmount && Number.isNaN(Number(closeAmount))) {
      showError("Informe um valor fisico valido para fechar o caixa.");
      return;
    }
    const res = await fetch("/api/financial/cash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "close",
        cashId: openCashData.id,
        closeAmount: parseFloat(closeAmount) || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showError(data.error || "Nao foi possivel fechar o caixa.");
      return;
    }
    setShowCloseModal(false);
    setCloseAmount("");
    showSuccess("Caixa fechado com sucesso.");
    fetchCash();
    fetchSummary();
  };

  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/financial/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...txForm,
          amount: parseFloat(String(txForm.amount)),
          installments: txForm.installments || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Nao foi possivel registrar o lancamento.");
        return;
      }
      setShowTxModal(false);
      setTxForm(defaultTx);
      showSuccess("Lancamento registrado com sucesso.");
      fetchSummary();
      if (activeTab === "extrato") fetchTransactions();
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className={s.page}>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>⏳</div>
          <p className={s.emptyTitle}>Carregando financeiro...</p>
        </div>
      </div>
    );

  const today = summary?.today;
  const month = summary?.month;
  const recv = summary?.receivables;
  const isLiq = (today?.liquido || 0) >= 0;
  const overdueReceivablesCount = recv?.overdueCount || 0;
  const overduePayablesCount = summary?.payables.overdueCount || 0;
  const quickActionItems = [
    {
      label: "Caixa Diario",
      text: openCashData
        ? "Caixa aberto e pronto para movimentacao."
        : "Abrir caixa e iniciar operacao do dia.",
      href: "/dashboard/financeiro/caixa",
    },
    {
      label: "Contas a Receber",
      text: `${recv?.count || 0} parcela(s) em carteira para acompanhar ou baixar.`,
      href: "/dashboard/financeiro/carne",
    },
    {
      label: "Inadimplentes",
      text:
        overdueReceivablesCount > 0
          ? `${overdueReceivablesCount} cobranca(s) prioritaria(s).`
          : "Sem cobrancas urgentes no momento.",
      href: "/dashboard/financeiro/inadimplentes",
    },
    {
      label: "Comissoes",
      text: "Revisar liberacoes e auditar repasses do time comercial.",
      href: "/dashboard/financeiro/comissoes",
    },
    {
      label: "Conciliacao OFX",
      text:
        overduePayablesCount > 0
          ? `${overduePayablesCount} conta(s) vencida(s) pedem revisao.`
          : "Conferir entradas e saidas com extrato bancario.",
      href: "/dashboard/financeiro/conciliacao",
    },
  ];

  return (
    <div className={f.page}>
      {/* Header */}
      <div className={s.pageHeader}>
        <div className={s.pageTitleArea}>
          <h1 className={s.pageTitle}>Financeiro</h1>
          <p className={s.pageSubtitle}>
            {formatDate(new Date().toISOString())} ·{" "}
            {openCashData ? "🟢 Caixa aberto" : "🔴 Caixa fechado"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button
            id="btn-nova-tx"
            className={s.btnSecondary}
            onClick={() => setShowTxModal(true)}
            style={{ fontSize: 0 }}
          >
            <span style={{ fontSize: 13 }}>Novo Lancamento</span>
            + Lançamento
          </button>
          {openCashData ? (
            <button
              className={s.btnSecondary}
              style={{
                borderColor: "var(--status-error)",
                color: "var(--status-error)",
                fontSize: 0,
              }}
              onClick={() => setShowCloseModal(true)}
            >
              <span style={{ fontSize: 13 }}>Fechar Caixa</span>
              🔒 Fechar Caixa
            </button>
          ) : (
            <button
              className={s.btnPrimary}
              onClick={() => setActiveTab("caixa")}
              style={{ fontSize: 0 }}
            >
              <span style={{ fontSize: 13 }}>Abrir Caixa</span>
              🔓 Abrir Caixa
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

      {/* Tabs */}
      <div className={f.tabs}>
        {(["resumo", "extrato", "caixa"] as const).map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? f.tabActive : f.tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "resumo"
              ? "📊 Resumo"
              : tab === "extrato"
                ? "📋 Extrato"
                : "🏧 Caixa"}
          </button>
        ))}
      </div>

      {/* ─── ABA RESUMO ──────────────────────────────────────────── */}
      {activeTab === "resumo" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <div
            className={s.card}
            style={{ borderLeft: "4px solid var(--brand-primary)" }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr",
                gap: "var(--space-4)",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Painel do Dia
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  Leitura rapida para abrir, operar e fechar o financeiro sem
                  trocar de contexto o tempo todo.
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginTop: 4,
                  }}
                >
                  Priorize caixa, pendencias do crediario e conciliacao antes de
                  encerrar o dia.
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "var(--space-2)",
                }}
              >
                {quickActionItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={s.btnSecondary}
                    style={{
                      textDecoration: "none",
                      display: "grid",
                      gap: 4,
                      textAlign: "left",
                      justifyContent: "flex-start",
                      minHeight: 72,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 800 }}>
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        lineHeight: 1.35,
                      }}
                    >
                      {item.text}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* KPIs do dia */}
          <div className={f.statsRow}>
            <StatCard
              icon="📈"
              label="Entradas Hoje"
              value={formatCurrency(today?.entradas || 0)}
              color="var(--status-success)"
            />
            <StatCard
              icon="📉"
              label="Saídas Hoje"
              value={formatCurrency(today?.saidas || 0)}
              color="var(--status-error)"
            />
            <StatCard
              icon={isLiq ? "✅" : "⚠️"}
              label="Líquido Hoje"
              value={formatCurrency(today?.liquido || 0)}
              color={isLiq ? "var(--status-success)" : "var(--status-error)"}
            />
            <StatCard
              icon="🔄"
              label="Recebíveis"
              value={formatCurrency(recv?.total || 0)}
              sub={recv?.count ? `${recv.count} parcelas` : undefined}
              color="var(--status-warning)"
            />
          </div>

          {/* Segunda linha */}
          <div className={f.statsRow}>
            <StatCard
              icon="📅"
              label="Entradas do Mês"
              value={formatCurrency(month?.entradas || 0)}
              color="var(--status-success)"
            />
            <StatCard
              icon="💸"
              label="Saídas do Mês"
              value={formatCurrency(month?.saidas || 0)}
              color="var(--status-error)"
            />
            <StatCard
              icon="💰"
              label="Saldo do Mês"
              value={formatCurrency(month?.liquido || 0)}
              color={
                (month?.liquido || 0) >= 0
                  ? "var(--status-success)"
                  : "var(--status-error)"
              }
            />
            {(recv?.overdue || 0) > 0 && (
              <StatCard
                icon="⚠️"
                label="Em Atraso"
                value={formatCurrency(recv?.overdue || 0)}
                sub={`${recv?.overdueCount || 0} parcela${recv?.overdueCount !== 1 ? "s" : ""}`}
                color="var(--status-error)"
              />
            )}
          </div>

          {/* Ações Rápidas & Links Externos */}
          <div
            className={f.statsRow}
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            }}
          >
            <div
              className={s.card}
              style={{
                borderLeft: "4px solid #6366f1",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "var(--space-4)",
                gap: "var(--space-2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                }}
              >
                <div style={{ fontSize: 24 }}>💳</div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    Gestão de Crediário Próprio
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Acesse o controle total de parcelas, emissão de carnês e
                    cobranças.
                  </div>
                </div>
              </div>
              <Link
                href="/dashboard/financeiro/carne"
                className={s.btnPrimary}
                style={{
                  background: "#6366f1",
                  marginTop: "var(--space-2)",
                  textAlign: "center",
                  textDecoration: "none",
                  display: "block",
                }}
              >
                Abrir Carteira de Carnês →
              </Link>
            </div>
            <div
              className={s.card}
              style={{
                borderLeft: "4px solid #10b981",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "var(--space-4)",
                gap: "var(--space-2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                }}
              >
                <div style={{ fontSize: 24 }}>💹</div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    Relatório DRE & Performance
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Veja o demonstrativo de resultado e análise de lucro real da
                    filial.
                  </div>
                </div>
              </div>
              <Link
                href="/dashboard/panorama"
                className={s.btnPrimary}
                style={{
                  background: "#10b981",
                  marginTop: "var(--space-2)",
                  textAlign: "center",
                  textDecoration: "none",
                  display: "block",
                }}
              >
                Ir para Panorama Estratégico →
              </Link>
            </div>
          </div>

          {/* Breakdown por método + Últimas transações */}
          <div className={f.resumoGrid}>
            {/* Breakdown métodos */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <span className={s.cardTitle}>
                  💳 Entradas por Método — Hoje
                </span>
              </div>
              <div className={f.methodList}>
                {Object.keys(today?.paymentBreakdown || {}).length === 0 ? (
                  <div className={f.methodEmpty}>
                    Nenhuma entrada registrada hoje
                  </div>
                ) : (
                  Object.entries(today?.paymentBreakdown || {}).map(
                    ([method, value]) => {
                      const cfg = METHOD_LABELS[method as PaymentMethod];
                      const pct = today?.entradas
                        ? (value / today.entradas) * 100
                        : 0;
                      return (
                        <div key={method} className={f.methodItem}>
                          <div className={f.methodInfo}>
                            <span>
                              {cfg?.icon} {cfg?.label || method}
                            </span>
                            <span
                              className={f.methodValue}
                              style={{ color: cfg?.color }}
                            >
                              {formatCurrency(value)}
                            </span>
                          </div>
                          <div className={f.methodBar}>
                            <div
                              className={f.methodBarFill}
                              style={{
                                width: `${pct}%`,
                                background: cfg?.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    },
                  )
                )}
              </div>
            </div>

            {/* Últimas transações */}
            <div className={s.card}>
              <div className={s.cardHeader}>
                <span className={s.cardTitle}>🕐 Últimas Movimentações</span>
                <button
                  className={s.btnGhost}
                  onClick={() => setActiveTab("extrato")}
                >
                  Ver todas →
                </button>
              </div>
              <div className={f.recentList}>
                {(summary?.recentTransactions || []).slice(0, 8).map((tx) => (
                  <div key={tx.id} className={f.recentItem}>
                    <div className={f.recentLeft}>
                      <span className={f.recentMethod}>
                        {METHOD_LABELS[tx.method]?.icon || "💰"}
                      </span>
                      <div>
                        <div className={f.recentDesc}>{tx.description}</div>
                        <div className={f.recentMeta}>
                          {tx.order ? `${tx.order.orderNumber} · ` : ""}
                          {formatDateTime(tx.createdAt)}
                        </div>
                        {tx.order && (
                          <Link
                            href="/dashboard/ordens"
                            className={s.btnSecondary}
                            style={{
                              marginTop: 6,
                              textDecoration: "none",
                              display: "inline-flex",
                              padding: "4px 10px",
                              fontSize: 11,
                            }}
                          >
                            Abrir O.S.
                          </Link>
                        )}
                      </div>
                    </div>
                    <div
                      className={f.recentAmount}
                      style={{
                        color:
                          tx.type === "ENTRADA"
                            ? "var(--status-success)"
                            : "var(--status-error)",
                      }}
                    >
                      {tx.type === "ENTRADA" ? "+" : "-"}
                      {formatCurrency(Number(tx.amount))}
                    </div>
                  </div>
                ))}
                {(summary?.recentTransactions || []).length === 0 && (
                  <div className={f.methodEmpty}>
                    Nenhuma movimentação registrada
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contas a pagar próximas */}
          {(summary?.payables.upcoming || []).length > 0 && (
            <div className={s.card}>
              <div className={s.cardHeader}>
                <span className={s.cardTitle}>
                  ⏰ Contas a Pagar — Próximos 7 Dias
                </span>
                {(summary?.payables.overdueCount || 0) > 0 && (
                  <span className={`${s.badge} ${s.badgeError}`}>
                    ⚠️ {summary?.payables.overdueCount} vencida
                    {summary?.payables.overdueCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <table className={s.table}>
                <thead className={s.tableHead}>
                  <tr>
                    <th>Descrição</th>
                    <th>Fornecedor</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.payables.upcoming.map((p) => (
                    <tr
                      key={p.id}
                      className={s.tableRow}
                      style={{ cursor: "default" }}
                    >
                      <td className={s.cellName}>{p.description}</td>
                      <td>{p.supplier || "—"}</td>
                      <td
                        style={{
                          color:
                            new Date(p.dueDate) < new Date()
                              ? "var(--status-error)"
                              : "var(--text-primary)",
                        }}
                      >
                        {formatDate(p.dueDate)}
                      </td>
                      <td
                        style={{
                          fontWeight: 700,
                          color: "var(--status-error)",
                        }}
                      >
                        {formatCurrency(Number(p.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── ABA EXTRATO ─────────────────────────────────────────── */}
      {activeTab === "extrato" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <div className={s.toolbar}>
            <div className={s.toolbarLeft}>
              <div className={s.searchBox}>
                <span className={s.searchIcon}>🔍</span>
                <input
                  className={s.searchInput}
                  placeholder="Buscar por descrição..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                />
              </div>
              <div className={f.filterTabs}>
                {(["all", "ENTRADA", "SAIDA", "pending"] as const).map((f2) => (
                  <button
                    key={f2}
                    className={txFilter === f2 ? f.filterActive : f.filterBtn}
                    onClick={() => setTxFilter(f2)}
                  >
                    {f2 === "all"
                      ? "Todos"
                      : f2 === "ENTRADA"
                        ? "↑ Entradas"
                        : f2 === "SAIDA"
                          ? "↓ Saídas"
                          : "⏳ A Receber"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={s.card}>
            <table className={s.table}>
              <thead className={s.tableHead}>
                <tr>
                  <th>Descrição</th>
                  <th>Método</th>
                  <th>OS / Cliente</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {txLoading ? (
                  <tr className={s.loadingRow}>
                    <td colSpan={6}>Carregando...</td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className={s.emptyState}>
                        <div className={s.emptyIcon}>💰</div>
                        <p className={s.emptyTitle}>
                          Nenhuma movimentação encontrada
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const mCfg = METHOD_LABELS[tx.method];
                    return (
                      <tr
                        key={tx.id}
                        className={s.tableRow}
                        style={{ cursor: "default" }}
                      >
                        <td className={s.cellName}>{tx.description}</td>
                        <td>
                          <span
                            className={s.badge}
                            style={{
                              background: mCfg?.color + "22",
                              color: mCfg?.color,
                              border: `1px solid ${mCfg?.color}44`,
                            }}
                          >
                            {mCfg?.icon} {mCfg?.label}
                          </span>
                        </td>
                        <td>
                          {tx.order ? (
                            <span>
                              <span
                                style={{
                                  fontFamily: "monospace",
                                  fontSize: 11,
                                }}
                              >
                                {tx.order.orderNumber}
                              </span>
                              <br />
                              <span style={{ fontSize: 11 }}>
                                {tx.order.customer?.name}
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {formatDateTime(tx.createdAt)}
                        </td>
                        <td>
                          {tx.isPending ? (
                            <span className={`${s.badge} ${s.badgeWarning}`}>
                              ⏳ Pendente
                            </span>
                          ) : (
                            <span className={`${s.badge} ${s.badgeSuccess}`}>
                              ✓ Pago
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            fontWeight: 700,
                            textAlign: "right",
                            color:
                              tx.type === "ENTRADA"
                                ? "var(--status-success)"
                                : "var(--status-error)",
                          }}
                        >
                          {tx.type === "ENTRADA" ? "+" : "-"}
                          {formatCurrency(Number(tx.amount))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── ABA CAIXA ───────────────────────────────────────────── */}
      {activeTab === "caixa" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          {cashLoading ? (
            <div className={s.emptyState}>
              <p>Carregando...</p>
            </div>
          ) : openCashData ? (
            <div className={f.cashCard}>
              <div className={f.cashHeader}>
                <div>
                  <div className={f.cashTitle}>🟢 Caixa Aberto</div>
                  <div className={f.cashMeta}>
                    Aberto por {openCashData.openedBy?.name} às{" "}
                    {formatDateTime(openCashData.openedAt)}
                    {Number(openCashData.openAmount) > 0 &&
                      ` · Troco inicial: ${formatCurrency(Number(openCashData.openAmount))}`}
                  </div>
                </div>
                <button
                  className={s.btnSecondary}
                  style={{
                    borderColor: "var(--status-error)",
                    color: "var(--status-error)",
                  }}
                  onClick={() => setShowCloseModal(true)}
                >
                  🔒 Fechar Caixa
                </button>
              </div>
              <div className={f.cashStats}>
                <div className={f.cashStat}>
                  <span className={f.cashStatLabel}>Entradas</span>
                  <span
                    className={f.cashStatValue}
                    style={{ color: "var(--status-success)" }}
                  >
                    {formatCurrency(openCashData.summary?.entradas || 0)}
                  </span>
                </div>
                <div className={f.cashStat}>
                  <span className={f.cashStatLabel}>Saídas</span>
                  <span
                    className={f.cashStatValue}
                    style={{ color: "var(--status-error)" }}
                  >
                    {formatCurrency(openCashData.summary?.saidas || 0)}
                  </span>
                </div>
                <div className={f.cashStat}>
                  <span className={f.cashStatLabel}>Saldo em Caixa</span>
                  <span
                    className={f.cashStatValue}
                    style={{ color: "var(--brand-primary)", fontSize: 22 }}
                  >
                    {formatCurrency(openCashData.summary?.liquido || 0)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className={f.cashCard}>
              <div className={f.cashHeader}>
                <div>
                  <div className={f.cashTitle}>🔴 Caixa Fechado</div>
                  <div className={f.cashMeta}>
                    Nenhum caixa aberto hoje. Abra o caixa para começar a
                    registrar movimentações.
                  </div>
                </div>
              </div>
              <div className={f.openCashForm}>
                <div className={s.fieldGroup} style={{ maxWidth: 260 }}>
                  <label className={s.fieldLabel}>Troco Inicial (R$)</label>
                  <input
                    className={s.fieldInput}
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={openAmount}
                    onChange={(e) => setOpenAmount(e.target.value)}
                  />
                </div>
                <button
                  id="btn-abrir-caixa"
                  className={s.btnPrimary}
                  onClick={handleOpenCash}
                >
                  🔓 Abrir Caixa
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: NOVO LANÇAMENTO ───────────────────────────────── */}
      {showTxModal && (
        <div
          className={s.modalOverlay}
          onClick={(e) => e.target === e.currentTarget && setShowTxModal(false)}
        >
          <div className={s.modal} style={{ maxWidth: 520 }}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Novo Lançamento</h2>
              <button
                className={s.modalClose}
                onClick={() => setShowTxModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveTx}>
              <div className={s.modalBody}>
                {/* Tipo */}
                <div className={s.formSection}>
                  <div className={s.formSectionTitle}>Tipo de Movimentação</div>
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    {(["ENTRADA", "SAIDA"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={
                          txForm.type === t ? s.btnPrimary : s.btnSecondary
                        }
                        style={
                          txForm.type !== t
                            ? {}
                            : {
                                background:
                                  t === "ENTRADA"
                                    ? "var(--status-success)"
                                    : "var(--status-error)",
                              }
                        }
                        onClick={() =>
                          setTxForm((prev) => ({ ...prev, type: t }))
                        }
                      >
                        {t === "ENTRADA" ? "↑ Entrada" : "↓ Saída"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Método + Valor */}
                <div className={s.formSection}>
                  <div className={s.formGrid}>
                    <div className={s.fieldGroup}>
                      <label className={s.fieldLabel}>
                        Método <span className={s.fieldRequired}>*</span>
                      </label>
                      <select
                        className={s.fieldSelect}
                        value={txForm.method}
                        onChange={(e) =>
                          setTxForm((prev) => ({
                            ...prev,
                            method: e.target.value as PaymentMethod,
                          }))
                        }
                        required
                      >
                        {Object.entries(METHOD_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.icon} {v.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={s.fieldGroup}>
                      <label className={s.fieldLabel}>
                        Valor (R$) <span className={s.fieldRequired}>*</span>
                      </label>
                      <input
                        className={s.fieldInput}
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0,00"
                        value={txForm.amount}
                        onChange={(e) =>
                          setTxForm((prev) => ({
                            ...prev,
                            amount: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Descrição */}
                <div className={s.formSection}>
                  <div className={s.fieldGroup}>
                    <label className={s.fieldLabel}>
                      Descrição <span className={s.fieldRequired}>*</span>
                    </label>
                    <input
                      className={s.fieldInput}
                      placeholder="Ex: Pagamento OS-2026-000001, Conta de energia..."
                      value={txForm.description}
                      onChange={(e) =>
                        setTxForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                {/* Parcelamento */}
                {(txForm.method === "CARTAO_CREDITO" ||
                  txForm.method === "CREDIARIO") && (
                  <div className={s.formSection}>
                    <div className={s.formSectionTitle}>Parcelamento</div>
                    <div className={s.formGrid}>
                      <div className={s.fieldGroup}>
                        <label className={s.fieldLabel}>Nº de Parcelas</label>
                        <select
                          className={s.fieldSelect}
                          value={txForm.installments}
                          onChange={(e) =>
                            setTxForm((prev) => ({
                              ...prev,
                              installments: parseInt(e.target.value),
                            }))
                          }
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                            <option key={n} value={n}>
                              {n}x
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={s.fieldGroup}>
                        <label className={s.fieldLabel}>Status</label>
                        <select
                          className={s.fieldSelect}
                          value={String(txForm.isPending)}
                          onChange={(e) =>
                            setTxForm((prev) => ({
                              ...prev,
                              isPending: e.target.value === "true",
                            }))
                          }
                        >
                          <option value="false">Pago agora (1ª parcela)</option>
                          <option value="true">A receber (pendente)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vencimento */}
                <div className={s.formSection}>
                  <div className={s.fieldGroup}>
                    <label className={s.fieldLabel}>
                      Vencimento{" "}
                      {txForm.isPending && (
                        <span className={s.fieldRequired}>*</span>
                      )}
                    </label>
                    <input
                      type="date"
                      className={s.fieldInput}
                      value={txForm.dueDate}
                      onChange={(e) =>
                        setTxForm((prev) => ({
                          ...prev,
                          dueDate: e.target.value,
                        }))
                      }
                      required={txForm.isPending}
                    />
                  </div>
                </div>
              </div>
              <div className={s.modalFooter}>
                <button
                  type="button"
                  className={s.btnSecondary}
                  onClick={() => setShowTxModal(false)}
                >
                  Cancelar
                </button>
                <button
                  id="btn-salvar-tx"
                  type="submit"
                  className={s.btnPrimary}
                  disabled={saving || !txForm.description || !txForm.amount}
                  style={
                    txForm.type === "SAIDA"
                      ? { background: "var(--status-error)" }
                      : {}
                  }
                >
                  {saving
                    ? "Salvando..."
                    : `${txForm.type === "ENTRADA" ? "↑" : "↓"} Registrar`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: FECHAR CAIXA ──────────────────────────────────── */}
      {showCloseModal && (
        <div
          className={s.modalOverlay}
          onClick={(e) =>
            e.target === e.currentTarget && setShowCloseModal(false)
          }
        >
          <div className={s.modal} style={{ maxWidth: 440 }}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>🔒 Fechar Caixa</h2>
              <button
                className={s.modalClose}
                onClick={() => setShowCloseModal(false)}
              >
                ×
              </button>
            </div>
            <div className={s.modalBody}>
              <div
                className={f.cashStats}
                style={{ marginBottom: "var(--space-4)" }}
              >
                <div className={f.cashStat}>
                  <span className={f.cashStatLabel}>Total de Entradas</span>
                  <span
                    className={f.cashStatValue}
                    style={{ color: "var(--status-success)" }}
                  >
                    {formatCurrency(openCashData?.summary?.entradas || 0)}
                  </span>
                </div>
                <div className={f.cashStat}>
                  <span className={f.cashStatLabel}>Total de Saídas</span>
                  <span
                    className={f.cashStatValue}
                    style={{ color: "var(--status-error)" }}
                  >
                    {formatCurrency(openCashData?.summary?.saidas || 0)}
                  </span>
                </div>
                <div className={f.cashStat}>
                  <span className={f.cashStatLabel}>Saldo Esperado</span>
                  <span
                    className={f.cashStatValue}
                    style={{ color: "var(--brand-primary)", fontSize: 18 }}
                  >
                    {formatCurrency(openCashData?.summary?.liquido || 0)}
                  </span>
                </div>
              </div>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>
                  Valor Físico em Caixa (R$)
                </label>
                <input
                  className={s.fieldInput}
                  type="number"
                  step="0.01"
                  placeholder="Contagem do dinheiro em caixa..."
                  value={closeAmount}
                  onChange={(e) => setCloseAmount(e.target.value)}
                />
              </div>
            </div>
            <div className={s.modalFooter}>
              <button
                className={s.btnSecondary}
                onClick={() => setShowCloseModal(false)}
              >
                Cancelar
              </button>
              <button
                id="btn-fechar-caixa"
                className={s.btnPrimary}
                style={{ background: "var(--status-error)" }}
                onClick={handleCloseCash}
              >
                🔒 Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
