import { PrismaClient } from '@prisma/client';

// PrismaClient のシングルトン。開発時のホットリロードでの接続枯渇を防ぐため
// グローバルにキャッシュする。
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
