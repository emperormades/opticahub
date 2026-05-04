import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logChange } from "@/lib/audit";
import { encryptOptionalPii, normalizeCpf, normalizeRg } from "@/lib/pii";
import { requireTenantContext } from "@/lib/session";

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// GET /api/customers - Lista clientes do tenant
export async function GET(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;

  const where = {
    tenantId: context.tenantId,
    isActive: true,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsapp: true,
        addressCity: true,
        addressState: true,
        consentWhatsapp: true,
        createdAt: true,
        prescriptions: {
          where: { isActive: true },
          orderBy: { version: "desc" },
          take: 1,
          select: { id: true, version: true, prescribedAt: true },
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({ customers, total, page, limit });
}

// POST /api/customers - Cria novo cliente
export async function POST(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = toTrimmedString(body.name);

  if (!name) {
    return NextResponse.json({ error: "Nome e obrigatorio" }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: {
      tenantId: context.tenantId,
      name,
      cpf: encryptOptionalPii(body.cpf, normalizeCpf),
      rg: encryptOptionalPii(body.rg, normalizeRg),
      email: toTrimmedString(body.email),
      phone: toTrimmedString(body.phone),
      whatsapp: toTrimmedString(body.whatsapp),
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      gender: body.gender || null,
      addressStreet: toTrimmedString(body.addressStreet),
      addressNumber: toTrimmedString(body.addressNumber),
      addressComp: toTrimmedString(body.addressComp),
      addressNeigh: toTrimmedString(body.addressNeigh),
      addressCity: toTrimmedString(body.addressCity),
      addressState: toTrimmedString(body.addressState),
      addressZip: toTrimmedString(body.addressZip),
      consentEmail: body.consentEmail || false,
      consentSms: body.consentSms || false,
      consentWhatsapp: body.consentWhatsapp || false,
      consentDate:
        body.consentEmail || body.consentSms || body.consentWhatsapp
          ? new Date()
          : null,
      notes: toTrimmedString(body.notes),
    },
  });

  await logChange({
    tenantId: context.tenantId,
    userId: context.userId,
    entityType: "Customer",
    entityId: customer.id,
    action: "CREATE",
    newValue: {
      name: customer.name,
      email: customer.email,
      hasCpf: Boolean(customer.cpf),
    },
  });

  return NextResponse.json(
    {
      ...customer,
      cpf: null,
      rg: null,
    },
    { status: 201 },
  );
}
