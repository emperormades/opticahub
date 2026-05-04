export interface DiameterParams {
  dma: number; // Diagonal Maior (mm)
  aro: number; // Tamanho do Aro (mm)
  ponte: number; // Tamanho da Ponte (mm)
  dnpOd: number; // DNP Olho Direito (mm)
  dnpOe: number; // DNP Olho Esquerdo (mm)
}

/**
 * Calculadora de Diâmetro Mínimo Útil (Ømin)
 * Cruza DNP, DMA e os eixos da armação para evitar blocos curtos.
 */
export function calculateMinDiameter(params: DiameterParams): {
  diameterMin: number;
  dpa: number;
  decentration: number;
} {
  const { dma, aro, ponte, dnpOd, dnpOe } = params;

  // DPA = Distância Pupilar da Armação
  const dpa = aro + ponte;
  const dnpTotal = dnpOd + dnpOe;

  // Descentração total = A diferença entre os centros ópticos da armação e os olhos do cliente
  const decentration = Math.abs(dpa - dnpTotal);

  // Ømin = Diagonal Maior + Descentração + 2mm (Margem de segurança para o corte)
  const diameterMin = dma + decentration + 2;

  return {
    diameterMin: Math.ceil(diameterMin), // Arredonda para cima
    dpa,
    decentration,
  };
}

/**
 * Simulador de Espessura de Borda (Aproximação Simples)
 * Ideal para lentes míopes (esférico negativo).
 * Retorna uma flag se recomenda o serviço de rebaixamento de borda.
 */
export interface ThicknessParams {
  sphere: number; // Grau Esférico (ex: -4.00)
  index: number; // Índice de Refração (ex: 1.50, 1.67)
  diameter: number; // Diâmetro do bloco selecionado ou Ømin
}

export function simulateEdgeThickness(params: ThicknessParams): {
  estimatedThickness: number;
  recommendEdgeThickening: boolean;
} {
  const { sphere, index, diameter } = params;

  // Apenas cálculo simples para lentes negativas
  if (sphere >= 0) {
    return { estimatedThickness: 2.0, recommendEdgeThickening: false };
  }

  // Fórmula Sagita simplificada: Espessura Borda ≈ Centro + (Diâmetro / 2)^2 * (|Grau| / (2000 * (Índice - 1)))
  // Aproximação genérica para fins acadêmicos/BI.
  const centerThickness = 1.2; // mm típicos para lentes SR
  const radius = diameter / 2;

  // Poder real = dioptria
  const sagitta = (radius * radius * Math.abs(sphere)) / (2000 * (index - 1));
  const estimatedThickness = centerThickness + sagitta * 10; // Ajuste escalar para mm reais na borda

  return {
    estimatedThickness: parseFloat(estimatedThickness.toFixed(1)),
    recommendEdgeThickening: estimatedThickness >= 6.0,
  };
}

/**
 * Alerta de Conflito Base vs. Armação
 */
export function checkBaseCurveConflict(
  isFrameCurved: boolean, // Ex: Óculos Esportivo
  lensBaseCurve: number, // Ex: 3.0 (Reta)
): { hasConflict: boolean; warning: string | null } {
  // Se a armação é curva e a lente sugerida tiver base reta (menor que 6)
  if (isFrameCurved && lensBaseCurve < 6.0) {
    return {
      hasConflict: true,
      warning:
        'Risco de Montagem Ruim: Armação curva exige lente de Base acentuada (≥ 6.0). A lente atual pode "achatar" a armação ou soltar.',
    };
  }

  return { hasConflict: false, warning: null };
}

/**
 * Validação de Altura de Montagem Mínima
 * Essencial para lentes progressivas / multifocais.
 * Compara a altura requisitada pelo desenho com a altura vertical da armação.
 */
export function validateFittingHeight(
  frameVerticalSize: number, // Altura vertical máxima da armação em mm
  pupilHeight: number, // Altura do centro pupilar medido em relação à base inferior da armação (DNP vertical)
  lensMinHeight: number, // Altura mínima exigida pelo desenho da lente progressiva (ex: 14mm para corredor curto, 18mm normal)
): { isValid: boolean; error: string | null } {
  // A medida "Coba" (Centro ótico base) ou altura pupilar dita quanto espaço tem para a área de leitura.
  if (pupilHeight < lensMinHeight) {
    return {
      isValid: false,
      error: `Erro de Altura: O corredor desta lente requer no mínimo ${lensMinHeight}mm. A altura medida foi de apenas ${pupilHeight}mm, o que cortará a área de visão de perto.`,
    };
  }

  // Mesmo que a altura pupilar atenda, garantir que o estojo (armação) tenha espaço suficiente acima (visão de longe)
  const upperSpace = frameVerticalSize - pupilHeight;
  if (upperSpace < 10) {
    // Tolerância genérica de 10mm para a visão de longe
    return {
      isValid: false,
      error: `Erro de Altura: A armação tem apenas ${frameVerticalSize}mm de altura total. Montar uma altura pupilar de ${pupilHeight}mm deixará apenas ${upperSpace}mm para a visão de longe, comprometendo o uso.`,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validação de Compatibilidade entre Armação e Material da Lente
 * Ex: Não pode montar CR-39 / Resina 1.50 em Parafusos (Balgriff) ou Fio de Nylon - Risco de trincar.
 */
export function checkMaterialCompatibility(
  frameType: string, // 'FECHADA', 'NYLON' (Meio Aro), 'PARAFUSADA' (Balgriff/3 Peças)
  lensIndex: string, // 'IDX_150', 'IDX_159' (Poly), 'IDX_153' (Trivex), 'IDX_167', etc
): { isCompatible: boolean; error: string | null } {
  const isFragileMaterial = ["IDX_150", "IDX_156"].includes(lensIndex);
  const isExposedFrame = ["NYLON", "PARAFUSADA"].includes(frameType);

  if (isFragileMaterial && isExposedFrame) {
    return {
      isCompatible: false,
      error: `Incompatibilidade de Material: Montar lentes de índice Básico (1.50/1.56) em armações "${frameType}" apresenta alto risco de trinca/quebra. Recomenda-se Policarbonato (1.59) ou Trivex.`,
    };
  }

  return { isCompatible: true, error: null };
}
