"use client";

import {
  buildOperationalWhatsAppMessage,
  buildOperationalWhatsAppUrl,
} from "@/lib/integrations/whatsapp-operational";
import { useCallback, useEffect, useMemo, useState } from "react";
import s from "../../shared.module.css";

interface ExpiringCustomer {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  prescriptionExpiresAt: string | null;
  daysUntilExpiry: number | null;
  lifetimeValue: number;
  rfmScore: string | null;
  latestPrescription: {
    id: string;
    version: number;
    prescribedAt: string;
    prescribedBy: string | null;
  } | null;
}

interface ExpiringPayload {
  summary: {
    total: number;
    overdue: number;
    dueToday: number;
    next7Days: number;
    next30Days: number;
  };
  customers: ExpiringCustomer[];
}

function formatDate(value: string | null) {
  if (!value) return "Nao informado";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getStatus(customer: ExpiringCustomer) {
  const days = customer.daysUntilExpiry;
  if (days === null) {
    return { label: "Sem data", color: "#64748b", bg: "#e2e8f0" };
  }
  if (days < 0) {
    return {
      label: `Vencida ha ${Math.abs(days)}d`,
      color: "#dc2626",
      bg: "#fee2e2",
    };
  }
  if (days === 0) {
    return { label: "Vence hoje", color: "#ea580c", bg: "#ffedd5" };
  }
  if (days <= 7) {
    return { label: `Vence em ${days}d`, color: "#b45309", bg: "#fef3c7" };
  }
  return { label: `Vence em ${days}d`, color: "#6366f1", bg: "#eef2ff" };
}

export default function ReceitasExpirandoPage() {
  const [status, setStatus] = useState<"all" | "expiring" | "overdue">("all");
  const [daysAhead, setDaysAhead] = useState(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ExpiringPayload | null>(null);
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      params.set("daysAhead", String(daysAhead));

      const res = await fetch(
        `/api/customers/expiring-prescriptions?${params}`,
      );
      const result = await res.json().catch(() => null);

      if (!res.ok) {
        setData(null);
        setUiMessage({
          type: "error",
          text: result?.error || "Nao foi possivel carregar o painel.",
        });
        return;
      }

      setData(result);
      setUiMessage(null);
    } catch {
      setData(null);
      setUiMessage({
        type: "error",
        text: "Falha ao carregar as receitas a expirar.",
      });
    } finally {
      setLoading(false);
    }
  }, [status, daysAhead]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const orderedCustomers = useMemo(() => {
    return [...(data?.customers || [])].sort((a, b) => {
      const aDays = a.daysUntilExpiry ?? 9999;
      const bDays = b.daysUntilExpiry ?? 9999;
      return aDays - bDays;
    });
  }, [data]);

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageTitleArea}>
          <h1 className={s.pageTitle}>Receitas a Expirar</h1>
          <p className={s.pageSubtitle}>
            Painel manual para reativacao, recaptura e contato preventivo do
            paciente
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            className={s.fieldSelect}
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "all" | "expiring" | "overdue")
            }
            style={{ width: 170 }}
          >
            <option value="all">Todas no periodo</option>
            <option value="expiring">A expirar</option>
            <option value="overdue">Ja vencidas</option>
          </select>
          <select
            className={s.fieldSelect}
            value={daysAhead}
            onChange={(e) => setDaysAhead(Number(e.target.value))}
            style={{ width: 150 }}
          >
            {[7, 15, 30, 45, 60].map((days) => (
              <option key={days} value={days}>
                {days} dias
              </option>
            ))}
          </select>
          <button className={s.btnSecondary} onClick={() => loadDashboard()}>
            Atualizar
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
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-5)",
        }}
      >
        {[
          {
            label: "No Radar",
            value: data?.summary.total || 0,
            color: "#0f172a",
            bg: "#e2e8f0",
          },
          {
            label: "Vencidas",
            value: data?.summary.overdue || 0,
            color: "#dc2626",
            bg: "#fee2e2",
          },
          {
            label: "Vence Hoje",
            value: data?.summary.dueToday || 0,
            color: "#ea580c",
            bg: "#ffedd5",
          },
          {
            label: "Prox. 7 Dias",
            value: data?.summary.next7Days || 0,
            color: "#b45309",
            bg: "#fef3c7",
          },
        ].map((card) => (
          <div
            key={card.label}
            className={s.card}
            style={{ padding: "var(--space-4)" }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {card.label}
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 28,
                fontWeight: 900,
                color: card.color,
              }}
            >
              {card.value}
            </div>
            <div
              style={{
                marginTop: 8,
                height: 8,
                borderRadius: 999,
                background: card.bg,
              }}
            />
          </div>
        ))}
      </div>

      <div className={s.card}>
        <div className={s.cardHeader}>
          <span className={s.cardTitle}>Fila de Reativacao</span>
          <span className={s.cardCount}>
            {data?.customers.length || 0} pacientes
          </span>
        </div>

        {loading ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>...</div>
            <p className={s.emptyText}>Carregando pacientes...</p>
          </div>
        ) : orderedCustomers.length === 0 ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>OK</div>
            <p className={s.emptyTitle}>Nenhuma receita no radar</p>
            <p className={s.emptyText}>
              Os pacientes com receita vencida ou prestes a vencer aparecerao
              aqui.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={s.table}>
              <thead className={s.tableHead}>
                <tr>
                  <th>Paciente</th>
                  <th>Ultima Receita</th>
                  <th>Validade</th>
                  <th style={{ textAlign: "right" }}>LTV</th>
                  <th style={{ textAlign: "center" }}>RFM</th>
                  <th style={{ textAlign: "center" }}>Contato</th>
                </tr>
              </thead>
              <tbody>
                {orderedCustomers.map((customer) => {
                  const statusMeta = getStatus(customer);
                  const phone = customer.whatsapp || customer.phone;
                  const whatsappUrl = buildOperationalWhatsAppUrl(
                    phone,
                    buildOperationalWhatsAppMessage("prescription_expiring", {
                      customerName: customer.name,
                      statusLabel:
                        customer.daysUntilExpiry !== null &&
                        customer.daysUntilExpiry < 0
                          ? "vencida"
                          : "proxima do vencimento",
                    }),
                  );

                  return (
                    <tr key={customer.id} className={s.tableRow}>
                      <td>
                        <div className={s.cellName}>{customer.name}</div>
                        <div className={s.cellMeta}>
                          {phone || "Sem telefone principal"}
                        </div>
                      </td>
                      <td>
                        {customer.latestPrescription ? (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>
                              v{customer.latestPrescription.version}
                            </div>
                            <div className={s.cellMeta}>
                              {formatDate(
                                customer.latestPrescription.prescribedAt,
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className={`${s.badge} ${s.badgeWarning}`}>
                            Sem receita
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                          {formatDate(customer.prescriptionExpiresAt)}
                        </div>
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: 6,
                            padding: "3px 10px",
                            borderRadius: 20,
                            background: statusMeta.bg,
                            color: statusMeta.color,
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 800 }}>
                        {formatCurrency(customer.lifetimeValue)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={s.badge}>
                          {customer.rfmScore || "SEM_HISTORICO"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {whatsappUrl ? (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={s.btnSecondary}
                            style={{
                              textDecoration: "none",
                              display: "inline-flex",
                              padding: "6px 10px",
                              fontSize: 12,
                            }}
                          >
                            WhatsApp
                          </a>
                        ) : (
                          <span className={s.badge}>Sem contato</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
