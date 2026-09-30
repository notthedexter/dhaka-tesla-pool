import { PrismaClient } from '@prisma/client';

// Global PrismaClient singleton for long-running Node processes and serverless warm containers (Vercel / Neon)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Always preserve client instance on global in serverless or development to prevent connection leaks
globalForPrisma.prisma = prisma;
