import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateSubsidyPdf } from '../services/pdf';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  const { prefecture, category, level, keyword, targetType, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where: any = { status: 'active' };
  if (prefecture && prefecture !== '全国') where.OR = [{ prefecture }, { prefecture: '全国' }];
  if (category) where.category = category;
  if (level) where.level = level;
  if (targetType) where.targetType = { contains: targetType };
  if (keyword) where.AND = [{ OR: [
    { title: { contains: keyword, mode: 'insensitive' } },
    { description: { contains: keyword, mode: 'insensitive' } },
  ]}];
  const [total, data] = await Promise.all([
    prisma.subsidy.count({ where }),
    prisma.subsidy.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
  ]);
  res.json({ data, meta: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
});

router.get('/:id', async (req: Request, res: Response) => {
  const data = await prisma.subsidy.findUnique({ where: { id: req.params.id } });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json({ data });
});

router.get('/:id/pdf', async (req: Request, res: Response) => {
  const subsidy = await prisma.subsidy.findUnique({ where: { id: req.params.id } });
  if (!subsidy) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="subsidy_${subsidy.id}.pdf"`);
  generateSubsidyPdf(subsidy as any).pipe(res);
});

export default router;
