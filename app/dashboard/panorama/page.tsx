"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";

// ─── Types ──────────────────────────────────────────────────────────────

interface PulseData {
  revenueToday: number;
  revenueTodayDelta: number | null;
  ticketMedio: number;
  ticketMedioDelta: number | null;
  osInProduction: number;
  osOverdue: number;
  revenueMonth: number;
  revenueMonthDelta: number | null;
  caixaAberto: boolean;
}

interface DailyFlux {
  date: string;
  income: number;
  expense: number;
}

interface Pipeline {
  orcamento: number;
  validacao: number;
  laboratorio: number;
  pronto: number;
}

interface TrendsData {
  dailyFlux: DailyFlux[];
  pipeline: Pipeline;
  totalPipeline: number;
  marginPct: number | null;
}

interface Receivables {
  total: number;
  count: number;
  overdue: number;
  overdueCount: number;
}

interface SmartAction {
  icon: string;
  text: string;
  href: string;
  urgency: "high" | "medium" | "low";
}

interface ActionsData {
  receivables: Receivables;
  churnRisk: number;
  smartActions: SmartAction[];
}

interface OverviewData {
  pulse: PulseData;
  trends: TrendsData;
  actions: ActionsData;
}

// ─── Helpers ────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtCompact = (v: number) => {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1).replace(".", ",")}k`;
  return fmtCurrency(v);
};

// ─── SVG Sparkline ──────────────────────────────────────────────────────

