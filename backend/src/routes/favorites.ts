import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function getUserId(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const p = jwt.verify(auth.slice(7), JWT_SECRET) as { id: string };
    return p.id;
  } catch { return null; }
}

// GET /api/favorites
router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { user: false },
  });
  // Fetch subsidy details
  const subsidyIds = favorites.map(f => f.subsidyId);
  const subsidies = await prisma.subsidy.findMany({ where: { id: { in: subsidyIds } } });
  const subsidyMap = Object.fromEntries(subsidies.map(s => [s.id, s]));
  const data = favorites.map(f => ({ ...f, subsidy: subsidyMap[f.subsidyId] || null }));
  res.json({ data });
});

// POST /api/favorites
router.post('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { subsidyId, note } = req.body;
  if (!subsidyId) return res.status(400).json({ error: 'subsidyId required' });
  const exists = await prisma.subsidy.findUnique({ where: { id: subsidyId } });
  if (!exists) return res.status(404).json({ error: 'Subsidy not found' });
  const data = await prisma.favorite.upsert({
    where: { userId_subsidyId: { userId, subsidyId } },
    update: { note: note || null },
    create: { userId, subsidyId, note: note || null },
  });
  res.status(201).json({ data });
});

// --- 共有コレクション（/:subsidyId より前に定義してルート衝突を回避）---
// GET /api/favorites/share — 現在の共有トークンを取得
router.get('/share', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { shareToken: true } });
  res.json({ token: user?.shareToken || null });
});

// POST /api/favorites/share — 共有を有効化（トークン発行、既存なら再利用）
router.post('/share', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { shareToken: true } });
  let token = existing?.shareToken;
  if (!token) {
    token = require('crypto').randomBytes(16).toString('hex');
    await prisma.user.update({ where: { id: userId }, data: { shareToken: token } });
  }
  res.json({ token });
});

// DELETE /api/favorites/share — 共有を無効化
router.delete('/share', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  await prisma.user.update({ where: { id: userId }, data: { shareToken: null } });
  res.json({ message: '共有を停止しました' });
});

// DELETE /api/favorites/:subsidyId
router.delete('/:subsidyId', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  await prisma.favorite.deleteMany({ where: { userId, subsidyId: req.params.subsidyId } });
  res.json({ message: 'お気に入りを解除しました' });
});

// GET /api/favorites/check/:subsidyId
router.get('/check/:subsidyId', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.json({ isFavorite: false });
  const fav = await prisma.favorite.findUnique({ where: { userId_subsidyId: { userId, subsidyId: req.params.subsidyId } } });
  res.json({ isFavorite: !!fav });
});

// GET /api/favorites/recommendations — お気に入りの傾向から推薦（重み付けスコアリング）
router.get('/recommendations', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const favorites = await prisma.favorite.findMany({ where: { userId } });
  const favIds = favorites.map(f => f.subsidyId);
  if (favIds.length === 0) return res.json({ data: [], basis: 'none' });

  const favSubsidies = await prisma.subsidy.findMany({ where: { id: { in: favIds } } });
  const catCount = new Map<string, number>();
  const prefCount = new Map<string, number>();
  for (const s of favSubsidies) {
    catCount.set(s.category, (catCount.get(s.category) || 0) + 1);
    if (s.prefecture && s.prefecture !== '全国') prefCount.set(s.prefecture, (prefCount.get(s.prefecture) || 0) + 1);
  }
  const cats = [...catCount.keys()];
  const prefs = [...prefCount.keys()];

  const candidates = await prisma.subsidy.findMany({
    where: {
      status: 'active',
      id: { notIn: favIds },
      OR: [
        ...(cats.length ? [{ category: { in: cats } }] : []),
        ...(prefs.length ? [{ prefecture: { in: prefs } }] : []),
      ],
    },
    take: 50,
    orderBy: { createdAt: 'desc' },
  });

  // カテゴリ一致(重み2×頻度) + 都道府県一致(重み1×頻度) でスコアリング
  const scored = candidates.map(s => {
    const score = 2 * (catCount.get(s.category) || 0) + 1 * (prefCount.get(s.prefecture) || 0);
    return { subsidy: s, score };
  }).filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || b.subsidy.createdAt.getTime() - a.subsidy.createdAt.getTime())
    .slice(0, 6);

  res.json({ data: scored.map(x => x.subsidy), basis: 'favorites' });
});

export default router;
