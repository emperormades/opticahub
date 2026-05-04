import { PaymentMethod, ProductType } from "@prisma/client";
import {
  CreateOrderInput,
  CreateOrderItemInput,
  CreateOrderPaymentInput,
} from "@/lib/services/orderService";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

function parseOrderItem(value: unknown): CreateOrderItemInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const description = isNonEmptyString(record.description)
    ? record.description.trim()
    : null;
  const quantity = toFiniteNumber(record.quantity);
  const unitPrice = toFiniteNumber(record.unitPrice);
  const discount = record.discount === undefined ? 0 : toFiniteNumber(record.discount);
  const itemType =
    typeof record.itemType === "string" &&
    Object.values(ProductType).includes(record.itemType as ProductType)
      ? (record.itemType as ProductType)
      : ProductType.SERVICOS;
  const productId = isNonEmptyString(record.productId)
    ? record.productId.trim()
    : undefined;

  if (!description || quantity === null || unitPrice === null || discount === null) {
    return null;
  }

  if (quantity <= 0 || !Number.isInteger(quantity) || unitPrice < 0 || discount < 0) {
    return null;
  }

  return {
    description,
    quantity,
    unitPrice,
    discount,
    itemType,
    productId,
  };
}

function parseOrderPayment(value: unknown): CreateOrderPaymentInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const amount = toFiniteNumber(record.amount);
  const rawInstallmentsCount =
    record.installmentsCount === undefined
      ? undefined
      : toFiniteNumber(record.installmentsCount);
  const installmentsCount =
    rawInstallmentsCount === null ? null : rawInstallmentsCount;
  const method =
    typeof record.method === "string" &&
    Object.values(PaymentMethod).includes(record.method as PaymentMethod)
      ? (record.method as PaymentMethod)
      : undefined;

  if (amount === null || amount <= 0) {
    return null;
  }

  if (
    installmentsCount !== undefined &&
    installmentsCount !== null &&
    (installmentsCount <= 0 || !Number.isInteger(installmentsCount))
  ) {
    return null;
  }

  return {
    amount,
    method,
    installmentsCount: installmentsCount === null ? undefined : installmentsCount,
  };
}

export function parseCreateOrderPayload(payload: unknown):
  | { success: true; data: CreateOrderInput }
  | { success: false; error: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { success: false, error: "Payload invalido" };
  }

  const body = payload as Record<string, unknown>;

  if (!isNonEmptyString(body.customerId)) {
    return { success: false, error: "customerId invalido" };
  }

  const rawItems = Array.isArray(body.items) ? body.items : null;
  if (!rawItems) {
    return { success: false, error: "items invalido" };
  }

  const items: CreateOrderItemInput[] = [];
  for (const rawItem of rawItems) {
    const item = parseOrderItem(rawItem);
    if (!item) {
      return { success: false, error: "Item de OS invalido" };
    }
    items.push(item);
  }

  const rawTransactions = Array.isArray(body.transactions) ? body.transactions : [];
  const transactions: CreateOrderPaymentInput[] = [];
  for (const rawPayment of rawTransactions) {
    const payment = parseOrderPayment(rawPayment);
    if (!payment) {
      return { success: false, error: "Pagamento invalido" };
    }
    transactions.push(payment);
  }

  const discount =
    body.discount === undefined ? undefined : toFiniteNumber(body.discount);
  if (discount !== undefined && (discount === null || discount < 0)) {
    return { success: false, error: "discount invalido" };
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const itemDiscountTotal = items.reduce(
    (sum, item) => sum + (item.discount || 0),
    0,
  );
  const totalDiscount = itemDiscountTotal + (discount || 0);
  const orderTotal = subtotal - totalDiscount;
  const splitTotal = transactions.reduce((sum, payment) => sum + payment.amount, 0);

  if (orderTotal < 0) {
    return { success: false, error: "total da OS invalido" };
  }

  if (
    transactions.length > 0 &&
    Math.abs(splitTotal - orderTotal) > 0.01
  ) {
    return { success: false, error: "split de pagamento invalido" };
  }

  if (body.labDeadline !== undefined && !isNonEmptyString(body.labDeadline)) {
    return { success: false, error: "labDeadline invalido" };
  }

  return {
    success: true,
    data: {
      customerId: body.customerId.trim(),
      prescriptionId: isNonEmptyString(body.prescriptionId)
        ? body.prescriptionId.trim()
        : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      labName: typeof body.labName === "string" ? body.labName : undefined,
      labDeadline: isNonEmptyString(body.labDeadline) ? body.labDeadline : undefined,
      discount: discount === undefined ? undefined : discount,
      items,
      transactions,
    },
  };
}
