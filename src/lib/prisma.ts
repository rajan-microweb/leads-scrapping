import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// Use singleton in all environments to avoid connection exhaustion in serverless (Vercel)
globalForPrisma.prisma = prisma
