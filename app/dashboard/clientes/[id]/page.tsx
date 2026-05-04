"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import s from "../../shared.module.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Prescription {
  id: string;
  version: number;
  prescribedAt: string;
  prescribedBy: string | null;
  crm: string | null;
  odSphere: number | null;
  odCylinder: number | null;
  odAxis: number | null;
  odAddition: number | null;
  odDnpMono: number | null;
  oeSphere: number | null;
  oeCylinder: number | null;
  oeAxis: number | null;
  oeAddition: number | null;
  oeDnpMono: number | null;
  dnpBinocular: number | null;
  mountingHeight: number | null;
  pantoscopic: number | null;
  wrapAngle: number | null;
  notes: string | null;
  isActive: boolean;
}

interface PrescriptionUpload {
  id: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "FAILED" | "RUNNING";
  createdAt: string;
  completedAt: string | null;
  fileName: string;
  mimeType: string | null;
  notes: string | null;
  dataUrl: string | null;
  reviewed: boolean;
}

type UploadAction = "REVIEWED" | "DISMISS";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  cpf: string | null;
  birthDate: string | null;
  gender: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressCity: string | null;
  addressState: string | null;
  consentEmail: boolean;
  consentSms: boolean;
  consentWhatsapp: boolean;
  notes: string | null;
  createdAt: string;
  prescriptions: Prescription[];
  creditScore: number | null;
  creditLimit: number | null;
  creditUsed: number | null;
  lastCreditCheck: string | null;
  lifetimeValue?: number | null;
  totalOrders?: number | null;
  rfmScore?: string | null;
  lastOrderAt?: string | null;
  orders?: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    isPaid: boolean;
    createdAt: string;
  }[];
}

const defaultRx = {
  prescribedAt: "",
  prescribedBy: "",
  crm: "",
  odSphere: "",
  odCylinder: "",
  odAxis: "",
  odAddition: "",
  odDnpMono: "",
  oeSphere: "",
  oeCylinder: "",
  oeAxis: "",
  oeAddition: "",
  oeDnpMono: "",
  dnpBinocular: "",
  mountingHeight: "",
  pantoscopic: "",
  wrapAngle: "",
  notes: "",
};

type RxForm = typeof defaultRx;

function formatVal(val: number | null, decimals = 2): string {
  if (val == null) return "—";
  const n = Number(val);
  return n > 0 ? `+${n.toFixed(decimals)}` : n.toFixed(decimals);
}

function formatAxis(val: number | null): string {
  if (val == null) return "—";
  return `${val}°`;
}

