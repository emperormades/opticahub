import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/session";

// GET /api/notifications
// Retorna contadores de alertas para o widget do header
export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      overdueInstallments,
      pendingApprovals,
      zeroStock,
      labOverdue,
      openOrders,
    ] = await Promise.all([
      prisma.installment.count({
        where: {
          tenantId: context.tenantId,
          isPaid: false,
          dueDate: { lt: today },
        },
      }),
      prisma.agentTask.count({
        where: {
          tenantId: context.tenantId,
          type: "DISCOUNT_APPROVAL",
          status: "PENDING",
        },
      }),
      prisma.stockItem.count({
        where: { tenantId: context.tenantId, quantity: { lte: 0 } },
      }),
      prisma.serviceOrder.count({
        where: {
          tenantId: context.tenantId,
          status: "LAB_SENT",
          labSentAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.serviceOrder.count({
        where: {
          tenantId: context.tenantId,
          status: { notIn: ["DELIVERED", "CANCELLED"] },
          isArchived: false,
        },
      }),
    ]);

    const total = overdueInstallments + pendingApprovals;
    const hasAlerts = total > 0 || zeroStock > 0 || labOverdue > 0;

    return NextResponse.json({
      total,
      hasAlerts,
      items: [
        {
          id: "overdue_installments",
          label: "Carnes Vencidos",
          count: overdueInstallments,
          icon: "💳",
          severity:
            overdueInstallments > 5
              ? "error"
              : overdueInstallments > 0
                ? "warning"
                : "ok",
          href: "/dashboard/financeiro/inadimplentes",
        },
        {
          id: "pending_approvals",
          label: "Aprovacoes Pendentes",
          count: pendingApprovals,
          icon: "🔐",
          severity: pendingApprovals > 0 ? "warning" : "ok",
          href: "/dashboard/agentes",
        },
        {
          id: "zero_stock",
          label: "Produtos Zerados",
          count: zeroStock,
          icon: "📦",
          severity: zeroStock > 3 ? "error" : zeroStock > 0 ? "warning" : "ok",
          href: "/dashboard/estoque?filter=low",
        },
        {
          id: "lab_overdue",
          label: "Labs Atrasados (+7d)",
          count: labOverdue,
          icon: "🔬",
          severity: labOverdue > 0 ? "warning" : "ok",
          href: "/dashboard/ordens?status=LAB_SENT",
        },
      ],
      stats: { openOrders },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
