import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logChange } from "@/lib/audit";
import {
  decryptOptionalPii,
  encryptOptionalPii,
  normalizeCpf,
  normalizeRg,
} from "@/lib/pii";
import { requireTenantContext } from "@/lib/session";

function toTrimmedNullableString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// GET /api/customers/[id] - Detalhes do cliente com prontuario completo
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: context.tenantId },
    include: {
      prescriptions: {
        orderBy: { version: "desc" },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          isPaid: true,
          createdAt: true,
        },
      },
    },
  });

  if (!customer)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allOrders = await prisma.serviceOrder.findMany({
    where: {
      tenantId: context.tenantId,
      customerId: customer.id,
      status: { notIn: ["CANCELLED"] },
    },
    select: { total: true, createdAt: true },
  });

  const lifetimeValue = allOrders.reduce(
    (acc, curr) => acc + Number(curr.total),
    0,
  );
  const totalOrders = allOrders.length;

  let rfmScore = "NOVO_CLIENTE";
  if (totalOrders > 0) {
    const lastOrder = allOrders.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )[0];
    const daysSinceLastOrder =
      (Date.now() - lastOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastOrder <= 90 && totalOrders > 1) rfmScore = "CAMPIAO";
    else if (daysSinceLastOrder > 180) rfmScore = "PERDIDO";
    else if (daysSinceLastOrder > 90) rfmScore = "EM_RISCO";
    else rfmScore = "REGULAR";
  }

  return NextResponse.json({
    ...customer,
    cpf: decryptOptionalPii(customer.cpf),
    rg: decryptOptionalPii(customer.rg),
    lifetimeValue,
    totalOrders,
    rfmScore,
  });
}

// PATCH /api/customers/[id] - Atualiza dados do cliente
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const rawName = toTrimmedNullableString(body.name);
  const name = rawName === null ? undefined : rawName;
  const email = toTrimmedNullableString(body.email);
  const phone = toTrimmedNullableString(body.phone);
  const whatsapp = toTrimmedNullableString(body.whatsapp);
  const addressStreet = toTrimmedNullableString(body.addressStreet);
  const addressNumber = toTrimmedNullableString(body.addressNumber);
  const addressComp = toTrimmedNullableString(body.addressComp);
  const addressNeigh = toTrimmedNullableString(body.addressNeigh);
  const addressCity = toTrimmedNullableString(body.addressCity);
  const addressState = toTrimmedNullableString(body.addressState);
  const addressZip = toTrimmedNullableString(body.addressZip);
  const notes = toTrimmedNullableString(body.notes);

  const existing = await prisma.customer.findFirst({
    where: { id, tenantId: context.tenantId },
  });
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.name !== undefined && !name) {
    return NextResponse.json({ error: "Nome invalido" }, { status: 400 });
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "cpf")
        ? { cpf: encryptOptionalPii(body.cpf, normalizeCpf) }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "rg")
        ? { rg: encryptOptionalPii(body.rg, normalizeRg) }
        : {}),
      ...(email !== undefined ? { email } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(whatsapp !== undefined ? { whatsapp } : {}),
      ...(typeof body.birthDate === "string"
        ? { birthDate: body.birthDate ? new Date(body.birthDate) : null }
        : body.birthDate === null
          ? { birthDate: null }
          : {}),
      ...(typeof body.gender === "string" || body.gender === null
        ? { gender: body.gender }
        : {}),
      ...(addressStreet !== undefined ? { addressStreet } : {}),
      ...(addressNumber !== undefined ? { addressNumber } : {}),
      ...(addressComp !== undefined ? { addressComp } : {}),
      ...(addressNeigh !== undefined ? { addressNeigh } : {}),
      ...(addressCity !== undefined ? { addressCity } : {}),
      ...(addressState !== undefined ? { addressState } : {}),
      ...(addressZip !== undefined ? { addressZip } : {}),
      ...(typeof body.consentEmail === "boolean"
        ? { consentEmail: body.consentEmail }
        : {}),
      ...(typeof body.consentSms === "boolean"
        ? { consentSms: body.consentSms }
        : {}),
      ...(typeof body.consentWhatsapp === "boolean"
        ? { consentWhatsapp: body.consentWhatsapp }
        : {}),
      ...(notes !== undefined ? { notes } : {}),
      updatedAt: new Date(),
    },
  });

  await logChange({
    tenantId: context.tenantId,
    userId: context.userId,
    entityType: "Customer",
    entityId: id,
    action: "UPDATE",
    oldValue: {
      name: existing.name,
      email: existing.email,
      hasCpf: Boolean(existing.cpf),
    },
    newValue: {
      name: updated.name,
      email: updated.email,
      hasCpf: Boolean(updated.cpf),
    },
  });

  return NextResponse.json({
    ...updated,
    cpf: decryptOptionalPii(updated.cpf),
    rg: decryptOptionalPii(updated.rg),
  });
}
