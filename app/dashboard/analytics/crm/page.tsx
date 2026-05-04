"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import shared from "../../shared.module.css";
import styles from "./crm.module.css";

type UiMessage = {
  type: "success" | "error";
  text: string;
};

type AbandonedDraft = {
  id: string;
  orderNumber: string;
  total: number;
  ageHours: number;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    whatsapp: string | null;
  } | null;
};

type ExpiringCustomer = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  prescriptionExpiresAt: string | null;
  daysUntilExpiry: number | null;
};

type OverdueInstallment = {
  id: string;
  amount: number;
  dueDate: string;
  penaltyAmount: number;
  interestAmount: number;
  transaction: {
    order?: {
      orderNumber: string;
      customer: {
        id?: string;
        name: string;
        phone?: string | null;
        whatsapp?: string | null;
      };
    } | null;
  };
};

type InadimplenteGroup = {
  customerKey: string;
  customerName: string;
  phone: string | null;
  installments: OverdueInstallment[];
  totalOverdue: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const normalized = value.includes("T") ? value : `${value}T12:00:00`;
  return new Date(normalized).toLocaleDateString("pt-BR");
}

function normalizePhone(value?: string | null) {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  if (digits.startsWith("55")) {
    return digits;
  }

  return `55${digits}`;
}

function buildWhatsAppUrl(phone: string | null, message: string) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return null;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

