"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import s from "../shared.module.css";
import h from "./diagnostico.module.css";

interface DiagnosticsServiceStatus {
  id: string;
  service: string;
  status: "OPERATIONAL" | "DEGRADED" | "DOWN";
  lastCheck: string;
}

interface DiagnosticsData {
  summary: {
    lowStock: number;
    overduePayments: number;
    incompleteCustomers: number;
  };
  services: DiagnosticsServiceStatus[];
}

export default function DiagnosticsPage() {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const fetchDiagnostics = () => {
    setLoading(true);
    fetch("/api/admin/diagnostics")
      .then(async (res) => {
        const result = await res.json().catch(() => null);
        if (!res.ok) {
          setUiMessage({
            type: "error",
            text: result?.error || "Nao foi possivel carregar o diagnostico.",
          });
          setData(null);
          return;
        }
        setData(result);
        setUiMessage(null);
      })
      .catch(() => {
        setUiMessage({
          type: "error",
          text: "Falha ao executar a varredura de diagnostico.",
        });
        setData(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  if (loading) {
    return (
      <div className={s.page}>
        <div className={s.pageHeader}>
          <h1 className={s.pageTitle}>Analisando Sistema...</h1>
        </div>
        <div className={s.loadingRow}>
          Efetuando varredura de integridade em tempo real...
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageTitleArea}>
          <h1 className={s.pageTitle}>Diagnóstico & Saúde</h1>
          <p className={s.pageSubtitle}>
            Visão técnica da integridade dos dados e serviços (Pillar 9).
          </p>
        </div>
        <button className={s.btnPrimary} onClick={fetchDiagnostics}>
          🔄 Atualizar Scan
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

      <div className={s.nextActionBanner}>
        <div>
          <div className={s.nextActionLabel}>⚡ Próxima Ação</div>
          <div className={s.nextActionText}>
            Se houver alerta, use os atalhos abaixo para ir direto ao módulo com o problema.
          </div>
        </div>
        <div className={s.nextActionActions}>
          <Link href="/dashboard/estoque" className={s.btnSecondary} style={{ textDecoration: "none" }}>
            Revisar Estoque →
          </Link>
          <Link href="/dashboard/financeiro/inadimplentes" className={s.btnSecondary} style={{ textDecoration: "none" }}>
            Cobrar Atrasos →
          </Link>
        </div>
      </div>


      <div className={h.grid}>
        <div className={s.card}>
          <div className={s.cardHeader}>
            <h2 className={s.cardTitle}>Alertas de Dados (Integridade)</h2>
          </div>
          <div className={h.alerts}>
            <div className={h.alertItem}>
              <div>
                <strong>📦 Estoque Crítico</strong>
                <p className={s.cellMeta}>
                  Produtos com quantidade zero ou negativa.
                </p>
              </div>
              <span
                className={
                  (data?.summary?.lowStock ?? 0) > 0
                    ? s.badgeStatusError
                    : s.badgeSuccess
                }
              >
                {data?.summary?.lowStock ?? 0} itens
              </span>
            </div>
            <div className={h.alertItem}>
              <div>
                <strong>💰 Pagamentos Atrasados ({">"}30d)</strong>
                <p className={s.cellMeta}>
                  Vendas com recebimento pendente há mais de um mês.
                </p>
              </div>
              <span
                className={
                  (data?.summary?.overduePayments ?? 0) > 0
                    ? s.badgeStatusWarning
                    : s.badgeSuccess
                }
              >
                {data?.summary?.overduePayments ?? 0} transações
              </span>
            </div>
            <div className={h.alertItem}>
              <div>
                <strong>👤 Cadastros Incompletos</strong>
                <p className={s.cellMeta}>
                  Clientes com CPF ou Telefone ausente.
                </p>
              </div>
              <span
                className={
                  (data?.summary?.incompleteCustomers ?? 0) > 0
                    ? s.badgeStatusInfo
                    : s.badgeSuccess
                }
              >
                {data?.summary?.incompleteCustomers ?? 0} clientes
              </span>
            </div>
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}>
            <h2 className={s.cardTitle}>Status de Serviços Externos</h2>
          </div>
          <div className={h.services}>
            {(data?.services?.length ?? 0) > 0 ? (
              data!.services.map((svc) => (
                <div key={svc.id} className={h.serviceItem}>
                  <div>
                    <strong>{svc.service}</strong>
                    <p className={s.cellMeta}>
                      Último check:{" "}
                      {new Date(svc.lastCheck).toLocaleTimeString()}
                    </p>
                  </div>
                  <span
                    className={
                      svc.status === "OPERATIONAL"
                        ? s.badgeSuccess
                        : s.badgeError
                    }
                  >
                    {svc.status}
                  </span>
                </div>
              ))
            ) : (
              <div className={s.emptyState}>
                <div className={s.emptyIcon}>📡</div>
                <p className={s.emptyText}>
                  Nenhum log de saúde de serviço disponível. Os agentes de
                  monitoramento ainda não reportaram status.
                </p>
              </div>
            )}
            <p className={s.cellMeta} style={{ padding: "0 var(--space-4)" }}>
              * Serviços como WhatsApp, PagSeguro e Laboratórios serão
              monitorados aqui.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
