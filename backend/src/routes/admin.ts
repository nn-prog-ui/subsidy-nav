import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { parse as csvParse } from 'csv-parse/sync';
import { requireAdmin } from '../middleware/auth';
import { runScrape } from '../services/scraper';
import { sendAnalyticsReport } from '../services/email';
import { closeExpiredSubsidies, activateUpcomingSubsidies } from '../services/maintenance';
import { invalidateCache } from '../middleware/cache';

const router = Router();

// 監査ログ記録ヘルパー（失敗してもメイン処理は止めない）
async function recordAudit(req: Request, action: string, target: string, targetId?: string, detail?: string) {
  try {
    await prisma.auditLog.create({
      data: { adminEmail: (req as any).adminEmail || 'unknown', action, target, targetId: targetId || null, detail: detail || null },
    });
  } catch (e: any) {
    console.error('Audit log error:', e.message);
  }
}
const prisma = new PrismaClient();

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
  res.json({ token });
});

router.get('/stats', requireAdmin, async (_req: Request, res: Response) => {
  const [subsidies, alerts, consulting, users, scrapes] = await Promise.all([
    prisma.subsidy.count(),
    prisma.alert.count({ where: { verified: true, active: true } }),
    prisma.consultingRequest.count(),
    prisma.user.count(),
    prisma.scrapeLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  res.json({ data: { subsidies, alerts, consulting, users, recentScrapes: scrapes } });
});

router.post('/scrape', requireAdmin, async (_req: Request, res: Response) => {
  res.json({ message: 'スクレイピングを開始しました' });
  runScrape().catch(console.error);
});

router.post('/report/send', requireAdmin, async (_req: Request, res: Response) => {
  res.json({ message: '週次分析レポートを送信しました（ADMIN_EMAIL宛）' });
  sendAnalyticsReport().catch(console.error);
});

router.post('/subsidies/refresh-status', requireAdmin, async (_req: Request, res: Response) => {
  const closed = await closeExpiredSubsidies();
  const activated = await activateUpcomingSubsidies();
  res.json({ message: `ステータスを更新しました（締切→closed: ${closed}件 / 開始→active: ${activated}件）`, closed, activated });
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
  const { page = '1', limit = '20', status, keyword } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where: any = status ? { status } : {};
  if (keyword) where.OR = [{ title: { contains: keyword, mode: 'insensitive' } }, { description: { contains: keyword, mode: 'insensitive' } }];
  const [total, data] = await Promise.all([
    prisma.subsidy.count({ where }),
    prisma.subsidy.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
  ]);
  res.json({ data, meta: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
});

// CSV Export
router.get('/subsidies/export/csv', requireAdmin, async (_req: Request, res: Response) => {
  const data = await prisma.subsidy.findMany({ orderBy: { createdAt: 'desc' } });
  const header = 'title,description,category,targetType,level,prefecture,municipalityCode,municipalityName,maxAmount,subsidyRate,applicationStart,applicationEnd,applicationUrl,requirements,notes,status';
  const rows = data.map(s => [
    s.title, s.description, s.category, s.targetType, s.level, s.prefecture,
    s.municipalityCode || '', s.municipalityName || '',
    s.maxAmount?.toString() || '', s.subsidyRate || '',
    s.applicationStart?.toISOString().slice(0, 10) || '',
    s.applicationEnd?.toISOString().slice(0, 10) || '',
    s.applicationUrl || '', s.requirements || '', s.notes || '', s.status,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="subsidies.csv"');
  res.send('﻿' + [header, ...rows].join('\n'));
});

router.post('/subsidies', requireAdmin, async (req: Request, res: Response) => {
  const { title, description, category, targetType, level, prefecture, municipalityCode, municipalityName,
    maxAmount, subsidyRate, applicationStart, applicationEnd, status, applicationUrl, requirements, notes,
    difficulty, estimatedDays, applicationSteps, requiredDocuments } = req.body;
  if (!title || !description || !category || !targetType || !level || !prefecture) {
    return res.status(400).json({ error: 'title, description, category, targetType, level, prefecture required' });
  }
  const data = await prisma.subsidy.create({
    data: {
      title, description, category, targetType, level, prefecture,
      municipalityCode: municipalityCode || null, municipalityName: municipalityName || null,
      maxAmount: maxAmount ? BigInt(maxAmount) : null, subsidyRate: subsidyRate || null,
      applicationStart: applicationStart ? new Date(applicationStart) : null,
      applicationEnd: applicationEnd ? new Date(applicationEnd) : null,
      status: status || 'active', applicationUrl: applicationUrl || null,
      requirements: requirements || null, notes: notes || null,
      difficulty: difficulty || null,
      estimatedDays: estimatedDays ? parseInt(estimatedDays) : null,
      applicationSteps: Array.isArray(applicationSteps) ? applicationSteps : [],
      requiredDocuments: Array.isArray(requiredDocuments) ? requiredDocuments : [],
    },
  });
  await recordAudit(req, 'create', 'subsidy', data.id, data.title);
  invalidateCache('/api/subsidies');
  res.status(201).json({ data });
});

router.patch('/subsidies/:id', requireAdmin, async (req: Request, res: Response) => {
  const { maxAmount, applicationStart, applicationEnd, estimatedDays, ...rest } = req.body;
  const data = await prisma.subsidy.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(maxAmount !== undefined ? { maxAmount: maxAmount ? BigInt(maxAmount) : null } : {}),
      ...(applicationStart !== undefined ? { applicationStart: applicationStart ? new Date(applicationStart) : null } : {}),
      ...(applicationEnd !== undefined ? { applicationEnd: applicationEnd ? new Date(applicationEnd) : null } : {}),
      ...(estimatedDays !== undefined ? { estimatedDays: estimatedDays ? parseInt(estimatedDays) : null } : {}),
    },
  });
  invalidateCache('/api/subsidies');
  await recordAudit(req, 'update', 'subsidy', data.id, data.title);
  res.json({ data });
});

// Bulk status update
router.patch('/subsidies/bulk/status', requireAdmin, async (req: Request, res: Response) => {
  const { ids, status } = req.body;
  if (!ids?.length || !status) return res.status(400).json({ error: 'ids and status required' });
  const { count } = await prisma.subsidy.updateMany({ where: { id: { in: ids } }, data: { status } });
  invalidateCache('/api/subsidies');
  await recordAudit(req, 'update', 'subsidy', undefined, `一括ステータス変更 status=${status} count=${count}`);
  res.json({ updated: count });
});

router.delete('/subsidies/:id', requireAdmin, async (req: Request, res: Response) => {
  await prisma.subsidy.delete({ where: { id: req.params.id } });
  invalidateCache('/api/subsidies');
  await recordAudit(req, 'delete', 'subsidy', req.params.id);
  res.json({ message: '削除しました' });
});

// Alerts management
router.get('/alerts', requireAdmin, async (_req: Request, res: Response) => {
  const data = await prisma.alert.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ data });
});

router.delete('/alerts/:id', requireAdmin, async (req: Request, res: Response) => {
  await prisma.alert.delete({ where: { id: req.params.id } });
  res.json({ message: '削除しました' });
});

// User management
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [total, data] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      skip, take: parseInt(limit), orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, emailVerified: true, provider: true, createdAt: true, _count: { select: { favorites: true } } },
    }),
  ]);
  res.json({ data, meta: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
});

