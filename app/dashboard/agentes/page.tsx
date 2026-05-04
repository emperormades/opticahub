"use client";

import { useState, useEffect, useCallback } from "react";
import s from "../shared.module.css";
import a from "./agentes.module.css";

interface AIAgent {
  id: string;
  type: string;
  name: string;
  description: string;
  longDesc?: string;
  icon?: string;
  priceMonth: number;
  basePrompt?: string;
}

type AgentConfigValue =
  | string
  | number
  | boolean
  | null
  | AgentConfigValue[]
  | { [key: string]: AgentConfigValue };

interface AgentLog {
  id: string;
  createdAt: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
}

interface TenantAgent {
  id: string;
  agentId: string;
  status: "ACTIVE" | "PAUSED" | "CONFIGURING" | "ERROR";
  customPrompt?: string;
  config: AgentConfigValue;
  totalTasksRun: number;
  lastRunAt?: string;
  agent: AIAgent;
  logs?: AgentLog[];
  tasks?: { id: string }[];
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v,
  );

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AgentesIAPage() {
  const [activeTab, setActiveTab] = useState<"marketplace" | "meus-agentes">(
    "marketplace",
  );
  const [catalog, setCatalog] = useState<AIAgent[]>([]);
  const [myAgents, setMyAgents] = useState<TenantAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentDetails, setAgentDetails] = useState<TenantAgent | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  // Prompts & Config
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptValue, setPromptValue] = useState("");

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agents");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setUiMessage({
          type: "error",
          text:
            data?.error ||
            "Nao foi possivel carregar o marketplace de agentes.",
        });
        setCatalog([]);
        setMyAgents([]);
        return;
      }
      setCatalog(data?.catalog || []);
      setMyAgents(data?.myAgents || []);
      setUiMessage(null);
    } catch {
      setUiMessage({
        type: "error",
        text: "Falha ao carregar os agentes da loja.",
      });
      setCatalog([]);
      setMyAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const handleSubscribe = async (agentId: string) => {
    const res = await fetch("/api/agents/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    });
    if (res.ok) {
      await fetchCatalog();
      setActiveTab("meus-agentes");
      setUiMessage({ type: "success", text: "Agente contratado com sucesso." });
    } else {
      const data = await res.json().catch(() => null);
      setUiMessage({
        type: "error",
        text: data?.error || "Nao foi possivel contratar este agente.",
      });
    }
  };

  const loadAgentDetails = async (tenantAgentId: string) => {
    setDetailsLoading(true);
    setSelectedAgentId(tenantAgentId);
    try {
      const res = await fetch(`/api/agents/${tenantAgentId}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setUiMessage({
          type: "error",
          text:
            data?.error || "Nao foi possivel carregar os detalhes do agente.",
        });
        setAgentDetails(null);
        return;
      }
      setAgentDetails(data);
      setPromptValue(data.customPrompt || "");
      setEditingPrompt(false);
      setUiMessage(null);
    } catch {
      setUiMessage({
        type: "error",
        text: "Falha ao carregar o agente selecionado.",
      });
      setAgentDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!agentDetails) return;
    const res = await fetch(`/api/agents/${agentDetails.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customPrompt: promptValue }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAgentDetails((prev) =>
        prev ? { ...prev, customPrompt: updated.customPrompt } : null,
      );
      setEditingPrompt(false);
      setUiMessage({
        type: "success",
        text: "Diretrizes do agente atualizadas com sucesso.",
      });
    } else {
      const data = await res.json().catch(() => null);
      setUiMessage({
        type: "error",
        text: data?.error || "Nao foi possivel salvar as diretrizes do agente.",
      });
    }
  };

  const handleToggleStatus = async (currentStatus: string) => {
    if (!agentDetails) return;
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const res = await fetch(`/api/agents/${agentDetails.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAgentDetails((prev) =>
        prev ? { ...prev, status: updated.status } : null,
      );
      fetchCatalog(); // Atualiza badge da lista
      setUiMessage({
        type: "success",
        text: `Agente ${updated.status === "ACTIVE" ? "ativado" : "pausado"} com sucesso.`,
      });
    } else {
      const data = await res.json().catch(() => null);
      setUiMessage({
        type: "error",
        text: data?.error || "Nao foi possivel alterar o status do agente.",
      });
    }
  };

  const handleUnsubscribe = async (id: string) => {
    if (
      !confirm(
        "Deseja realmente demitir este agente? O histórico será apagado.",
      )
    )
      return;
    const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSelectedAgentId(null);
      fetchCatalog();
      setUiMessage({ type: "success", text: "Agente removido com sucesso." });
    } else {
      const data = await res.json().catch(() => null);
      setUiMessage({
        type: "error",
        text: data?.error || "Nao foi possivel remover este agente.",
      });
    }
  };

  if (loading)
    return (
      <div className={s.page}>
        <div className={s.emptyState}>⏳ Carregando agentes...</div>
      </div>
    );

  return (
    <div className={a.page}>
      <div className={s.pageHeader}>
        <div className={s.pageTitleArea}>
          <h1 className={s.pageTitle}>Funcionários Digitais (IA)</h1>
          <p className={s.pageSubtitle}>
            Automação cognitiva para escalas de atendimento e pós-venda.
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

      <div className={a.layout}>
        {/* SIDEBAR TABS & LIST */}
        <div className={a.sidebar}>
          <div className={a.tabs}>
            <button
              className={activeTab === "marketplace" ? a.tabActive : a.tab}
              onClick={() => {
                setActiveTab("marketplace");
                setSelectedAgentId(null);
              }}
            >
              🛒 Marketplace
            </button>
            <button
              className={activeTab === "meus-agentes" ? a.tabActive : a.tab}
              onClick={() => {
                setActiveTab("meus-agentes");
                setSelectedAgentId(null);
              }}
            >
              🤖 Minha Equipe IA ({myAgents.length})
            </button>
          </div>

          <div className={a.listArea}>
            <div
              className={s.card}
              style={{
                marginBottom: "var(--space-3)",
                borderLeft: "4px solid var(--brand-primary)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 4,
                }}
              >
                {activeTab === "marketplace"
                  ? "Contratacao assistida"
                  : "Gestao da equipe ativa"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                {activeTab === "marketplace"
                  ? "Contrate pelo marketplace. Se o agente ja estiver ativo, abra direto na equipe."
                  : "Selecione um agente para ajustar prompt, pausar, ativar ou revisar a operacao."}
              </div>
            </div>
            {activeTab === "marketplace" && (
              <div className={a.agentGrid}>
                {catalog.map((agent) => {
                  const subscribedAgent = myAgents.find(
                    (m) => m.agentId === agent.id,
                  );
                  const isSubscribed = Boolean(subscribedAgent);
                  return (
                    <div key={agent.id} className={a.agentCard}>
                      <div className={a.agentHeader}>
                        <div className={a.agentIcon}>{agent.icon || "🤖"}</div>
                        <div className={a.agentName}>{agent.name}</div>
                      </div>
                      <div className={a.agentDesc}>{agent.description}</div>
                      <div className={a.agentPrice}>
                        {Number(agent.priceMonth) === 0 ? (
                          "Gratuito"
                        ) : (
                          <span>
                            {formatCurrency(Number(agent.priceMonth))}/mês
                          </span>
                        )}
                      </div>
                      <div className={a.agentFooter}>
                        {isSubscribed ? (
                          <button
                            className={s.btnSecondary}
                            style={{ width: "100%", fontSize: 0 }}
                            onClick={() => {
                              setActiveTab("meus-agentes");
                              if (subscribedAgent) {
                                void loadAgentDetails(subscribedAgent.id);
                              }
                            }}
                          >
                            <span style={{ fontSize: 13 }}>Abrir na Equipe</span>
                            ✓ Contratado
                          </button>
                        ) : (
                          <button
                            id={`btn-contratar-${agent.type.toLowerCase()}`}
                            className={s.btnPrimary}
                            style={{ width: "100%", justifyContent: "center" }}
                            onClick={() => handleSubscribe(agent.id)}
                          >
                            + Contratar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "meus-agentes" && (
              <div className={a.workerList}>
                {myAgents.length === 0 ? (
                  <div className={a.emptyWorkers}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        textAlign: "center",
                        marginBottom: 8,
                      }}
                    >
                      Nenhum agente ativo nesta loja.
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        textAlign: "center",
                      }}
                    >
                      Contrate no marketplace e depois abra o agente aqui para ajustar o comportamento.
                    </div>
                    <button
                      className={s.btnPrimary}
                      style={{
                        marginTop: 12,
                        width: "100%",
                        justifyContent: "center",
                      }}
                      onClick={() => setActiveTab("marketplace")}
                    >
                      Ir para Marketplace
                    </button>
                    Você ainda não tem agentes contratados. Vá ao Marketplace!
                  </div>
                ) : (
                  myAgents.map((w) => (
                    <div
                      key={w.id}
                      className={
                        selectedAgentId === w.id
                          ? a.workerItemActive
                          : a.workerItem
                      }
                      onClick={() => loadAgentDetails(w.id)}
                    >
                      <div className={a.workerLeft}>
                        <span>{w.agent.icon || "🤖"}</span>
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span className={a.workerName}>{w.agent.name}</span>
                          <span
                            className={a.workerStatus}
                            style={{
                              color:
                                w.status === "ACTIVE"
                                  ? "var(--status-success)"
                                  : w.status === "PAUSED"
                                    ? "var(--status-warning)"
                                    : "var(--text-tertiary)",
                            }}
                          >
                            {w.status === "ACTIVE"
                              ? "🟢 Trabalhando"
                              : w.status === "PAUSED"
                                ? "⏸️ Pausado"
                                : `⚙️ ${w.status}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* DETAILS PANEL (MYS AGENTES ONLY) */}
        {activeTab === "meus-agentes" && selectedAgentId && (
          <div className={a.detailsPanel}>
            {detailsLoading ? (
              <div className={s.emptyState}>
                ⏳ Carregando cérebro digital...
              </div>
            ) : agentDetails ? (
              <div className={a.brainUI}>
                <div className={a.brainHeader}>
                  <div className={a.brainTitleRow}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span style={{ fontSize: "32px" }}>
                        {agentDetails.agent.icon}
                      </span>
                      <div>
                        <h2 className={a.brainName}>
                          {agentDetails.agent.name}
                        </h2>
                        <span className={a.brainSubtitle}>
                          {agentDetails.agent.description}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        id="btn-toggle-agent"
                        className={s.btnPrimary}
                        style={{
                          background:
                            agentDetails.status === "ACTIVE"
                              ? "var(--status-warning)"
                              : "var(--status-success)",
                          color:
                            agentDetails.status === "ACTIVE" ? "#000" : "#fff",
                        }}
                        onClick={() => handleToggleStatus(agentDetails.status)}
                      >
                        {agentDetails.status === "ACTIVE"
                          ? "⏸️ Pausar Agente"
                          : "▶️ Ativar Agente"}
                      </button>
                      <button
                        className={s.btnSecondary}
                        style={{
                          color: "var(--status-error)",
                          borderColor: "var(--status-error)",
                        }}
                        onClick={() => handleUnsubscribe(agentDetails.id)}
                      >
                        Demitir
                      </button>
                    </div>
                  </div>

                  <div className={a.kpiRow}>
                    <div className={a.kpiCard}>
                      <span className={a.kpiLabel}>Status</span>
                      <span
                        className={a.kpiValue}
                        style={{
                          color:
                            agentDetails.status === "ACTIVE"
                              ? "var(--status-success)"
                              : "var(--status-warning)",
                        }}
                      >
                        {agentDetails.status}
                      </span>
                    </div>
                    <div className={a.kpiCard}>
                      <span className={a.kpiLabel}>Ações Executadas</span>
                      <span className={a.kpiValue}>
                        {agentDetails.totalTasksRun}
                      </span>
                    </div>
                    <div className={a.kpiCard}>
                      <span className={a.kpiLabel}>Última Ação</span>
                      <span
                        className={a.kpiValue}
                        style={{ fontSize: "13px", paddingTop: 3 }}
                      >
                        {agentDetails.lastRunAt
                          ? formatDateTime(agentDetails.lastRunAt)
                          : "Nunca rodou"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={a.brainBody}>
                  {/* Prompt Tuning */}
                  <div className={s.card}>
                    <div className={s.cardHeader}>
                      <span className={s.cardTitle}>
                        🧠 Prompt Tuning (Comportamento)
                      </span>
                      {!editingPrompt ? (
                        <button
                          className={s.btnGhost}
                          onClick={() => setEditingPrompt(true)}
                        >
                          ✏️ Editar Diretrizes
                        </button>
                      ) : (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className={s.btnSecondary}
                            onClick={() => {
                              setEditingPrompt(false);
                              setPromptValue(agentDetails.customPrompt || "");
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            className={s.btnPrimary}
                            onClick={handleSavePrompt}
                          >
                            Salvar
                          </button>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "var(--space-4)" }}>
                      {editingPrompt ? (
                        <textarea
                          className={s.fieldTextarea}
                          style={{
                            minHeight: "150px",
                            fontFamily: "monospace",
                            fontSize: 12,
                          }}
                          value={promptValue}
                          onChange={(e) => setPromptValue(e.target.value)}
                          placeholder="Reescreva o prompt do agente..."
                        />
                      ) : (
                        <div className={a.promptDisplay}>
                          {agentDetails.customPrompt ||
                            "Nenhuma diretriz configurada."}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Config JSON Stub */}
                  <div className={s.card}>
                    <div className={s.cardHeader}>
                      <span className={s.cardTitle}>
                        ⚙️ Configurações Base (Regras)
                      </span>
                    </div>
                    <div style={{ padding: "var(--space-4)" }}>
                      <pre className={a.jsonDisplay}>
                        {JSON.stringify(agentDetails.config, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Logs & Auditoria */}
                  <div className={s.card}>
                    <div className={s.cardHeader}>
                      <span className={s.cardTitle}>
                        📜 Audit Log do Agente
                      </span>
                      <span className={s.cardCount}>
                        {(agentDetails.logs || []).length} registros
                      </span>
                    </div>
                    <table className={s.table}>
                      <thead className={s.tableHead}>
                        <tr>
                          <th>Time</th>
                          <th>Level</th>
                          <th>Evento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(agentDetails.logs || []).length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              style={{
                                textAlign: "center",
                                padding: "var(--space-5)",
                                color: "var(--text-tertiary)",
                              }}
                            >
                              Nenhuma atividade registrada ainda.
                            </td>
                          </tr>
                        ) : (
                          (agentDetails.logs || []).map((log) => (
                            <tr key={log.id} className={s.tableRow}>
                              <td
                                style={{
                                  fontSize: "11px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatDateTime(log.createdAt)}
                              </td>
                              <td>
                                <span
                                  className={`${s.badge} ${log.level === "ERROR" ? s.badgeError : log.level === "WARN" ? s.badgeWarning : s.badgeInfo}`}
                                >
                                  {log.level}
                                </span>
                              </td>
                              <td
                                style={{
                                  fontFamily: "monospace",
                                  fontSize: "12px",
                                }}
                              >
                                {log.message}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
