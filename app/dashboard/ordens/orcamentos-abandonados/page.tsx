"use client";

import {
  buildOperationalWhatsAppMessage,
  buildOperationalWhatsAppUrl,
} from "@/lib/integrations/whatsapp-operational";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import s from "../../shared.module.css";

interface AbandonedDraftOrder {
  id: string;
  orderNumber: string;
  total: number;
  ageHours: number;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    whatsapp: string | null;
  };
  seller: {
    id: string;
    name: string;
  };
  items: Array<{
    id: string;
    description: string;
    total: number;
  }>;
  lastEvent: {
    createdAt: string;
    notes: string | null;
  } | null;
}

interface AbandonedDraftPayload {
  summary: {
    total: number;
    olderThan72h: number;
    olderThan120h: number;
    pipelineValue: number;
  };
  orders: AbandonedDraftOrder[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getAgingMeta(ageHours: number) {
  if (ageHours >= 120) {
    return {
      label: `${ageHours}h sem fechar`,
      color: "#dc2626",
      bg: "#fee2e2",
    };
  }
  if (ageHours >= 72) {
    return { label: `${ageHours}h em risco`, color: "#b45309", bg: "#fef3c7" };
  }
  return { label: `${ageHours}h em aberto`, color: "#6366f1", bg: "#eef2ff" };
}

export default function OrcamentosAbandonadosPage() {
  const router = useRouter();
  const [minAgeHours, setMinAgeHours] = useState(48);
  const [maxAgeHours, setMaxAgeHours] = useState(168);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AbandonedDraftPayload | null>(null);
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        minAgeHours: String(minAgeHours),
        maxAgeHours: String(maxAgeHours),
      });
      const res = await fetch(`/api/orders/abandoned-drafts?${params}`);
      const result = await res.json().catch(() => null);

      if (!res.ok) {
        setData(null);
        setUiMessage({
          type: "error",
          text: result?.error || "Nao foi possivel carregar os orcamentos.",
        });
        return;
      }

      setData(result);
      setUiMessage(null);
    } catch {
      setData(null);
      setUiMessage({
        type: "error",
        text: "Falha ao carregar os orcamentos abandonados.",
      });
    } finally {
      setLoading(false);
    }
  }, [minAgeHours, maxAgeHours]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const prioritizedOrders = useMemo(() => {
    return [...(data?.orders || [])].sort((a, b) => b.ageHours - a.ageHours);
  }, [data]);

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageTitleArea}>
          <h1 className={s.pageTitle}>Orcamentos Abandonados</h1>
          <p className={s.pageSubtitle}>
            Fila manual de resgate comercial para drafts parados no funil
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            className={s.fieldSelect}
            value={minAgeHours}
            onChange={(e) => setMinAgeHours(Number(e.target.value))}
            style={{ width: 170 }}
          >
            {[24, 48, 72].map((hours) => (
              <option key={hours} value={hours}>
                Min. {hours} horas
              </option>
            ))}
          </select>
          <select
            className={s.fieldSelect}
            value={maxAgeHours}
            onChange={(e) => setMaxAgeHours(Number(e.target.value))}
            style={{ width: 170 }}
          >
            {[120, 168, 240, 336].map((hours) => (
              <option key={hours} value={hours}>
                Ate {hours} horas
              </option>
            ))}
          </select>
          <button className={s.btnSecondary} onClick={() => loadDrafts()}>
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
            label: "72h+ em Risco",
            value: data?.summary.olderThan72h || 0,
            color: "#b45309",
            bg: "#fef3c7",
          },
          {
            label: "120h+ Criticos",
            value: data?.summary.olderThan120h || 0,
            color: "#dc2626",
            bg: "#fee2e2",
          },
          {
            label: "Pipeline em Risco",
            value: formatCurrency(data?.summary.pipelineValue || 0),
            color: "#6366f1",
            bg: "#eef2ff",
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

      <div className={s.card}>
        <div className={s.cardHeader}>
          <span className={s.cardTitle}>Fila de Resgate</span>
          <span className={s.cardCount}>{data?.orders.length || 0} drafts</span>
        </div>

        {loading ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>...</div>
            <p className={s.emptyText}>Carregando orcamentos...</p>
          </div>
        ) : prioritizedOrders.length === 0 ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>OK</div>
            <p className={s.emptyTitle}>Nenhum draft parado nessa janela</p>
            <p className={s.emptyText}>
              Os orcamentos abertos e sem avance dentro da janela selecionada
              aparecerao aqui.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={s.table}>
              <thead className={s.tableHead}>
                <tr>
                  <th>OS / Cliente</th>
                  <th>Item Principal</th>
                  <th>Responsavel</th>
                  <th style={{ textAlign: "right" }}>Valor</th>
                  <th style={{ textAlign: "center" }}>Aging</th>
                  <th style={{ textAlign: "center" }}>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {prioritizedOrders.map((order) => {
                  const aging = getAgingMeta(order.ageHours);
                  const phone = order.customer.whatsapp || order.customer.phone;
                  const leadItem =
                    order.items[0]?.description || "Pacote optico";
                  const whatsappUrl = buildOperationalWhatsAppUrl(
                    phone,
                    buildOperationalWhatsAppMessage("abandoned_quote", {
                      customerName: order.customer.name,
                      sellerName: order.seller.name,
                      orderNumber: order.orderNumber,
                      leadItem,
                    }),
                  );

                  return (
                    <tr key={order.id} className={s.tableRow}>
                      <td>
                        <div className={s.cellName}>{order.orderNumber}</div>
                        <div className={s.cellMeta}>
                          {order.customer.name} • criada em{" "}
                          {formatDate(order.createdAt)}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                          {leadItem}
                        </div>
                        <div className={s.cellMeta}>
                          {order.items.length} item(ns)
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                          {order.seller.name}
                        </div>
                        <div className={s.cellMeta}>
                          {phone || "Sem telefone principal"}
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 900 }}>
                        {formatCurrency(order.total)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 20,
                            background: aging.bg,
                            color: aging.color,
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          {aging.label}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          <button
                            type="button"
                            className={s.btnSecondary}
                            onClick={() =>
                              router.push(`/dashboard/ordens/${order.id}`)
                            }
                            style={{ fontSize: 12, padding: "6px 10px" }}
                          >
                            Abrir OS
                          </button>
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
                        </div>
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
