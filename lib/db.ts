import { prismaOfflineSingleton } from '@/lib/stubs/prisma-client'

const globalForPrisma = globalThis as unknown as {
  prisma?: typeof prismaOfflineSingleton
}

/** Cliente Prisma offline (proxy). */
export const prisma: any = globalForPrisma.prisma ?? prismaOfflineSingleton

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
