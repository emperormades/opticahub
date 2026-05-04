"use client";

import {
  buildOperationalWhatsAppMessage,
  buildOperationalWhatsAppUrl,
} from "@/lib/integrations/whatsapp-operational";
import { useCallback, useEffect, useMemo, useState } from "react";
import s from "../../shared.module.css";

interface OverdueInstallment {
  id: string;
  number: number;
  dueDate: string;
  amount: number;
  isPaid: boolean;
  paidAt: string | null;
  penaltyAmount: number;
  interestAmount: number;
  paymentLink: string | null;
  transaction: {
    amount: number;
    order?: {
      orderNumber: string;
      customer: { name: string; whatsapp: string | null; phone: string | null };
    } | null;
  };
}

interface CustomerDebtBucket {
  customerName: string;
  phone: string | null;
  installments: Array<{
    id: string;
    orderNumber: string;
    number: number;
    dueDate: string;
    daysLate: number;
    principal: number;
    estimatedPenalty: number;
    estimatedInterest: number;
    estimatedTotal: number;
  }>;
  overdueCount: number;
  totalPrincipal: number;
  totalEstimated: number;
  maxDaysLate: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

function calculateDebtSnapshot(installment: OverdueInstallment) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${installment.dueDate}T12:00:00`);
  const daysLate = Math.max(
    1,
    Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const principal = Number(installment.amount);
  const estimatedPenalty = Math.round(principal * 0.02 * 100) / 100;
  const estimatedInterest =
    Math.round(principal * (0.01 / 30) * daysLate * 100) / 100;
  const estimatedTotal = principal + estimatedPenalty + estimatedInterest;

  return {
    daysLate,
    principal,
    estimatedPenalty,
    estimatedInterest,
    estimatedTotal,
  };
}

export default function InadimplentesPage() {
  const [loading, setLoading] = useState(true);
  const [installments, setInstallments] = useState<OverdueInstallment[]>([]);
  const [search, setSearch] = useState("");
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const loadOverdue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/financial/carne?status=overdue");
      const result = await res.json().catch(() => null);

      if (!res.ok) {
        setInstallments([]);
        setUiMessage({
          type: "error",
          text: result?.error || "Nao foi possivel carregar os inadimplentes.",
        });
        return;
      }

      setInstallments(Array.isArray(result) ? result : []);
      setUiMessage(null);
    } catch {
      setInstallments([]);
      setUiMessage({
        type: "error",
        text: "Falha ao carregar as parcelas vencidas.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverdue();
  }, [loadOverdue]);

  const grouped = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const map = new Map<string, CustomerDebtBucket>();

    for (const installment of installments) {
      const customerName =
        installment.transaction.order?.customer.name || "Cliente sem nome";
      const phone =
        installment.transaction.order?.customer.whatsapp ||
        installment.transaction.order?.customer.phone ||
        null;
      const snapshot = calculateDebtSnapshot(installment);

      if (
        normalizedSearch &&
        !customerName.toLowerCase().includes(normalizedSearch) &&
        !(installment.transaction.order?.orderNumber || "")
          .toLowerCase()
          .includes(normalizedSearch)
      ) {
        continue;
      }

      const key = `${customerName}:${phone || ""}`;
      if (!map.has(key)) {
        map.set(key, {
          customerName,
          phone,
          installments: [],
          overdueCount: 0,
          totalPrincipal: 0,
          totalEstimated: 0,
          maxDaysLate: 0,
        });
      }

      const bucket = map.get(key)!;
      bucket.installments.push({
        id: installment.id,
        orderNumber: installment.transaction.order?.orderNumber || "-",
        number: installment.number,
        dueDate: installment.dueDate,
        ...snapshot,
      });
      bucket.overdueCount += 1;
      bucket.totalPrincipal += snapshot.principal;
      bucket.totalEstimated += snapshot.estimatedTotal;
      bucket.maxDaysLate = Math.max(bucket.maxDaysLate, snapshot.daysLate);
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.maxDaysLate !== a.maxDaysLate) return b.maxDaysLate - a.maxDaysLate;
      return b.totalEstimated - a.totalEstimated;
    });
  }, [installments, search]);

  const totals = useMemo(() => {
    return grouped.reduce(
      (acc, customer) => {
        acc.customers += 1;
        acc.installments += customer.overdueCount;
        acc.principal += customer.totalPrincipal;
        acc.estimated += customer.totalEstimated;
        return acc;
      },
      { customers: 0, installments: 0, principal: 0, estimated: 0 },
    );
  }, [grouped]);

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageTitleArea}>
          <h1 className={s.pageTitle}>Inadimplentes do Crediario</h1>
          <p className={s.pageSubtitle}>
            Fila de cobranca manual para parcelas vencidas, com aging e valor
            estimado atualizado
          </p>
        </div>
        <button className={s.btnSecondary} onClick={() => loadOverdue()}>
          Atualizar
        </button>
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
            label: "Clientes",
            value: String(totals.customers),
            color: "#0f172a",
            bg: "#e2e8f0",
          },
          {
            label: "Parcelas",
            value: String(totals.installments),
            color: "#dc2626",
            bg: "#fee2e2",
          },
          {
            label: "Principal",
            value: formatCurrency(totals.principal),
            color: "#6366f1",
            bg: "#eef2ff",
          },
          {
            label: "Cobranca Estimada",
            value: formatCurrency(totals.estimated),
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
                fontSize: 24,
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

      <div
        className={s.card}
        style={{
          padding: "var(--space-4)",
          marginBottom: "var(--space-4)",
          display: "flex",
          gap: "var(--space-3)",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          className={s.fieldInput}
          placeholder="Buscar por cliente ou OS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            fontWeight: 700,
          }}
        >
          Recálculo em tempo real por dias de atraso, multa e juros estimados
        </div>
      </div>

      <div className={s.card}>
        <div className={s.cardHeader}>
          <span className={s.cardTitle}>Fila de Cobranca</span>
          <span className={s.cardCount}>{grouped.length} clientes</span>
        </div>

        {loading ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>...</div>
            <p className={s.emptyText}>Carregando inadimplentes...</p>
          </div>
        ) : grouped.length === 0 ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>OK</div>
            <p className={s.emptyTitle}>Nenhum cliente inadimplente</p>
            <p className={s.emptyText}>
              As parcelas vencidas do crediario aparecerao aqui.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "var(--space-3)",
              padding: "0 var(--space-4) var(--space-4)",
            }}
          >
            {grouped.map((customer) => {
              const leadInstallment = customer.installments[0];
              const whatsappUrl = buildOperationalWhatsAppUrl(
                customer.phone,
                buildOperationalWhatsAppMessage("overdue_collection", {
                  customerName: customer.customerName,
                  overdueCount: customer.overdueCount,
                  estimatedTotal: formatCurrency(customer.totalEstimated),
                }),
              );

              return (
                <div
                  key={`${customer.customerName}-${customer.phone || "sem-contato"}`}
                  style={{
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-lg)",
                    padding: "16px 18px",
                    background: "var(--bg-base)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "var(--space-3)",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 900,
                          color: "var(--text-primary)",
                        }}
                      >
                        {customer.customerName}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          marginTop: 4,
                        }}
                      >
                        {customer.phone || "Sem telefone principal"} •{" "}
                        {customer.overdueCount} parcela(s) •{" "}
                        {customer.maxDaysLate} dia(s) de atraso maximo
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-tertiary)",
                          fontWeight: 700,
                        }}
                      >
                        Cobrar agora
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 900,
                          color: "#dc2626",
                        }}
                      >
                        {formatCurrency(customer.totalEstimated)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                    {customer.installments.map((installment) => (
                      <div
                        key={installment.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
                          gap: 12,
                          padding: "10px 12px",
                          borderRadius: 10,
                          background: "#fff7ed",
                          border: "1px solid #fed7aa",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: "var(--text-primary)",
                            }}
                          >
                            {installment.orderNumber} • Parcela{" "}
                            {installment.number}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-secondary)",
                            }}
                          >
                            Venceu em {formatDate(installment.dueDate)}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#b45309",
                          }}
                        >
                          {installment.daysLate} dia(s)
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {formatCurrency(installment.principal)} +{" "}
                          {formatCurrency(
                            installment.estimatedPenalty +
                              installment.estimatedInterest,
                          )}
                        </div>
                        <div
                          style={{
                            textAlign: "right",
                            fontSize: 13,
                            fontWeight: 900,
                            color: "#dc2626",
                          }}
                        >
                          {formatCurrency(installment.estimatedTotal)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{ fontSize: 12, color: "var(--text-secondary)" }}
                    >
                      Parcela mais urgente: {leadInstallment.orderNumber} •{" "}
                      {leadInstallment.daysLate} dia(s) de atraso
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <a
                        href="/dashboard/financeiro/carne?status=overdue"
                        className={s.btnSecondary}
                        style={{
                          textDecoration: "none",
                          display: "inline-flex",
                          fontSize: 12,
                          padding: "6px 10px",
                        }}
                      >
                        Abrir Carnê
                      </a>
                      {whatsappUrl ? (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={s.btnSecondary}
                          style={{
                            textDecoration: "none",
                            display: "inline-flex",
                            fontSize: 12,
                            padding: "6px 10px",
                          }}
                        >
                          Cobrar no WhatsApp
                        </a>
                      ) : (
                        <span className={s.badge}>Sem contato</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
