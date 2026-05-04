"use client";

import { useState, useEffect, useCallback } from "react";
import s from "../../shared.module.css";

const formatCurrency = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v || 0),
  );

const formatPct = (v: number | null | undefined) => `${(v ?? 0).toFixed(1)}%`;

const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

interface DRERow {
  label: string;
  value: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  isDeduction?: boolean;
  indent?: boolean;
  pct?: number | null;
  accent?: string;
}

interface DREData {
  period: { month: number; year: number };
  dre: {
    faturamentoBruto: number;
    deducoes: number;
    receitaLiquida: number;
    custosMercadoria: {
      cmvTotal: number;
      labCostTotal: number;
      comissoesTotal: number;
      taxasCartao: number;
      total: number;
    };
    margemContribuicao: number;
    margemContribuicaoPct: number;
    custosFixos: { total: number; byCategory: Record<string, number> };
    ebitda: number;
    ebitdaMarginPct: number;
    depreciacao: { total: number; assets: { name: string; monthly: number }[] };
    lucroLiquido: number;
    lucroLiquidoMarginPct: number;
  };
  indicators: {
    breakEven: number | null;
    margemSegurancaAbs: number | null;
    margemSegurancaPct: number | null;
    ordersCount: number;
    ticketMedio: number;
  };
}