router.delete('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  await recordAudit(req, 'delete', 'user', req.params.id);
  res.json({ message: '削除しました' });
});

// Audit logs
router.get('/audit-logs', requireAdmin, async (_req: Request, res: Response) => {
  const data = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ data });
});

// CSV Import
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
        results.errors.push(`行スキップ（必須項目不足）: ${row.title || '(no title)'}`);
        continue;
      }
      await prisma.subsidy.create({
        data: {
          title: row.title, description: row.description, category: row.category,
          targetType: row.targetType, level: row.level, prefecture: row.prefecture,
          municipalityCode: row.municipalityCode || null, municipalityName: row.municipalityName || null,
          maxAmount: row.maxAmount ? BigInt(row.maxAmount) : null, subsidyRate: row.subsidyRate || null,
          applicationStart: row.applicationStart ? new Date(row.applicationStart) : null,
          applicationEnd: row.applicationEnd ? new Date(row.applicationEnd) : null,
          applicationUrl: row.applicationUrl || null, requirements: row.requirements || null,
          notes: row.notes || null, status: row.status || 'active',
        },
      });
      results.created++;
    } catch (e: any) {
      results.errors.push(`${row.title}: ${e.message}`);
    }
  }

  invalidateCache('/api/subsidies');
  res.json({ data: results });
});

// CSV Template download
router.get('/import/csv/template', requireAdmin, (_req: Request, res: Response) => {
  const header = 'title,description,category,targetType,level,prefecture,municipalityCode,municipalityName,maxAmount,subsidyRate,applicationStart,applicationEnd,applicationUrl,requirements,notes,status';
  const example = '"IT導入補助金サンプル","ITツール導入支援","IT・デジタル","中小企業","国","全国","","",4500000,"1/2","2024-04-01","2024-12-31","https://example.com","要件サンプル","備考","active"';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="import_template.csv"');
  res.send('﻿' + [header, example].join('\n'));
});

export default router;
