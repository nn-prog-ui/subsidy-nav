import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateTemplatePdf } from '../services/pdf';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req: Request, res: Response) => {
  const data = await prisma.template.findMany({ orderBy: { downloadCount: 'desc' } });
  res.json({ data });
});

router.get('/:id/download', async (req: Request, res: Response) => {
  const template = await prisma.template.findUnique({ where: { id: req.params.id } });
  if (!template) return res.status(404).json({ error: 'Not found' });
  await prisma.template.update({ where: { id: template.id }, data: { downloadCount: { increment: 1 } } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${template.fileName}"`);
  generateTemplatePdf(template as any).pipe(res);
});

export default router;
