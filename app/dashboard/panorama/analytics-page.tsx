"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import s from "../shared.module.css";
import a from "./analytics.module.css";

interface AnalyticsKpis {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  averageTicket: number;
  ordersPaid: number;
}

interface DailyFluxPoint {
  date: string;
  income: number;
  expense: number;
}

interface AnalyticsResponse {
  kpis: AnalyticsKpis;
  charts: {
    dailyFlux: DailyFluxPoint[];
  };
}

interface TooltipEntry {
  color?: string;
  name?: string;
  value?: number;
}

interface AnalyticsTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v,
  );

export default function AnalyticsPage() {
  const [range, setRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsResponse | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?range=${range}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const CustomTooltip = ({ active, payload, label }: AnalyticsTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            padding: 10,
            borderRadius: 8,
          }}
        >
          <p
            style={{
              margin: 0,
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 4,
            }}
          >
            {label}
          </p>
          {payload.map((entry, index: number) => (
            <p
              key={index}
              style={{
                margin: 0,
                color: entry.color,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {entry.name === "income" ? "📈 Receita: " : "📉 Despesa: "}
              {formatCurrency(entry.value || 0)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading)
    return (
      <div className={s.page}>
        <div className={s.emptyState}>
          ⏳ Extraindo inteligência de dados...
        </div>
      </div>
    );
  if (!data || !data.kpis)
    return (
      <div className={s.page}>
        <div className={s.emptyState}>Nenhum dado financeiro encontrado.</div>
      </div>
    );

  const { kpis, charts } = data;
  const {
    totalIncome,
    totalExpense,
    netProfit,
    profitMargin,
    averageTicket,
    ordersPaid,
  } = kpis;

  return (
    <div className={a.page} style={{ padding: "24px" }}>
      <div className={s.pageHeader}>
        <div className={a.dateToggle} style={{ marginLeft: "auto" }}>
          <button
            className={range === "7" ? a.dateBtnActive : a.dateBtn}
            onClick={() => setRange("7")}
          >
            7 D
          </button>
          <button
            className={range === "15" ? a.dateBtnActive : a.dateBtn}
            onClick={() => setRange("15")}
          >
            15 D
          </button>
          <button
            className={range === "30" ? a.dateBtnActive : a.dateBtn}
            onClick={() => setRange("30")}
          >
            30 D
          </button>
          <button
            className={range === "90" ? a.dateBtnActive : a.dateBtn}
            onClick={() => setRange("90")}
          >
            90 D
          </button>
        </div>
      </div>

      <div className={a.kpiGrid}>
        <div className={a.kpiCard}>
          <div className={a.kpiHeader}>
            <span className={a.kpiTitle}>Faturamento Bruto</span>
            <div
              className={a.kpiIcon}
              style={{
                background: "var(--status-success-bg)",
                color: "var(--status-success)",
              }}
            >
              📈
            </div>
          </div>
          <div
            className={a.kpiValue}
            style={{ color: "var(--status-success)" }}
          >
            {formatCurrency(totalIncome)}
          </div>
          <div className={a.kpiSub}>
            <span>{ordersPaid} transações recebidas</span>
          </div>
        </div>

        <div className={a.kpiCard}>
          <div className={a.kpiHeader}>
            <span className={a.kpiTitle}>Ticket Médio da OS</span>
            <div
              className={a.kpiIcon}
              style={{
                background: "var(--status-info-bg)",
                color: "var(--status-info)",
              }}
            >
              🏷️
            </div>
          </div>
          <div className={a.kpiValue}>{formatCurrency(averageTicket)}</div>
          <div className={a.kpiSub}>
            <span>Por OS aprovada</span>
          </div>
        </div>

        <div className={a.kpiCard}>
          <div className={a.kpiHeader}>
            <span className={a.kpiTitle}>Lucro Líquido Real</span>
            <div
              className={a.kpiIcon}
              style={{
                background:
                  netProfit >= 0
                    ? "var(--status-success-bg)"
                    : "var(--status-error-bg)",
                color:
                  netProfit >= 0
                    ? "var(--status-success)"
                    : "var(--status-error)",
              }}
            >
              💰
            </div>
          </div>
          <div
            className={a.kpiValue}
            style={{
              color:
                netProfit >= 0
                  ? "var(--status-success)"
                  : "var(--status-error)",
            }}
          >
            {formatCurrency(netProfit)}
          </div>
          <div className={a.kpiSub}>
            <span>Entradas - Saídas executadas</span>
          </div>
        </div>

        <div className={a.kpiCard}>
          <div className={a.kpiHeader}>
            <span className={a.kpiTitle}>Margem Líquida</span>
            <div
              className={a.kpiIcon}
              style={{
                background: "var(--brand-primary-light)",
                color: "var(--brand-primary)",
              }}
            >
              %
            </div>
          </div>
          <div className={a.kpiValue}>{profitMargin.toFixed(1)}%</div>
          <div className={a.kpiSub}>
            <span>Lucratividade final do período</span>
          </div>
        </div>
      </div>

      <div className={a.chartsGrid}>
        {/* Gráfico Principal */}
        <div className={a.chartCard}>
          <div className={a.chartHeader}>
            <h2 className={a.chartTitle}>Evolução Financeira (R$)</h2>
          </div>
          <div className={a.chartBody}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={charts.dailyFlux}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--status-success)"
                      stopOpacity={0.5}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--status-success)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--status-error)"
                      stopOpacity={0.5}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--status-error)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="var(--text-tertiary)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-tertiary)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$${value / 1000}k`}
                />
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border-subtle)"
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="var(--status-success)"
                  fillOpacity={1}
                  fill="url(#colorIncome)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="var(--status-error)"
                  fillOpacity={1}
                  fill="url(#colorExpense)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DRE e Mix de Recebimentos */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <div className={a.chartCard}>
            <div className={a.chartHeader}>
              <h2 className={a.chartTitle}>DRE Simplificado</h2>
            </div>
            <div className={a.dreList}>
              <div className={a.dreItem}>
                <span className={a.dreLabel}>1. Receita Bruta de Vendas</span>
                <span className={a.dreVal}>{formatCurrency(totalIncome)}</span>
              </div>
              <div className={a.dreItem}>
                <span className={a.dreLabel}>[-] Deduções Incidentes</span>
                <span
                  className={a.dreVal}
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {formatCurrency(0)}
                </span>
              </div>
              <div
                className={a.dreItem}
                style={{
                  background: "var(--bg-elevated)",
                  borderTop: "1px solid var(--border-default)",
                }}
              >
                <span className={a.dreLabel} style={{ fontWeight: 600 }}>
                  2. Receita Líquida
                </span>
                <span className={a.dreVal} style={{ fontWeight: 700 }}>
                  {formatCurrency(totalIncome)}
                </span>
              </div>
              <div className={a.dreItem}>
                <span className={a.dreLabel}>[-] Despesas Operacionais</span>
                <span
                  className={a.dreVal}
                  style={{ color: "var(--status-error)" }}
                >
                  {formatCurrency(totalExpense)}
                </span>
              </div>
              <div className={`${a.dreItem} ${a.dreTotal}`}>
                <span className={a.dreLabel}>Lucro Líquido</span>
                <span
                  className={a.dreVal}
                  style={{
                    color:
                      netProfit >= 0
                        ? "var(--status-success)"
                        : "var(--status-error)",
                  }}
                >
                  {formatCurrency(netProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
