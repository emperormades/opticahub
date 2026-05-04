import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptOptionalPii, normalizeCpf } from "@/lib/pii";

function toTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function matchesIdentifier(
  identifier: string,
  order: {
    customer: {
      phone: string | null;
      whatsapp: string | null;
      cpf: string | null;
    } | null;
  },
) {
  const customer = order.customer;
  if (!customer) {
    return false;
  }

  const normalizedInput = normalizeDigits(identifier);
  if (normalizedInput.length < 4) {
    return false;
  }

  const phone = normalizeDigits(customer.phone || "");
  const whatsapp = normalizeDigits(customer.whatsapp || "");
  const cpf = normalizeCpf(decryptOptionalPii(customer.cpf) || "");

  return (
    phone.includes(normalizedInput) ||
    whatsapp.includes(normalizedInput) ||
    cpf.includes(normalizedInput)
  );
}

const PUBLIC_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Pedido recebido",
  VALIDATING: "Validacao tecnica",
  LAB_SENT: "Enviado ao laboratorio",
  IN_PRODUCTION: "Em producao",
  QUALITY_CHECK: "Em conferencia",
  DELIVERY_READY: "Pronto para retirada",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantSlug = toTrimmedString(body.tenantSlug);
    const orderNumber = toTrimmedString(body.orderNumber);
    const identifier = toTrimmedString(body.identifier);

    if (!tenantSlug || !orderNumber || !identifier) {
      return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findFirst({
      where: { slug: tenantSlug, isActive: true },
      select: { id: true, name: true, slug: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Pedido nao encontrado" },
        { status: 404 },
      );
    }

    const order = await prisma.serviceOrder.findFirst({
      where: {
        tenantId: tenant.id,
        orderNumber: { equals: orderNumber, mode: "insensitive" },
      },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            whatsapp: true,
            cpf: true,
          },
        },
        events: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            notes: true,
            createdAt: true,
          },
        },
      },
    });

    if (!order || !matchesIdentifier(identifier, order)) {
      return NextResponse.json(
        { error: "Pedido nao encontrado" },
        { status: 404 },
      );
    }

    const timeline =
      order.events.length > 0
        ? order.events.map((event) => ({
            id: event.id,
            status: event.toStatus,
            label: PUBLIC_STATUS_LABELS[event.toStatus] || event.toStatus,
            notes: event.notes,
            createdAt: event.createdAt,
          }))
        : [
            {
              id: `fallback-${order.id}`,
              status: order.status,
              label: PUBLIC_STATUS_LABELS[order.status] || order.status,
              notes: "Pedido registrado no sistema.",
              createdAt: order.createdAt,
            },
          ];

    return NextResponse.json({
      tenant: { name: tenant.name, slug: tenant.slug },
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        statusLabel: PUBLIC_STATUS_LABELS[order.status] || order.status,
        isPaid: order.isPaid,
        customerName: order.customer?.name || "Cliente",
        labDeadline: order.labDeadline,
        deliveredAt: order.deliveredAt,
        updatedAt: order.updatedAt,
      },
      timeline,
    });
  } catch (error) {
    console.error("[PUBLIC_ORDER_TRACK]", error);
    return NextResponse.json(
      { error: "Erro ao consultar acompanhamento" },
      { status: 500 },
    );
  }
}
