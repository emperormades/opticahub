"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import EstoquePage from "../estoque/page";
import ImportarXMLPage from "../estoque/import/page";
import KanbanLogisticaPage from "../logistica/kanban/page";
import AuditoriaLabPage from "../analytics/auditoria-lab/page";
import EDIPage from "./edi/page";
import ReposicaoPage from "../estoque/suprimentos/page";
import s from "../shared.module.css";

const TABS = [
  { id: "LOGISTICA", label: "SLA Laboratório (Kanban)", icon: "🚚" },
  { id: "EDI", label: "Integração Lixadeiras (EDI)", icon: "📡" },
  { id: "AUDITORIA", label: "Auditoria de Glosas", icon: "🛡️" },
  { id: "ESTOQUE", label: "Estoque de Produtos", icon: "📦" },
  { id: "REPOSICAO", label: "Ponto de Pedido (Compras)", icon: "🚨" },
  { id: "XML", label: "Importar NF-e (XML)", icon: "📄" },
];

export default function BackofficeHubPage() {
  const [activeTab, setActiveTab] = useState("LOGISTICA");

  const activeSummaryMap: Record<string, { title: string; text: string }> = {
    LOGISTICA: {
      title: "Fluxo de SLA e acompanhamento",
      text: "Acompanhe o percurso da O.S. no laboratorio e mantenha a previsibilidade de entrega.",
    },
    EDI: {
      title: "Preparacao de integracao industrial",
      text: "O backend do lote existe, mas a camada visual de disparo ainda esta em consolidacao.",
    },
    AUDITORIA: {
      title: "Conferencia de glosas e divergencias",
      text: "Concilie notas do laboratorio com a operacao da loja antes de liberar pagamento.",
    },
    ESTOQUE: {
      title: "Controle operacional de catalogo",
      text: "Gerencie saldo, auditoria e status do estoque com foco em disponibilidade real.",
    },
    REPOSICAO: {
      title: "Planejamento de ressuprimento",
      text: "A camada visual de reposicao ainda esta em preparo, mas o modulo ja indica a direcao correta.",
    },
    XML: {
      title: "Entrada assistida de estoque",
      text: "Importe NF-e para reduzir cadastro manual e acelerar entrada de produtos.",
    },
  };

  const activeSummary = activeSummaryMap[activeTab];

  return (
    <div className={s.page} style={{ paddingTop: 0 }}>
      <div
        style={{
          padding: "16px 24px",
          background: "var(--bg-elevated)",
          borderBottom: "1px solid var(--border-subtle)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.3px",
            }}
          >
            📦 Logística & Lab
          </h1>
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      <div className={s.hubContent} style={{ padding: "24px" }}>
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
                Hub de Backoffice
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                }}
              >
                {activeSummary.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginTop: 4,
                }}
              >
                {activeSummary.text}
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
                Aba ativa
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {TABS.find((tab) => tab.id === activeTab)?.label}
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
                Direcao
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {activeTab === "XML" || activeTab === "ESTOQUE"
                  ? "Operacao imediata"
                  : "Blindagem operacional"}
              </div>
            </div>
          </div>
        </div>

        {activeTab === "LOGISTICA" && <KanbanLogisticaPage />}
        {activeTab === "EDI" && <EDIPage />}
        {activeTab === "AUDITORIA" && <AuditoriaLabPage />}
        {activeTab === "ESTOQUE" && <EstoquePage />}
        {activeTab === "REPOSICAO" && <ReposicaoPage />}
        {activeTab === "XML" && <ImportarXMLPage />}
      </div>
    </div>
  );
}
