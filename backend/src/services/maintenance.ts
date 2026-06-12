import { PrismaClient } from '@prisma/client';
import { invalidateCache } from '../middleware/cache';

const prisma = new PrismaClient();

/**
 * 申請締切を過ぎた active な補助金を closed に更新する。
 * 更新件数を返す。
 */
export async function closeExpiredSubsidies(now: Date = new Date()): Promise<number> {
  const { count } = await prisma.subsidy.updateMany({
    where: {
      status: 'active',
      applicationEnd: { not: null, lt: now },
    },
    data: { status: 'closed' },
  });
  if (count > 0) {
    invalidateCache('/api/subsidies');
    console.log(`[Maintenance] Closed ${count} expired subsidies`);
  }
  return count;
}

/**
 * 申請開始日が到来した upcoming な補助金を active に更新する。
 */
export async function activateUpcomingSubsidies(now: Date = new Date()): Promise<number> {
  const { count } = await prisma.subsidy.updateMany({
    where: {
      status: 'upcoming',
      applicationStart: { not: null, lte: now },
      OR: [{ applicationEnd: null }, { applicationEnd: { gte: now } }],
    },
    data: { status: 'active' },
  });
  if (count > 0) {
    invalidateCache('/api/subsidies');
    console.log(`[Maintenance] Activated ${count} upcoming subsidies`);
  }
  return count;
}
