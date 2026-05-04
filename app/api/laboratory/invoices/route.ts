import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { LaboratoryAuditService, InvoicePayload } from "@/lib/optical/audit";
import { requireTenantContext } from "@/lib/session";

type InvoiceItemInput = {
  orderNumber?: string;
  description?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  totalPrice?: number | string;
};

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: Prisma.LabInvoiceWhereInput = { tenantId: context.tenantId };
    if (status) where.status = status;

    const invoices = await prisma.labInvoice.findMany({
      where,
      orderBy: { issueDate: "desc" },
      include: {
        items: {
          include: {
            linkedOrder: {
              select: {
                orderNumber: true,
                labCost: true,
                reworkCount: true,
                reworkCause: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ invoices });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext();
    const body = await req.json();
    const bodyItems = Array.isArray(body.items)
      ? (body.items as InvoiceItemInput[])
      : [];

    const payload: InvoicePayload = {
      tenantId: context.tenantId,
      xmlKey: body.xmlKey,
      invoiceNumber: body.invoiceNumber || `NF-${Date.now()}`,
      labName: body.labName || "Laboratorio Generico",
      issueDate: new Date(body.issueDate || Date.now()),
      totalAmount: Number(body.totalAmount),
      items: bodyItems.map((item) => ({
        orderNumber:
          typeof item.orderNumber === "string" ? item.orderNumber : "",
        description:
          typeof item.description === "string" ? item.description : "",
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    };

    const invoiceId = await LaboratoryAuditService.processInvoice(payload);
    return NextResponse.json({ success: true, invoiceId });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar fatura do laboratorio",
      },
      { status: 400 },
    );
  }
}
