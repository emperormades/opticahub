"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "./vitrine.module.css";

type Props = {
  tenantSlug: string;
};

type TimelineStep = {
  key: string;
  label: string;
  status: "done" | "current" | "pending";
};

type SearchState = "idle" | "loading" | "found" | "not_found" | "error";

function toStoreName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function mapTimeline(rawStatus: string): TimelineStep[] {
  const orderIndex: Record<string, number> = {
    LAB_SENT: 0,
    IN_PRODUCTION: 1,
    QUALITY_CHECK: 1,
    DELIVERY_READY: 2,
    DELIVERED: 2,
  };
  const currentIndex = orderIndex[rawStatus] ?? 0;

  return [
    {
      key: "laboratorio",
      label: "Laboratorio",
      status: currentIndex > 0 ? "done" : currentIndex === 0 ? "current" : "pending",
    },
    {
      key: "montagem",
      label: "Em Montagem",
      status: currentIndex > 1 ? "done" : currentIndex === 1 ? "current" : "pending",
    },
    {
      key: "loja",
      label: "Pronto na Loja",
      status: currentIndex >= 2 ? "done" : "pending",
    },
  ];
}

const MOCK_TRACK = {
  orderNumber: "OS-10458",
  customerName: "Cliente",
  status: "IN_PRODUCTION",
};

export default function PublicTrackingView({ tenantSlug }: Props) {
  const storeName = useMemo(() => toStoreName(tenantSlug), [tenantSlug]);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>("idle");
  const [feedback, setFeedback] = useState("");
  const [result, setResult] = useState<{
    orderNumber: string;
    customerName: string;
    timeline: TimelineStep[];
  } | null>(null);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();

    if (!value) {
      setState("error");
      setFeedback("Digite seu CPF ou numero da OS para continuar.");
      return;
    }

    setState("loading");
    setFeedback("");
    setResult(null);

    const normalized = normalizeDigits(value);

    try {
      // Endpoint legado exige orderNumber + identifier. Sem ambos, usamos fallback visual.
      const response = await fetch("/api/orders/public/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantSlug,
          orderNumber: value,
          identifier: normalized || value,
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        setResult({
          orderNumber: payload.order.orderNumber,
          customerName: payload.order.customerName || "Cliente",
          timeline: mapTimeline(payload.order.status),
        });
        setState("found");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 450));
      setResult({
        orderNumber: MOCK_TRACK.orderNumber,
        customerName: MOCK_TRACK.customerName,
        timeline: mapTimeline(MOCK_TRACK.status),
      });
      setState("found");
      setFeedback("Mostrando demonstracao visual para validacao de layout.");
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 450));
      setResult({
        orderNumber: MOCK_TRACK.orderNumber,
        customerName: MOCK_TRACK.customerName,
        timeline: mapTimeline(MOCK_TRACK.status),
      });
      setState("found");
      setFeedback("Modo demonstracao ativo: sem conexao com o servidor.");
    }
  }

  const whatsAppHref = `https://wa.me/55?text=${encodeURIComponent(
    `Oi! Gostaria de agendar um novo exame na ${storeName}.`,
  )}`;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.storePill}>{storeName}</p>
        <h1 className={styles.title}>Acompanhe seu Oculos</h1>
        <p className={styles.subtitle}>
          Digite seu CPF ou numero da OS para ver o andamento do seu pedido.
        </p>
      </section>

      <section className={styles.card}>
        <form onSubmit={handleSearch} className={styles.form}>
          <label htmlFor="public-query" className={styles.label}>
            Digite seu CPF ou Numero da OS
          </label>
          <input
            id="public-query"
            className={styles.input}
            placeholder="Ex: 123.456.789-09 ou OS-10458"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
          <button type="submit" className={styles.btnPrimary} disabled={state === "loading"}>
            {state === "loading" ? "Buscando..." : "Buscar meu Oculos"}
          </button>
        </form>

        {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
        {state === "not_found" ? <p className={styles.error}>Nao encontramos o pedido.</p> : null}
      </section>

      {result ? (
        <section className={styles.timelineCard}>
          <header className={styles.timelineHeader}>
            <p className={styles.timelineTitle}>Status do pedido {result.orderNumber}</p>
            <p className={styles.timelineMeta}>Cliente: {result.customerName}</p>
          </header>

          <ul className={styles.timeline}>
            {result.timeline.map((step) => (
              <li key={step.key} className={styles.timelineItem}>
                <span
                  className={`${styles.dot} ${
                    step.status === "done"
                      ? styles.dotDone
                      : step.status === "current"
                        ? styles.dotCurrent
                        : styles.dotPending
                  }`}
                />
                <span className={styles.stepLabel}>{step.label}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className={styles.footer}>
        <a href={whatsAppHref} target="_blank" rel="noreferrer" className={styles.btnWhats}>
          Agendar Novo Exame
        </a>
      </footer>
    </main>
  );
}
