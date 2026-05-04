"use client";

import { useState, useEffect } from "react";
import s from "../../shared.module.css";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  labName: string | null;
  labOrderCode: string | null;
  labDeadline: string | null;
  reworkCount: number;
  isSpecialTreatment: boolean;
  treatmentProtocol: string | null;
  slaStatus: "NO_DEADLINE" | "ON_TRACK" | "WARNING" | "CRITICAL" | "OVERDUE";
  customer: { name: string } | null;
}

interface LogisticsSummary {
  total: number;
  avgLeadTimeDays: number | null;
  overdue: number;
  critical: number;
}

const formatDate = (v: string) => {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(v));
};

const COLUMNS = [
  { id: "VALIDATING", title: "Aguardando Laboratório" },
  { id: "LAB_SENT", title: "Enviado ao Lab" },
  { id: "IN_PRODUCTION", title: "Em Produção" },
  { id: "QUALITY_CHECK", title: "Controle de Qualidade" },
  { id: "DELIVERY_READY", title: "Pronto para Retirada" },
];

export default function KanbanLogisticaPage() {
  const [kanban, setKanban] = useState<Record<string, Order[]>>({});
  const [summary, setSummary] = useState<LogisticsSummary>({
    total: 0,
    avgLeadTimeDays: null,
    overdue: 0,
    critical: 0,
  });
  const [loading, setLoading] = useState(true);
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const fetchBoard = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/logistics/orders");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setUiMessage({
          type: "error",
          text: data?.error || "Nao foi possivel carregar o board logistico.",
        });
        setKanban({});
        setSummary({
          total: 0,
          avgLeadTimeDays: null,
          overdue: 0,
          critical: 0,
        });
        return;
      }
      setKanban(data?.kanban || {});
      setSummary(
        data?.summary || {
          total: 0,
          avgLeadTimeDays: null,
          overdue: 0,
          critical: 0,
        },
      );
      setUiMessage(null);
    } catch {
      setUiMessage({
        type: "error",
        text: "Falha ao carregar a operacao logistica.",
      });
      setKanban({});
      setSummary({ total: 0, avgLeadTimeDays: null, overdue: 0, critical: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, []);

  const handleMove = async (orderId: string, newStatus: string) => {
    const res = await fetch("/api/logistics/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, newStatus }),
    });
    if (res.ok) {
      setUiMessage({
        type: "success",
        text: "Estado logistico atualizado com sucesso.",
      });
      fetchBoard();
    } else {
      const data = await res.json().catch(() => null);
      setUiMessage({
        type: "error",
        text: data?.error || "Nao foi possivel mover a ordem no board.",
      });
    }
  };

  if (loading && Object.keys(kanban).length === 0) {
    return (
      <div className={s.page}>
        <div className={s.emptyState}>Carregando Logística...</div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageTitleArea}>
          <h1 className={s.pageTitle}>🚚 Logística e Leva & Traz</h1>
          <p className={s.pageSubtitle}>
            Acompanhamento vivo de Produção e SLA de Laboratórios.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className={s.btnSecondary} onClick={fetchBoard}>
            Atualizar Board
          </button>
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

      <div
        className={s.card}
        style={{
          marginBottom: "var(--space-3)",
          borderLeft: "4px solid var(--brand-primary)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr",
            gap: "var(--space-3)",
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
              Operacao de Laboratorio
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "var(--text-primary)",
              }}
            >
              Fluxo vivo de producao e retirada
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginTop: 4,
              }}
            >
              Use o board para acompanhar gargalos, SLA e transicoes entre
              laboratorio, producao e entrega.
            </div>
          </div>
          <div
            style={{
              padding: "var(--space-3)",
              background: "var(--bg-elevated)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Ordens ativas
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {summary.total}
            </div>
          </div>
          <div
            style={{
              padding: "var(--space-3)",
              background: "var(--bg-elevated)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Risco atual
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color:
                  summary.overdue > 0
                    ? "var(--status-error)"
                    : "var(--text-primary)",
              }}
            >
              {summary.overdue} atrasadas / {summary.critical} criticas
            </div>
          </div>
        </div>
      </div>

      {/* KPIs SLA */}
      <div className={s.kpiGrid}>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Total Produção</div>
          <div className={s.kpiValue}>{summary.total || 0}</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Lead Time Médio Lab</div>
          <div className={s.kpiValue}>
            {summary.avgLeadTimeDays !== null
              ? `${summary.avgLeadTimeDays} dias`
              : "N/A"}
          </div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Atrasados / Críticos</div>
          <div
            className={s.kpiValue}
            style={{
              color: summary.overdue > 0 ? "var(--status-error)" : "inherit",
            }}
          >
            {summary.overdue || 0} / {summary.critical || 0}
          </div>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          minHeight: "65vh",
          paddingBottom: 16,
        }}
      >
        {COLUMNS.map((col) => {
          const columnOrders = kanban[col.id] || [];
          return (
            <div
              key={col.id}
              style={{
                flex: "0 0 300px",
                background: "var(--surface-secondary)",
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-3)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                  }}
                >
                  {col.title}
                </h3>
                <div
                  className={s.badge}
                  style={{ background: "var(--surface-primary)" }}
                >
                  {columnOrders.length}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                  flex: 1,
                  overflowY: "auto",
                }}
              >
                {columnOrders.map((order) => (
                  <div
                    key={order.id}
                    style={{
                      background: "var(--surface-primary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      padding: "var(--space-3)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      borderLeft:
                        order.slaStatus === "OVERDUE"
                          ? "4px solid var(--status-error)"
                          : order.slaStatus === "CRITICAL"
                            ? "4px solid var(--status-warning)"
                            : "4px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          fontFamily: "monospace",
                        }}
                      >
                        {order.orderNumber}
                      </span>
                      {order.isSpecialTreatment && (
                        <span
                          title={order.treatmentProtocol || "Especial"}
                          style={{ fontSize: 14 }}
                        >
                          🩺
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {order.customer?.name}
                    </div>

                    {/* Detalhes do Lab */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        background: "var(--surface-secondary)",
                        padding: "6px 8px",
                        borderRadius: 4,
                      }}
                    >
                      <div>🏢 {order.labName || "Não Atribuído"}</div>
                      {(order.slaStatus === "OVERDUE" ||
                        order.slaStatus === "CRITICAL") &&
                        order.labDeadline && (
                          <div
                            style={{
                              color: "var(--status-error)",
                              fontWeight: 600,
                            }}
                          >
                            ⏰ Prazo: {formatDate(order.labDeadline)}
                          </div>
                        )}
                    </div>

                    {/* Ações de Estado */}
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      {COLUMNS.findIndex((c) => c.id === col.id) > 0 && (
                        <button
                          onClick={() =>
                            handleMove(
                              order.id,
                              COLUMNS[
                                COLUMNS.findIndex((c) => c.id === col.id) - 1
                              ].id,
                            )
                          }
                          style={{
                            flex: 1,
                            fontSize: 11,
                            padding: "4px",
                            background: "var(--surface-secondary)",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          ← Voltar
                        </button>
                      )}
                      {COLUMNS.findIndex((c) => c.id === col.id) <
                        COLUMNS.length - 1 && (
                        <button
                          onClick={() =>
                            handleMove(
                              order.id,
                              COLUMNS[
                                COLUMNS.findIndex((c) => c.id === col.id) + 1
                              ].id,
                            )
                          }
                          style={{
                            flex: 1,
                            fontSize: 11,
                            padding: "4px",
                            background: "var(--text-primary)",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          Avançar →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {columnOrders.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--text-tertiary)",
                      fontSize: 12,
                      padding: "24px 0",
                    }}
                  >
                    Estágio Vazio
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
