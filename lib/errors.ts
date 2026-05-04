/**
 * AppError — Classe de erro padrão do domínio VisionCore OS.
 * Documentação: docs/contracts/ERROR_PATTERNS.md §5
 *
 * Uso:
 *   throw new AppError('Caixa já está aberto', 'CASH_REGISTER_CONFLICT', 409);
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// ---------- Códigos de Erro Padronizados ----------

/** Sessão ausente ou expirada */
export const ERR_UNAUTHORIZED = 'UNAUTHORIZED'; // 401

/** Role insuficiente para a ação */
export const ERR_FORBIDDEN = 'FORBIDDEN'; // 403

/** Registro não encontrado */
export const ERR_NOT_FOUND = 'NOT_FOUND'; // 404

/** Soma dos splits ≠ total da OS */
export const ERR_INVALID_PAYMENT_SPLIT = 'INVALID_PAYMENT_SPLIT'; // 400

/** Total da OS negativo */
export const ERR_INVALID_TOTAL = 'INVALID_TOTAL'; // 400

/** Caixa já aberto / já fechado */
export const ERR_CASH_REGISTER_CONFLICT = 'CASH_REGISTER_CONFLICT'; // 409

/** Estoque ≤ 0 para produto físico */
export const ERR_STOCK_INSUFFICIENT = 'STOCK_INSUFFICIENT'; // 400

/** Cliente com 3+ parcelas em atraso */
export const ERR_CREDIARIO_BLOCKED = 'CREDIARIO_BLOCKED'; // 403

/** Receita com mais de 365 dias */
export const ERR_PRESCRIPTION_EXPIRED = 'PRESCRIPTION_EXPIRED'; // 400

/** Dados obrigatórios para envio ao lab ausentes */
export const ERR_LAB_DATA_INCOMPLETE = 'LAB_DATA_INCOMPLETE'; // 400

/** XML de NF-e inválido, vazio ou inconsistente */
export const ERR_XML_INVALID = 'XML_INVALIDO'; // 400
