import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const TYPES = ['view', 'search', 'match'];

// POST /api/events — 解析イベント記録（匿名・fire-and-forget）
router.post('/', async (req: Request, res: Response) => {
  const { type, subsidyId, keyword } = req.body || {};
  if (!TYPES.includes(type)) return res.status(400).json({ error: 'invalid type' });
  // 早期にレスポンスを返し、記録は非同期
  res.status(202).json({ ok: true });
  prisma.analyticsEvent.create({
    data: {
      type,
      subsidyId: subsidyId || null,
      keyword: keyword ? String(keyword).slice(0, 100) : null,
    },
  }).catch(() => {});
});

export default router;
