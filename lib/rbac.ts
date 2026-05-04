/**
 * Motor de RBAC (Role-Based Access Control) Granular
 * Controla quem pode fazer o quê dentro de cada tenant.
 */

import { prisma } from './db'

// Cache simples em memória para permissões (TTL: 5 minutos)
const permissionCache = new Map<string, { permissions: string[]; expiresAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getUserPermissions(
    userId: string,
    tenantId: string
): Promise<string[]> {
    const cacheKey = `${tenantId}:${userId}`
    const cached = permissionCache.get(cacheKey)

    if (cached && cached.expiresAt > Date.now()) {
        return cached.permissions
    }

    const userRoles = (await prisma.userRole.findMany({
        where: { user: { id: userId, tenantId } },
        include: {
            role: {
                include: {
                    rolePermissions: {
                        include: { permission: true },
                    },
                },
            },
        },
    })) as any[]

    const permissions: string[] = userRoles.flatMap((ur: any) =>
        ur.role.rolePermissions.map((rp: any) => String(rp.permission.action)),
    )

    const uniquePermissions = [...new Set(permissions)]

    permissionCache.set(cacheKey, {
        permissions: uniquePermissions,
        expiresAt: Date.now() + CACHE_TTL,
    })

    return uniquePermissions
}

export async function hasPermission(
    userId: string,
    tenantId: string,
    action: string
): Promise<boolean> {
    const permissions = await getUserPermissions(userId, tenantId)
    return permissions.includes(action)
}

export async function getUserRoles(userId: string, tenantId: string): Promise<string[]> {
    const userRoles = (await prisma.userRole.findMany({
        where: { user: { id: userId, tenantId } },
        include: { role: true },
    })) as any[]
    return userRoles.map((ur: any) => ur.role.name as string)
}

// Invalida o cache quando permissões de um usuário são alteradas
export function invalidatePermissionCache(userId: string, tenantId: string): void {
    permissionCache.delete(`${tenantId}:${userId}`)
}

// Permissões padrão do sistema
export const PERMISSIONS = {
    // Vendas
    SALES_CREATE: 'sales:create',
    SALES_READ: 'sales:read',
    SALES_UPDATE: 'sales:update',
    SALES_DELETE: 'sales:delete',
    DISCOUNT_APPLY: 'discount:apply',
    DISCOUNT_APPROVE: 'discount:approve', // Desconto > 10% exige este

    // Financeiro
    FINANCIAL_READ: 'financial:read',
    FINANCIAL_WRITE: 'financial:write',
    FINANCIAL_REPORTS: 'financial:reports',

    // Estoque
    STOCK_READ: 'stock:read',
    STOCK_WRITE: 'stock:write',
    STOCK_ADJUST: 'stock:adjust',

    // OS (Ordens de Serviço)
    OS_CREATE: 'os:create',
    OS_READ: 'os:read',
    OS_UPDATE: 'os:update',
    OS_SEND_LAB: 'os:send_lab',
    OS_QUALITY_CHECK: 'os:quality_check',

    // Admin
    ADMIN_USERS: 'admin:users',
    ADMIN_ROLES: 'admin:roles',
    ADMIN_TENANT: 'admin:tenant',
    ADMIN_AUDIT: 'admin:audit',
} as const

// Papéis padrão e suas permissões
export const DEFAULT_ROLES = {
    ADMIN: Object.values(PERMISSIONS), // Tudo
    GERENTE: [
        PERMISSIONS.SALES_CREATE, PERMISSIONS.SALES_READ, PERMISSIONS.SALES_UPDATE, PERMISSIONS.SALES_DELETE,
        PERMISSIONS.DISCOUNT_APPLY, PERMISSIONS.DISCOUNT_APPROVE,
        PERMISSIONS.FINANCIAL_READ, PERMISSIONS.FINANCIAL_REPORTS,
        PERMISSIONS.STOCK_READ, PERMISSIONS.STOCK_WRITE, PERMISSIONS.STOCK_ADJUST,
        PERMISSIONS.OS_CREATE, PERMISSIONS.OS_READ, PERMISSIONS.OS_UPDATE, PERMISSIONS.OS_SEND_LAB, PERMISSIONS.OS_QUALITY_CHECK,
        PERMISSIONS.ADMIN_USERS,
    ],
    VENDEDOR: [
        PERMISSIONS.SALES_CREATE, PERMISSIONS.SALES_READ, PERMISSIONS.SALES_UPDATE,
        PERMISSIONS.DISCOUNT_APPLY,
        PERMISSIONS.OS_CREATE, PERMISSIONS.OS_READ, PERMISSIONS.OS_UPDATE,
        PERMISSIONS.STOCK_READ,
    ],
    LABORATORISTA: [
        PERMISSIONS.OS_READ, PERMISSIONS.OS_UPDATE, PERMISSIONS.OS_QUALITY_CHECK,
        PERMISSIONS.STOCK_READ,
    ],
    FINANCEIRO: [
        PERMISSIONS.FINANCIAL_READ, PERMISSIONS.FINANCIAL_WRITE, PERMISSIONS.FINANCIAL_REPORTS,
        PERMISSIONS.SALES_READ,
        PERMISSIONS.STOCK_READ,
    ],
} as const
