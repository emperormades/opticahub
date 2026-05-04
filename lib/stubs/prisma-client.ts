/**
 * Stub tipado para substituir @prisma/client (modo offline — sem banco real).
 * Mantém enums e tipos usados pelo domínio para o projeto compilar sem Prisma.
 */

export enum PlanTier {
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum Gender {
  MASCULINO = 'MASCULINO',
  FEMININO = 'FEMININO',
  OUTRO = 'OUTRO',
  NAO_INFORMADO = 'NAO_INFORMADO',
}

export enum ProductType {
  LENTES = 'LENTES',
  ARMACOES = 'ARMACOES',
  ACESSORIOS = 'ACESSORIOS',
  SERVICOS = 'SERVICOS',
}

export enum LensIndex {
  IDX_150 = 'IDX_150',
  IDX_156 = 'IDX_156',
  IDX_160 = 'IDX_160',
  IDX_167 = 'IDX_167',
  IDX_174 = 'IDX_174',
}

export enum LensMaterial {
  RESINA = 'RESINA',
  POLICARBONATO = 'POLICARBONATO',
  TRIVEX = 'TRIVEX',
  MINERAL = 'MINERAL',
}

export enum LensTreatment {
  NENHUM = 'NENHUM',
  AR = 'AR',
  BLUE = 'BLUE',
  FOTOCROMICO = 'FOTOCROMICO',
  AR_BLUE = 'AR_BLUE',
  AR_FOTOCROMICO = 'AR_FOTOCROMICO',
}

export enum LensDesign {
  VISAO_SIMPLES = 'VISAO_SIMPLES',
  BIFOCAL = 'BIFOCAL',
  PROGRESSIVA = 'PROGRESSIVA',
  OCUPACIONAL = 'OCUPACIONAL',
}

export enum OSStatus {
  DRAFT = 'DRAFT',
  VALIDATING = 'VALIDATING',
  LAB_SENT = 'LAB_SENT',
  IN_PRODUCTION = 'IN_PRODUCTION',
  QUALITY_CHECK = 'QUALITY_CHECK',
  DELIVERY_READY = 'DELIVERY_READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum ReworkCause {
  VENDA = 'VENDA',
  MEDICAO = 'MEDICAO',
  LABORATORIO = 'LABORATORIO',
  MEDICO = 'MEDICO',
}

export enum PaymentMethod {
  DINHEIRO = 'DINHEIRO',
  PIX = 'PIX',
  CARTAO_DEBITO = 'CARTAO_DEBITO',
  CARTAO_CREDITO = 'CARTAO_CREDITO',
  BOLETO = 'BOLETO',
  CREDIARIO = 'CREDIARIO',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

export enum TransactionType {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA',
}

export enum AgentType {
  CLOSER = 'CLOSER',
  CARETAKER = 'CARETAKER',
  COLLECTOR = 'COLLECTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  CONTROLLER = 'CONTROLLER',
  CUSTOM = 'CUSTOM',
}

export enum AgentStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CONFIGURING = 'CONFIGURING',
  ERROR = 'ERROR',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

/** Tipos de modelo — amplos para modo offline */
export type Product = Record<string, any>
export type ServiceOrder = Record<string, any>
export type Customer = Record<string, any>
export type User = Record<string, any>
export type Tenant = Record<string, any>

export interface PrismaClient {
  $disconnect(): Promise<void>
  $transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T>
  $on(...args: unknown[]): void
}

export namespace Prisma {
  export type JsonValue =
    | string
    | number
    | boolean
    | null
    | { [key: string]: JsonValue | undefined }
    | JsonValue[]

  export type JsonObject = Record<string, JsonValue>

  export type InputJsonValue = JsonValue

  export class Decimal {
    constructor(public readonly value: unknown = 0) {}
    toString(): string {
      return String(this.value)
    }
    toNumber(): number {
      const n = Number(this.value)
      return Number.isFinite(n) ? n : 0
    }
  }

  export type TransactionWhereInput = Record<string, unknown>
  export type ProductWhereInput = Record<string, unknown>
  export type ServiceOrderWhereInput = Record<string, unknown>
  export type ServiceOrderUpdateInput = Record<string, unknown>
  export type LabInvoiceWhereInput = Record<string, unknown>
  export type InstallmentWhereInput = Record<string, unknown>
  export type ServiceOrderItemCreateManyInput = Record<string, unknown>
  export type LabInvoiceItemCreateManyInput = Record<string, unknown>
  export type InstallmentCreateManyInput = Record<string, unknown>
  export type ServiceOrderGetPayload<_Arg = unknown> = ServiceOrder

  export type TransactionClient = PrismaClient
}

function createOfflinePrismaDelegate(): PrismaClient {
  const noopNull = async (): Promise<any | null> => null
  const noopArr = async (): Promise<any[]> => []
  const noopZero = async (): Promise<number> => 0
  const noopAgg = async () => ({
    _sum: {},
    _avg: {},
    _min: {},
    _max: {},
    _count: { _all: 0 },
  })
  const noopCreate = async (): Promise<any> => ({ id: 'offline-stub' })

  const base = {
    findMany: noopArr,
    findFirst: noopNull,
    findUnique: noopNull,
    create: noopCreate,
    createMany: async () => ({ count: 0 }),
    update: noopCreate,
    updateMany: async () => ({ count: 0 }),
    upsert: noopCreate,
    delete: noopCreate,
    deleteMany: async () => ({ count: 0 }),
    count: noopZero,
    aggregate: noopAgg,
    groupBy: noopArr,
  }

  function modelDelegate(): unknown {
    return new Proxy(base, {
      get(target, prop: string | symbol) {
        const p = String(prop)
        if (p in target) return Reflect.get(target, p)
        return async () => null
      },
    })
  }

  const models = new Map<string, unknown>()
  const getModel = (name: string) => {
    if (!models.has(name)) models.set(name, modelDelegate())
    return models.get(name)
  }

  return new Proxy({} as PrismaClient, {
    get(_, prop: string | symbol) {
      const p = String(prop)
      if (p === '$disconnect') return async () => {}
      if (p === '$on') return () => {}
      if (p === '$transaction') {
        return async <T>(fn: (tx: PrismaClient) => Promise<T>) =>
          fn(createOfflinePrismaDelegate())
      }
      if (p.startsWith('$')) return async () => undefined
      return getModel(p)
    },
  })
}

export const prismaOfflineSingleton = createOfflinePrismaDelegate()
