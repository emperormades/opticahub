import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  calculateMinDiameter,
  simulateEdgeThickness,
  checkBaseCurveConflict,
} from "@/lib/optical/calculations";
import { requireTenantContext } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext();
    const body = await req.json();

    const {
      prescriptionId,
      dma,
      aro,
      ponte,
      lensIndex,
      lensBaseCurve,
      isFrameCurved,
    } = body;

    if (!prescriptionId || !dma || !aro || !ponte) {
      return NextResponse.json(
        {
          error: "Faltam dados da Armacao ou Receita para a validacao optica.",
        },
        { status: 400 },
      );
    }

    const rx = await prisma.prescription.findFirst({
      where: { id: prescriptionId, tenantId: context.tenantId },
    });

    if (!rx) {
      return NextResponse.json(
        { error: "Receita nao encontrada" },
        { status: 404 },
      );
    }

    const dnpOd = rx.odDnpMono || 30;
    const dnpOe = rx.oeDnpMono || 30;

    const diameterCalc = calculateMinDiameter({
      dma: parseFloat(dma),
      aro: parseFloat(aro),
      ponte: parseFloat(ponte),
      dnpOd: Number(dnpOd),
      dnpOe: Number(dnpOe),
    });

    const worstSphere = Math.min(
      Number(rx.odSphere || 0),
      Number(rx.oeSphere || 0),
    );

    let thicknessCalc = null;
    if (lensIndex) {
      thicknessCalc = simulateEdgeThickness({
        sphere: worstSphere,
        index: parseFloat(lensIndex),
        diameter: diameterCalc.diameterMin,
      });
    }

    let curveWarning = null;
    if (lensBaseCurve && isFrameCurved !== undefined) {
      const conflict = checkBaseCurveConflict(
        Boolean(isFrameCurved),
        parseFloat(lensBaseCurve),
      );
      if (conflict.hasConflict) {
        curveWarning = conflict.warning;
      }
    }

    return NextResponse.json({
      ok: true,
      diameterCalc,
      thicknessCalc,
      curveWarning,
      message: "Validacao optica finalizada.",
    });
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
