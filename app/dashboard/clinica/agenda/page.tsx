"use client";

import {
  buildOperationalWhatsAppMessage,
  buildOperationalWhatsAppUrl,
} from "@/lib/integrations/whatsapp-operational";
import { useState, useEffect } from "react";
import s from "../../shared.module.css";

interface FollowUp {
  id: string;
  scheduledDate: string;
  protocol: string;
  status: "PENDING" | "COMPLETED" | "MISSED" | "RESCHEDULED";
  customer: { name: string; phone: string | null };
  order: { orderNumber: string };
}

interface PublicScheduleRequest {
  id: string;
  createdAt: string;
  requestedDate: string | null;
  preferredPeriod: string | null;
  notes: string | null;
  leadName: string;
  leadPhone: string | null;
  source: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
}

type FollowUpActionType = "COMPLETE" | "MISSED" | "RESCHEDULE";
type PublicRequestActionType = "CONFIRM" | "DISMISS";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export default function AgendaClinicaPage() {
  const [agenda, setAgenda] = useState<{
    overdue: FollowUp[];
    thisWeek: FollowUp[];
    upcoming: FollowUp[];
    total: number;
  }>({
    overdue: [],
    thisWeek: [],
    upcoming: [],
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [publicRequests, setPublicRequests] = useState<{
    requests: PublicScheduleRequest[];
    summary: { total: number; today: number; highPriority: number };
  }>({
    requests: [],
    summary: { total: 0, today: 0, highPriority: 0 },
  });
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [followUpAction, setFollowUpAction] = useState<{
    followUpId: string;
    action: FollowUpActionType;
  } | null>(null);
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [followUpNextDate, setFollowUpNextDate] = useState("");
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const [publicRequestAction, setPublicRequestAction] = useState<{
    taskId: string;
    action: PublicRequestActionType;
  } | null>(null);
  const [publicRequestNotes, setPublicRequestNotes] = useState("");
  const [submittingPublicRequest, setSubmittingPublicRequest] = useState(false);

  const fetchAgenda = async () => {
    try {
      const res = await fetch("/api/clinical/followups?daysAhead=90");
      const data = await res.json();
      if (res.ok) {
        setAgenda(data);
      } else {
        setUiMessage({
          type: "error",
          text: data.error || "Nao foi possivel carregar a agenda clinica.",
        });
      }
    } catch {
      setUiMessage({
        type: "error",
        text: "Falha ao carregar os retornos clinicos.",
      });
    }
  };

  const fetchPublicRequests = async () => {
    try {
      const res = await fetch("/api/clinics/schedule/requests");
      const data = await res.json();
      if (res.ok) {
        setPublicRequests(data);
      } else {
        setUiMessage({
          type: "error",
          text:
            data.error || "Nao foi possivel carregar as solicitacoes publicas.",
        });
      }
    } catch {
      setUiMessage({
        type: "error",
        text: "Falha ao carregar as solicitacoes de agendamento.",
      });
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAgenda(), fetchPublicRequests()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  const openFollowUpAction = (
    followUpId: string,
    action: FollowUpActionType,
  ) => {
    setFollowUpAction({ followUpId, action });
    setFollowUpNotes("");
    setFollowUpNextDate("");
  };

  const handleAction = async () => {
    if (!followUpAction) return;
    if (followUpAction.action === "RESCHEDULE" && !followUpNextDate) {
      setUiMessage({
        type: "error",
        text: "Informe a nova data antes de reagendar.",
      });
      return;
    }

    setSubmittingFollowUp(true);
    const res = await fetch("/api/clinical/followups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        followUpId: followUpAction.followUpId,
        action: followUpAction.action,
        notes: followUpNotes,
        nextDate:
          followUpAction.action === "RESCHEDULE" ? followUpNextDate : null,
      }),
    });

    if (res.ok) {
      setUiMessage({ type: "success", text: "Agenda atualizada com sucesso." });
      setFollowUpAction(null);
      setFollowUpNotes("");
      setFollowUpNextDate("");
      void refreshAll();
    } else {
      const data = await res.json();
      setUiMessage({
        type: "error",
        text: data.error || "Falha ao atualizar agendamento.",
      });
    }
    setSubmittingFollowUp(false);
  };

  const openPublicRequestAction = (
    taskId: string,
    action: PublicRequestActionType,
  ) => {
    setPublicRequestAction({ taskId, action });
    setPublicRequestNotes("");
  };

  const handlePublicRequest = async () => {
    if (!publicRequestAction) return;
    setSubmittingPublicRequest(true);
    const res = await fetch("/api/clinics/schedule/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: publicRequestAction.taskId,
        action: publicRequestAction.action,
        notes:
          publicRequestAction.action === "DISMISS" ? publicRequestNotes : "",
      }),
    });

    if (res.ok) {
      setUiMessage({
        type: "success",
        text:
          publicRequestAction.action === "CONFIRM"
            ? "Solicitacao marcada como atendida pela clinica."
            : "Solicitacao encerrada com sucesso.",
      });
      setPublicRequestAction(null);
      setPublicRequestNotes("");
      void refreshAll();
    } else {
      const data = await res.json().catch(() => null);
      setUiMessage({
        type: "error",
        text: data?.error || "Falha ao atualizar a solicitacao publica.",
      });
    }
    setSubmittingPublicRequest(false);
  };

  if (loading && agenda.total === 0) {
    return (
      <div className={s.page}>
        <div className={s.emptyState}>Carregando agenda clinica...</div>
      </div>
    );
  }

  const renderList = (items: FollowUp[], title: string, badgeColor: string) => {
    if (!items.length) return null;
    return (
      <div
        className={s.card}
        style={{ marginBottom: 24, borderLeft: `6px solid ${badgeColor}` }}
      >
        <div className={s.cardHeader}>
          <div className={s.cardTitle}>
            {title}{" "}
            <span className={s.badge} style={{ marginLeft: 8 }}>
              {items.length}
            </span>
          </div>
        </div>
        <table className={s.table}>
          <thead className={s.tableHead}>
            <tr>
              <th>Data do Retorno</th>
              <th>Paciente</th>
              <th>Contato</th>
              <th>Tratamento / OS</th>
              <th align="right">Acao Rapida</th>
            </tr>
          </thead>
          <tbody>
            {items.map((followUp) => (
              <tr key={followUp.id} className={s.tableRow}>
                <td style={{ fontWeight: 600, color: badgeColor }}>
                  {formatDate(followUp.scheduledDate)}
                </td>
                <td className={s.cellName}>{followUp.customer.name}</td>
                <td>{followUp.customer.phone || "Sem Telefone"}</td>
                <td>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>
                    {followUp.protocol.replace("_", " ")}
                  </div>
                  <div style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
                    OS {followUp.order.orderNumber}
                  </div>
                </td>
                <td
                  align="right"
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() => openFollowUpAction(followUp.id, "COMPLETE")}
                    className={s.btnPrimary}
                    style={{ padding: "4px 12px", fontSize: 12 }}
                  >
                    Realizado
                  </button>
                  <button
                    onClick={() =>
                      openFollowUpAction(followUp.id, "RESCHEDULE")
                    }
                    className={s.btnSecondary}
                    style={{ padding: "4px 12px", fontSize: 12 }}
                  >
                    Reagendar
                  </button>
                  <button
                    onClick={() => openFollowUpAction(followUp.id, "MISSED")}
                    className={s.btnDanger}
                    style={{ padding: "4px 12px", fontSize: 12 }}
                  >
                    Faltou
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className={s.page}>
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

      <div className={s.pageHeader}>
        <div className={s.pageTitleArea}>
          <h1 className={s.pageTitle}>CRM e Agenda Preditiva</h1>
          <p className={s.pageSubtitle}>
            Acompanhamento proativo de pacientes com tratamentos prolongados.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className={s.btnSecondary} onClick={() => void refreshAll()}>
            Atualizar Agenda
          </button>
        </div>
      </div>

      <div className={s.kpiGrid}>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Solicitacoes Publicas</div>
          <div
            className={s.kpiValue}
            style={{
              color:
                publicRequests.summary.total > 0
                  ? "var(--status-info)"
                  : "inherit",
            }}
          >
            {publicRequests.summary.total} leads
          </div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Retornos Vencidos</div>
          <div
            className={s.kpiValue}
            style={{
              color:
                agenda.overdue.length > 0 ? "var(--status-error)" : "inherit",
            }}
          >
            {agenda.overdue.length} pacientes
          </div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Retornos Nesta Semana</div>
          <div
            className={s.kpiValue}
            style={{
              color:
                agenda.thisWeek.length > 0
                  ? "var(--status-warning)"
                  : "inherit",
            }}
          >
            {agenda.thisWeek.length} pacientes
          </div>
        </div>
      </div>

      <div
        className={s.card}
        style={{ marginBottom: 24, borderLeft: "6px solid var(--status-info)" }}
      >
        <div className={s.cardHeader}>
          <div className={s.cardTitle}>
            Triagem de Agendamentos Publicos
            <span className={s.badge} style={{ marginLeft: 8 }}>
              {publicRequests.summary.total}
            </span>
          </div>
        </div>
        {publicRequests.requests.length === 0 ? (
          <div className={s.emptyState}>
            Nenhuma solicitacao publica aguardando retorno da clinica.
          </div>
        ) : (
          <table className={s.table}>
            <thead className={s.tableHead}>
              <tr>
                <th>Paciente</th>
                <th>Horario Preferencial</th>
                <th>Preferencia</th>
                <th>Observacao</th>
                <th align="right">Acao</th>
              </tr>
            </thead>
            <tbody>
              {publicRequests.requests.map((request) => {
                const whatsappUrl = buildOperationalWhatsAppUrl(
                  request.leadPhone,
                  buildOperationalWhatsAppMessage("schedule_confirmation", {
                    customerName: request.leadName,
                    requestedDate: request.requestedDate
                      ? formatDateTime(request.requestedDate)
                      : "o horario solicitado",
                    preferredPeriod: request.preferredPeriod,
                  }),
                );

                return (
                  <tr key={request.id} className={s.tableRow}>
                    <td>
                      <div className={s.cellName}>{request.leadName}</div>
                      <div
                        style={{ fontSize: 12, color: "var(--text-tertiary)" }}
                      >
                        {request.leadPhone || "Sem WhatsApp"} •{" "}
                        {request.source || "Link publico"}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {request.requestedDate
                        ? formatDateTime(request.requestedDate)
                        : "Nao informado"}
                    </td>
                    <td>
                      <span className={s.badge}>
                        {request.preferredPeriod || "sem periodo"}
                      </span>
                    </td>
                    <td
                      style={{
                        maxWidth: 280,
                        fontSize: 12,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {request.notes || "Sem observacao adicional"}
                    </td>
                    <td
                      align="right"
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                      }}
                    >
                      {whatsappUrl ? (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={s.btnSecondary}
                          style={{
                            textDecoration: "none",
                            padding: "4px 12px",
                            fontSize: 12,
                          }}
                        >
                          WhatsApp
                        </a>
                      ) : (
                        <span className={s.badge}>Sem contato</span>
                      )}
                      <button
                        onClick={() =>
                          openPublicRequestAction(request.id, "CONFIRM")
                        }
                        className={s.btnPrimary}
                        style={{ padding: "4px 12px", fontSize: 12 }}
                      >
                        Atendido
                      </button>
                      <button
                        onClick={() =>
                          openPublicRequestAction(request.id, "DISMISS")
                        }
                        className={s.btnSecondary}
                        style={{ padding: "4px 12px", fontSize: 12 }}
                      >
                        Encerrar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {renderList(
        agenda.overdue,
        "Vencidos e Nao Compareceram",
        "var(--status-error)",
      )}
      {renderList(
        agenda.thisWeek,
        "Retornos desta Semana",
        "var(--status-warning)",
      )}
      {renderList(agenda.upcoming, "Proximos 90 Dias", "var(--status-success)")}

      {agenda.total === 0 && (
        <div className={s.emptyState}>
          Nenhum paciente agendado para retorno no momento.
        </div>
      )}

      {followUpAction && (
        <div
          className={s.modalOverlay}
          onClick={(e) =>
            e.target === e.currentTarget && setFollowUpAction(null)
          }
        >
          <div className={s.modal} style={{ maxWidth: 520 }}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>
                {followUpAction.action === "COMPLETE"
                  ? "Registrar retorno concluido"
                  : followUpAction.action === "RESCHEDULE"
                    ? "Reagendar retorno"
                    : "Marcar falta do paciente"}
              </h2>
              <button
                className={s.modalClose}
                onClick={() => setFollowUpAction(null)}
              >
                ×
              </button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formSection}>
                <div className={s.formSectionTitle}>Acao clinica</div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {followUpAction.action === "COMPLETE"
                    ? "Registre a conclusao do retorno e, se precisar, deixe uma anotacao clinica."
                    : followUpAction.action === "RESCHEDULE"
                      ? "Defina a nova data e registre o motivo do reagendamento."
                      : "Marque a falta e use a observacao para orientar o proximo contato."}
                </div>
              </div>
              {followUpAction.action === "RESCHEDULE" && (
                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel}>Nova data</label>
                  <input
                    type="date"
                    className={s.fieldInput}
                    value={followUpNextDate}
                    onChange={(e) => setFollowUpNextDate(e.target.value)}
                  />
                </div>
              )}
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>Observacao</label>
                <textarea
                  className={s.fieldTextarea}
                  placeholder="Descreva o que aconteceu neste contato."
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                />
              </div>
            </div>
            <div className={s.modalFooter}>
              <button
                className={s.btnSecondary}
                onClick={() => setFollowUpAction(null)}
              >
                Cancelar
              </button>
              <button
                className={s.btnPrimary}
                onClick={() => void handleAction()}
                disabled={submittingFollowUp}
              >
                {submittingFollowUp ? "Salvando..." : "Confirmar acao"}
              </button>
            </div>
          </div>
        </div>
      )}

      {publicRequestAction && (
        <div
          className={s.modalOverlay}
          onClick={(e) =>
            e.target === e.currentTarget && setPublicRequestAction(null)
          }
        >
          <div className={s.modal} style={{ maxWidth: 520 }}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>
                {publicRequestAction.action === "CONFIRM"
                  ? "Registrar contato com o lead"
                  : "Encerrar solicitacao publica"}
              </h2>
              <button
                className={s.modalClose}
                onClick={() => setPublicRequestAction(null)}
              >
                x
              </button>
            </div>
            <div className={s.modalBody}>
              <div className={s.formSection}>
                <div className={s.formSectionTitle}>Triagem clinica</div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {publicRequestAction.action === "CONFIRM"
                    ? "Use esta acao quando a equipe ja assumiu o contato e vai conduzir a confirmacao do horario."
                    : "Registre o motivo do encerramento para que a equipe entenda por que este lead saiu da fila."}
                </div>
              </div>
              <div className={s.fieldGroup}>
                <label className={s.fieldLabel}>
                  {publicRequestAction.action === "CONFIRM"
                    ? "Observacao interna (opcional)"
                    : "Motivo do encerramento"}
                </label>
                <textarea
                  className={s.fieldTextarea}
                  placeholder={
                    publicRequestAction.action === "CONFIRM"
                      ? "Ex: paciente respondeu, retorno agendado por telefone."
                      : "Ex: contato invalido, paciente desistiu, horario indisponivel..."
                  }
                  value={publicRequestNotes}
                  onChange={(e) => setPublicRequestNotes(e.target.value)}
                />
              </div>
            </div>
            <div className={s.modalFooter}>
              <button
                className={s.btnSecondary}
                onClick={() => setPublicRequestAction(null)}
              >
                Cancelar
              </button>
              <button
                className={s.btnPrimary}
                onClick={() => void handlePublicRequest()}
                disabled={submittingPublicRequest}
              >
                {submittingPublicRequest ? "Salvando..." : "Confirmar acao"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