function Sparkline({
  data,
}: {
  data: DailyFlux[];
}) {
  if (data.length === 0) return null;

  const W = 460;
  const H = 110;
  const PAD = 8;
  const chartW = W - PAD * 2;
  const chartH = H - PAD * 2;

  const allValues = data.flatMap((d) => [d.income, d.expense]);
  const maxVal = Math.max(...allValues, 1);

  const xStep = chartW / Math.max(data.length - 1, 1);

  const toY = (v: number) => PAD + chartH - (v / maxVal) * chartH;
  const toX = (i: number) => PAD + i * xStep;

  // Income line
  const incomePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(d.income).toFixed(1)}`)
    .join(" ");

  // Income area
  const incomeArea = `${incomePath} L ${toX(data.length - 1).toFixed(1)} ${(H - PAD).toFixed(1)} L ${toX(0).toFixed(1)} ${(H - PAD).toFixed(1)} Z`;

  // Expense line
  const expensePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(d.expense).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((pct) => (
        <line
          key={pct}
          x1={PAD}
          y1={PAD + chartH * (1 - pct)}
          x2={W - PAD}
          y2={PAD + chartH * (1 - pct)}
          stroke="rgba(0,0,0,0.04)"
          strokeWidth="1"
        />
      ))}

      {/* Income area fill */}
      <path d={incomeArea} fill="rgba(16, 185, 129, 0.08)" />

      {/* Income line */}
      <path
        d={incomePath}
        fill="none"
        stroke="#10b981"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Expense line (dashed) */}
      <path
        d={expensePath}
        fill="none"
        stroke="#ef4444"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />

      {/* Income dots */}
      {data.map((d, i) => (
        <circle
          key={`inc-${i}`}
          cx={toX(i)}
          cy={toY(d.income)}
          r="3"
          fill="#10b981"
        />
      ))}

      {/* Day labels */}
      {data.map((d, i) => (
        <text
          key={`lbl-${i}`}
          x={toX(i)}
          y={H - 1}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize="9"
          fontWeight="600"
        >
          {d.date}
        </text>
      ))}
    </svg>
  );
}

// ─── Delta Pill ─────────────────────────────────────────────────────────

function DeltaPill({ delta }: { delta: number | null }) {
  if (delta === null) return <span className={`${styles.pulseDelta} ${styles.deltaNeutral}`}>—</span>;
  const cls = delta > 0 ? styles.deltaUp : delta < 0 ? styles.deltaDown : styles.deltaNeutral;
  const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "";
  return (
    <span className={`${styles.pulseDelta} ${cls}`}>
      {arrow} {Math.abs(delta)}%
    </span>
  );
}

// ─── Pipeline Funnel ────────────────────────────────────────────────────

const FUNNEL_STEPS: { key: keyof Pipeline; label: string; color: string }[] = [
  { key: "orcamento", label: "Orçamento", color: "#6366f1" },
  { key: "validacao", label: "Validação", color: "#f59e0b" },
  { key: "laboratorio", label: "Laboratório", color: "#3b82f6" },
  { key: "pronto", label: "Pronto", color: "#10b981" },
];

function PipelineFunnel({
  pipeline,
  total,
  osOverdue,
}: {
  pipeline: Pipeline;
  total: number;
  osOverdue: number;
}) {
  const maxCount = Math.max(...Object.values(pipeline), 1);

  return (
    <div className={styles.funnelList}>
      {FUNNEL_STEPS.map((step) => {
        const count = pipeline[step.key];
        const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
        const showAlert = step.key === "laboratorio" && osOverdue > 0;

        return (
          <div key={step.key} className={styles.funnelStep}>
            <span className={styles.funnelLabel}>{step.label}</span>
            <div className={styles.funnelBarTrack}>
              <div
                className={styles.funnelBarFill}
                style={{
                  width: `${Math.max(pct, 3)}%`,
                  background: step.color,
                  opacity: count > 0 ? 1 : 0.2,
                }}
              />
            </div>
            <span className={styles.funnelCount}>{count}</span>
            {showAlert && (
              <span className={styles.funnelAlert}>{osOverdue} atraso</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function PanoramaPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/overview");
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error || "Não foi possível carregar o panorama.");
        setData(null);
        return;
      }
      setData(json);
      setError(null);
    } catch {
      setError("Falha na conexão com o servidor.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>Carregando panorama estratégico…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>{error || "Erro ao carregar dados."}</div>
      </div>
    );
  }

  const { pulse, trends, actions } = data;

  return (
    <div className={styles.page}>
      {/* ─── BLOCO 1: PULSO ─────────────────────────────────────────── */}
      <section className={styles.pulseGrid}>
        {/* Receita Hoje */}
        <div className={styles.pulseCard}>
          <span className={styles.pulseLabel}>Receita Hoje</span>
          <span className={styles.pulseValue}>{fmtCompact(pulse.revenueToday)}</span>
          <div className={styles.pulseMeta}>
            <DeltaPill delta={pulse.revenueTodayDelta} />
            <span className={styles.pulseSubtext}>vs ontem</span>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className={styles.pulseCard}>
          <span className={styles.pulseLabel}>Ticket Médio</span>
          <span className={styles.pulseValue}>{fmtCurrency(pulse.ticketMedio)}</span>
          <div className={styles.pulseMeta}>
            <DeltaPill delta={pulse.ticketMedioDelta} />
            <span className={styles.pulseSubtext}>vs mês anterior</span>
          </div>
        </div>

        {/* OS em Produção */}
        <div className={styles.pulseCard}>
          <span className={styles.pulseLabel}>OS em Produção</span>
          <span className={styles.pulseValue}>{pulse.osInProduction}</span>
          <div className={styles.pulseMeta}>
            {pulse.osOverdue > 0 ? (
              <span className={styles.pulseAlert}>
                ⚠ {pulse.osOverdue} atrasada{pulse.osOverdue > 1 ? "s" : ""}
              </span>
            ) : (
              <span className={styles.pulseOk}>Sem atrasos</span>
            )}
          </div>
        </div>

        {/* Receita do Mês */}
        <div className={styles.pulseCard}>
          <span className={styles.pulseLabel}>Receita do Mês</span>
          <span className={styles.pulseValue}>{fmtCompact(pulse.revenueMonth)}</span>
          <div className={styles.pulseMeta}>
            <DeltaPill delta={pulse.revenueMonthDelta} />
            <span className={styles.pulseSubtext}>vs mês anterior</span>
          </div>
        </div>
      </section>

      {/* ─── BLOCO 2: TENDÊNCIAS ────────────────────────────────────── */}
      <section className={styles.trendsGrid}>
        {/* Sparkline de Receita x Despesa */}
        <div className={styles.trendCard}>
          <div className={styles.trendHeader}>
            <span className={styles.trendTitle}>Fluxo dos Últimos 7 Dias</span>
            {trends.marginPct !== null && (
              <span className={styles.trendBadge}>
                Margem {trends.marginPct > 0 ? "+" : ""}
                {trends.marginPct}%
              </span>
            )}
          </div>
          <div className={styles.chartWrapper}>
            <Sparkline data={trends.dailyFlux} />
          </div>
          <div className={styles.chartLegend}>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "#10b981" }} />
              Receita
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "#ef4444" }} />
              Despesa
            </span>
          </div>
        </div>

        {/* Pipeline de OS */}
        <div className={styles.trendCard}>
          <div className={styles.trendHeader}>
            <span className={styles.trendTitle}>Pipeline de OS</span>
            <span className={styles.trendBadge}>{trends.totalPipeline} ativas</span>
          </div>
          <PipelineFunnel
            pipeline={trends.pipeline}
            total={trends.totalPipeline}
            osOverdue={pulse.osOverdue}
          />
        </div>
      </section>

      {/* ─── BLOCO 3: ATENÇÃO ───────────────────────────────────────── */}
      <section className={styles.actionsGrid}>
        {/* A Receber */}
        <div className={styles.actionCard}>
          <span className={styles.actionLabel}>A Receber</span>
          <span className={styles.actionValue}>{fmtCompact(actions.receivables.total)}</span>
          {actions.receivables.overdueCount > 0 ? (
            <span className={styles.actionDetail}>
              <span className={styles.actionHighlight}>
                {actions.receivables.overdueCount} parcela{actions.receivables.overdueCount > 1 ? "s" : ""} vencida{actions.receivables.overdueCount > 1 ? "s" : ""}
              </span>
              {" "}({fmtCompact(actions.receivables.overdue)})
            </span>
          ) : (
            <span className={styles.actionDetail}>Nenhuma parcela vencida</span>
          )}
        </div>

        {/* Clientes em Risco */}
        <div className={styles.actionCard}>
          <span className={styles.actionLabel}>Clientes em Risco</span>
          <span className={styles.actionValue}>{actions.churnRisk}</span>
          <span className={styles.actionDetail}>
            {actions.churnRisk > 0
              ? "Receituário vencendo em 30 dias"
              : "Nenhum risco identificado"}
          </span>
        </div>

        {/* Ações Inteligentes */}
        <div className={styles.actionCard}>
          <span className={styles.actionLabel}>Ações Prioritárias</span>
          {actions.smartActions.length === 0 ? (
            <span className={styles.actionDetail} style={{ padding: "12px 0" }}>
              ✅ Tudo em ordem — nenhuma ação urgente.
            </span>
          ) : (
            <div className={styles.smartList}>
              {actions.smartActions.map((action, i) => (
                <Link
                  key={i}
                  href={action.href}
                  className={styles.smartItem}
                  data-urgency={action.urgency}
                >
                  <span className={styles.smartIcon}>{action.icon}</span>
                  <span className={styles.smartText}>{action.text}</span>
                  <span className={styles.smartArrow}>→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
