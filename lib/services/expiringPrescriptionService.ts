import { prisma } from "@/lib/db";

export interface ExpiringPrescriptionsQuery {
  status?: "expiring" | "overdue";
  daysAhead?: number;
}

export async function listExpiringPrescriptions(
  tenantId: string,
  query: ExpiringPrescriptionsQuery = {},
) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const daysAhead = Math.min(Math.max(query.daysAhead || 30, 1), 120);
  const futureLimit = new Date(now);
  futureLimit.setDate(futureLimit.getDate() + daysAhead);

  const where =
    query.status === "overdue"
      ? {
          tenantId,
          isActive: true,
          prescriptionExpiresAt: { lt: now },
        }
      : query.status === "expiring"
        ? {
            tenantId,
            isActive: true,
            prescriptionExpiresAt: { gte: now, lte: futureLimit },
          }
        : {
            tenantId,
            isActive: true,
            prescriptionExpiresAt: { lte: futureLimit },
          };

  const customers = await prisma.customer.findMany({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
      whatsapp: true,
      prescriptionExpiresAt: true,
      lifetimeValue: true,
      rfmScore: true,
      prescriptions: {
        where: { isActive: true },
        orderBy: { prescribedAt: "desc" },
        take: 1,
        select: {
          id: true,
          version: true,
          prescribedAt: true,
          prescribedBy: true,
        },
      },
    },
    orderBy: { prescriptionExpiresAt: "asc" },
    take: 200,
  });

  const mapped = customers.map((customer) => {
    const expiresAt = customer.prescriptionExpiresAt;
    const daysUntilExpiry = expiresAt
      ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      prescriptionExpiresAt: expiresAt,
      daysUntilExpiry,
      lifetimeValue: Number(customer.lifetimeValue || 0),
      rfmScore: customer.rfmScore,
      latestPrescription: customer.prescriptions[0] || null,
    };
  });

  return {
    summary: {
      total: mapped.length,
      overdue: mapped.filter((customer) => (customer.daysUntilExpiry ?? 1) < 0).length,
      dueToday: mapped.filter((customer) => customer.daysUntilExpiry === 0).length,
      next7Days: mapped.filter(
        (customer) =>
          customer.daysUntilExpiry !== null &&
          customer.daysUntilExpiry >= 1 &&
          customer.daysUntilExpiry <= 7,
      ).length,
      next30Days: mapped.filter(
        (customer) =>
          customer.daysUntilExpiry !== null &&
          customer.daysUntilExpiry >= 1 &&
          customer.daysUntilExpiry <= 30,
      ).length,
    },
    customers: mapped,
  };
}
