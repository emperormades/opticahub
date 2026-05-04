import { PaymentMethod, TransactionType } from "@prisma/client";

export interface CreateCarnePayload {
  transactionId: string;
  installmentsCount: number;
  firstDueDate: string;
}

export interface PayInstallmentPayload {
  paid: true;
}

export interface CreateTransactionPayload {
  type: TransactionType;
  method: PaymentMethod;
  amount: number;
  description: string;
  orderId?: string;
  installments?: number;
  isPending?: boolean;
  dueDate?: string;
  notes?: string;
  commissionPct?: number;
}

export interface ListTransactionsQuery {
  type?: TransactionType;
  isPending?: boolean;
  page: number;
  limit: number;
  search?: string;
  from?: string;
  to?: string;
}

export interface FinancialDateRangeQuery {
  startDate?: string;
  endDate?: string;
}

export interface FinancialSummaryQuery {
  date?: string;
}

export interface CashMutationPayload {
  action: "open" | "close" | "withdrawal";
  openAmount?: number;
  closeAmount?: number;
  withdrawAmount?: number;
  notes?: string;
  cashId?: string;
}

export interface CarneListQuery {
  transactionId?: string;
  status?: "overdue" | "pending" | "paid";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function toPositiveInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export function parseCreateCarnePayload(payload: unknown):
  | { success: true; data: CreateCarnePayload }
  | { success: false; error: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { success: false, error: "Payload invalido" };
  }

  const body = payload as Record<string, unknown>;
  const installmentsCount = toPositiveInteger(body.installmentsCount);

  if (!isNonEmptyString(body.transactionId)) {
    return { success: false, error: "transactionId invalido" };
  }

  if (installmentsCount === null) {
    return { success: false, error: "installmentsCount invalido" };
  }

  if (!isNonEmptyString(body.firstDueDate)) {
    return { success: false, error: "firstDueDate invalido" };
  }

  if (Number.isNaN(new Date(body.firstDueDate).getTime())) {
    return { success: false, error: "firstDueDate invalido" };
  }

  return {
    success: true,
    data: {
      transactionId: body.transactionId.trim(),
      installmentsCount,
      firstDueDate: body.firstDueDate,
    },
  };
}

export function parsePayInstallmentPayload(payload: unknown):
  | { success: true; data: PayInstallmentPayload }
  | { success: false; error: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { success: false, error: "Payload invalido" };
  }

  const body = payload as Record<string, unknown>;

  if (body.paid !== true) {
    return { success: false, error: "Payload invalido: paid=true e obrigatorio" };
  }

  return { success: true, data: { paid: true } };
}

export function parseCreateTransactionPayload(payload: unknown):
  | { success: true; data: CreateTransactionPayload }
  | { success: false; error: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { success: false, error: "Payload invalido" };
  }

  const body = payload as Record<string, unknown>;
  const amount =
    typeof body.amount === "number"
      ? body.amount
      : typeof body.amount === "string" && body.amount.trim() !== ""
        ? Number(body.amount)
        : NaN;
  const installments =
    body.installments === undefined ? undefined : toPositiveInteger(body.installments);
  const commissionPct =
    body.commissionPct === undefined
      ? undefined
      : typeof body.commissionPct === "number"
        ? body.commissionPct
        : typeof body.commissionPct === "string" && body.commissionPct.trim() !== ""
          ? Number(body.commissionPct)
          : NaN;

  if (
    typeof body.type !== "string" ||
    !Object.values(TransactionType).includes(body.type as TransactionType)
  ) {
    return { success: false, error: "type invalido" };
  }

  if (
    typeof body.method !== "string" ||
    !Object.values(PaymentMethod).includes(body.method as PaymentMethod)
  ) {
    return { success: false, error: "method invalido" };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "amount invalido" };
  }

  if (!isNonEmptyString(body.description)) {
    return { success: false, error: "description invalido" };
  }

  if (installments === null) {
    return { success: false, error: "installments invalido" };
  }

  if (
    commissionPct !== undefined &&
    (!Number.isFinite(commissionPct) || commissionPct < 0 || commissionPct > 100)
  ) {
    return { success: false, error: "commissionPct invalido" };
  }

  if (body.dueDate !== undefined) {
    if (!isNonEmptyString(body.dueDate) || Number.isNaN(new Date(body.dueDate).getTime())) {
      return { success: false, error: "dueDate invalido" };
    }
  }

  if (body.orderId !== undefined && !isNonEmptyString(body.orderId)) {
    return { success: false, error: "orderId invalido" };
  }

  if (body.isPending !== undefined && typeof body.isPending !== "boolean") {
    return { success: false, error: "isPending invalido" };
  }

  if (body.notes !== undefined && typeof body.notes !== "string") {
    return { success: false, error: "notes invalido" };
  }

  return {
    success: true,
    data: {
      type: body.type as TransactionType,
      method: body.method as PaymentMethod,
      amount,
      description: body.description.trim(),
      orderId: isNonEmptyString(body.orderId) ? body.orderId.trim() : undefined,
      installments: installments === undefined ? undefined : installments,
      isPending: typeof body.isPending === "boolean" ? body.isPending : undefined,
      dueDate: isNonEmptyString(body.dueDate) ? body.dueDate : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      commissionPct,
    },
  };
}

