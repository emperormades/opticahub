"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import s from "../../shared.module.css";

interface Commission {
  id: string;
  seller: { name: string };
  baseAmount: string;
  pct: string;
  amount: string;
  createdAt: string;
  transaction: { order?: { orderNumber: string; customer?: { name: string } } };
}

interface RankingItem {
  name: string;
  totalVendas: number;
  totalComissao: number;
  count: number;
}

const fmt = (v: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v),
  );

const fmtPct = (v: number | string) => `${Number(v).toFixed(1)}%`;

export default function ComissoesPage() {
  const [data, setData] = useState<{
    commissions: Commission[];
    ranking: RankingItem[];
  }>({ commissions: [], ranking: [] });
  const [loading, setLoading] = useState(true);
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const fetchCommissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/financial/commissions");
      if (!res.ok) {
        const result = await res.json().catch(() => null);
        setUiMessage({
          type: "error",
          text: result?.error || "Nao foi possivel carregar as comissoes.",
        });
        setData({ commissions: [], ranking: [] });
        return;
      }
      const result = await res.json();
      setData({
        commissions: Array.isArray(result?.commissions)
          ? result.commissions
          : [],
        ranking: Array.isArray(result?.ranking) ? result.ranking : [],
      });
      setUiMessage(null);
    } catch {
      setUiMessage({
        type: "error",
        text: "Falha ao carregar o painel de comissoes.",
      });
      setData({ commissions: [], ranking: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  if (loading)
    return (
      <div className={s.page}>
        <p>Carregando performance...</p>
      </div>
    );

  return (
    <div
      className={s.page}
      style={{ background: "#f8fafc", minHeight: "100vh", padding: "24px" }}
    >
      <div className={s.pageHeader}>
        <div className={s.pageTitleArea}>
          <h1 className={s.pageTitle}>🏅 Performance & Comissões</h1>
          <p className={s.pageSubtitle}>
            Visão detalhada de vendas e remuneração variável por vendedor
          </p>
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

      <div className={s.nextActionBanner}>
        <div>
          <div className={s.nextActionLabel}>⚡ Próxima Ação</div>
          <div className={s.nextActionText}>
            Valide divergências, confira recebíveis e abra a O.S. correspondente se necessário.
          </div>
        </div>
        <div className={s.nextActionActions}>
          <Link
            href="/dashboard/financeiro/carne"
            className={s.btnSecondary}
            style={{ textDecoration: "none" }}
          >
            Ver Recebíveis →
          </Link>
          <Link
            href="/dashboard/financeiro"
            className={s.btnSecondary}
            style={{ textDecoration: "none" }}
          >
            Voltar ao Financeiro →
          </Link>
        </div>
      </div>


      {/* RANKING DE VENDAS (MÉTRICAS DE PERFORMANCE) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "var(--space-5)",
          marginBottom: "var(--space-6)",
        }}
      >
        {data.ranking.map((r, i) => (
          <div
            key={r.name}
            className={s.card}
            style={{
              padding: "var(--space-5)",
              borderLeft:
                i === 0
                  ? "4px solid #10b981"
                  : "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
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
                  }}
                >
                  VENDEDOR {i + 1}º Lugar
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: "var(--text-primary)",
                    marginTop: 4,
                  }}
                >
                  {r.name}
                </div>
              </div>
              <div style={{ fontSize: 24 }}>
                {i === 0 ? "🏆" : i === 1 ? "🥈" : "🥉"}
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginTop: 20,
              }}
            >
              <div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                  TOTAL VENDAS
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "var(--brand-primary)",
                  }}
                >
                  {fmt(r.totalVendas)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                  COMISSÃO
                </div>
                <div
                  style={{ fontSize: 16, fontWeight: 800, color: "#10b981" }}
                >
                  {fmt(r.totalComissao)}
                </div>
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-tertiary)",
                marginTop: 12,
              }}
            >
              {r.count} Ordens de Serviço liquidadas
            </div>
          </div>
        ))}
      </div>

      {/* EXTRATO DETALHADO (AUDITORIA DE COMISSÕES) */}
      <div className={s.card}>
        <div className={s.cardHeader}>
          <h2 className={s.cardTitle}>
            📜 Extrato de Lançamentos de Comissões
          </h2>
          <span className={s.cardCount}>
            {data.commissions.length} registros
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className={s.table}>
            <thead className={s.tableHead}>
              <tr>
                <th>Data</th>
                <th>OS / Cliente</th>
                <th>Vendedor</th>
                <th style={{ textAlign: "right" }}>Venda</th>
                <th style={{ textAlign: "center" }}>%</th>
                <th style={{ textAlign: "right" }}>Comissão</th>
              </tr>
            </thead>
            <tbody>
              {data.commissions.map((c) => (
                <tr key={c.id} className={s.tableRow}>
                  <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {c.transaction.order?.orderNumber || "—"}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "var(--text-tertiary)" }}
                    >
                      {c.transaction.order?.customer?.name || "Cliente Avulso"}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{c.seller.name}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {fmt(c.baseAmount)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span
                      className={s.badge}
                      style={{
                        background: "#f0f9ff",
                        color: "#0369a1",
                        fontSize: 11,
                      }}
                    >
                      {fmtPct(c.pct)}
                    </span>
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: 900,
                      color: "#10b981",
                    }}
                  >
                    {fmt(c.amount)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {c.transaction.order?.orderNumber ? (
                      <Link
                        href="/dashboard/ordens"
                        className={s.btnSecondary}
                        style={{
                          textDecoration: "none",
                          fontSize: 11,
                          padding: "4px 10px",
                        }}
                      >
                        Abrir O.S.
                      </Link>
                    ) : (
                      <span
                        style={{ fontSize: 11, color: "var(--text-tertiary)" }}
                      >
                        Sem O.S.
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
