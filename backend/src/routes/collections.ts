import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { cacheMiddleware } from '../middleware/cache';

const router = Router();
const prisma = new PrismaClient();

// GET /api/collections/:token — 公開お気に入りコレクション（匿名閲覧可）
router.get('/:token', cacheMiddleware(120), async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { shareToken: req.params.token },
    select: { id: true, name: true },
  });
  if (!user) return res.status(404).json({ error: 'コレクションが見つかりません' });

  const favorites = await prisma.favorite.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
  const subsidies = await prisma.subsidy.findMany({
    where: { id: { in: favorites.map(f => f.subsidyId) } },
    select: { id: true, title: true, category: true, level: true, prefecture: true, maxAmount: true, status: true },
  });
  const map = Object.fromEntries(subsidies.map(s => [s.id, s]));
  const items = favorites.map(f => map[f.subsidyId]).filter(Boolean);

  res.json({ data: { owner: user.name || '匿名ユーザー', count: items.length, subsidies: items } });
});

export default router;
