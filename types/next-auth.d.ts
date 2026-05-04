import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      tenantId: string
      tenantSlug: string
      tenantName: string
      roles: string[]
    }
  }

  interface User {
    tenantId: string
    tenantSlug: string
    tenantName: string
    roles: string[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    tenantId: string
    tenantSlug: string
    tenantName: string
    roles: string[]
  }
}
