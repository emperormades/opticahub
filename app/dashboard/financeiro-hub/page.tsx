"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import FinanceiroPage from "../financeiro/page";
import CarnePage from "../financeiro/carne/page";
import DrePage from "../analytics/dre/page";
import s from "../shared.module.css";

const TABS = [
  { id: "FINANCEIRO", label: "Gestão Financeira", icon: "🏦" },
  { id: "CARNE", label: "Carnês Digitais", icon: "💳" },
  { id: "DRE", label: "DRE (Resultados)", icon: "🧭" },
  { id: "CONCILIACAO", label: "Conciliação Bancária", icon: "🔄" },
];

const UI_TABS = [
  { id: "FINANCEIRO", label: "Caixa", icon: "CX" },
  { id: "CARNE", label: "Carnês", icon: "CRN" },
  { id: "DRE", label: "DRE", icon: "DRE" },
  { id: "CONCILIACAO", label: "Conciliação", icon: "OFX" },
];

export default function FinanceiroHubPage() {
  const [activeTab, setActiveTab] = useState("FINANCEIRO");

  const activeSummaryMap: Record<
    string,
    { title: string; text: string; focus: string }
  > = {
    FINANCEIRO: {
      title: "Operação Financeira Diária",
      text: "Acompanhe caixa, lançamentos e saldo do dia para manter o fechamento confiável.",
      focus: "Caixa e transações",
    },
    CARNE: {
      title: "Gestão de Recebíveis Parcelados",
      text: "Controle parcelas em aberto, cobrança e baixa de crediário no mesmo fluxo.",
      focus: "Recebíveis e cobrança",
    },
    DRE: {
      title: "Leitura Gerencial de Resultados",
      text: "Use o DRE para enxergar margem, EBITDA e lucro sem perder a visão operacional do período.",
      focus: "Resultado e margem",
    },
    CONCILIACAO: {
      title: "Conciliação Bancária (OFX)",
      text: "Importe o extrato do banco, confira os lançamentos e ajuste divergências antes do fechamento mensal.",
      focus: "Extrato e divergências",
    },
  };

  const activeSummary = activeSummaryMap[activeTab];

  return (
    <div className={s.page} style={{ paddingTop: 0 }}>

      {/* * Header fixo — padrão idêntico ao Panorama e Clínica Hub */}
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
            🏦 Hub Financeiro
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

      {/* * Ações rápidas coerentes com o ERP — 4 entradas espelhando as 4 tabs */}
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
            id: "FINANCEIRO",
            icon: "🏦",
            label: "Caixa Diário",
            sub: "Caixa, extrato e pendências do dia em um único painel.",
          },
          {
            id: "CARNE",
            icon: "💳",
            label: "Recebíveis",
            sub: "Gerar carnê, baixar parcelas e acompanhar cobrança.",
          },
          {
            id: "DRE",
            icon: "🧭",
            label: "Resultado (DRE)",
            sub: "Analise margem e EBITDA do período.",
          },
          {
            id: "CONCILIACAO",
            icon: "🔄",
            label: "Conciliação",
            sub: "Acesse OFX e ajuste lançamentos antes do fechamento.",
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
              background: activeTab === item.id ? "rgba(59,130,246,0.06)" : "#ffffff",
              border: `1px solid ${activeTab === item.id ? "rgba(59,130,246,0.25)" : "rgba(0,0,0,0.08)"}`,
              borderRadius: 10,
              cursor: "pointer",
              transition: "all 120ms ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 800, color: activeTab === item.id ? "#3b82f6" : "#374151" }}>
              {item.icon} {item.label}
            </span>
            <span style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.4 }}>
              {item.sub}
            </span>
          </button>
        ))}
      </div>

      <div style={{ padding: "0 24px 24px" }}>
        {activeTab === "FINANCEIRO" && <FinanceiroPage />}
        {activeTab === "CARNE" && <CarnePage />}
        {activeTab === "DRE" && <DrePage />}
        {activeTab === "CONCILIACAO" && (
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
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔄</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#374151", marginBottom: 6 }}>
              Conciliação Bancária
            </div>
            <div style={{ fontSize: 13 }}>
              Navegue para{" "}
              <a href="/dashboard/financeiro/conciliacao" style={{ color: "#3b82f6", fontWeight: 600 }}>
                Conciliação Bancária
              </a>{" "}
              para importar o extrato OFX e conferir os lançamentos.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

