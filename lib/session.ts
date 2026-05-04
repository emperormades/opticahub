import { auth } from '@/lib/auth'

export interface TenantContext {
  userId: string
  tenantId: string
  tenantSlug: string
  tenantName: string
  roles: string[]
}

export const ADMIN_ROLES = ['ADMIN', 'GERENTE'] as const
export const FINANCIAL_ROLES = ['ADMIN', 'GERENTE', 'FINANCEIRO'] as const

export async function requireTenantContext(): Promise<TenantContext> {
  const session = await auth()

  if (!session?.user) {
    throw new Error('UNAUTHORIZED')
  }

  return {
    userId: session.user.id,
    tenantId: session.user.tenantId,
    tenantSlug: session.user.tenantSlug,
    tenantName: session.user.tenantName,
    roles: session.user.roles ?? [],
  }
}

export function hasAnyRole(
  context: Pick<TenantContext, 'roles'>,
  requiredRoles: readonly string[]
): boolean {
  return context.roles.some((role) => requiredRoles.includes(role))
}
