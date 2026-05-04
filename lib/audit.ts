/**
 * Audit Trail — Registro imutável de todas as alterações do sistema.
 * Garante rastreabilidade total para conformidade LGPD e auditoria interna.
 */

import type { Prisma, PrismaClient } from '@prisma/client'

interface LogChangeParams {
    tenantId: string
    userId?: string
    entityType: string
    entityId: string
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTOCK_NFE'
    field?: string
    oldValue?: unknown
    newValue?: unknown
    reason?: string
    ipAddress?: string
    db?: PrismaClient
}

export async function logChange(params: LogChangeParams): Promise<void> {
    try {
        const { prisma } = await import('./db')
        const db = params.db ?? prisma

        await db.auditLog.create({
            data: {
                tenantId: params.tenantId,
                userId: params.userId,
                entityType: params.entityType,
                entityId: params.entityId,
                action: params.action,
                field: params.field,
                oldValue: params.oldValue !== undefined ? JSON.stringify(params.oldValue) : null,
                newValue: params.newValue !== undefined ? JSON.stringify(params.newValue) : null,
                reason: params.reason,
                ipAddress: params.ipAddress,
            },
        })
    } catch (error) {
        // Audit Trail nunca deve quebrar a operação principal
        // Em produção, enviar para um sistema de alertas (Sentry, etc.)
        console.error('[AuditTrail] Failed to log change:', error)
    }
}

export async function getEntityHistory(
    tenantId: string,
    entityType: string,
    entityId: string
) {
    const { prisma } = await import('./db')
    return prisma.auditLog.findMany({
        where: { tenantId, entityType, entityId },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { timestamp: 'desc' },
    })
}
