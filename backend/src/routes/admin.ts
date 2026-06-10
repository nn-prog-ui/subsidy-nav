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

// Subsidy CRUD
router.get('/subsidies', requireAdmin, async (req: Request, res: Response) => {
  const { page = '1', limit = '20', status } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = status ? { status } : {};
  const [total, data] = await Promise.all([
    prisma.subsidy.count({ where }),
    prisma.subsidy.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
  ]);
  res.json({ data, meta: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
});

router.post('/subsidies', requireAdmin, async (req: Request, res: Response) => {
  const { title, description, category, targetType, level, prefecture, municipalityCode, municipalityName,
    maxAmount, subsidyRate, applicationStart, applicationEnd, status, applicationUrl, requirements, notes } = req.body;
  if (!title || !description || !category || !targetType || !level || !prefecture) {
    return res.status(400).json({ error: 'title, description, category, targetType, level, prefecture required' });
  }
  const data = await prisma.subsidy.create({
    data: {
      title, description, category, targetType, level, prefecture,
      municipalityCode: municipalityCode || null,
      municipalityName: municipalityName || null,
      maxAmount: maxAmount ? BigInt(maxAmount) : null,
      subsidyRate: subsidyRate || null,
      applicationStart: applicationStart ? new Date(applicationStart) : null,
      applicationEnd: applicationEnd ? new Date(applicationEnd) : null,
      status: status || 'active',
      applicationUrl: applicationUrl || null,
      requirements: requirements || null,
      notes: notes || null,
    },
  });
  res.status(201).json({ data });
});

router.patch('/subsidies/:id', requireAdmin, async (req: Request, res: Response) => {
  const { maxAmount, applicationStart, applicationEnd, ...rest } = req.body;
  const data = await prisma.subsidy.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(maxAmount !== undefined ? { maxAmount: maxAmount ? BigInt(maxAmount) : null } : {}),
      ...(applicationStart !== undefined ? { applicationStart: applicationStart ? new Date(applicationStart) : null } : {}),
      ...(applicationEnd !== undefined ? { applicationEnd: applicationEnd ? new Date(applicationEnd) : null } : {}),
    },
  });
  res.json({ data });
});

router.delete('/subsidies/:id', requireAdmin, async (req: Request, res: Response) => {
  await prisma.subsidy.delete({ where: { id: req.params.id } });
  res.json({ message: '削除しました' });
});

// Alerts management
router.get('/alerts', requireAdmin, async (_req: Request, res: Response) => {
  const data = await prisma.alert.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ data });
});

export default router;

// CSV Import
import { parse as csvParse } from 'csv-parse/sync';

router.post('/import/csv', requireAdmin, async (req: Request, res: Response) => {
  const { csv } = req.body;
  if (!csv) return res.status(400).json({ error: 'csv field required' });

  let records: any[];
  try {
    records = csvParse(csv, { columns: true, skip_empty_lines: true, trim: true });
  } catch (e: any) {
    return res.status(400).json({ error: 'CSV parse error: ' + e.message });
  }

  const results = { created: 0, errors: [] as string[] };
  for (const row of records) {
    try {
      if (!row.title || !row.description || !row.category || !row.targetType || !row.level || !row.prefecture) {
        results.errors.push(`行スキップ: title/description/category/targetType/level/prefecture が必須: ${row.title || '(no title)'}`);
        continue;
      }
      await prisma.subsidy.create({
        data: {
          title: row.title,
          description: row.description,
          category: row.category,
          targetType: row.targetType,
          level: row.level,
          prefecture: row.prefecture,
          municipalityCode: row.municipalityCode || null,
          municipalityName: row.municipalityName || null,
          maxAmount: row.maxAmount ? BigInt(row.maxAmount) : null,
          subsidyRate: row.subsidyRate || null,
          applicationStart: row.applicationStart ? new Date(row.applicationStart) : null,
          applicationEnd: row.applicationEnd ? new Date(row.applicationEnd) : null,
          applicationUrl: row.applicationUrl || null,
          requirements: row.requirements || null,
          notes: row.notes || null,
          status: row.status || 'active',
        },
      });
      results.created++;
    } catch (e: any) {
      results.errors.push(`${row.title}: ${e.message}`);
    }
  }

  res.json({ data: results });
});
