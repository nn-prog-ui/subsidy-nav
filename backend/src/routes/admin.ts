import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireAdmin } from '../middleware/auth';
import { runScrape } from '../services/scraper';

const router = Router();
const prisma = new PrismaClient();

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
  res.json({ token });
});

router.get('/stats', requireAdmin, async (_req: Request, res: Response) => {
  const [subsidies, alerts, consulting, scrapes] = await Promise.all([
    prisma.subsidy.count(),
    prisma.alert.count({ where: { verified: true, active: true } }),
    prisma.consultingRequest.count(),
    prisma.scrapeLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  res.json({ data: { subsidies, alerts, consulting, recentScrapes: scrapes } });
});

router.post('/scrape', requireAdmin, async (_req: Request, res: Response) => {
  res.json({ message: 'スクレイピングを開始しました' });
  runScrape().catch(console.error);
});

router.get('/consulting', requireAdmin, async (_req: Request, res: Response) => {
  const data = await prisma.consultingRequest.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ data });
});

router.patch('/consulting/:id', requireAdmin, async (req: Request, res: Response) => {
  const data = await prisma.consultingRequest.update({ where: { id: req.params.id }, data: { status: req.body.status } });
  res.json({ data });
});

export default router;
