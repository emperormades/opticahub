"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import AgendaClinicaPage from "../clinica/agenda/page";
import CrmPreditivoPage from "../analytics/crm/page";
import s from "../shared.module.css";

const TABS = [
  { id: "AGENDA", label: "Agenda de Retornos", icon: "📅" },
  { id: "CRM", label: "CRM & Retenção (RFM)", icon: "🧠" },
  { id: "CLIENTES", label: "Gestão de Clientes", icon: "👥" },
  { id: "ORDENS", label: "Ordens de Serviço", icon: "👓" },
];

const UI_TABS = [
  { id: "AGENDA", label: "Agenda", icon: "AGD" },
  { id: "CRM", label: "CRM", icon: "CRM" },
  { id: "CLIENTES", label: "Clientes", icon: "CLI" },
  { id: "ORDENS", label: "OS", icon: "OS" },
];

export default function ClinicaHubPage() {
  const [activeTab, setActiveTab] = useState("AGENDA");

  const activeSummaryMap: Record<
    string,
    { title: string; text: string; focus: string }
  > = {
    AGENDA: {
      title: "Retenção e Recorrência Clínica",
      text: "Organize retornos e acompanhe follow-ups para não perder pacientes no pós-venda.",
      focus: "Agenda e follow-up",
    },
    CRM: {
      title: "Leitura Preditiva da Base",
      text: "Use as métricas RFM para antecipar churn, reativação e oportunidades de contato proativo.",
      focus: "RFM, churn e reativação",
    },
    CLIENTES: {
      title: "Base de Pacientes e Receitas",
      text: "Acesse o histórico completo de cada cliente, prescrições ativas e crédito disponível.",
      focus: "Cadastro e prescrições",
    },
    ORDENS: {
      title: "Ordens de Serviço da Loja",
      text: "Acompanhe o status de cada OS — do orçamento à entrega — sem perder nenhuma etapa.",
      focus: "Pipeline de ordens",
    },
  };

  const activeSummary = activeSummaryMap[activeTab];

  return (
    <div className={s.page} style={{ paddingTop: 0 }}>

      {/* * Header fixo — padrão idêntico ao Panorama e Hub Financeiro */}
      <div
        style={{
          padding: "14px 24px",
          background: "#ffffff",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#111827",
              margin: 0,
              letterSpacing: "-0.3px",
            }}
          >
            🩺 Hub Clínica & CRM
          </h1>
          <span
            style={{
              fontSize: 12,
              color: "#9ca3af",
              borderLeft: "1px solid rgba(0,0,0,0.1)",
              paddingLeft: 10,
            }}
          >
            {UI_TABS.find((t) => t.id === activeTab)?.label}
          </span>
        </div>
        <Tabs tabs={UI_TABS} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* * 4 quick-action cards — CRM accent: laranja (#E35336) */}
      <div
        style={{
          padding: "0 24px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        {[
          {
            id: "AGENDA",
            icon: "📅",
            label: "Agenda",
            sub: "Retornos, reagendamentos e triagem clínica.",
          },
          {
            id: "CRM",
            icon: "🧠",
            label: "CRM & RFM",
            sub: "Churn, reativação e sinais de contato da base.",
          },
          {
            id: "CLIENTES",
            icon: "👥",
            label: "Clientes",
            sub: "Histórico, prescrições ativas e crédito de cada paciente.",
          },
          {
            id: "ORDENS",
            icon: "👓",
            label: "Ordens de Serviço",
            sub: "Pipeline completo de OS — do orçamento à entrega.",
          },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              textAlign: "left",
              padding: "14px 16px",
              background: activeTab === item.id ? "rgba(227,83,54,0.05)" : "#ffffff",
              border: `1px solid ${activeTab === item.id ? "rgba(227,83,54,0.25)" : "rgba(0,0,0,0.08)"}`,
              borderRadius: 10,
              cursor: "pointer",
              transition: "all 120ms ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: activeTab === item.id ? "#E35336" : "#374151",
              }}
            >
              {item.icon} {item.label}
            </span>
            <span style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.4 }}>
              {item.sub}
            </span>
          </button>
        ))}
      </div>

      <div style={{ padding: "0 24px 24px" }}>
        {activeTab === "AGENDA" && <AgendaClinicaPage />}
        {activeTab === "CRM" && <CrmPreditivoPage />}
        {activeTab === "CLIENTES" && (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.07)",
              borderRadius: 12,
              textAlign: "center",
              padding: "48px 24px",
              color: "#9ca3af",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#374151", marginBottom: 6 }}>
              Gestão de Clientes
            </div>
            <div style={{ fontSize: 13 }}>
              Navegue para{" "}
              <a href="/dashboard/clientes" style={{ color: "#E35336", fontWeight: 600 }}>
                Gestão de Clientes
              </a>{" "}
              para ver a listagem completa.
            </div>
          </div>
        )}
        {activeTab === "ORDENS" && (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.07)",
              borderRadius: 12,
              textAlign: "center",
              padding: "48px 24px",
              color: "#9ca3af",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>👓</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#374151", marginBottom: 6 }}>
              Ordens de Serviço
            </div>
            <div style={{ fontSize: 13 }}>
              Navegue para{" "}
              <a href="/dashboard/ordens" style={{ color: "#E35336", fontWeight: 600 }}>
                Ordens de Serviço
              </a>{" "}
              para ver o pipeline completo.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

