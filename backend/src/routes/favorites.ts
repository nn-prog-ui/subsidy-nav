import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();
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

export default router;
