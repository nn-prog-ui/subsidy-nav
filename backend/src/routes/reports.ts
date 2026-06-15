import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateBody, reportSchema } from '../utils/validation';

const router = Router();

// POST /api/reports — 補助金情報の誤りを報告（匿名可）
router.post('/', validateBody(reportSchema), async (req: Request, res: Response) => {
  const { subsidyId, reason, detail, email } = req.body;
  const exists = await prisma.subsidy.findUnique({ where: { id: subsidyId }, select: { id: true } });
  if (!exists) return res.status(404).json({ error: '対象の補助金が見つかりません' });
  await prisma.subsidyReport.create({
    data: { subsidyId, reason, detail: detail || null, email: email || null },
  });
  res.status(201).json({ message: 'ご報告ありがとうございます。確認のうえ対応します。' });
});

export default router;
