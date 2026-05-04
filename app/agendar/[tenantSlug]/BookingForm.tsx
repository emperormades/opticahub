"use client";

import { useState } from "react";

const DEFAULT_ERROR =
  "Houve um erro de conexao. Por favor, tente novamente ou chame no WhatsApp.";

type PreferredPeriod = "MORNING" | "AFTERNOON" | "EVENING";

const PERIOD_OPTIONS: Array<{
  id: PreferredPeriod;
  label: string;
  helper: string;
}> = [
  { id: "MORNING", label: "Manha", helper: "08h - 12h" },
  { id: "AFTERNOON", label: "Tarde", helper: "13h - 18h" },
  { id: "EVENING", label: "Noite", helper: "18h+" },
];

function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatPhoneInput(value: string) {
  const digits = normalizePhoneDigits(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getMinimumDateTimeValue() {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000);
  nextHour.setMinutes(0, 0, 0);
  const timezoneOffset = nextHour.getTimezoneOffset();
  const localDate = new Date(nextHour.getTime() - timezoneOffset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export default function BookingForm({ tenantSlug }: { tenantSlug: string }) {
  const [status, setStatus] = useState<
    "IDLE" | "LOADING" | "SUCCESS" | "ERROR"
  >("IDLE");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [preferredPeriod, setPreferredPeriod] =
    useState<PreferredPeriod>("AFTERNOON");
  const [errorText, setErrorText] = useState(DEFAULT_ERROR);
  const minDateTime = getMinimumDateTimeValue();

  const resetForm = () => {
    setStatus("IDLE");
    setName("");
    setPhone("");
    setDate("");
    setNotes("");
    setPreferredPeriod("AFTERNOON");
    setErrorText(DEFAULT_ERROR);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPhone = normalizePhoneDigits(phone);
    const selectedDate = date ? new Date(date) : new Date("invalid");
    const minDate = new Date(minDateTime);

    if (
      normalizedPhone.length < 10 ||
      Number.isNaN(selectedDate.getTime()) ||
      selectedDate < minDate
    ) {
      setErrorText(
        "Escolha um horario futuro e informe um WhatsApp valido para receber a confirmacao.",
      );
      setStatus("ERROR");
      return;
    }

    setStatus("LOADING");
    setErrorText(DEFAULT_ERROR);

    try {
      const res = await fetch("/api/clinics/schedule/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug,
          name,
          phone,
          date,
          notes,
          preferredPeriod,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorText(data?.error || "Falha ao agendar. Tente novamente.");
        setStatus("ERROR");
        return;
      }

      setStatus("SUCCESS");
    } catch {
      setStatus("ERROR");
    }
  };

  if (status === "SUCCESS") {
    return (
      <div
        style={{
          background: "var(--bg-elevated)",
          padding: 32,
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>OK</div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--status-success)",
            marginBottom: 8,
            letterSpacing: "-0.3px",
          }}
        >
          Solicitacao recebida
        </h2>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Sua solicitacao de agendamento foi enviada. Nossa equipe entrara em
          contato via WhatsApp no numero{" "}
          <strong style={{ color: "var(--text-primary)" }}>{phone}</strong> para
          confirmar seu horario
          {preferredPeriod
            ? ` no periodo da ${preferredPeriod === "MORNING" ? "manha" : preferredPeriod === "AFTERNOON" ? "tarde" : "noite"}`
            : ""}
          .
        </p>
        <button
          onClick={resetForm}
          style={{
            marginTop: 24,
            padding: "10px 20px",
            background: "var(--bg-hover)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            fontWeight: 600,
            cursor: "pointer",
            transition: "0.2s",
          }}
        >
          Fazer novo agendamento
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "var(--bg-elevated)",
        padding: 32,
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-md)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div
        style={{
          padding: 14,
          borderRadius: "var(--radius-md)",
          background: "var(--brand-primary-light)",
          color: "var(--brand-primary)",
          marginBottom: 20,
          border: "1px solid var(--border-subtle)",
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
          Como funciona
        </div>
        <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>
          Voce escolhe um horario preferencial e nossa equipe confirma a
          disponibilidade pelo WhatsApp antes de fechar a agenda.
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: 6,
          }}
        >
          Nome completo *
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Joao da Silva"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-strong)",
            fontSize: 14,
            color: "var(--text-primary)",
            background: "var(--bg-base)",
            outline: "none",
          }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: 6,
          }}
        >
          WhatsApp *
        </label>
        <input
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
          placeholder="(00) 00000-0000"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-strong)",
            fontSize: 14,
            color: "var(--text-primary)",
            background: "var(--bg-base)",
            outline: "none",
          }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: 6,
          }}
        >
          Data e horario preferencial *
        </label>
        <input
          type="datetime-local"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={minDateTime}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-strong)",
            fontSize: 14,
            color: "var(--text-primary)",
            background: "var(--bg-base)",
            outline: "none",
          }}
        />
        <p
          style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6 }}
        >
          Entraremos em contato para confirmar a disponibilidade deste horario
          exato.
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: 8,
          }}
        >
          Periodo preferencial
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          {PERIOD_OPTIONS.map((option) => {
            const isActive = preferredPeriod === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setPreferredPeriod(option.id)}
                style={{
                  padding: "10px 8px",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${isActive ? "var(--brand-primary)" : "var(--border-default)"}`,
                  background: isActive
                    ? "var(--brand-primary-light)"
                    : "var(--bg-base)",
                  color: isActive
                    ? "var(--brand-primary)"
                    : "var(--text-primary)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700 }}>
                  {option.label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-tertiary)",
                    marginTop: 2,
                  }}
                >
                  {option.helper}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: 6,
          }}
        >
          Observacao (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 280))}
          placeholder="Ex: preciso de atendimento apos o trabalho, retorno de lente, urgencia..."
          rows={3}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-strong)",
            fontSize: 14,
            color: "var(--text-primary)",
            background: "var(--bg-base)",
            outline: "none",
            resize: "vertical",
          }}
        />
        <p
          style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6 }}
        >
          {notes.length}/280 caracteres
        </p>
      </div>

      {status === "ERROR" && (
        <div
          style={{
            padding: 12,
            background: "var(--status-error-bg)",
            color: "var(--status-error)",
            borderRadius: "var(--radius-md)",
            marginBottom: 20,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {errorText}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "LOADING"}
        style={{
          width: "100%",
          padding: "14px 24px",
          background: "var(--brand-primary)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius-md)",
          fontSize: 15,
          fontWeight: 600,
          cursor: status === "LOADING" ? "not-allowed" : "pointer",
          opacity: status === "LOADING" ? 0.7 : 1,
          transition: "0.2s",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {status === "LOADING" ? "Enviando..." : "Solicitar agendamento"}
      </button>
    </form>
  );
}
