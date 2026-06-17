import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function getUserId(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return (jwt.verify(auth.slice(7), JWT_SECRET) as { id: string }).id;
  } catch { return null; }
}

// GET /api/saved-searches — 一覧
router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const data = await prisma.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  res.json({ data });
});

// POST /api/saved-searches — 保存（最大20件まで）
router.post('/', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const { name, query } = req.body;
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name required' });
  const count = await prisma.savedSearch.count({ where: { userId } });
  if (count >= 20) return res.status(400).json({ error: '保存できる検索条件は20件までです' });
  const data = await prisma.savedSearch.create({
    data: { userId, name: name.slice(0, 60), query: String(query || '').slice(0, 500) },
  });
  res.status(201).json({ data });
});

// DELETE /api/saved-searches/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  await prisma.savedSearch.deleteMany({ where: { id: req.params.id, userId } });
  res.json({ message: '削除しました' });
});

export default router;
