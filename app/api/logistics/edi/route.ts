import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/session";

function parseOrderIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const ids = value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
  if (ids.length !== value.length) {
    return null;
  }

  return Array.from(new Set(ids));
}

export async function POST(req: NextRequest) {
  let context;

  try {
    context = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const orderIds = parseOrderIds(body?.orderIds);

  if (!orderIds) {
    return NextResponse.json(
      { error: "Nenhuma OS valida foi enviada para EDI." },
      { status: 400 },
    );
  }

  const orders = await prisma.serviceOrder.findMany({
    where: {
      tenantId: context.tenantId,
      id: { in: orderIds },
    },
    select: {
      id: true,
      orderNumber: true,
      prescription: {
        select: {
          odSphere: true,
          odCylinder: true,
          odAxis: true,
          odAddition: true,
          mountingHeight: true,
        },
      },
    },
  });

  if (orders.length !== orderIds.length) {
    return NextResponse.json(
      { error: "Uma ou mais OS nao pertencem ao tenant ou nao existem." },
      { status: 404 },
    );
  }

  const firstOrder = orders[0];
  const prescription = firstOrder.prescription;

  const sph = Number(prescription?.odSphere || -2.5).toFixed(2);
  const cyl = Number(prescription?.odCylinder || -1).toFixed(2);
  const axis = Math.max(0, Math.min(180, Number(prescription?.odAxis || 180)));
  const addition = Number(prescription?.odAddition || 1.5).toFixed(2);
  const centerThickness = Number(prescription?.mountingHeight || 1.8).toFixed(
    1,
  );

  const vcaContent = [
    "REQ=JOB",
    `JOB=${firstOrder.orderNumber}`,
    `SPH=${sph}`,
    `CYL=${cyl}`,
    `AX=${axis}`,
    `ADD=${addition}`,
    "DBL=16",
    "HBOX=52",
    "VBOX=36",
    `CTHICK=${centerThickness}`,
    "FCRV=4.25",
    "BND=1",
    "LIND=1.59",
    "RIND=1.59",
    "FTYPE=2",
    "CRC=1",
    "END=JOB",
  ].join("\n");

  return NextResponse.json({
    success: true,
    message: `Gerado payload VCA (OMA Standard) para ${orders.length} OS(s).`,
    orderNumbers: orders.map((order) => order.orderNumber),
    payload: vcaContent,
    dispatchedAt: new Date().toISOString(),
  });
}
