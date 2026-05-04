import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logChange } from "@/lib/audit";
import { requireTenantContext } from "@/lib/session";

// POST /api/customers/[id]/prescriptions - Adiciona nova receita ao prontuario
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireTenantContext();
    const { id } = await params;
    const body = await req.json();

    const customer = await prisma.customer.findFirst({
      where: { id, tenantId: context.tenantId },
    });

    if (!customer)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const lastPrescription = await prisma.prescription.findFirst({
      where: { customerId: id },
      orderBy: { version: "desc" },
    });
    const nextVersion = (lastPrescription?.version ?? 0) + 1;

    const prescribedAt = body.prescribedAt
      ? new Date(body.prescribedAt)
      : new Date();
    const prescriptionExpiresAt = new Date(prescribedAt);
    prescriptionExpiresAt.setDate(prescriptionExpiresAt.getDate() + 365);

    const prescription = await prisma.$transaction(async (tx) => {
      const created = await tx.prescription.create({
        data: {
          customerId: id,
          tenantId: context.tenantId,
          version: nextVersion,
          prescribedAt,
          prescribedBy: body.prescribedBy || null,
          crm: body.crm || null,
          odSphere: body.odSphere ?? null,
          odCylinder: body.odCylinder ?? null,
          odAxis: body.odAxis ?? null,
          odAddition: body.odAddition ?? null,
          odPrism: body.odPrism ?? null,
          odPrismBase: body.odPrismBase || null,
          odDnpMono: body.odDnpMono ?? null,
          oeSphere: body.oeSphere ?? null,
          oeCylinder: body.oeCylinder ?? null,
          oeAxis: body.oeAxis ?? null,
          oeAddition: body.oeAddition ?? null,
          oePrism: body.oePrism ?? null,
          oePrismBase: body.oePrismBase || null,
          oeDnpMono: body.oeDnpMono ?? null,
          dnpBinocular: body.dnpBinocular ?? null,
          mountingHeight: body.mountingHeight ?? null,
          pantoscopic: body.pantoscopic ?? null,
          wrapAngle: body.wrapAngle ?? null,
          notes: body.notes || null,
        },
      });

      await tx.customer.update({
        where: { id },
        data: {
          prescriptionExpiresAt,
        },
      });

      return created;
    });

    await logChange({
      tenantId: context.tenantId,
      userId: context.userId,
      entityType: "Prescription",
      entityId: prescription.id,
      action: "CREATE",
      newValue: { customerId: id, version: nextVersion },
    });

    return NextResponse.json(prescription, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
