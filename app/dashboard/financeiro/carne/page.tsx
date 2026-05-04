"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import shared from "../../shared.module.css";
import styles from "./carne.module.css";

type Installment = {
  id: string;
  number: number;
  dueDate: string;
  amount: number;
  isPaid: boolean;
  paidAt: string | null;
  penaltyAmount: number;
  interestAmount: number;
  paymentLink: string | null;
  transaction: {
    installmentsCount?: number | null;
    order?: {
      orderNumber: string;
      customer: {
        name: string;
      };
    } | null;
  };
};

type FilterKey = "all" | "pending" | "overdue" | "paid";

type UiMessage = {
  type: "success" | "error";
  text: string;
};

const FILTERS: Array<{
  key: FilterKey;
  label: string;
  tone: "default" | "danger";
}> = [
  { key: "all", label: "Todos", tone: "default" },
  { key: "pending", label: "A Vencer", tone: "default" },
  { key: "overdue", label: "Vencidos", tone: "danger" },
  { key: "paid", label: "Pagos", tone: "default" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string) {
  const normalized = value.includes("T") ? value : `${value}T12:00:00`;
  return new Date(normalized).toLocaleDateString("pt-BR");
}

function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getDueDate(value: string) {
  return new Date(value.includes("T") ? value : `${value}T12:00:00`);
}

function calculateChargesPreview(installment: Installment) {
  if (installment.isPaid) {
    return {
      penaltyAmount: Number(installment.penaltyAmount),
      interestAmount: Number(installment.interestAmount),
      total: Number(installment.amount) +
        Number(installment.penaltyAmount) +
        Number(installment.interestAmount),
      isOverdue: false,
      daysLate: 0,
    };
  }

  const dueDate = getDueDate(installment.dueDate);
  const today = getToday();

  if (today <= dueDate) {
    return {
      penaltyAmount: 0,
      interestAmount: 0,
      total: Number(installment.amount),
      isOverdue: false,
      daysLate: 0,
    };
  }

  const daysLate = Math.ceil(
    (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const penaltyAmount = Math.round(Number(installment.amount) * 0.02 * 100) / 100;
  const interestAmount =
    Math.round(Number(installment.amount) * (0.01 / 30) * daysLate * 100) / 100;

  return {
    penaltyAmount,
    interestAmount,
    total: Number(installment.amount) + penaltyAmount + interestAmount,
    isOverdue: true,
    daysLate,
  };
}

function getStatus(installment: Installment) {
  if (installment.isPaid) {
    return {
      label: "Pago",
      tone: "success" as const,
    };
  }

  const dueDate = getDueDate(installment.dueDate);
  const today = getToday();

  if (dueDate < today) {
    return {
      label: "Vencido",
      tone: "danger" as const,
    };
  }

  return {
    label: "A vencer",
    tone: "warning" as const,
  };
}

async function readJson(response: Response) {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default function CarnePage() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [uiMessage, setUiMessage] = useState<UiMessage | null>(null);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(
    null,
  );
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isLoadingInstallment, setIsLoadingInstallment] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [confirmPay, setConfirmPay] = useState(false);
  const [modalMessage, setModalMessage] = useState<UiMessage | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [router, status]);

  useEffect(() => {
    if (status === "authenticated") {
      void loadInstallments(filter);
    }
  }, [filter, status]);

  async function loadInstallments(activeFilter: FilterKey) {
    setLoading(true);

    try {
      const query = activeFilter === "all" ? "" : `?status=${activeFilter}`;
      const response = await fetch(`/api/financial/carne${query}`);
      const body = await readJson(response);

      if (!response.ok) {
        setUiMessage({
          type: "error",
          text: String(body?.error || "Não foi possível carregar as parcelas."),
        });
        setInstallments([]);
        return;
      }

      setInstallments(
        Array.isArray(body) ? (body as unknown as Installment[]) : [],
      );
    } catch {
      setUiMessage({
        type: "error",
        text: "Falha ao carregar o painel de crediario.",
      });
      setInstallments([]);
    } finally {
      setLoading(false);
    }
  }

  async function openPayModal(installmentId: string) {
    setIsPayModalOpen(true);
    setIsLoadingInstallment(true);
    setConfirmPay(false);
    setModalMessage(null);

    try {
      const response = await fetch(`/api/financial/carne/${installmentId}`);
      const body = await readJson(response);

      if (!response.ok) {
        setModalMessage({
          type: "error",
          text: String(body?.error || "Não foi possível carregar a parcela."),
        });
        setSelectedInstallment(null);
        return;
      }

      setSelectedInstallment(body as unknown as Installment);
    } catch {
      setModalMessage({
        type: "error",
        text: "Falha ao carregar os detalhes da parcela.",
      });
      setSelectedInstallment(null);
    } finally {
      setIsLoadingInstallment(false);
    }
  }

  function closePayModal() {
    setIsPayModalOpen(false);
    setSelectedInstallment(null);
    setConfirmPay(false);
    setModalMessage(null);
  }

  async function confirmPayment() {
    if (!selectedInstallment) {
      return;
    }

    if (!confirmPay) {
      setModalMessage({
        type: "error",
        text: "Confirme a baixa antes de concluir o pagamento.",
      });
      return;
    }

    setIsSubmittingPayment(true);
    setModalMessage(null);

    try {
      const response = await fetch(`/api/financial/carne/${selectedInstallment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: true }),
      });

      const body = await readJson(response);

      if (!response.ok) {
        const text = String(body?.error || "Não foi possível dar baixa.");
        const message = { type: "error" as const, text };

        setModalMessage(message);
        if (response.status === 400) {
          setUiMessage(message);
        }
        return;
      }

      const paidInstallment = {
        ...selectedInstallment,
        ...(body as Partial<Installment>),
      };

      setInstallments((current) => {
        const next = current.map((item) =>
          item.id === paidInstallment.id
            ? {
                ...item,
                ...paidInstallment,
              }
            : item,
        );

        if (filter === "all") {
          return next;
        }

        if (filter === "paid") {
          return next;
        }

        return next.filter((item) => !item.isPaid);
      });

      setUiMessage({
        type: "success",
        text: "Parcela baixada com sucesso.",
      });
      closePayModal();
    } catch {
      setModalMessage({
        type: "error",
        text: "Falha ao concluir o pagamento da parcela.",
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className={shared.page}>
        <div className={styles.loadingCard}>Carregando painel de crediario...</div>
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
          <h1 className={shared.pageTitle}>Carteira de Carnês</h1>
          <p className={shared.pageSubtitle}>
            Gerencie parcelas do crediário próprio e registre baixas manuais com
            segurança.
          </p>
        </div>
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

      <section className={styles.filterBar}>
        {FILTERS.map((item) => {
          const isActive = filter === item.key;
          return (
            <button
              key={item.key}
              type="button"
              className={`${styles.filterTab} ${
                isActive
                  ? item.tone === "danger"
                    ? styles.filterTabDanger
                    : styles.filterTabActive
                  : ""
              }`}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          );
        })}
      </section>

      <section className={styles.infoCard}>
        <span className={styles.infoLabel}>Regra operacional</span>
        <p className={styles.infoText}>
          Cada baixa quita apenas a parcela selecionada. Se houver atraso, a
          tela antecipa multa e juros usando a mesma regra aplicada pelo backend
          no momento da confirmacao.
        </p>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div>
            <h2 className={styles.tableTitle}>Parcelas</h2>
            <p className={styles.tableSubtitle}>
              {installments.length} registro(s) no filtro atual.
            </p>
          </div>
        </div>

        {installments.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Nenhuma parcela encontrada.</p>
            <p className={styles.emptyText}>
              Ajuste o filtro ou gere um novo carne para visualizar parcelas aqui.
            </p>
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Parcela</th>
                  <th>Data de Venc.</th>
                  <th className={styles.moneyHead}>Valor</th>
                  <th>Status</th>
                  <th>Acao</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((installment) => {
                  const statusBadge = getStatus(installment);
                  const totalInstallments =
                    installment.transaction.installmentsCount || installment.number;

                  return (
                    <tr key={installment.id}>
                      <td>
                        <strong className={styles.primaryCell}>
                          {installment.transaction.order?.customer.name || "Cliente"}
                        </strong>
                        <span className={styles.secondaryCell}>
                          OS {installment.transaction.order?.orderNumber || "-"}
                        </span>
                      </td>
                      <td>
                        {installment.number}/{totalInstallments}
                      </td>
                      <td>{formatDate(installment.dueDate)}</td>
                      <td className={styles.moneyCell}>
                        {formatCurrency(Number(installment.amount))}
                      </td>
                      <td>
                        <span
                          className={`${styles.statusPill} ${
                            statusBadge.tone === "success"
                              ? styles.statusSuccess
                              : statusBadge.tone === "danger"
                                ? styles.statusDanger
                                : styles.statusWarning
                          }`}
                        >
                          {statusBadge.label}
                        </span>
                      </td>
                      <td>
                        {installment.isPaid ? (
                          <span className={styles.paidLabel}>
                            Pago em {installment.paidAt ? formatDate(installment.paidAt) : "-"}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={styles.btnPrimary}
                            onClick={() => void openPayModal(installment.id)}
                          >
                            Dar Baixa
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isPayModalOpen ? (
        <div className={shared.modalOverlay}>
          <div className={`${shared.modal} ${styles.payModal}`}>
            <div className={shared.modalHeader}>
              <h3 className={shared.modalTitle}>Dar Baixa na Parcela</h3>
              <button
                type="button"
                className={shared.modalClose}
                onClick={closePayModal}
              >
                &times;
              </button>
            </div>

            <div className={shared.modalBody}>
              {modalMessage ? (
                <div
                  className={`${styles.feedbackBanner} ${
                    modalMessage.type === "error"
                      ? styles.feedbackError
                      : styles.feedbackSuccess
                  }`}
                >
                  <span>{modalMessage.text}</span>
                </div>
              ) : null}

              {isLoadingInstallment || !selectedInstallment ? (
                <div className={styles.loadingCard}>Carregando detalhes...</div>
              ) : (
                <>
                  {(() => {
                    const preview = calculateChargesPreview(selectedInstallment);
                    const totalInstallments =
                      selectedInstallment.transaction.installmentsCount ||
                      selectedInstallment.number;

                    return (
                      <>
                        <div className={styles.impactPanel}>
                          <strong>Conferencia da baixa</strong>
                          <span>
                            Cliente:{" "}
                            <b>
                              {selectedInstallment.transaction.order?.customer.name ||
                                "Cliente"}
                            </b>
                          </span>
                          <span>
                            Parcela {selectedInstallment.number}/{totalInstallments}
                          </span>
                        </div>

                        <div className={styles.detailGrid}>
                          <div className={styles.detailCard}>
                            <span className={styles.detailLabel}>Valor original</span>
                            <strong className={styles.detailValue}>
                              {formatCurrency(Number(selectedInstallment.amount))}
                            </strong>
                          </div>
                          <div className={styles.detailCard}>
                            <span className={styles.detailLabel}>Multa</span>
                            <strong className={styles.detailValue}>
                              {formatCurrency(preview.penaltyAmount)}
                            </strong>
                          </div>
                          <div className={styles.detailCard}>
                            <span className={styles.detailLabel}>Juros</span>
                            <strong className={styles.detailValue}>
                              {formatCurrency(preview.interestAmount)}
                            </strong>
                          </div>
                          <div className={styles.detailCard}>
                            <span className={styles.detailLabel}>Total a receber</span>
                            <strong className={styles.detailValue}>
                              {formatCurrency(preview.total)}
                            </strong>
                          </div>
                        </div>

                        <div className={styles.recitalBox}>
                          {preview.isOverdue
                            ? `Parcela em atraso ha ${preview.daysLate} dia(s). Os encargos serao recalculados pelo backend ao confirmar.`
                            : "Parcela dentro do prazo. Nenhum encargo adicional sera aplicado."}
                        </div>

                        <label className={styles.confirmBox}>
                          <input
                            type="checkbox"
                            checked={confirmPay}
                            onChange={(event) => setConfirmPay(event.target.checked)}
                          />
                          <span>
                            Confirmo que revisei o valor e desejo registrar este
                            pagamento agora.
                          </span>
                        </label>
                      </>
                    );
                  })()}
                </>
              )}
            </div>

            <div className={shared.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={closePayModal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => void confirmPayment()}
                disabled={
                  isLoadingInstallment || isSubmittingPayment || !selectedInstallment
                }
              >
                {isSubmittingPayment ? "Confirmando..." : "Confirmar Pagamento"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
