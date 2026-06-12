import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const STATUSES = ['considering', 'preparing', 'applied', 'approved', 'rejected'];

function getUserId(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return (jwt.verify(auth.slice(7), JWT_SECRET) as { id: string }).id;
  } catch { return null; }
}

// GET /api/progress — ユーザーの全進捗（補助金情報付き）
router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const items = await prisma.applicationProgress.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  const subsidies = await prisma.subsidy.findMany({ where: { id: { in: items.map(i => i.subsidyId) } } });
  const map = Object.fromEntries(subsidies.map(s => [s.id, s]));
  res.json({ data: items.map(i => ({ ...i, subsidy: map[i.subsidyId] || null })) });
});

// GET /api/progress/:subsidyId — 単一進捗（未設定なら null）
router.get('/:subsidyId', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.json({ data: null });
  const item = await prisma.applicationProgress.findUnique({
    where: { userId_subsidyId: { userId, subsidyId: req.params.subsidyId } },
  });
  res.json({ data: item });
});

// PUT /api/progress/:subsidyId — 進捗の作成/更新
router.put('/:subsidyId', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { status, memo } = req.body;
  if (status && !STATUSES.includes(status)) return res.status(400).json({ error: 'invalid status' });
  const exists = await prisma.subsidy.findUnique({ where: { id: req.params.subsidyId } });
  if (!exists) return res.status(404).json({ error: 'Subsidy not found' });
  const data = await prisma.applicationProgress.upsert({
    where: { userId_subsidyId: { userId, subsidyId: req.params.subsidyId } },
    update: { status: status || undefined, memo: memo !== undefined ? memo : undefined },
    create: { userId, subsidyId: req.params.subsidyId, status: status || 'considering', memo: memo || null },
  });
  res.json({ data });
});

// DELETE /api/progress/:subsidyId
router.delete('/:subsidyId', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  await prisma.applicationProgress.deleteMany({ where: { userId, subsidyId: req.params.subsidyId } });
  res.json({ message: '削除しました' });
});

export default router;
