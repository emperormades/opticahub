import { prisma } from "../db";
import {
  calculateMinDiameter,
  simulateEdgeThickness,
  checkBaseCurveConflict,
  checkMaterialCompatibility,
} from "../optical/calculations";

const INDEX_MAP: Record<string, number> = {
  IDX_150: 1.5,
  IDX_156: 1.56,
  IDX_160: 1.6,
  IDX_167: 1.67,
  IDX_174: 1.74,
};

export interface OpticalValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class OpticalEngine {
  /**
   * Validacao tecnica completa de uma Ordem de Servico.
   * Retorna erros impeditivos e avisos de atencao.
   */
  static async validateServiceOrder(
    orderId: string,
    tenantId?: string,
  ): Promise<OpticalValidationResult> {
    const order = await prisma.serviceOrder.findFirst({
      where: {
        id: orderId,
        ...(tenantId ? { tenantId } : {}),
      },
      include: {
        prescription: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return { valid: false, errors: ["OS nao encontrada"], warnings: [] };
    }

    const rx = order.prescription;
    if (!rx) {
      return {
        valid: true,
        errors: [],
        warnings: [
          "OS sem receita tecnica vinculada. Recomenda-se anexar para validacao de montagem.",
        ],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    const frameItem = order.items.find((item) => item.itemType === "ARMACOES");
    const lensItem = order.items.find((item) => item.itemType === "LENTES");

    if (frameItem?.product && lensItem?.product) {
      const frame = frameItem.product;
      const lens = lensItem.product;

      if (frame.frameDma && frame.frameBridge && rx.odDnpMono && rx.oeDnpMono) {
        const aro = Number(frame.frameSize?.split("-")[0]) || 50;

        const res = calculateMinDiameter({
          dma: Number(frame.frameDma),
          aro,
          ponte: Number(frame.frameBridge),
          dnpOd: Number(rx.odDnpMono),
          dnpOe: Number(rx.oeDnpMono),
        });

        const nominalDiameter = 70;
        if (res.diameterMin > nominalDiameter) {
          errors.push(
            `Erro de Montagem: A armacao exige um diametro minimo de ${res.diameterMin}mm, mas a lente padrao possui O${nominalDiameter}mm. Risco de "buraco" no canto da armacao.`,
          );
        }
      }

      if (rx.odSphere && Number(rx.odSphere) <= -3) {
        const indexValue = lens.lensIndex
          ? (INDEX_MAP[lens.lensIndex] ?? 1.5)
          : 1.5;

        const thick = simulateEdgeThickness({
          sphere: Number(rx.odSphere),
          index: indexValue,
          diameter: 70,
        });

        if (thick.recommendEdgeThickening) {
          warnings.push(
            `Atencao Estetica: Borda estimada em ${thick.estimatedThickness}mm. Com indice ${indexValue.toFixed(2)}, a lente pode ficar muito grossa para esta armacao.`,
          );
        }
      }

      if (lens.lensBaseCurve) {
        const isCurved = Number(rx.wrapAngle || 0) > 10;
        const baseRes = checkBaseCurveConflict(
          isCurved,
          Number(lens.lensBaseCurve),
        );
        if (baseRes.hasConflict && baseRes.warning) {
          warnings.push(baseRes.warning);
        }
      }

      const frameMountType = frame.frameMaterial?.toUpperCase() || null;
      if (
        lens.lensIndex &&
        frameMountType &&
        ["FECHADA", "NYLON", "PARAFUSADA"].includes(frameMountType)
      ) {
        const matRes = checkMaterialCompatibility(
          frameMountType,
          lens.lensIndex,
        );
        if (!matRes.isCompatible && matRes.error) {
          errors.push(matRes.error);
        }
      }

      const lensName = lens.name?.toLowerCase() || "";
      const isProgressive =
        lensName.includes("multifocal") || lensName.includes("progressive");

      if (isProgressive) {
        if (!rx.mountingHeight) {
          errors.push(
            "Lente progressiva exige altura de montagem registrada na receita antes da liberacao tecnica.",
          );
        } else {
          warnings.push(
            "Altura de montagem informada, mas a validacao automatica final depende da medida vertical da armacao, ainda indisponivel no cadastro atual.",
          );
        }
      }
    } else {
      if (!frameItem) warnings.push("Nenhuma armacao identificada nesta OS.");
      if (!lensItem) warnings.push("Nenhuma lente identificada nesta OS.");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Registra o resultado da auditoria tecnica como um evento na OS.
   */
  static async auditAndLog(orderId: string, tenantId: string, userId?: string) {
    const result = await this.validateServiceOrder(orderId, tenantId);

    const note = result.valid
      ? "Aprovada na auditoria tecnica para montagem."
      : `Bloqueada na auditoria tecnica. ${result.errors.join(" ")}`;

    await prisma.serviceOrderEvent.create({
      data: {
        orderId,
        tenantId,
        userId: userId || null,
        fromStatus: null,
        toStatus: "VALIDATING",
        notes: note,
        metadata: {
          valid: result.valid,
          errors: result.errors,
          warnings: result.warnings,
          auditedAt: new Date().toISOString(),
        },
      },
    });

    return result;
  }
}