export default function DrePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<DREData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const fetchDRE = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/dre?month=${month}&year=${year}`);
      const result = await res.json().catch(() => null);
      if (!res.ok) {
        setUiMessage({
          type: "error",
          text: result?.error || "Nao foi possivel calcular o DRE.",
        });
        setData(null);
        return;
      }
      setData(result);
      setUiMessage(null);
    } catch {
      setUiMessage({ type: "error", text: "Falha ao carregar o DRE." });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchDRE();
  }, [fetchDRE]);

  const dre = data?.dre;
  const ind = data?.indicators;

  // Montar as linhas da cascata DRE
  const rows: DRERow[] = dre
    ? [
        {
          label: "Faturamento Bruto",
          value: dre.faturamentoBruto,
          isSubtotal: true,
          accent: "#0ea5e9",
        },
        {
          label: "(-) Devoluções e Cancelamentos",
          value: -dre.deducoes,
          isDeduction: true,
          indent: true,
        },
        {
          label: "(=) Receita Líquida",
          value: dre.receitaLiquida,
          isTotal: true,
          accent: "#6366f1",
        },
        {
          label: "(-) CMV — Custo das Mercadorias",
          value: -dre.custosMercadoria.cmvTotal,
          isDeduction: true,
          indent: true,
        },
        {
          label: "(-) Custo de Laboratório/Montagem",
          value: -dre.custosMercadoria.labCostTotal,
          isDeduction: true,
          indent: true,
        },
        {
          label: "(-) Comissões de Vendedores",
          value: -dre.custosMercadoria.comissoesTotal,
          isDeduction: true,
          indent: true,
        },
        {
          label: "(-) Taxas de Cartão (est. 3%)",
          value: -dre.custosMercadoria.taxasCartao,
          isDeduction: true,
          indent: true,
        },
        {
          label: "(=) Margem de Contribuição",
          value: dre.margemContribuicao,
          isTotal: true,
          pct: dre.margemContribuicaoPct,
          accent: "#10b981",
        },
        {
          label: "(-) Custos Fixos Operacionais",
          value: -dre.custosFixos.total,
          isDeduction: true,
          indent: true,
        },
        {
          label: "(=) EBITDA (Lucro Operacional)",
          value: dre.ebitda,
          isTotal: true,
          pct: dre.ebitdaMarginPct,
          accent: dre.ebitda >= 0 ? "#f59e0b" : "#ef4444",
        },
        {
          label: "(-) Depreciação de Ativos",
          value: -dre.depreciacao.total,
          isDeduction: true,
          indent: true,
        },
        {
          label: "(=) LUCRO LÍQUIDO",
          value: dre.lucroLiquido,
          isTotal: true,
          pct: dre.lucroLiquidoMarginPct,
          accent: dre.lucroLiquido >= 0 ? "#22c55e" : "#ef4444",
        },
      ]
    : [];

  const faturamento = dre?.faturamentoBruto || 1;

  return (
    <div className={s.page} style={{ padding: "24px" }}>
      {/* Header */}
      <div className={s.pageHeader}>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginLeft: "auto",
          }}
        >
          <select
            className={s.fieldSelect}
            style={{ width: 110 }}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            className={s.fieldSelect}
            style={{ width: 90 }}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
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

      {loading ? (
        <div
          className={s.card}
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--text-tertiary)",
          }}
        >
          Calculando DRE...
        </div>
      ) : (
        <>
          {/* KPI Cards superiores */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {[
              {
                label: "Faturamento Bruto",
                value: formatCurrency(dre?.faturamentoBruto),
                color: "#0ea5e9",
                icon: "📈",
              },
              {
                label: "Margem de Contribuição",
                value: formatPct(dre?.margemContribuicaoPct),
                sub: formatCurrency(dre?.margemContribuicao),
                color: "#10b981",
                icon: "📊",
              },
              {
                label: "EBITDA",
                value: formatPct(dre?.ebitdaMarginPct),
                sub: formatCurrency(dre?.ebitda),
                color: (dre?.ebitda ?? 0) >= 0 ? "#f59e0b" : "#ef4444",
                icon: "💹",
              },
              {
                label: "Lucro Líquido",
                value: formatCurrency(dre?.lucroLiquido),
                sub: formatPct(dre?.lucroLiquidoMarginPct),
                color: (dre?.lucroLiquido ?? 0) >= 0 ? "#22c55e" : "#ef4444",
                icon: "🏦",
              },
            ].map((kpi, i) => (
              <div key={i} className={s.card} style={{ padding: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-tertiary)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {kpi.label}
                  </span>
                  <span style={{ fontSize: 20 }}>{kpi.icon}</span>
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: kpi.color,
                    letterSpacing: "-0.5px",
                  }}
                >
                  {kpi.value}
                </div>
                {kpi.sub && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-tertiary)",
                      marginTop: 4,
                    }}
                  >
                    {kpi.sub}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* DRE Cascata (tabela) */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>
                Demonstrativo de Resultado — {MONTHS[month - 1]}/{year}
              </span>
              <span className={s.cardCount}>
                {ind?.ordersCount} OS | Ticket Médio:{" "}
                {formatCurrency(ind?.ticketMedio)}
              </span>
            </div>
            <table className={s.table}>
              <thead>
                <tr className={s.tableHead}>
                  <th style={{ width: "55%" }}>Linha do DRE</th>
                  <th style={{ textAlign: "right" }}>Valor (R$)</th>
                  <th style={{ textAlign: "right", width: 120 }}>
                    % sobre Fat.
                  </th>
                  <th style={{ width: 200 }}>Representação Visual</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const barWidth = Math.min(
                    100,
                    Math.abs((row.value / faturamento) * 100),
                  );
                  const barColor = row.isDeduction
                    ? "#ef444466"
                    : row.accent
                      ? row.accent + "99"
                      : "#94a3b866";

                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        background: row.isTotal
                          ? "var(--bg-elevated)"
                          : "transparent",
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 20px",
                          paddingLeft: row.indent ? 36 : 20,
                          fontSize: row.isTotal ? 13 : 12,
                          fontWeight: row.isTotal || row.isSubtotal ? 700 : 400,
                          color: row.isTotal
                            ? row.accent || "var(--text-primary)"
                            : "var(--text-secondary)",
                        }}
                      >
                        {row.label}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "12px 20px",
                          fontSize: row.isTotal ? 14 : 13,
                          fontWeight: row.isTotal ? 700 : 500,
                          color:
                            row.value < 0
                              ? "#ef4444"
                              : row.accent || "var(--text-primary)",
                          letterSpacing: "-0.3px",
                        }}
                      >
                        {formatCurrency(row.value)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "12px 20px",
                          fontSize: 12,
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {row.pct != null ? (
                          <span
                            style={{
                              color: row.accent || "inherit",
                              fontWeight: 600,
                            }}
                          >
                            {formatPct(row.pct)}
                          </span>
                        ) : (
                          <span>
                            {formatPct(
                              (Math.abs(row.value) / faturamento) * 100,
                            )}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <div
                          style={{
                            height: 8,
                            borderRadius: 4,
                            background: "var(--bg-elevated)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${barWidth}%`,
                              background: row.accent || barColor,
                              borderRadius: 4,
                              transition: "width 0.8s ease",
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Indicadores Avançados */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
            }}
          >
            {/* Break-Even */}
            <div className={s.card} style={{ padding: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                📍 Ponto de Equilíbrio (Break-Even)
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#f59e0b",
                  letterSpacing: "-0.5px",
                }}
              >
                {ind?.breakEven != null ? formatCurrency(ind.breakEven) : "N/D"}
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  marginTop: 8,
                  lineHeight: 1.5,
                }}
              >
                Valor mínimo a faturar para cobrir todos os custos fixos e
                variáveis.
              </p>
            </div>

            {/* Margem de Segurança */}
            <div className={s.card} style={{ padding: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                🛡️ Margem de Segurança
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color:
                    (ind?.margemSegurancaAbs ?? 0) >= 0 ? "#10b981" : "#ef4444",
                  letterSpacing: "-0.5px",
                }}
              >
                {ind?.margemSegurancaPct != null
                  ? formatPct(ind.margemSegurancaPct)
                  : "N/D"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  marginTop: 4,
                }}
              >
                {ind?.margemSegurancaAbs != null
                  ? formatCurrency(ind.margemSegurancaAbs)
                  : ""}
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-tertiary)",
                  marginTop: 8,
                  lineHeight: 1.5,
                }}
              >
                Quanto as vendas podem cair antes de entrar em prejuízo.
              </p>
            </div>

            {/* Custos Fixos por Categoria */}
            <div className={s.card} style={{ padding: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                🏗️ Custos Fixos por Categoria
              </div>
              {Object.entries(dre?.custosFixos.byCategory || {}).length ===
              0 ? (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    lineHeight: 1.5,
                  }}
                >
                  Nenhum custo fixo registrado para este período. Registre em{" "}
                  <strong>Financeiro → Custos Fixos</strong>.
                </p>
              ) : (
                Object.entries(dre!.custosFixos.byCategory).map(
                  ([cat, val]) => (
                    <div
                      key={cat}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ color: "var(--text-secondary)" }}>
                        {cat}
                      </span>
                      <span style={{ color: "#ef4444", fontWeight: 600 }}>
                        {formatCurrency(val)}
                      </span>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
