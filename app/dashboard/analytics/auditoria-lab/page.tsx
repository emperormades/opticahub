"use client";

import { useState, useEffect } from "react";
import s from "../../shared.module.css";

interface InvoiceItem {
  id: string;
  orderNumber: string | null;
  description: string;
  quantity: number;
  unitPrice: string | number;
  totalPrice: string | number;
  matchStatus: string;
  divergenceNotes: string | null;
  linkedOrder: {
    orderNumber: string;
    labCost: string;
    reworkCount: number;
    reworkCause: string;
  } | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  labName: string;
  issueDate: string;
  totalAmount: string | number;
  status: "PENDING_CONCILIATION" | "CONCILIATED" | "DIVERGENT";
  items: InvoiceItem[];
  createdAt: string;
}

const parseCurrency = (v: number | string | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v || 0),
  );
const formatDate = (v: string) => new Date(v).toLocaleDateString("pt-BR");

export default function AuditoriaLabPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/laboratory/invoices");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setUiMessage({
          type: "error",
          text:
            data?.error ||
            "Nao foi possivel carregar as faturas do laboratorio.",
        });
        setInvoices([]);
        return;
      }
      setInvoices(data?.invoices || []);
      setUiMessage(null);
    } catch {
      setUiMessage({
        type: "error",
        text: "Falha ao carregar a auditoria de laboratorio.",
      });
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Simular uploade de XML que gera divergência
  const handleSimulateDivergent = async () => {
    setIsSimulating(true);
    try {
      const payload = {
        labName: "Laboratório Integrado Padrão",
        totalAmount: 950.0,
        // Usando uma OS que não existe e outra que cobraram errado (Multifocal simulado)
        items: [
          {
            orderNumber: "OS-UNKNOWN-99",
            description: "Surfaçagem Lente Visão Simples",
            quantity: 1,
            unitPrice: 150,
            totalPrice: 150,
          },
          {
            orderNumber: "OS-2026-000001",
            description: "Multifocal Progressiva Premium",
            quantity: 1,
            unitPrice: 800,
            totalPrice: 800,
          },
        ],
      };
      await fetch("/api/laboratory/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setUiMessage({
        type: "success",
        text: "XML divergente simulado com sucesso para auditoria.",
      });
      await fetchInvoices();
    } catch {
      setUiMessage({
        type: "error",
        text: "Falha ao simular a importacao do XML de laboratorio.",
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const valConciliado = invoices
    .filter((i) => i.status === "CONCILIATED")
    .reduce((sum, i) => sum + Number(i.totalAmount), 0);
  const valDivergente = invoices
    .filter((i) => i.status === "DIVERGENT")
    .reduce((sum, i) => sum + Number(i.totalAmount), 0);

  if (loading && invoices.length === 0) {
    return (
      <div className={s.page}>
        <div className={s.emptyState}>Carregando Dashboards...</div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageTitleArea}>
          <h1 className={s.pageTitle}>
            🛡️ Auditoria Financeira de Precisão (DRE Blindado)
          </h1>
          <p className={s.pageSubtitle}>
            Conciliação automatizada de Notas Fiscais (XML) do Laboratório vs.
            Ordens de Serviço.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            className={s.btnPrimary}
            onClick={handleSimulateDivergent}
            disabled={isSimulating}
          >
            {isSimulating
              ? "Simulando XML..."
              : "Simular Importação XML (Divergente)"}
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
              Eixo de Auditoria Lab
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "var(--text-primary)",
              }}
            >
              Conferencia antes de liberar pagamento
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginTop: 4,
              }}
            >
              Compare nota recebida com a O.S. da loja para evitar glosa,
              vazamento financeiro e custo sem lastro.
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
              Faturas
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {invoices.length} processadas
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
              Risco retido
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color:
                  valDivergente > 0
                    ? "var(--status-error)"
                    : "var(--text-primary)",
              }}
            >
              {parseCurrency(valDivergente)}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className={s.kpiGrid}>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Total Conciliado (Liberado)</div>
          <div
            className={s.kpiValue}
            style={{ color: "var(--status-success)" }}
          >
            {parseCurrency(valConciliado)}
          </div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Total Glosado/Divergente (Retido)</div>
          <div className={s.kpiValue} style={{ color: "var(--status-error)" }}>
            {parseCurrency(valDivergente)}
          </div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Notas com Vazamento/Remake</div>
          <div className={s.kpiValue}>
            {
              invoices.filter((i) =>
                i.items.some((it) => it.linkedOrder?.reworkCount),
              ).length
            }
          </div>
        </div>
      </div>

      {/* Faturas list */}
      <div className={s.card}>
        <div className={s.cardHeader}>
          <div className={s.cardTitle}>Faturas de Laboratório Processadas</div>
        </div>

        {invoices.length === 0 ? (
          <div className={s.emptyState}>Nenhuma fatura recebida ainda.</div>
        ) : (
          <div
            style={{
              padding: "0 var(--space-4) var(--space-4)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-3)",
                  borderLeft: `6px solid ${invoice.status === "CONCILIATED" ? "var(--status-success)" : invoice.status === "DIVERGENT" ? "var(--status-error)" : "var(--status-warning)"}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                      {invoice.labName} — {invoice.invoiceNumber}
                    </h3>
                    <div
                      style={{ fontSize: 13, color: "var(--text-secondary)" }}
                    >
                      Emissão: {formatDate(invoice.issueDate)} • Recebido:{" "}
                      {formatDate(invoice.createdAt)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {parseCurrency(invoice.totalAmount)}
                    </div>
                    <span
                      className={s.badge}
                      style={{
                        marginTop: 4,
                        background:
                          invoice.status === "CONCILIATED"
                            ? "#10b98122"
                            : "#ef444422",
                        color:
                          invoice.status === "CONCILIATED"
                            ? "#059669"
                            : "#dc2626",
                      }}
                    >
                      {invoice.status === "CONCILIATED"
                        ? "✓ Conciliado (Pag. Liberado)"
                        : "❌ Divergência Encontrada"}
                    </span>
                  </div>
                </div>

                <table
                  className={s.table}
                  style={{ borderTop: "1px solid var(--border-subtle)" }}
                >
                  <thead className={s.tableHead}>
                    <tr>
                      <th>Item na NF / XML</th>
                      <th>Ref. OS (Loja)</th>
                      <th>Valor</th>
                      <th>Status Conciliação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => (
                      <tr
                        key={item.id}
                        className={s.tableRow}
                        style={{
                          background:
                            item.matchStatus !== "MATCHED_OK"
                              ? "#ef44440a"
                              : "transparent",
                        }}
                      >
                        <td className={s.cellName} style={{ minWidth: 200 }}>
                          {item.description}
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--text-tertiary)",
                            }}
                          >
                            {item.quantity}x unit.
                          </div>
                        </td>
                        <td>
                          <span
                            style={{ fontWeight: 600, fontFamily: "monospace" }}
                          >
                            {item.orderNumber || "—"}
                          </span>
                          {item.linkedOrder?.reworkCause && (
                            <div style={{ color: "#b45309", fontSize: 12 }}>
                              ⚠️ Retrabalho: {item.linkedOrder.reworkCause}
                            </div>
                          )}
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          {parseCurrency(item.totalPrice)}
                        </td>
                        <td>
                          {item.matchStatus === "MATCHED_OK" ? (
                            <span
                              style={{
                                color: "var(--status-success)",
                                fontSize: 13,
                                fontWeight: 600,
                              }}
                            >
                              ✓ Válido
                            </span>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <span
                                style={{
                                  color: "var(--status-error)",
                                  fontSize: 13,
                                  fontWeight: 600,
                                }}
                              >
                                ❌ Divergente / Glosa
                              </span>
                              <span
                                style={{
                                  color: "var(--text-secondary)",
                                  fontSize: 12,
                                  maxWidth: 300,
                                  whiteSpace: "normal",
                                  lineHeight: 1.4,
                                  marginTop: 4,
                                }}
                              >
                                {item.divergenceNotes}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