export function parseListTransactionsQuery(searchParams: URLSearchParams):
  | { success: true; data: ListTransactionsQuery }
  | { success: false; error: string } {
  const typeParam = searchParams.get("type");
  const isPendingParam = searchParams.get("isPending");
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");
  const search = searchParams.get("search") || "";
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const page = pageParam === null ? 1 : toPositiveInteger(pageParam);
  const limit = limitParam === null ? 30 : toPositiveInteger(limitParam);

  if (page === null || limit === null) {
    return { success: false, error: "page/limit invalido" };
  }

  if (
    typeParam &&
    !Object.values(TransactionType).includes(typeParam as TransactionType)
  ) {
    return { success: false, error: "type invalido" };
  }

  if (
    isPendingParam !== null &&
    isPendingParam !== "true" &&
    isPendingParam !== "false"
  ) {
    return { success: false, error: "isPending invalido" };
  }

  if (from && Number.isNaN(new Date(from).getTime())) {
    return { success: false, error: "from invalido" };
  }

  if (to && Number.isNaN(new Date(to).getTime())) {
    return { success: false, error: "to invalido" };
  }

  return {
    success: true,
    data: {
      type: typeParam ? (typeParam as TransactionType) : undefined,
      isPending: isPendingParam === null ? undefined : isPendingParam === "true",
      page,
      limit,
      search: search || undefined,
      from,
      to,
    },
  };
}

export function parseFinancialDateRangeQuery(searchParams: URLSearchParams):
  | { success: true; data: FinancialDateRangeQuery }
  | { success: false; error: string } {
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  if (startDate && Number.isNaN(new Date(startDate).getTime())) {
    return { success: false, error: "startDate invalido" };
  }

  if (endDate && Number.isNaN(new Date(endDate).getTime())) {
    return { success: false, error: "endDate invalido" };
  }

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return { success: false, error: "intervalo invalido" };
  }

  return {
    success: true,
    data: { startDate, endDate },
  };
}

export function parseFinancialSummaryQuery(searchParams: URLSearchParams):
  | { success: true; data: FinancialSummaryQuery }
  | { success: false; error: string } {
  const date = searchParams.get("date") || undefined;

  if (date && Number.isNaN(new Date(date).getTime())) {
    return { success: false, error: "date invalida" };
  }

  return {
    success: true,
    data: { date },
  };
}

export function parseCashMutationPayload(payload: unknown):
  | { success: true; data: CashMutationPayload }
  | { success: false; error: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { success: false, error: "Payload invalido" };
  }

  const body = payload as Record<string, unknown>;
  const action = body.action;

  if (action !== "open" && action !== "close" && action !== "withdrawal") {
    return { success: false, error: "Acao invalida" };
  }

  const openAmount =
    body.openAmount === undefined ? undefined : toFiniteNumber(body.openAmount);
  const closeAmount =
    body.closeAmount === undefined ? undefined : toFiniteNumber(body.closeAmount);
  const withdrawAmount =
    body.withdrawAmount === undefined ? undefined : toFiniteNumber(body.withdrawAmount);

  if (body.openAmount !== undefined && openAmount === null) {
    return { success: false, error: "openAmount invalido" };
  }

  if (body.closeAmount !== undefined && closeAmount === null) {
    return { success: false, error: "closeAmount invalido" };
  }

  if (body.withdrawAmount !== undefined && withdrawAmount === null) {
    return { success: false, error: "withdrawAmount invalido" };
  }

  if (body.notes !== undefined && typeof body.notes !== "string") {
    return { success: false, error: "notes invalido" };
  }

  if (action === "close") {
    if (!isNonEmptyString(body.cashId)) {
      return { success: false, error: "cashId invalido" };
    }
  }

  if (action === "withdrawal") {
    if (withdrawAmount === null || withdrawAmount === undefined || withdrawAmount <= 0) {
      return { success: false, error: "withdrawAmount invalido" };
    }

    if (!isNonEmptyString(body.notes)) {
      return { success: false, error: "notes obrigatorio para sangria" };
    }
  }

  return {
    success: true,
    data: {
      action,
      openAmount: openAmount === null ? undefined : openAmount,
      closeAmount: closeAmount === null ? undefined : closeAmount,
      withdrawAmount: withdrawAmount === null ? undefined : withdrawAmount,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      cashId: isNonEmptyString(body.cashId) ? body.cashId.trim() : undefined,
    },
  };
}

