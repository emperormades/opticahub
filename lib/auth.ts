import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

/** Usuário fixo — modo offline (sem Prisma / sem login real). */
export const DEMO_USER = {
  id: 'offline-user',
  email: 'offline@local.invalid',
  name: 'Visitante',
  tenantId: 'offline-demo-tenant',
  tenantSlug: 'offline',
  tenantName: 'Demonstração local',
  roles: ['ADMIN', 'GERENTE', 'VENDEDOR', 'FINANCEIRO', 'LABORATORISTA'],
}

const nextAuthBundle = NextAuth({
  session: { strategy: 'jwt' },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: {},
        password: {},
        tenantSlug: {},
      },
      async authorize() {
        return DEMO_USER
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.tenantId = user.tenantId
        token.tenantSlug = user.tenantSlug
        token.tenantName = user.tenantName
        token.roles = user.roles
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.tenantId = token.tenantId as string
      session.user.tenantSlug = token.tenantSlug as string
      session.user.tenantName = token.tenantName as string
      session.user.roles = (token.roles as string[]) ?? []
      return session
    },
  },
})

const { handlers, auth: rawAuth, signIn, signOut } = nextAuthBundle

/** `auth()` nas Server Components sempre devolve sessão demo (sem cookie também funciona). */
export const auth = ((...args: unknown[]) => {
  if (args.length === 0) {
    return Promise.resolve({
      user: DEMO_USER,
      expires: new Date(Date.now() + 86400000 * 365).toISOString(),
    })
  }
  return rawAuth(...(args as Parameters<typeof rawAuth>))
}) as typeof rawAuth

export { handlers, signIn, signOut }
