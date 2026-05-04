"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import s from "../shared.module.css";

interface TenantConfig {
  whatsappToken?: string;
  whatsappPhoneId?: string;
  defaultCommissionPct?: number;
  logo?: string;
  address?: string;
  phone?: string;
  cnpj?: string;
  enableAgents?: boolean;
}

interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  plan: string;
  config: TenantConfig | null;
}

const PLAN_LABELS: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  STARTER: { label: "Starter", color: "#6366f1", bg: "#eef2ff" },
  PROFESSIONAL: { label: "Professional", color: "#0ea5e9", bg: "#e0f2fe" },
  ENTERPRISE: { label: "Enterprise", color: "#16a34a", bg: "#dcfce7" },
};

export default function ConfiguracoesPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [address, setAddress] = useState("");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [commissionPct, setCommissionPct] = useState(5);
  const [enableAgents, setEnableAgents] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok || !data) {
          setUiMessage({
            type: "error",
            text: data?.error || "Nao foi possivel carregar as configuracoes.",
          });
          setLoading(false);
          return;
        }
        const typedData = data as TenantSettings;
        setSettings(typedData);
        setName(typedData.name || "");
        const cfg = typedData.config || {};
        setPhone(cfg.phone || "");
        setCnpj(cfg.cnpj || "");
        setAddress(cfg.address || "");
        setWhatsappToken(cfg.whatsappToken || "");
        setWhatsappPhoneId(cfg.whatsappPhoneId || "");
        setCommissionPct(cfg.defaultCommissionPct || 5);
        setEnableAgents(cfg.enableAgents || false);
        setUiMessage(null);
        setLoading(false);
      })
      .catch(() => {
        setUiMessage({
          type: "error",
          text: "Falha ao carregar as configuracoes da loja.",
        });
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          config: {
            phone,
            cnpj,
            address,
            whatsappToken,
            whatsappPhoneId,
            defaultCommissionPct: commissionPct,
            enableAgents,
          },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setUiMessage({
          type: "error",
          text: data?.error || "Nao foi possivel salvar as configuracoes.",
        });
        return;
      }
      setSaved(true);
      setUiMessage({
        type: "success",
        text: "Configuracoes salvas com sucesso.",
      });
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setUiMessage({
        type: "error",
        text: "Falha ao salvar as configuracoes da loja.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className={s.page}>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>⏳</div>
          <p className={s.emptyText}>Carregando configurações...</p>
        </div>
      </div>
    );

  const plan = PLAN_LABELS[settings?.plan || "STARTER"];

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageTitleArea}>
          <h1 className={s.pageTitle}>⚙️ Configurações da Loja</h1>
          <p className={s.pageSubtitle}>
            Personalize o sistema com os dados e integrações da sua ótica
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            alignItems: "center",
          }}
        >
          {saved && (
            <span
              style={{
                fontSize: 13,
                color: "#16a34a",
                fontWeight: 700,
                padding: "8px 14px",
                background: "#dcfce7",
                borderRadius: 8,
              }}
            >
              ✓ Salvo com sucesso!
            </span>
          )}
          <button
            id="btn-salvar-config"
            className={s.btnPrimary}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Salvando..." : "💾 Salvar Configurações"}
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

      <div className={s.nextActionBanner}>
        <div>
          <div className={s.nextActionLabel}>⚡ Próxima Ação</div>
          <div className={s.nextActionText}>
            Salve as configurações e valide os serviços no Diagnóstico antes de liberar a operação.
          </div>
        </div>
        <div className={s.nextActionActions}>
          <Link href="/dashboard/diagnostico" className={s.btnSecondary} style={{ textDecoration: "none" }}>
            Ver Diagnóstico →
          </Link>
          <Link href="/dashboard/agentes" className={s.btnSecondary} style={{ textDecoration: "none" }}>
            Agentes IA →
          </Link>
        </div>
      </div>


      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-5)",
        }}
      >
        {/* Coluna Esquerda */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-5)",
          }}
        >
          {/* Dados da Loja */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>🏪 Dados da Ótica</span>
            </div>
            <div
              className={s.formSection}
              style={{ padding: "var(--space-4)" }}
            >
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Nome da Loja *</label>
                <input
                  className={s.fieldInput}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ótica Central"
                />
              </div>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>CNPJ</label>
                <input
                  className={s.fieldInput}
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Telefone</label>
                <input
                  className={s.fieldInput}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Endereço</label>
                <input
                  className={s.fieldInput}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, Nº, Bairro, Cidade - UF"
                />
              </div>
            </div>
          </div>

          {/* Comissões */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>💵 Comissões</span>
            </div>
            <div style={{ padding: "var(--space-4)" }}>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>
                  Comissão padrão dos vendedores (%)
                </label>
                <input
                  className={s.fieldInput}
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={commissionPct}
                  onChange={(e) => setCommissionPct(Number(e.target.value))}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginTop: 4,
                  }}
                >
                  Esta % é aplicada automaticamente no fechamento de cada OS
                  paga.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-5)",
          }}
        >
          {/* Plano Atual */}
          <div className={s.card} style={{ padding: "var(--space-4)" }}>
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
                    letterSpacing: "0.05em",
                  }}
                >
                  Plano Atual
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: plan.color,
                    marginTop: 4,
                  }}
                >
                  {plan.label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginTop: 4,
                  }}
                >
                  Slug:{" "}
                  <code style={{ fontFamily: "monospace" }}>
                    {settings?.slug}
                  </code>
                </div>
              </div>
              <div
                style={{
                  padding: "8px 16px",
                  background: plan.bg,
                  borderRadius: 8,
                  color: plan.color,
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                ⭐ {plan.label}
              </div>
            </div>
          </div>

          {/* WhatsApp */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>
                💬 WhatsApp Business (Meta API)
              </span>
            </div>
            <div
              className={s.formSection}
              style={{ padding: "var(--space-4)" }}
            >
              <div
                style={{
                  padding: "var(--space-3)",
                  background: "#fef9c3",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#b45309",
                  marginBottom: "var(--space-3)",
                }}
              >
                ⚠️ Para ativar o envio real via WhatsApp, você precisa de uma
                conta no <strong>Meta for Developers</strong> com um número de
                WhatsApp Business aprovado.
              </div>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>
                  Token de Acesso (WHATSAPP_TOKEN)
                </label>
                <input
                  className={s.fieldInput}
                  type="password"
                  value={whatsappToken}
                  onChange={(e) => setWhatsappToken(e.target.value)}
                  placeholder="EAAxxxxxxxx..."
                />
              </div>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>
                  Phone ID (WHATSAPP_PHONE_ID)
                </label>
                <input
                  className={s.fieldInput}
                  value={whatsappPhoneId}
                  onChange={(e) => setWhatsappPhoneId(e.target.value)}
                  placeholder="123456789012345"
                />
              </div>
            </div>
          </div>

          {/* Agentes IA */}
          <div className={s.card} style={{ padding: "var(--space-4)" }}>
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
                    fontWeight: 700,
                    fontSize: 14,
                    color: "var(--text-primary)",
                  }}
                >
                  🤖 Funcionários Digitais (Agentes IA)
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    marginTop: 4,
                  }}
                >
                  Habilita a infraestrutura de automação inteligente para esta
                  loja.
                </div>
              </div>
              <button
                id="toggle-agentes"
                onClick={() => setEnableAgents(!enableAgents)}
                style={{
                  width: 52,
                  height: 28,
                  borderRadius: 14,
                  border: "none",
                  background: enableAgents
                    ? "var(--brand-primary)"
                    : "var(--border-subtle)",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.2s",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#fff",
                    top: 3,
                    transition: "left 0.2s",
                    left: enableAgents ? 27 : 3,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                  }}
                />
              </button>
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: 11,
                color: "var(--text-tertiary)",
                padding: "var(--space-2)",
                background: "var(--bg-elevated)",
                borderRadius: 6,
              }}
            >
              🔌 Infraestrutura pronta. Os "cérebros" dos agentes serão plugados
              em versão futura.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