export function parseCarneListQuery(searchParams: URLSearchParams):
  | { success: true; data: CarneListQuery }
  | { success: false; error: string } {
  const transactionId = searchParams.get("transactionId") || undefined;
  const statusParam = searchParams.get("status") || undefined;

  if (transactionId !== undefined && !isNonEmptyString(transactionId)) {
    return { success: false, error: "transactionId invalido" };
  }

  if (
    statusParam !== undefined &&
    statusParam !== "overdue" &&
    statusParam !== "pending" &&
    statusParam !== "paid"
  ) {
    return { success: false, error: "status invalido" };
  }

  return {
    success: true,
    data: {
      transactionId: transactionId?.trim(),
      status: statusParam,
    },
  };
}

// ─── Split Payment ────────────────────────────────────────────────────────────

export interface SplitPaymentItemPayload {
  method: PaymentMethod;
  amount: number;
  installmentsCount?: number;
  notes?: string;
  commissionPct?: number;
}

export interface SplitPaymentPayload {
  orderId: string;
  splits: SplitPaymentItemPayload[];
}

export function parseSplitPaymentPayload(payload: unknown):
  | { success: true; data: SplitPaymentPayload }
  | { success: false; error: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { success: false, error: "Payload invalido" };
  }

  const body = payload as Record<string, unknown>;

  if (!isNonEmptyString(body.orderId)) {
    return { success: false, error: "orderId invalido" };
  }

  if (!Array.isArray(body.splits) || body.splits.length === 0) {
    return { success: false, error: "splits deve ser um array com ao menos 1 item" };
  }

  const validatedSplits: SplitPaymentItemPayload[] = [];

  for (let i = 0; i < body.splits.length; i++) {
    const raw = body.splits[i];

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { success: false, error: `splits[${i}]: item invalido` };
    }

    const item = raw as Record<string, unknown>;

    if (
      typeof item.method !== "string" ||
      !Object.values(PaymentMethod).includes(item.method as PaymentMethod)
    ) {
      return { success: false, error: `splits[${i}].method invalido` };
    }

    const amount = toFiniteNumber(item.amount);
    if (amount === null || amount <= 0) {
      return { success: false, error: `splits[${i}].amount invalido` };
    }

    const installmentsCount =
      item.installmentsCount === undefined
        ? undefined
        : toPositiveInteger(item.installmentsCount);

    if (item.installmentsCount !== undefined && installmentsCount === null) {
      return { success: false, error: `splits[${i}].installmentsCount invalido` };
    }

    if (item.notes !== undefined && typeof item.notes !== "string") {
      return { success: false, error: `splits[${i}].notes invalido` };
    }

    const commissionPct =
      item.commissionPct === undefined ? undefined : toFiniteNumber(item.commissionPct);

    if (
      item.commissionPct !== undefined &&
      (commissionPct === null || commissionPct === undefined || commissionPct < 0 || commissionPct > 100)
    ) {
      return { success: false, error: `splits[${i}].commissionPct invalido` };
    }

    validatedSplits.push({
      method: item.method as PaymentMethod,
      amount,
      installmentsCount: installmentsCount ?? undefined,
      notes: typeof item.notes === "string" ? item.notes : undefined,
      commissionPct: commissionPct ?? undefined,
    });
  }

  return {
    success: true,
    data: {
      orderId: (body.orderId as string).trim(),
      splits: validatedSplits,
    },
  };
}
