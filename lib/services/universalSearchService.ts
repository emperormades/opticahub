import { prisma } from "@/lib/db";
import { decryptOptionalPii, normalizeCpf } from "@/lib/pii";
import { UniversalSearchQuery } from "@/lib/validation/searchPayload";

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export async function runUniversalSearch(
  tenantId: string,
  query: UniversalSearchQuery,
) {
  const normalizedDigits = normalizeDigits(query.q);

  const [orders, customers, cpfCandidates, products] = await Promise.all([
    prisma.serviceOrder.findMany({
      where: {
        tenantId,
        OR: [
          { orderNumber: { contains: query.q, mode: "insensitive" } },
          { customer: { name: { contains: query.q, mode: "insensitive" } } },
          ...(normalizedDigits
            ? [
                { customer: { phone: { contains: normalizedDigits } } },
                { customer: { whatsapp: { contains: normalizedDigits } } },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        isPaid: true,
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            whatsapp: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: query.limit,
    }),
    prisma.customer.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { name: { contains: query.q, mode: "insensitive" } },
          { email: { contains: query.q, mode: "insensitive" } },
          ...(normalizedDigits
            ? [
                { phone: { contains: normalizedDigits } },
                { whatsapp: { contains: normalizedDigits } },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsapp: true,
      },
      orderBy: { createdAt: "desc" },
      take: query.limit,
    }),
    normalizedDigits.length >= 4
      ? prisma.customer.findMany({
          where: {
            tenantId,
            isActive: true,
            cpf: { not: null },
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            whatsapp: true,
            cpf: true,
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      : Promise.resolve([]),
    prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        isArchived: false,
        OR: [
          { name: { contains: query.q, mode: "insensitive" } },
          { sku: { contains: query.q, mode: "insensitive" } },
          { barcode: { contains: query.q, mode: "insensitive" } },
          { supplierCode: { contains: query.q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        salePrice: true,
        category: { select: { type: true } },
        stockItems: {
          where: { tenantId },
          select: { quantity: true },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
      take: query.limit,
    }),
  ]);

  const customerMap = new Map<
    string,
    {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      whatsapp: string | null;
      matchedByCpf: boolean;
    }
  >();

  for (const customer of customers) {
    customerMap.set(customer.id, {
      ...customer,
      matchedByCpf: false,
    });
  }

  if (normalizedDigits.length >= 4) {
    for (const customer of cpfCandidates) {
      const decryptedCpf = decryptOptionalPii(customer.cpf);
      if (!decryptedCpf) continue;

      if (normalizeCpf(decryptedCpf).includes(normalizedDigits)) {
        customerMap.set(customer.id, {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          whatsapp: customer.whatsapp,
          matchedByCpf: true,
        });
      }
    }
  }

  return {
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: Number(order.total),
      isPaid: order.isPaid,
      customer: order.customer,
    })),
    customers: Array.from(customerMap.values()).slice(0, query.limit),
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      salePrice: Number(product.salePrice),
      itemType: product.category.type,
      stock: product.stockItems[0]?.quantity ?? 0,
    })),
  };
}