async function readJson(response: Response) {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default function CrmOperacionalPage() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [uiMessage, setUiMessage] = useState<UiMessage | null>(null);
  const [abandonedDrafts, setAbandonedDrafts] = useState<AbandonedDraft[]>([]);
  const [expiringCustomers, setExpiringCustomers] = useState<ExpiringCustomer[]>([]);
  const [overdueCustomers, setOverdueCustomers] = useState<InadimplenteGroup[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [router, status]);

  useEffect(() => {
    if (status === "authenticated") {
      void loadQueues();
    }
  }, [status]);

  async function loadQueues() {
    setLoading(true);

    try {
      const [draftsResponse, prescriptionsResponse, carneResponse] = await Promise.all([
        fetch("/api/orders/abandoned-drafts?minAgeHours=24"),
        fetch("/api/customers/expiring-prescriptions?daysAhead=35"),
        fetch("/api/financial/carne?status=overdue"),
      ]);

      const [draftsBody, prescriptionsBody, carneBody] = await Promise.all([
        readJson(draftsResponse),
        readJson(prescriptionsResponse),
        readJson(carneResponse),
      ]);

      if (!draftsResponse.ok || !prescriptionsResponse.ok || !carneResponse.ok) {
        setUiMessage({
          type: "error",
          text: "Nao foi possivel carregar todas as filas de CRM.",
        });
      } else {
        const nextDrafts = ((draftsBody?.orders as unknown as AbandonedDraft[]) ||
          []) as AbandonedDraft[];
        const nextCustomers =
          ((prescriptionsBody?.customers as unknown as ExpiringCustomer[]) ||
            []) as ExpiringCustomer[];
        const nextInstallments =
          (Array.isArray(carneBody)
            ? (carneBody as unknown as OverdueInstallment[])
            : []) as OverdueInstallment[];

        setAbandonedDrafts(nextDrafts);
        setExpiringCustomers(nextCustomers);
        setOverdueCustomers(groupOverdueByCustomer(nextInstallments));
        setUiMessage(null);
      }
    } catch {
      setUiMessage({
        type: "error",
        text: "Falha ao carregar as filas manuais de CRM.",
      });
    } finally {
      setLoading(false);
    }
  }

  function groupOverdueByCustomer(installments: OverdueInstallment[]) {
    const grouped = new Map<string, InadimplenteGroup>();

    for (const installment of installments) {
      const customer = installment.transaction.order?.customer;
      const customerKey =
        customer?.id ||
        `${customer?.name || "cliente"}-${customer?.phone || customer?.whatsapp || installment.id}`;
      const total =
        Number(installment.amount) +
        Number(installment.penaltyAmount) +
        Number(installment.interestAmount);

      const current = grouped.get(customerKey);
      if (current) {
        current.installments.push(installment);
        current.totalOverdue += total;
        continue;
      }

      grouped.set(customerKey, {
        customerKey,
        customerName: customer?.name || "Cliente",
        phone: customer?.whatsapp || customer?.phone || null,
        installments: [installment],
        totalOverdue: total,
      });
    }

    return Array.from(grouped.values()).sort(
      (a, b) => b.totalOverdue - a.totalOverdue,
    );
  }

  function openWhatsApp(phone: string | null, text: string) {
    const url = buildWhatsAppUrl(phone, text);

    if (!url) {
      setUiMessage({
        type: "error",
        text: "Cliente sem telefone valido para WhatsApp.",
      });
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (status === "loading" || loading) {
    return (
      <div className={shared.page}>
        <div className={styles.loadingCard}>Carregando filas manuais de CRM...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>CRM Operacional</h1>
          <p className={shared.pageSubtitle}>
            Filas manuais de resgate, renovação e cobrança para o time comercial.
          </p>
        </div>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={() => void loadQueues()}
        >
          Atualizar Filas
        </button>
      </div>

      {uiMessage ? (
        <div
          className={`${styles.feedbackBanner} ${
            uiMessage.type === "error" ? styles.feedbackError : styles.feedbackSuccess
          }`}
        >
          <span>{uiMessage.text}</span>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => setUiMessage(null)}
          >
            Fechar
          </button>
        </div>
      ) : null}

      <div className={styles.columns}>
        <section className={styles.queueCard}>
          <div className={styles.queueHeader}>
            <div>
              <span className={styles.queueEyebrow}>Fila 1</span>
              <h2 className={styles.queueTitle}>Orçamentos Abandonados</h2>
            </div>
            <span className={styles.queueCount}>{abandonedDrafts.length}</span>
          </div>
          <p className={styles.queueCopy}>
            OS em rascunho com mais de 24 horas sem conversao.
          </p>

          {abandonedDrafts.length === 0 ? (
            <div className={styles.emptyBox}>
              <p className={styles.emptyTitle}>Oba! Nenhum resgate pendente.</p>
              <p className={styles.emptyText}>
                Nenhum orcamento em DRAFT ultrapassou a janela de resgate agora.
              </p>
            </div>
          ) : (
            <div className={styles.queueList}>
              {abandonedDrafts.map((draft) => (
                <article key={draft.id} className={styles.queueItem}>
                  <div>
                    <strong className={styles.itemTitle}>
                      {draft.customer?.name || "Cliente"}
                    </strong>
                    <span className={styles.itemMeta}>
                      OS {draft.orderNumber} • {draft.ageHours}h parada •{" "}
                      {formatCurrency(Number(draft.total))}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={() =>
                      openWhatsApp(
                        draft.customer?.whatsapp || draft.customer?.phone || null,
                        `Oi, ${draft.customer?.name || "cliente"}! Seu orcamento ${draft.orderNumber} continua disponivel. Posso te ajudar a concluir?`,
                      )
                    }
                  >
                    Enviar WhatsApp
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.queueCard}>
          <div className={styles.queueHeader}>
            <div>
              <span className={styles.queueEyebrow}>Fila 2</span>
              <h2 className={styles.queueTitle}>Receitas a Expirar</h2>
            </div>
            <span className={styles.queueCount}>{expiringCustomers.length}</span>
          </div>
          <p className={styles.queueCopy}>
            Clientes perto do vencimento da receita e oportunidade de retorno.
          </p>

          {expiringCustomers.length === 0 ? (
            <div className={styles.emptyBox}>
              <p className={styles.emptyTitle}>Nenhuma receita no radar.</p>
              <p className={styles.emptyText}>
                Hoje nao ha clientes perto de completar 1 ano de receita.
              </p>
            </div>
          ) : (
            <div className={styles.queueList}>
              {expiringCustomers.map((customer) => (
                <article key={customer.id} className={styles.queueItem}>
                  <div>
                    <strong className={styles.itemTitle}>{customer.name}</strong>
                    <span className={styles.itemMeta}>
                      Expira em {formatDate(customer.prescriptionExpiresAt)} •{" "}
                      {customer.daysUntilExpiry !== null
                        ? `${customer.daysUntilExpiry} dia(s)`
                        : "sem data"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() =>
                      openWhatsApp(
                        customer.whatsapp || customer.phone || null,
                        `Oi, ${customer.name}! Sua receita esta perto de vencer. Quer agendar um novo exame?`,
                      )
                    }
                  >
                    Chamar para Novo Exame
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.queueCard}>
          <div className={styles.queueHeader}>
            <div>
              <span className={styles.queueEyebrow}>Fila 3</span>
              <h2 className={styles.queueTitle}>Inadimplentes</h2>
            </div>
            <span className={styles.queueCount}>{overdueCustomers.length}</span>
          </div>
          <p className={styles.queueCopy}>
            Clientes com parcelas de crediario vencidas e cobranca assistida.
          </p>

          {overdueCustomers.length === 0 ? (
            <div className={styles.emptyBox}>
              <p className={styles.emptyTitle}>Oba! Nenhuma divida hoje.</p>
              <p className={styles.emptyText}>
                Nenhum cliente com parcela vencida apareceu na fila atual.
              </p>
            </div>
          ) : (
            <div className={styles.queueList}>
              {overdueCustomers.map((group) => (
                <article key={group.customerKey} className={styles.queueItem}>
                  <div>
                    <strong className={styles.itemTitle}>{group.customerName}</strong>
                    <span className={styles.itemMeta}>
                      {group.installments.length} parcela(s) vencida(s) •{" "}
                      {formatCurrency(group.totalOverdue)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={() =>
                      openWhatsApp(
                        group.phone,
                        `Oi, ${group.customerName}! Identificamos ${group.installments.length} parcela(s) em atraso no seu crediario. Vamos regularizar?`,
                      )
                    }
                  >
                    Cobrar Cliente
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
