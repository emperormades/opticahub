"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import shared from "../../shared.module.css";
import styles from "./caixa.module.css";

type TransactionRecord = {
  id: string;
  type: "ENTRADA" | "SAIDA";
  method: string;
  amount: string;
  description: string;
  notes?: string | null;
  createdAt: string;
  user?: { name: string | null } | null;
  order?:
    | {
        orderNumber: string;
        customer?: { name: string | null } | null;
      }
    | null;
};

type CashRegisterDetails = {
  id: string;
  openedAt: string;
  openedBy: { id?: string; name: string | null };
  openAmount: string;
  transactions: TransactionRecord[];
};

type RecentCash = {
  id: string;
  openedAt: string;
  closedAt: string | null;
  totalEntradas: string | null;
  totalSaidas: string | null;
  totalLiquido: string | null;
  openedBy: { name: string | null };
};

type DashboardPayload = {
  lastCashes?: RecentCash[];
};

type UiMessage = {
  type: "success" | "error";
  text: string;
};

type FormErrors = {
  open: string | null;
  withdrawal: string | null;
  close: string | null;
};

const METHOD_LABELS: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  CARTAO_CREDITO: "Cartão de Crédito",
  CARTAO_DEBITO: "Cartão de Débito",
  CREDIARIO: "Crediário",
  BOLETO: "Boleto",
};

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseMoneyInput(value: string) {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) {
    return NaN;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

async function readJsonBody(response: Response) {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default function CaixaDiarioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCash, setActiveCash] = useState<CashRegisterDetails | null>(null);
  const [recentCashes, setRecentCashes] = useState<RecentCash[]>([]);
  const [uiMessage, setUiMessage] = useState<UiMessage | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({
    open: null,
    withdrawal: null,
    close: null,
  });
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<
    "open" | "withdrawal" | "close" | null
  >(null);
  const [openAmount, setOpenAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNotes, setWithdrawNotes] = useState("");
  const [closeAmount, setCloseAmount] = useState("");
  const [lastCloseDifference, setLastCloseDifference] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [router, status]);

  async function loadCashData(showSpinner = false) {
    if (showSpinner) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [activeResponse, dashboardResponse] = await Promise.all([
        fetch("/api/financial/cash-register?activeOnly=true"),
        fetch("/api/financial/cash"),
      ]);

      const activeJson = await readJsonBody(activeResponse);
      const dashboardJson = (await readJsonBody(
        dashboardResponse,
      )) as DashboardPayload | null;

      if (!activeResponse.ok) {
        setUiMessage({
          type: "error",
          text:
            String(activeJson?.error || "") ||
            "Não foi possível carregar o caixa atual.",
        });
      } else {
        const nextCash =
          activeJson && Object.keys(activeJson).length > 0
            ? (activeJson as unknown as CashRegisterDetails)
            : null;

        setActiveCash(nextCash);
      }

      if (!dashboardResponse.ok) {
        setRecentCashes([]);
      } else {
        setRecentCashes(dashboardJson?.lastCashes || []);
      }
    } catch {
      setUiMessage({
        type: "error",
        text: "Falha ao carregar a gestao de caixa.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      void loadCashData(true);
    }
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className={shared.page}>
        <div className={styles.loadingPanel}>Carregando gestao de caixa...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const operatorName = session?.user?.name || "Operador";
  const hasActiveCash = Boolean(activeCash);

  let totalEntradas = 0;
  let totalSaidas = 0;
  let entradasDinheiro = 0;
  let saidasDinheiro = 0;
  let runningBalance = Number(activeCash?.openAmount || 0);

  const transactionRows = activeCash
    ? activeCash.transactions.map((transaction) => {
        const amount = Number(transaction.amount);

        if (transaction.type === "ENTRADA") {
          totalEntradas += amount;
          runningBalance += amount;
          if (transaction.method === "DINHEIRO") {
            entradasDinheiro += amount;
          }
        } else {
          totalSaidas += amount;
          runningBalance -= amount;
          if (transaction.method === "DINHEIRO") {
            saidasDinheiro += amount;
          }
        }

        const originText = transaction.order
          ? `${transaction.order.customer?.name || "Cliente"} / OS ${transaction.order.orderNumber}`
          : transaction.user?.name || "Lancamento interno";

        return {
          id: transaction.id,
          createdAt: transaction.createdAt,
          event: transaction.description,
          origin: originText,
          methodLabel: METHOD_LABELS[transaction.method] || transaction.method,
          notes: transaction.notes || "",
          input: transaction.type === "ENTRADA" ? amount : 0,
          output: transaction.type === "SAIDA" ? amount : 0,
          balance: runningBalance,
        };
      })
    : [];

  const openingBalance = Number(activeCash?.openAmount || 0);
  const grossBalance = roundCurrency(openingBalance + totalEntradas - totalSaidas);
  const expectedDrawer = roundCurrency(
    openingBalance + entradasDinheiro - saidasDinheiro,
  );
  const nonCashImpact = roundCurrency(totalEntradas - entradasDinheiro);
  const closeAmountValue = parseMoneyInput(closeAmount);
  const closeDifference = Number.isFinite(closeAmountValue)
    ? roundCurrency(closeAmountValue - expectedDrawer)
    : 0;

  const lastClosedCash = recentCashes[0] || null;
  const hasLiveDivergence = isCloseModalOpen && Math.abs(closeDifference) > 0;
  const showLastCloseAlert =
    !hasActiveCash &&
    lastCloseDifference !== null &&
    Math.abs(lastCloseDifference) > 0;

  const statusTone =
    hasLiveDivergence || showLastCloseAlert
      ? "alert"
      : hasActiveCash
        ? "open"
        : "closed";

  const statusTitle =
    statusTone === "alert"
      ? "Divergencia de Caixa"
      : statusTone === "open"
        ? "Caixa Aberto"
        : "Caixa Fechado";

  const statusSubtitle = hasActiveCash
    ? `Aberto por ${activeCash?.openedBy.name || "Operador"} em ${formatDate(activeCash!.openedAt)} às ${formatTime(activeCash!.openedAt)}.`
    : statusTone === "alert"
      ? `O último fechamento registrou ${lastCloseDifference && lastCloseDifference > 0 ? "sobra" : "falta"} de ${formatCurrency(Math.abs(lastCloseDifference || 0))}.`
      : lastClosedCash
        ? `Último fechamento em ${formatDate(lastClosedCash.closedAt || lastClosedCash.openedAt)}. Operação atual sem caixa aberto.`
        : "Nenhuma sessão aberta no momento. Abra o caixa para iniciar o dia.";

  const inlineCloseDifferenceLabel =
    closeDifference > 0
      ? `Sobrando ${formatCurrency(closeDifference)}`
      : closeDifference < 0
        ? `Faltando ${formatCurrency(Math.abs(closeDifference))}`
        : "Fechamento sem divergência";

  function resetOpenModal() {
    setFormErrors((current) => ({ ...current, open: null }));
    setOpenAmount("");
    setIsOpenModalOpen(true);
  }

  function resetWithdrawalModal() {
    setFormErrors((current) => ({ ...current, withdrawal: null }));
    setWithdrawAmount("");
    setWithdrawNotes("");
    setIsWithdrawalModalOpen(true);
  }

  function resetCloseModal() {
    setFormErrors((current) => ({ ...current, close: null }));
    setCloseAmount(expectedDrawer.toFixed(2).replace(".", ","));
    setIsCloseModalOpen(true);
  }

  async function handleOpenCash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedAmount = openAmount.trim() === "" ? 0 : parseMoneyInput(openAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setFormErrors((current) => ({
        ...current,
        open: "Informe um saldo inicial valido.",
      }));
      return;
    }

    setSubmittingAction("open");
    setFormErrors((current) => ({ ...current, open: null }));

    try {
      const response = await fetch("/api/financial/cash-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "open",
          openAmount: parsedAmount,
        }),
      });

      const body = await readJsonBody(response);

      if (!response.ok) {
        const message =
          response.status === 400
            ? String(body?.error || "Não foi possível abrir o caixa.")
            : "Não foi possível abrir o caixa.";

        setFormErrors((current) => ({ ...current, open: message }));
        return;
      }

      setUiMessage({
        type: "success",
        text: "Caixa aberto e pronto para operar.",
      });
      setLastCloseDifference(null);
      setIsOpenModalOpen(false);
      await loadCashData();
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeCash) {
      setFormErrors((current) => ({
        ...current,
        withdrawal: "Nenhum caixa aberto para registrar sangria.",
      }));
      return;
    }

    const parsedAmount = parseMoneyInput(withdrawAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormErrors((current) => ({
        ...current,
        withdrawal: "Informe um valor valido para a sangria.",
      }));
      return;
    }

    if (!withdrawNotes.trim()) {
      setFormErrors((current) => ({
        ...current,
        withdrawal: "A justificativa da sangria é obrigatória.",
      }));
      return;
    }

    setSubmittingAction("withdrawal");
    setFormErrors((current) => ({ ...current, withdrawal: null }));

    try {
      const response = await fetch("/api/financial/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "withdrawal",
          cashId: activeCash.id,
          withdrawAmount: parsedAmount,
          notes: withdrawNotes.trim(),
        }),
      });

      const body = await readJsonBody(response);

      if (!response.ok) {
        const message =
          response.status === 400 || response.status === 404
            ? String(body?.error || "Não foi possível registrar a sangria.")
            : "Não foi possível registrar a sangria.";

        setFormErrors((current) => ({ ...current, withdrawal: message }));
        return;
      }

      setUiMessage({
        type: "success",
        text: "Sangria registrada e abatida do saldo esperado.",
      });
      setIsWithdrawalModalOpen(false);
      await loadCashData();
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleCloseCash(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeCash) {
      setFormErrors((current) => ({
        ...current,
        close: "Nao existe caixa aberto para fechar.",
      }));
      return;
    }

    const parsedAmount = parseMoneyInput(closeAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setFormErrors((current) => ({
        ...current,
        close: "Informe o valor fisico contado em caixa.",
      }));
      return;
    }

    const discrepancy = roundCurrency(parsedAmount - expectedDrawer);

    setSubmittingAction("close");
    setFormErrors((current) => ({ ...current, close: null }));

    try {
      const response = await fetch(
        `/api/financial/cash-register/${activeCash.id}/close`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            closeAmount: parsedAmount,
          }),
        },
      );

      const body = await readJsonBody(response);

      if (!response.ok) {
        const message =
          response.status === 400
            ? String(body?.error || "Não foi possível fechar o caixa.")
            : "Não foi possível fechar o caixa.";

        setFormErrors((current) => ({ ...current, close: message }));
        return;
      }

      setLastCloseDifference(discrepancy);
      setUiMessage({
        type: "success",
        text:
          discrepancy === 0
            ? "Caixa fechado sem divergência."
            : "Caixa fechado com divergência registrada para auditoria.",
      });
      setIsCloseModalOpen(false);
      await loadCashData();
    } finally {
      setSubmittingAction(null);
    }
  }

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Gestão de Caixa Diário</h1>
          <p className={shared.pageSubtitle}>
            Operador atual: <strong>{operatorName}</strong>
            {refreshing ? "  Atualizando dados..." : ""}
          </p>
        </div>
        <button
          type="button"
          className={shared.btnSecondary}
          onClick={() => void loadCashData()}
        >
          Atualizar
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
            className={shared.btnSecondary}
            onClick={() => setUiMessage(null)}
          >
            Fechar
          </button>
        </div>
      ) : null}

      <section
        className={`${styles.statusHero} ${
          statusTone === "open"
            ? styles.statusHeroOpen
            : statusTone === "alert"
              ? styles.statusHeroAlert
              : styles.statusHeroClosed
        }`}
      >
        <div className={styles.statusCopy}>
          <p className={styles.statusEyebrow}>Status operacional</p>
          <h2 className={styles.statusTitle}>{statusTitle}</h2>
          <p className={styles.statusSubtitle}>{statusSubtitle}</p>
        </div>

        <div className={styles.statusMetrics}>
          <div className={styles.metricPill}>
            <span className={styles.metricLabel}>Saldo esperado na gaveta</span>
            <strong className={styles.metricValue}>
              {formatCurrency(hasActiveCash ? expectedDrawer : 0)}
            </strong>
          </div>
          <div className={styles.metricPill}>
            <span className={styles.metricLabel}>Movimento total</span>
            <strong className={styles.metricValue}>
              {formatCurrency(
                hasActiveCash ? grossBalance : lastClosedCash?.totalLiquido || 0,
              )}
            </strong>
          </div>
        </div>
      </section>

      <section className={styles.actionGrid}>
        <article className={styles.actionCard}>
          <div className={styles.actionHeader}>
            <h3 className={styles.actionTitle}>Abrir Caixa</h3>
          </div>
          <p className={styles.actionText}>
            Registre o troco inicial da gaveta antes da primeira venda do dia.
          </p>
          <div className={styles.actionMetric}>
            <span className={styles.actionMetricLabel}>Saldo inicial</span>
            <strong className={styles.actionMetricValue}>
              {formatCurrency(hasActiveCash ? openingBalance : 0)}
            </strong>
          </div>
          <button
            type="button"
            className={shared.btnPrimary}
            disabled={hasActiveCash || submittingAction !== null}
            onClick={resetOpenModal}
          >
            {hasActiveCash ? "Ja aberto" : "Abrir Caixa"}
          </button>
        </article>

        <article className={styles.actionCard}>
          <div className={styles.actionHeader}>
            <h3 className={styles.actionTitle}>Sangria</h3>
          </div>
          <p className={styles.actionText}>
            Lance retiradas em dinheiro da gaveta com justificativa.
          </p>
          <div className={styles.actionMetric}>
            <span className={styles.actionMetricLabel}>Saídas em dinheiro</span>
            <strong className={styles.actionMetricValue}>
              {formatCurrency(hasActiveCash ? saidasDinheiro : 0)}
            </strong>
          </div>
          <button
            type="button"
            className={shared.btnSecondary}
            disabled={!hasActiveCash || submittingAction !== null}
            onClick={resetWithdrawalModal}
          >
            Registrar Sangria
          </button>
        </article>

        <article className={styles.actionCard}>
          <div className={styles.actionHeader}>
            <h3 className={styles.actionTitle}>Fechar Caixa</h3>
          </div>
          <p className={styles.actionText}>
            Compare o saldo físico contado com o saldo esperado antes de encerrar.
          </p>
          <div className={styles.actionMetric}>
            <span className={styles.actionMetricLabel}>Contagem esperada</span>
            <strong className={styles.actionMetricValue}>
              {formatCurrency(hasActiveCash ? expectedDrawer : 0)}
            </strong>
          </div>
          <button
            type="button"
            className={`${shared.btnPrimary} ${styles.dangerButton}`}
            disabled={!hasActiveCash || submittingAction !== null}
            onClick={resetCloseModal}
          >
            Fechar Caixa
          </button>
        </article>
      </section>

      <section className={styles.insightGrid}>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>Fluxo de sangria</span>
          <p className={styles.infoText}>
            Toda sangria entra como saída em dinheiro e reduz apenas o saldo
            esperado da gaveta, sem apagar o movimento financeiro do dia.
          </p>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Entradas</span>
            <strong className={styles.summaryValue}>
              {formatCurrency(totalEntradas)}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Saídas</span>
            <strong className={styles.summaryValue}>
              {formatCurrency(totalSaidas)}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Não-dinheiro</span>
            <strong className={styles.summaryValue}>
              {formatCurrency(nonCashImpact)}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Saldo operacional</span>
            <strong className={styles.summaryValue}>
              {formatCurrency(grossBalance)}
            </strong>
          </div>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div>
        <h3 className={styles.tableTitle}>Transações do Caixa — Hoje</h3>
            <p className={styles.tableSubtitle}>
              Entradas e saídas detalhadas por horário, origem e efeito no saldo.
            </p>
          </div>
          <div className={styles.tableMeta}>
            {hasActiveCash
              ? `${transactionRows.length} lancamentos`
              : "Nenhum caixa aberto"}
          </div>
        </div>

        {hasActiveCash ? (
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Evento</th>
                  <th>Origem</th>
                  <th>Meio</th>
                  <th className={styles.moneyHead}>Entrada</th>
                  <th className={styles.moneyHead}>Saida</th>
                  <th className={styles.moneyHead}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{formatTime(activeCash!.openedAt)}</td>
                  <td>
                    <strong>Abertura de caixa</strong>
                  </td>
                  <td>{activeCash!.openedBy.name || "Operador"}</td>
                  <td>Dinheiro</td>
                  <td className={styles.moneyCell}>
                    {formatCurrency(openingBalance)}
                  </td>
                  <td className={styles.moneyCell}>-</td>
                  <td className={styles.moneyCell}>
                    {formatCurrency(openingBalance)}
                  </td>
                </tr>
                {transactionRows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatTime(row.createdAt)}</td>
                    <td>
                      <strong>{row.event}</strong>
                      {row.notes ? (
                        <span className={styles.cellNote}>{row.notes}</span>
                      ) : null}
                    </td>
                    <td>{row.origin}</td>
                    <td>{row.methodLabel}</td>
                    <td className={styles.moneyCell}>
                      {row.input > 0 ? formatCurrency(row.input) : "-"}
                    </td>
                    <td className={styles.moneyCell}>
                      {row.output > 0 ? formatCurrency(row.output) : "-"}
                    </td>
                    <td className={styles.moneyCell}>
                      {formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>
              Nenhuma transacao ativa para exibir agora.
            </p>
            <p className={styles.emptyText}>
              Abra o caixa para iniciar os lancamentos do dia e acompanhar a
              gaveta em tempo real.
            </p>
          </div>
        )}
      </section>

      {recentCashes.length > 0 ? (
        <section className={styles.historyCard}>
          <div className={styles.tableHeader}>
            <div>
              <h3 className={styles.tableTitle}>Ultimos Fechamentos</h3>
              <p className={styles.tableSubtitle}>
                Historico recente para auditoria rapida do financeiro.
              </p>
            </div>
          </div>
          <div className={styles.historyList}>
            {recentCashes.map((cash) => (
              <div key={cash.id} className={styles.historyItem}>
                <div>
                  <strong>{formatDate(cash.closedAt || cash.openedAt)}</strong>
                  <span className={styles.historyMeta}>
                    Aberto por {cash.openedBy.name || "Operador"}
                  </span>
                </div>
                <strong>{formatCurrency(cash.totalLiquido || 0)}</strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {isOpenModalOpen ? (
        <div className={shared.modalOverlay}>
          <div className={`${shared.modal} ${styles.compactModal}`}>
            <div className={shared.modalHeader}>
              <h3 className={shared.modalTitle}>Abrir Caixa</h3>
              <button
                type="button"
                className={shared.modalClose}
                onClick={() => setIsOpenModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form id="open-cash-form" onSubmit={handleOpenCash}>
              <div className={shared.modalBody}>
                <p className={styles.modalText}>
                  Informe o troco inicial que ficara disponivel na gaveta no
                  inicio do expediente.
                </p>

                <div className={shared.fieldGroup}>
                  <label className={shared.fieldLabel}>Saldo inicial</label>
                  <input
                    className={shared.fieldInput}
                    type="text"
                    inputMode="decimal"
                    value={openAmount}
                    onChange={(event) => setOpenAmount(event.target.value)}
                    placeholder="Ex: 150,00"
                    autoFocus
                  />
                </div>

                {formErrors.open ? (
                  <div className={styles.formError}>{formErrors.open}</div>
                ) : null}
              </div>

              <div className={shared.modalFooter}>
                <button
                  type="button"
                  className={shared.btnSecondary}
                  onClick={() => setIsOpenModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={shared.btnPrimary}
                  disabled={submittingAction === "open"}
                >
                  {submittingAction === "open" ? "Abrindo..." : "Confirmar Abertura"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isWithdrawalModalOpen ? (
        <div className={shared.modalOverlay}>
          <div className={`${shared.modal} ${styles.compactModal}`}>
            <div className={shared.modalHeader}>
              <h3 className={shared.modalTitle}>Registrar Sangria</h3>
              <button
                type="button"
                className={shared.modalClose}
                onClick={() => setIsWithdrawalModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form id="withdraw-cash-form" onSubmit={handleWithdrawal}>
              <div className={shared.modalBody}>
                <p className={styles.modalText}>
                  Lance a retirada de dinheiro com a justificativa operacional.
                </p>

                <div className={shared.fieldGroup}>
                  <label className={shared.fieldLabel}>Valor da sangria</label>
                  <input
                    className={shared.fieldInput}
                    type="text"
                    inputMode="decimal"
                    value={withdrawAmount}
                    onChange={(event) => setWithdrawAmount(event.target.value)}
                    placeholder="Ex: 35,50"
                    autoFocus
                  />
                </div>

                <div className={shared.fieldGroup}>
                  <label className={shared.fieldLabel}>Justificativa</label>
                  <textarea
                    className={shared.fieldTextarea}
                    value={withdrawNotes}
                    onChange={(event) => setWithdrawNotes(event.target.value)}
                    placeholder="Ex: Comprar agua"
                  />
                </div>

                {formErrors.withdrawal ? (
                  <div className={styles.formError}>{formErrors.withdrawal}</div>
                ) : null}
              </div>

              <div className={shared.modalFooter}>
                <button
                  type="button"
                  className={shared.btnSecondary}
                  onClick={() => setIsWithdrawalModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={shared.btnPrimary}
                  disabled={submittingAction === "withdrawal"}
                >
                  {submittingAction === "withdrawal"
                    ? "Registrando..."
                    : "Confirmar Sangria"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isCloseModalOpen ? (
        <div className={shared.modalOverlay}>
          <div className={`${shared.modal} ${styles.compactModal}`}>
            <div className={shared.modalHeader}>
              <h3 className={shared.modalTitle}>Fechar Caixa</h3>
              <button
                type="button"
                className={shared.modalClose}
                onClick={() => setIsCloseModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form id="close-cash-form" onSubmit={handleCloseCash}>
              <div className={shared.modalBody}>
                <div className={styles.impactPanel}>
                  <strong>Conferencia final da gaveta</strong>
                  <span>
                    Saldo esperado: <b>{formatCurrency(expectedDrawer)}</b>
                  </span>
                </div>

                <div className={shared.fieldGroup}>
                  <label className={shared.fieldLabel}>Valor fisico contado</label>
                  <input
                    className={shared.fieldInput}
                    type="text"
                    inputMode="decimal"
                    value={closeAmount}
                    onChange={(event) => setCloseAmount(event.target.value)}
                    placeholder="Ex: 920,00"
                    autoFocus
                  />
                </div>

                <div
                  className={`${styles.differenceBox} ${
                    Math.abs(closeDifference) > 0
                      ? styles.differenceAlert
                      : styles.differenceOk
                  }`}
                >
                  <span className={styles.differenceLabel}>
                    Valor faltante / sobrando
                  </span>
                  <strong className={styles.differenceValue}>
                    {inlineCloseDifferenceLabel}
                  </strong>
                </div>

                {formErrors.close ? (
                  <div className={styles.formError}>{formErrors.close}</div>
                ) : null}
              </div>

              <div className={shared.modalFooter}>
                <button
                  type="button"
                  className={shared.btnSecondary}
                  onClick={() => setIsCloseModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`${shared.btnPrimary} ${styles.dangerButton}`}
                  disabled={submittingAction === "close"}
                >
                  {submittingAction === "close" ? "Fechando..." : "Confirmar Fechamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