export default function ClienteDetalhePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRxModal, setShowRxModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [rxForm, setRxForm] = useState(defaultRx);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState("");
  const [savingRx, setSavingRx] = useState(false);
  const [uploadingPrescription, setUploadingPrescription] = useState(false);
  const [prescriptionUploads, setPrescriptionUploads] = useState<
    PrescriptionUpload[]
  >([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const [checkingCredit, setCheckingCredit] = useState(false);
  const [uiMessage, setUiMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const selectedUpload =
    prescriptionUploads.find((upload) => upload.id === selectedUploadId) ??
    null;

  const loadPrescriptionUploads = async () => {
    const res = await fetch(`/api/customers/${id}/prescription-upload`);
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setPrescriptionUploads(Array.isArray(data?.uploads) ? data.uploads : []);
    }
  };

  const handleCreditCheck = async () => {
    setCheckingCredit(true);
    const res = await fetch(`/api/customers/${id}/credit-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestedAmount: 2000 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setUiMessage({
        type: "error",
        text: data?.error || "Nao foi possivel consultar o credito.",
      });
      setCheckingCredit(false);
      return;
    }
    // Atualizar dados do cliente também
    const updated = await fetch(`/api/customers/${id}`).then((r) => r.json());
    setCustomer(updated);
    setUiMessage({
      type: "success",
      text: "Consulta de credito atualizada com sucesso.",
    });
    setCheckingCredit(false);
  };

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) {
          setUiMessage({
            type: "error",
            text: d?.error || "Nao foi possivel carregar o cliente.",
          });
          setLoading(false);
          return;
        }
        setCustomer(d);
        setUiMessage(null);
        void loadPrescriptionUploads();
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleRxChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setRxForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openRxModal = (upload?: PrescriptionUpload) => {
    if (upload) {
      setSelectedUploadId(upload.id);
      setRxForm((prev) => ({
        ...prev,
        notes: prev.notes || upload.notes || "",
      }));
    } else {
      setSelectedUploadId(null);
    }

    setShowRxModal(true);
  };

  const saveRx = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRx(true);
    try {
      const body = Object.fromEntries(
        Object.entries(rxForm).map(([k, v]) => [
          k,
          v === "" ? null : isNaN(Number(v)) ? v : Number(v),
        ]),
      );
      const res = await fetch(`/api/customers/${id}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        if (selectedUpload && selectedUpload.status === "PENDING") {
          await fetch(`/api/customers/${id}/prescription-upload`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskId: selectedUpload.id,
              action: "REVIEWED",
            }),
          });
          await loadPrescriptionUploads();
        }

        setShowRxModal(false);
        setSelectedUploadId(null);
        setRxForm(defaultRx);
        const updated = await fetch(`/api/customers/${id}`).then((r) =>
          r.json(),
        );
        setCustomer(updated);
        setUiMessage({ type: "success", text: "Receita salva com sucesso." });
      } else {
        const data = await res.json().catch(() => null);
        setUiMessage({
          type: "error",
          text: data?.error || "Nao foi possivel salvar a receita.",
        });
      }
    } catch {
      setUiMessage({ type: "error", text: "Falha ao salvar a receita." });
    } finally {
      setSavingRx(false);
    }
  };

  const handlePrescriptionUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUiMessage({
        type: "error",
        text: "Selecione um arquivo antes de enviar.",
      });
      return;
    }

    setUploadingPrescription(true);

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("notes", uploadNotes);

    try {
      const res = await fetch(`/api/customers/${id}/prescription-upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setUiMessage({
          type: "error",
          text: data?.error || "Nao foi possivel enviar o receituario.",
        });
        return;
      }

      setShowUploadModal(false);
      setUploadFile(null);
      setUploadNotes("");
      await loadPrescriptionUploads();
      setUiMessage({
        type: "success",
        text: "Receituario enviado para triagem clinica.",
      });
    } catch {
      setUiMessage({ type: "error", text: "Falha ao enviar o receituario." });
    } finally {
      setUploadingPrescription(false);
    }
  };

  const handleUploadReview = async (taskId: string, action: UploadAction) => {
    const res = await fetch(`/api/customers/${id}/prescription-upload`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, action }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setUiMessage({
        type: "error",
        text: data?.error || "Nao foi possivel atualizar o anexo.",
      });
      return;
    }

    await loadPrescriptionUploads();
    if (selectedUploadId === taskId && action === "DISMISS") {
      setSelectedUploadId(null);
    }
    setUiMessage({
      type: "success",
      text:
        action === "REVIEWED"
          ? "Receituario marcado como revisado."
          : "Receituario encerrado.",
    });
  };

  if (loading)
    return (
      <div className={s.page}>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>⏳</div>
          <p className={s.emptyText}>Carregando prontuário...</p>
        </div>
        <div
          style={{
            marginTop: "var(--space-3)",
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "var(--space-2)",
          }}
        >
          <button
            type="button"
            className={s.btnSecondary}
            onClick={() => router.push("/dashboard/clientes/receitas-expirando")}
            style={{ justifyContent: "center" }}
          >
            Fila de Reativacao
          </button>
          <button
            type="button"
            className={s.btnSecondary}
            onClick={() => router.push("/dashboard/ordens/orcamentos-abandonados")}
            style={{ justifyContent: "center" }}
          >
            Orcamentos Parados
          </button>
        </div>
      </div>
    );

  if (!customer)
    return (
      <div className={s.page}>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>❌</div>
          <p className={s.emptyTitle}>Cliente não encontrado</p>
          <button className={s.btnSecondary} onClick={() => router.back()}>
            ← Voltar
          </button>
        </div>
      </div>
    );

  const activePrescriptions = customer.prescriptions.filter((p) => p.isActive);

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.pageHeader}>
        <div className={s.pageTitleArea}>
          <button
            className={s.btnGhost}
            onClick={() => router.push("/dashboard/clientes")}
          >
            ← Clientes
          </button>
          <h1 className={s.pageTitle} style={{ marginTop: 4 }}>
            {customer.name}
          </h1>
          <p className={s.pageSubtitle}>
            Prontuário Óptico — {activePrescriptions.length}{" "}
            {activePrescriptions.length === 1
              ? "receita registrada"
              : "receitas registradas"}
          </p>
        </div>
        <button
          id="btn-nova-receita"
          className={s.btnPrimary}
          onClick={() => openRxModal()}
        >
          + Nova Receita
        </button>
        <button
          className={s.btnSecondary}
          onClick={() => setShowUploadModal(true)}
        >
          Upload de Receituario
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

      <div className={s.card} style={{ marginBottom: "var(--space-3)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "var(--space-3)",
          }}
        >
          <button
            type="button"
            className={s.btnSecondary}
            onClick={() => openRxModal()}
            style={{
              display: "grid",
              gap: 4,
              textAlign: "left",
              justifyContent: "flex-start",
              minHeight: 72,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800 }}>Nova Receita</span>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                lineHeight: 1.35,
              }}
            >
              Registrar a receita estruturada e atualizar o prontuario.
            </span>
          </button>
          <button
            type="button"
            className={s.btnSecondary}
            onClick={() => setShowUploadModal(true)}
            style={{
              display: "grid",
              gap: 4,
              textAlign: "left",
              justifyContent: "flex-start",
              minHeight: 72,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800 }}>
              Receituario Digital
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                lineHeight: 1.35,
              }}
            >
              Anexar foto ou PDF antes da digitacao clinica.
            </span>
          </button>
          <button
            type="button"
            className={s.btnSecondary}
            onClick={handleCreditCheck}
            disabled={checkingCredit || !customer.cpf}
            style={{
              display: "grid",
              gap: 4,
              textAlign: "left",
              justifyContent: "flex-start",
              minHeight: 72,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800 }}>
              Consultar Credito
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                lineHeight: 1.35,
              }}
            >
              Validar limite antes de fechar uma venda parcelada.
            </span>
          </button>
          <button
            type="button"
            className={s.btnSecondary}
            onClick={() => router.push("/dashboard/ordens")}
            style={{
              display: "grid",
              gap: 4,
              textAlign: "left",
              justifyContent: "flex-start",
              minHeight: 72,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800 }}>Abrir O.S.</span>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                lineHeight: 1.35,
              }}
            >
              Levar este atendimento para a fila comercial e de venda.
            </span>
          </button>
        </div>
      </div>

      {/* Linha 1: KPIs de CRM (Novos) */}
      <div className={s.kpiGrid} style={{ marginBottom: "var(--space-4)" }}>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>LTV (Lifetime Value)</div>
          <div className={s.kpiValue} style={{ color: "var(--brand-primary)" }}>
            {customer.lifetimeValue
              ? new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(Number(customer.lifetimeValue))
              : "R$ 0,00"}
          </div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Total de Pedidos</div>
          <div className={s.kpiValue}>{customer.totalOrders || 0}</div>
        </div>
        <div className={s.kpiCard}>
          <div className={s.kpiLabel}>Status RFM Score</div>
          <div
            className={s.kpiValue}
            style={{
              color:
                customer.rfmScore === "CAMPIAO"
                  ? "var(--status-success)"
                  : customer.rfmScore === "EM_RISCO"
                    ? "var(--status-warning)"
                    : customer.rfmScore === "PERDIDO"
                      ? "var(--status-error)"
                      : "var(--text-primary)",
            }}
          >
            {customer.rfmScore
              ? customer.rfmScore.replace("_", " ")
              : "NOVO C."}
          </div>
        </div>
      </div>

      {/* Customer Info Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "var(--space-4)",
        }}
      >
        {/* Dados pessoais */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>👤 Dados do Cliente</span>
            <span className={`${s.badge} ${s.badgeSuccess}`}>Ativo</span>
          </div>
          <div
            style={{
              padding: "var(--space-5)",
              display: "grid",
              gap: "var(--space-3)",
            }}
          >
            {[
              ["Email", customer.email],
              ["Telefone", customer.phone],
              ["WhatsApp", customer.whatsapp],
              ["CPF", customer.cpf ? "●●●.●●●.●●●-●●" : null],
              [
                "Cidade",
                customer.addressCity && customer.addressState
                  ? `${customer.addressCity}/${customer.addressState}`
                  : null,
              ],
              [
                "Cadastro",
                new Date(customer.createdAt).toLocaleDateString("pt-BR"),
              ],
            ].map(([label, value]) =>
              value ? (
                <div
                  key={label as string}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
                  <span
                    style={{ color: "var(--text-primary)", fontWeight: 500 }}
                  >
                    {value}
                  </span>
                </div>
              ) : null,
            )}
          </div>
        </div>

        {/* LGPD */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>🛡️ Consentimentos LGPD</span>
          </div>
          <div
            style={{
              padding: "var(--space-5)",
              display: "grid",
              gap: "var(--space-3)",
            }}
          >
            {[
              { label: "📧 Email", active: customer.consentEmail },
              { label: "💬 SMS", active: customer.consentSms },
              { label: "📱 WhatsApp", active: customer.consentWhatsapp },
            ].map(({ label, active }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  {label}
                </span>
                <span
                  className={`${s.badge} ${active ? s.badgeSuccess : s.badgeDefault}`}
                >
                  {active ? "✓ Consentido" : "Não consentido"}
                </span>
              </div>
            ))}
            {customer.notes && (
              <div
                style={{
                  marginTop: "var(--space-2)",
                  padding: "var(--space-3)",
                  background: "var(--bg-elevated)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                📝 {customer.notes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card de Pedidos Recentes */}
      {customer.orders && customer.orders.length > 0 && (
        <div className={s.card} style={{ marginBottom: "var(--space-4)" }}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>🛍️ Últimas Ordens de Serviço</span>
            <span className={s.cardCount}>
              {customer.orders.length} recentes
            </span>
          </div>
          <table className={s.table}>
            <thead className={s.tableHead}>
              <tr>
                <th>Número da OS</th>
                <th>Data</th>
                <th>Valor Total</th>
                <th>Status de Pgto</th>
                <th>Logística</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customer.orders.map((o) => (
                <tr
                  key={o.id}
                  className={s.tableRow}
                  onClick={() => router.push(`/dashboard/ordens/${o.id}`)}
                >
                  <td
                    className={s.cellName}
                    style={{ fontFamily: "monospace" }}
                  >
                    {o.orderNumber}
                  </td>
                  <td>{new Date(o.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td style={{ fontWeight: 600 }}>
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(Number(o.total))}
                  </td>
                  <td>
                    <span
                      className={s.badge}
                      style={{
                        background: o.isPaid
                          ? "var(--status-success-bg)"
                          : "var(--status-warning-bg)",
                        color: o.isPaid
                          ? "var(--status-success)"
                          : "var(--status-warning)",
                      }}
                    >
                      {o.isPaid ? "Pago" : "Pendente"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={s.badge}
                      style={{ background: "var(--bg-elevated)" }}
                    >
                      {o.status.replace("_", " ")}
                    </span>
                  </td>
                  <td align="right">
                    <span
                      style={{
                        color: "var(--brand-primary)",
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      Ver →
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Card de Crédito */}
      <div className={s.card}>
        <div className={s.cardHeader}>
          <span className={s.cardTitle}>💳 Análise de Crédito</span>
          {customer.lastCreditCheck && (
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              Última consulta:{" "}
              {new Date(customer.lastCreditCheck).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
        <div style={{ padding: "var(--space-4)" }}>
          {customer.creditScore != null ? (
            (() => {
              const score = customer.creditScore!;
              const visual =
                score >= 700
                  ? {
                      label: "Excelente",
                      color: "#16a34a",
                      bg: "#dcfce7",
                      bars: 5,
                    }
                  : score >= 500
                    ? { label: "Bom", color: "#65a30d", bg: "#f0fdf4", bars: 4 }
                    : score >= 300
                      ? {
                          label: "Regular",
                          color: "#b45309",
                          bg: "#fef9c3",
                          bars: 3,
                        }
                      : score >= 150
                        ? {
                            label: "Ruim",
                            color: "#ea580c",
                            bg: "#ffedd5",
                            bars: 2,
                          }
                        : {
                            label: "Péssimo",
                            color: "#dc2626",
                            bg: "#fee2e2",
                            bars: 1,
                          };
              const fmt = (v: number) =>
                new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(v);
              return (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "var(--space-4)",
                    alignItems: "center",
                  }}
                >
                  {/* Score */}
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 6,
                      }}
                    >
                      Score
                    </div>
                    <div
                      style={{
                        fontSize: 36,
                        fontWeight: 900,
                        color: visual.color,
                      }}
                    >
                      {score}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: visual.color,
                        background: visual.bg,
                        padding: "2px 10px",
                        borderRadius: 20,
                        display: "inline-block",
                        marginTop: 4,
                      }}
                    >
                      {visual.label}
                    </div>
                    {/* Barras de score */}
                    <div
                      style={{
                        display: "flex",
                        gap: 3,
                        justifyContent: "center",
                        marginTop: 8,
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((b) => (
                        <div
                          key={b}
                          style={{
                            width: 20,
                            height: 6,
                            borderRadius: 3,
                            background:
                              b <= visual.bars
                                ? visual.color
                                : "var(--border-subtle)",
                            transition: "background 0.3s",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Limite */}
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 6,
                      }}
                    >
                      Limite Aprovado
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        color: "var(--brand-primary)",
                      }}
                    >
                      {fmt(Number(customer.creditLimit ?? 0))}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        marginTop: 4,
                      }}
                    >
                      Utilizado: {fmt(Number(customer.creditUsed ?? 0))}
                    </div>
                  </div>
                  {/* Status */}
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 6,
                      }}
                    >
                      Status
                    </div>
                    <div
                      style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        background: visual.bg,
                        color: visual.color,
                        fontWeight: 800,
                        fontSize: 14,
                      }}
                    >
                      {score >= 300 ? "✓ Crediário OK" : "✕ Restrito"}
                    </div>
                    <button
                      id="btn-reconsultar"
                      className={s.btnSecondary}
                      onClick={handleCreditCheck}
                      disabled={checkingCredit}
                      style={{
                        marginTop: 8,
                        fontSize: 11,
                        padding: "4px 12px",
                      }}
                    >
                      {checkingCredit ? "⏳..." : "🔄 Reconsultar"}
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
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
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  Nenhuma consulta realizada
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    marginTop: 4,
                  }}
                >
                  Consulte o crédito antes de fechar uma venda parcelada
                </div>
              </div>
              <button
                id="btn-consultar-credito"
                className={s.btnPrimary}
                onClick={handleCreditCheck}
                disabled={checkingCredit || !customer.cpf}
                title={!customer.cpf ? "CPF obrigatório para consulta" : ""}
              >
                {checkingCredit ? "⏳ Consultando..." : "🔍 Consultar Crédito"}
              </button>
            </div>
          )}
          {!customer.cpf && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "#b45309",
                background: "#fef9c3",
                padding: "var(--space-2)",
                borderRadius: 6,
              }}
            >
              ⚠️ CPF necessário para consulta de crédito. Edite o cadastro do
              cliente.
            </div>
          )}
        </div>
      </div>

      <div className={s.card} style={{ marginBottom: "var(--space-4)" }}>
        <div className={s.cardHeader}>
          <span className={s.cardTitle}>Triagem de Receituario Digital</span>
          <span className={s.cardCount}>
            {prescriptionUploads.length} anexo(s)
          </span>
        </div>

        {prescriptionUploads.length === 0 ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>PDF</div>
            <p className={s.emptyTitle}>Nenhum receituario em triagem</p>
            <p className={s.emptyText}>
              Use o upload tatico para anexar uma foto ou PDF da receita antes
              da digitacao estruturada.
            </p>
          </div>
        ) : (
          <div
            style={{
              padding: "var(--space-4)",
              display: "grid",
              gap: "var(--space-3)",
            }}
          >
            {prescriptionUploads.map((upload) => (
              <div
                key={upload.id}
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-3)",
                  display: "grid",
                  gridTemplateColumns: "140px 1fr auto",
                  gap: "var(--space-3)",
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    minHeight: 96,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {upload.dataUrl && upload.mimeType?.startsWith("image/") ? (
                    <img
                      src={upload.dataUrl}
                      alt={upload.fileName}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-tertiary)",
                        fontWeight: 700,
                      }}
                    >
                      PDF
                    </span>
                  )}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "var(--text-primary)",
                    }}
                  >
                    {upload.fileName}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Enviado em{" "}
                    {new Date(upload.createdAt).toLocaleString("pt-BR")}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {upload.notes || "Sem observacao adicional"}
                  </div>
                  <span className={s.badge}>
                    {upload.status === "PENDING"
                      ? "Em triagem"
                      : upload.status === "COMPLETED"
                        ? "Revisado"
                        : "Encerrado"}
                  </span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {upload.status === "PENDING" ? (
                    <>
                      <button
                        className={s.btnSecondary}
                        style={{ fontSize: 12, padding: "6px 10px" }}
                        onClick={() => openRxModal(upload)}
                      >
                        Transcrever
                      </button>
                      <button
                        className={s.btnPrimary}
                        style={{ fontSize: 12, padding: "6px 10px" }}
                        onClick={() =>
                          handleUploadReview(upload.id, "REVIEWED")
                        }
                      >
                        Revisado
                      </button>
                      <button
                        className={s.btnSecondary}
                        style={{ fontSize: 12, padding: "6px 10px" }}
                        onClick={() => handleUploadReview(upload.id, "DISMISS")}
                      >
                        Encerrar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={s.btnSecondary}
                        style={{ fontSize: 12, padding: "6px 10px" }}
                        onClick={() => openRxModal(upload)}
                      >
                        Usar como Base
                      </button>
                      <span className={s.badge}>Concluido</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prontuário Óptico */}
      <div className={s.card}>
        <div className={s.cardHeader}>
          <span className={s.cardTitle}>
            👁️ Prontuário Óptico — Histórico Evolutivo
          </span>
          <span className={s.cardCount}>
            {activePrescriptions.length} receitas
          </span>
        </div>

        {activePrescriptions.length === 0 ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>👁️</div>
            <p className={s.emptyTitle}>Nenhuma receita registrada</p>
            <p className={s.emptyText}>
              Clique em "Nova Receita" para iniciar o prontuário óptico deste
              cliente.
            </p>
          </div>
        ) : (
          <div
            style={{
              padding: "var(--space-4)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            {/* CHART: DIOPTRIC TIMELINE */}
            {activePrescriptions.length > 1 && (
              <div
                style={{
                  marginBottom: "var(--space-4)",
                  padding: "var(--space-4)",
                  background: "var(--surface-primary)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    marginBottom: "var(--space-4)",
                  }}
                >
                  📈 Histórico Evolutivo (Esférico)
                </h3>
                <div style={{ height: 200, width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[...activePrescriptions].reverse().map((p) => ({
                        data: new Date(p.prescribedAt).toLocaleDateString(
                          "pt-BR",
                          { month: "short", year: "numeric" },
                        ),
                        OD_ESF: p.odSphere || 0,
                        OE_ESF: p.oeSphere || 0,
                      }))}
                      margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--border-subtle)"
                      />
                      <XAxis
                        dataKey="data"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                      />
                      <Line
                        type="monotone"
                        name="Olho Direito (OD)"
                        dataKey="OD_ESF"
                        stroke="#dc2626"
                        activeDot={{ r: 6 }}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        name="Olho Esquerdo (OE)"
                        dataKey="OE_ESF"
                        stroke="#16a34a"
                        activeDot={{ r: 6 }}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {/* LIST: CHR PRESCRIPTION CARDS */}
            {activePrescriptions.map((rx) => (
              <div key={rx.id} className={s.prescriptionCard}>
                <div className={s.prescriptionHeader}>
                  <div className={s.prescriptionVersion}>
                    <span className={s.prescriptionVersionBadge}>
                      Receita v{rx.version}
                    </span>
                    {new Date(rx.prescribedAt).getTime() <
                    Date.now() - 365 * 24 * 60 * 60 * 1000 ? (
                      <span
                        style={{
                          fontSize: 11,
                          background: "var(--status-error-bg)",
                          color: "var(--status-error)",
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontWeight: 700,
                        }}
                      >
                        ⚠️ Vencida (+1 ano)
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          background: "var(--status-success-bg)",
                          color: "var(--status-success)",
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontWeight: 700,
                        }}
                      >
                        ✓ Válida
                      </span>
                    )}
                    <span className={s.prescriptionMeta}>
                      {rx.prescribedBy
                        ? `Dr(a). ${rx.prescribedBy}`
                        : "Médico não informado"}
                      {rx.crm ? ` · CRM ${rx.crm}` : ""}
                    </span>
                  </div>
                  <span className={s.prescriptionMeta}>
                    {new Date(rx.prescribedAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className={s.prescriptionBody}>
                  <table className={s.eyeTable}>
                    <thead>
                      <tr>
                        <th>Olho</th>
                        <th>Esférico</th>
                        <th>Cilíndrico</th>
                        <th>Eixo</th>
                        <th>Adição</th>
                        <th>DNP Mono</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className={s.eyeOD}>🔴 OD</td>
                        <td>{formatVal(rx.odSphere)}</td>
                        <td>{formatVal(rx.odCylinder)}</td>
                        <td>{formatAxis(rx.odAxis)}</td>
                        <td>{formatVal(rx.odAddition)}</td>
                        <td>
                          {rx.odDnpMono != null ? `${rx.odDnpMono}mm` : "—"}
                        </td>
                      </tr>
                      <tr>
                        <td className={s.eyeOE}>🟢 OE</td>
                        <td>{formatVal(rx.oeSphere)}</td>
                        <td>{formatVal(rx.oeCylinder)}</td>
                        <td>{formatAxis(rx.oeAxis)}</td>
                        <td>{formatVal(rx.oeAddition)}</td>
                        <td>
                          {rx.oeDnpMono != null ? `${rx.oeDnpMono}mm` : "—"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {(rx.dnpBinocular || rx.mountingHeight || rx.pantoscopic) && (
                    <div
                      style={{
                        display: "flex",
                        gap: "var(--space-4)",
                        marginTop: "var(--space-3)",
                        paddingTop: "var(--space-3)",
                        borderTop: "1px solid var(--border-subtle)",
                        fontSize: 12,
                      }}
                    >
                      {rx.dnpBinocular != null && (
                        <span style={{ color: "var(--text-secondary)" }}>
                          DNP Binocular:{" "}
                          <strong style={{ color: "var(--text-primary)" }}>
                            {rx.dnpBinocular}mm
                          </strong>
                        </span>
                      )}
                      {rx.mountingHeight != null && (
                        <span style={{ color: "var(--text-secondary)" }}>
                          Alt. Montagem:{" "}
                          <strong style={{ color: "var(--text-primary)" }}>
                            {rx.mountingHeight}mm
                          </strong>
                        </span>
                      )}
                      {rx.pantoscopic != null && (
                        <span style={{ color: "var(--text-secondary)" }}>
                          Pantoscópico:{" "}
                          <strong style={{ color: "var(--text-primary)" }}>
                            {rx.pantoscopic}°
                          </strong>
                        </span>
                      )}
                    </div>
                  )}
                  {rx.notes && (
                    <div
                      style={{
                        marginTop: "var(--space-3)",
                        padding: "var(--space-3)",
                        background: "var(--bg-surface)",
                        borderRadius: "var(--radius-md)",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                      }}
                    >
                      📝 {rx.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── MODAL: NOVA RECEITA ─────────────────────────────────── */}
      {showUploadModal && (
        <div
          className={s.modalOverlay}
          onClick={(e) =>
            e.target === e.currentTarget && setShowUploadModal(false)
          }
        >
          <div className={s.modal} style={{ maxWidth: 560 }}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Upload de Receituario</h2>
              <button
                className={s.modalClose}
                onClick={() => setShowUploadModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handlePrescriptionUpload}>
              <div className={s.modalBody}>
                <div
                  style={{
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--brand-primary-light)",
                    color: "var(--brand-primary)",
                    marginBottom: "var(--space-4)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Intake tatico
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5 }}>
                    Este upload serve para triagem clinica e digitacao guiada. O
                    arquivo nao substitui a receita estruturada do prontuario.
                  </div>
                </div>

                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel}>
                    Arquivo (JPG, PNG, WEBP ou PDF ate 1.5MB)
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className={s.fieldInput}
                  />
                </div>

                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel}>Observacao (opcional)</label>
                  <textarea
                    className={s.fieldTextarea}
                    value={uploadNotes}
                    onChange={(e) =>
                      setUploadNotes(e.target.value.slice(0, 280))
                    }
                    placeholder="Ex: receita externa, foto enviada pelo WhatsApp, urgencia..."
                  />
                </div>
              </div>
              <div className={s.modalFooter}>
                <button
                  type="button"
                  className={s.btnSecondary}
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={s.btnPrimary}
                  disabled={uploadingPrescription}
                >
                  {uploadingPrescription
                    ? "Enviando..."
                    : "Enviar para Triagem"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRxModal && (
        <div
          className={s.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRxModal(false);
              setSelectedUploadId(null);
            }
          }}
        >
          <div className={s.modal}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Nova Receita — {customer.name}</h2>
              <button
                className={s.modalClose}
                onClick={() => {
                  setShowRxModal(false);
                  setSelectedUploadId(null);
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={saveRx}>
              <div className={s.modalBody}>
                {selectedUpload && (
                  <div
                    style={{
                      padding: "var(--space-3)",
                      borderRadius: "var(--radius-md)",
                      background: "var(--brand-primary-light)",
                      color: "var(--brand-primary)",
                      marginBottom: "var(--space-4)",
                      display: "grid",
                      gap: "var(--space-3)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Transcricao guiada tatica
                      </div>
                      <div
                        style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5 }}
                      >
                        Este anexo esta servindo como base para digitacao manual
                        da receita estruturada. Confira os dados e salve o
                        prontuario final.
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "120px 1fr",
                        gap: "var(--space-3)",
                        alignItems: "start",
                      }}
                    >
                      <div
                        style={{
                          borderRadius: "var(--radius-sm)",
                          background: "var(--surface-primary)",
                          border:
                            "1px solid color-mix(in srgb, var(--brand-primary) 20%, transparent)",
                          minHeight: 90,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {selectedUpload.dataUrl &&
                        selectedUpload.mimeType?.startsWith("image/") ? (
                          <img
                            src={selectedUpload.dataUrl}
                            alt={selectedUpload.fileName}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 700 }}>
                            PDF
                          </span>
                        )}
                      </div>
                      <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
                        <div
                          style={{
                            fontWeight: 800,
                            color: "var(--text-primary)",
                          }}
                        >
                          {selectedUpload.fileName}
                        </div>
                        <div style={{ color: "var(--text-secondary)" }}>
                          Enviado em{" "}
                          {new Date(selectedUpload.createdAt).toLocaleString(
                            "pt-BR",
                          )}
                        </div>
                        <div style={{ color: "var(--text-secondary)" }}>
                          {selectedUpload.notes ||
                            "Sem observacao clinica adicional."}
                        </div>
                        <div style={{ color: "var(--text-secondary)" }}>
                          Ao salvar a receita, a triagem pendente sera marcada
                          como revisada automaticamente.
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: "var(--space-2)",
                      }}
                    >
                      {[
                        "1. Leia o anexo e confirme as medidas.",
                        "2. Digite os campos clinicos abaixo.",
                        "3. Ajuste observacoes e finalize o prontuario.",
                      ].map((step) => (
                        <div
                          key={step}
                          style={{
                            padding: "var(--space-2)",
                            borderRadius: "var(--radius-sm)",
                            background: "var(--surface-primary)",
                            color: "var(--text-secondary)",
                            fontSize: 11,
                            lineHeight: 1.5,
                          }}
                        >
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Médico */}
                <div className={s.formSection}>
                  <div className={s.formSectionTitle}>Dados da Receita</div>
                  <div className={s.formGrid}>
                    <div className={s.fieldGroup}>
                      <label className={s.fieldLabel}>Data da Receita</label>
                      <input
                        name="prescribedAt"
                        type="date"
                        className={s.fieldInput}
                        value={rxForm.prescribedAt}
                        onChange={handleRxChange}
                      />
                    </div>
                    <div className={s.fieldGroup}>
                      <label className={s.fieldLabel}>Médico Responsável</label>
                      <input
                        name="prescribedBy"
                        className={s.fieldInput}
                        placeholder="Nome do médico"
                        value={rxForm.prescribedBy}
                        onChange={handleRxChange}
                      />
                    </div>
                    <div className={s.fieldGroup}>
                      <label className={s.fieldLabel}>CRM</label>
                      <input
                        name="crm"
                        className={s.fieldInput}
                        placeholder="CRM/SP 00000"
                        value={rxForm.crm}
                        onChange={handleRxChange}
                      />
                    </div>
                  </div>
                </div>

                {/* OD */}
                <div className={s.formSection}>
                  <div
                    className={s.formSectionTitle}
                    style={{ color: "var(--status-info)" }}
                  >
                    🔴 Olho Direito (OD)
                  </div>
                  <div className={s.formGrid3}>
                    {[
                      {
                        name: "odSphere",
                        label: "Esférico",
                        placeholder: "-2.25",
                      },
                      {
                        name: "odCylinder",
                        label: "Cilíndrico",
                        placeholder: "-0.50",
                      },
                      { name: "odAxis", label: "Eixo", placeholder: "180" },
                      {
                        name: "odAddition",
                        label: "Adição",
                        placeholder: "+2.00",
                      },
                      {
                        name: "odDnpMono",
                        label: "DNP Mono (mm)",
                        placeholder: "32",
                      },
                    ].map((f) => (
                      <div key={f.name} className={s.fieldGroup}>
                        <label className={s.fieldLabel}>{f.label}</label>
                        <input
                          name={f.name}
                          className={s.fieldInput}
                          placeholder={f.placeholder}
                          value={rxForm[f.name as keyof RxForm]}
                          onChange={handleRxChange}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* OE */}
                <div className={s.formSection}>
                  <div
                    className={s.formSectionTitle}
                    style={{ color: "var(--status-success)" }}
                  >
                    🟢 Olho Esquerdo (OE)
                  </div>
                  <div className={s.formGrid3}>
                    {[
                      {
                        name: "oeSphere",
                        label: "Esférico",
                        placeholder: "-2.25",
                      },
                      {
                        name: "oeCylinder",
                        label: "Cilíndrico",
                        placeholder: "-0.50",
                      },
                      { name: "oeAxis", label: "Eixo", placeholder: "180" },
                      {
                        name: "oeAddition",
                        label: "Adição",
                        placeholder: "+2.00",
                      },
                      {
                        name: "oeDnpMono",
                        label: "DNP Mono (mm)",
                        placeholder: "32",
                      },
                    ].map((f) => (
                      <div key={f.name} className={s.fieldGroup}>
                        <label className={s.fieldLabel}>{f.label}</label>
                        <input
                          name={f.name}
                          className={s.fieldInput}
                          placeholder={f.placeholder}
                          value={rxForm[f.name as keyof RxForm]}
                          onChange={handleRxChange}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Binocular */}
                <div className={s.formSection}>
                  <div className={s.formSectionTitle}>Medidas Binoculares</div>
                  <div className={s.formGrid}>
                    {[
                      {
                        name: "dnpBinocular",
                        label: "DNP Binocular (mm)",
                        placeholder: "64",
                      },
                      {
                        name: "mountingHeight",
                        label: "Altura de Montagem (mm)",
                        placeholder: "18",
                      },
                      {
                        name: "pantoscopic",
                        label: "Pantoscópico (°)",
                        placeholder: "8",
                      },
                      {
                        name: "wrapAngle",
                        label: "Curv. Armação (°)",
                        placeholder: "5",
                      },
                    ].map((f) => (
                      <div key={f.name} className={s.fieldGroup}>
                        <label className={s.fieldLabel}>{f.label}</label>
                        <input
                          name={f.name}
                          className={s.fieldInput}
                          placeholder={f.placeholder}
                          value={rxForm[f.name as keyof RxForm]}
                          onChange={handleRxChange}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className={s.formSection}>
                  <div className={s.formSectionTitle}>Observações Clínicas</div>
                  <div className={s.fieldGroup}>
                    <textarea
                      name="notes"
                      className={s.fieldTextarea}
                      placeholder="Observações sobre a receita, condições especiais..."
                      value={rxForm.notes}
                      onChange={handleRxChange}
                    />
                  </div>
                </div>
              </div>
              <div className={s.modalFooter}>
                <button
                  type="button"
                  className={s.btnSecondary}
                  onClick={() => {
                    setShowRxModal(false);
                    setSelectedUploadId(null);
                  }}
                >
                  Cancelar
                </button>
                <button
                  id="btn-salvar-receita"
                  type="submit"
                  className={s.btnPrimary}
                  disabled={savingRx}
                >
                  {savingRx ? "Salvando..." : "👁️ Salvar Receita"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
