"use client";

import Link from "next/link";
import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import ConfiguracoesPage from "../configuracoes/page";
import AgentesPage from "../agentes/page";
import s from "../shared.module.css";

const TABS = [
  { id: "CONFIG", label: "Dados da Loja", icon: "⚙️" },
  { id: "AGENTES", label: "Agentes IA (Beta)", icon: "🤖" },
];

export default function AdminHubPage() {
  const [activeTab, setActiveTab] = useState("CONFIG");

  const activeSummary =
    activeTab === "CONFIG"
      ? {
          title: "Base institucional da loja",
          text: "Centralize identidade da otica, integracoes administrativas e regras gerais antes de expandir automacoes.",
        }
      : {
          title: "Operacao de agentes em consolidacao",
          text: "O modulo de agentes ja pode ser configurado e auditado, mas segue em fase de maturacao operacional.",
        };

  return (
    <div className={s.page} style={{ paddingTop: 0 }}>
      <div
        style={{
          padding: "16px 24px",
          background: "var(--bg-elevated)",
          borderBottom: "1px solid var(--border-color)",
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
            }}
          >
            ⚙️ Configurações & Inteligência
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
              gridTemplateColumns: "1.4fr 1fr 1fr",
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
                Hub Administrativo
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
                {activeTab === "CONFIG" ? "Dados da Loja" : "Agentes IA"}
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
                Foco atual
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {activeTab === "CONFIG"
                  ? "Governanca e setup"
                  : "Automacao assistida"}
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "var(--space-2)",
              }}
            >
              <Link
                href={activeTab === "CONFIG" ? "/dashboard/configuracoes" : "/dashboard/agentes"}
                className={s.btnSecondary}
                style={{ textDecoration: "none", textAlign: "center" }}
              >
                {activeTab === "CONFIG" ? "Abrir Configuracoes" : "Abrir Agentes"}
              </Link>
              <Link
                href="/dashboard/diagnostico"
                className={s.btnSecondary}
                style={{ textDecoration: "none", textAlign: "center" }}
              >
                Ver Diagnostico
              </Link>
            </div>
          </div>
        </div>

        {activeTab === "CONFIG" && <ConfiguracoesPage />}
        {activeTab === "AGENTES" && <AgentesPage />}
      </div>
    </div>
  );
}
