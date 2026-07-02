import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { parse as csvParse } from 'csv-parse/sync';
import { requireAdmin } from '../middleware/auth';
import { runScrape } from '../services/scraper';
import { sendAnalyticsReport, sendSavedSearchAlerts } from '../services/email';
import { closeExpiredSubsidies, activateUpcomingSubsidies } from '../services/maintenance';
import { importFromJGrants } from '../services/importJgrants';
import { importMhlwGrants } from '../services/importMhlwGrants';
import { importFromJnet21 } from '../services/importJnet21';
import { generateApplicationGuide, GuideError } from '../services/applicationGuide';
import { extractFromUrl, approveExtraction, rejectExtraction, ExtractionError } from '../services/aiExtraction';
import { generateConsultingReply, ConsultingReplyError } from '../services/consultingReply';
import { findDuplicateGroups } from '../utils/duplicates';
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

router.post('/saved-search-alerts/send', requireAdmin, async (_req: Request, res: Response) => {
  res.json({ message: '保存検索の新着通知を送信しました' });
  sendSavedSearchAlerts().catch(console.error);
});

router.post('/import/jgrants', requireAdmin, async (req: Request, res: Response) => {
  res.json({ message: 'Jグランツからの取り込みを開始しました（完了後に件数を反映）' });
  importFromJGrants()
    .then(r => recordAudit(req, 'create', 'subsidy', undefined, `jGrants取り込み 新規${r.imported}/更新${r.updated}`))
    .catch(console.error);
});

router.post('/import/mhlw', requireAdmin, async (req: Request, res: Response) => {
  res.json({ message: '厚労省 雇用関係助成金の取り込みを開始しました（完了後に件数を反映）' });
  importMhlwGrants()
    .then(r => recordAudit(req, 'create', 'subsidy', undefined, `厚労省助成金取り込み 新規${r.imported}/更新${r.updated}`))
    .catch(console.error);
});

router.post('/import/jnet21', requireAdmin, async (req: Request, res: Response) => {
  res.json({ message: 'J-Net21から取り込みを開始しました（補助金系のみ抽出しレビューキューへ）' });
  importFromJnet21()
    .then(r => recordAudit(req, 'create', 'extraction', undefined, `J-Net21取り込み ${r.saved}件`))
    .catch(console.error);
});

// Phase 31: 補助金1件のAI申請ガイドを生成（同期。完了後にガイドを返す）
router.post('/subsidies/:id/guide', requireAdmin, async (req: Request, res: Response) => {
  try {
    const guide = await generateApplicationGuide(req.params.id);
    await recordAudit(req, 'create', 'guide', req.params.id, 'AI申請ガイド生成');
    res.json({ message: 'AI申請ガイドを生成しました', guide });
  } catch (e: any) {
    const status = e instanceof GuideError ? e.statusCode : 500;
    res.status(status).json({ error: e.message || 'ガイド生成に失敗しました' });
  }
});

// Phase 32: AI抽出（公式サイト/告示URL → 補助金候補）
router.post('/extract', requireAdmin, async (req: Request, res: Response) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url を指定してください' });
  try {
    const result = await extractFromUrl(url);
    await recordAudit(req, 'create', 'extraction', undefined, `AI抽出 ${result.saved}件 from ${url}`);
    res.json({ message: `AI抽出が完了しました（候補${result.saved}件）`, saved: result.saved });
  } catch (e: any) {
    const status = e instanceof ExtractionError ? e.statusCode : 500;
    res.status(status).json({ error: e.message || 'AI抽出に失敗しました' });
  }
});

router.get('/extractions', requireAdmin, async (req: Request, res: Response) => {
  const status = (req.query.status as string) || 'pending';
  const data = await prisma.extractedSubsidy.findMany({
    where: { status },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ data });
});

router.post('/extractions/:id/approve', requireAdmin, async (req: Request, res: Response) => {
  try {
    const subsidy = await approveExtraction(req.params.id);
    await recordAudit(req, 'create', 'subsidy', subsidy.id, `AI抽出を公開: ${subsidy.title}`);
    res.json({ message: '補助金として公開しました', subsidy });
  } catch (e: any) {
    const status = e instanceof ExtractionError ? e.statusCode : 500;
    res.status(status).json({ error: e.message || '公開に失敗しました' });
  }
});

router.post('/extractions/:id/reject', requireAdmin, async (req: Request, res: Response) => {
  try {
    await rejectExtraction(req.params.id);
    await recordAudit(req, 'update', 'extraction', req.params.id, 'AI抽出候補を却下');
    res.json({ message: '却下しました' });
  } catch (e: any) {
    const status = e instanceof ExtractionError ? e.statusCode : 500;
    res.status(status).json({ error: e.message || '却下に失敗しました' });
  }
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

// Phase 37: 相談リクエストへのAI返信ドラフト（補助金提案つき）
router.post('/consulting/:id/ai-reply', requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await generateConsultingReply(req.params.id);
    await recordAudit(req, 'create', 'consulting-reply', req.params.id, 'AI返信ドラフト生成');
    res.json(result);
  } catch (e: any) {
    const status = e instanceof ConsultingReplyError ? e.statusCode : 500;
    res.status(status).json({ error: e.message || 'AI返信ドラフト生成に失敗しました' });
  }
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
  const before = await prisma.subsidy.findUnique({ where: { id: req.params.id } });
  if (!before) return res.status(404).json({ error: 'Not found' });

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

  // 変更フィールドの差分を記録
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(req.body)) {
    const b = (before as any)[key];
    const a = (data as any)[key];
    const bs = b instanceof Date ? b.toISOString() : typeof b === 'bigint' ? b.toString() : b;
    const as = a instanceof Date ? a.toISOString() : typeof a === 'bigint' ? a.toString() : a;
    if (JSON.stringify(bs) !== JSON.stringify(as)) changes[key] = { from: bs ?? null, to: as ?? null };
  }
  if (Object.keys(changes).length > 0) {
    await prisma.subsidyRevision.create({
      data: { subsidyId: data.id, adminEmail: (req as any).adminEmail || null, changes: JSON.stringify(changes) },
    }).catch(e => console.error('Revision error:', e.message));
  }

  invalidateCache('/api/subsidies');
  await recordAudit(req, 'update', 'subsidy', data.id, data.title);
  res.json({ data });
});

// 補助金の変更履歴（全体・直近50件、タイトル付き）
router.get('/revisions', requireAdmin, async (_req: Request, res: Response) => {
  const revisions = await prisma.subsidyRevision.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  const ids = [...new Set(revisions.map(r => r.subsidyId))];
  const subs = await prisma.subsidy.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } });
  const titleMap = Object.fromEntries(subs.map(s => [s.id, s.title]));
  res.json({ data: revisions.map(r => ({ ...r, title: titleMap[r.subsidyId] || '(削除済み)', changes: JSON.parse(r.changes) })) });
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

// 重複・類似補助金の検出（タイトル類似度ベース）
router.get('/subsidies/duplicates', requireAdmin, async (_req: Request, res: Response) => {
  const subsidies = await prisma.subsidy.findMany({
    where: { status: { not: 'deleted' } },
    select: { id: true, title: true, prefecture: true, category: true, level: true, status: true, createdAt: true },
    take: 2000,
  });
  const groups = findDuplicateGroups(subsidies.map(s => ({ id: s.id, title: s.title })));
  const byId = Object.fromEntries(subsidies.map(s => [s.id, s]));
  const detailed = groups.map(g => g.map(item => byId[item.id]));
  res.json({ data: detailed, count: detailed.length });
});

// 情報誤り報告のレビュー
router.get('/reports', requireAdmin, async (req: Request, res: Response) => {
  const { status } = req.query as Record<string, string>;
  const reports = await prisma.subsidyReport.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const ids = [...new Set(reports.map(r => r.subsidyId))];
  const subs = await prisma.subsidy.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } });
  const titleMap = Object.fromEntries(subs.map(s => [s.id, s.title]));
  res.json({ data: reports.map(r => ({ ...r, title: titleMap[r.subsidyId] || '(削除済み)' })) });
});

router.patch('/reports/:id', requireAdmin, async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['open', 'resolved', 'dismissed'].includes(status)) return res.status(400).json({ error: 'invalid status' });
  const data = await prisma.subsidyReport.update({ where: { id: req.params.id }, data: { status } });
  await recordAudit(req, 'update', 'report', data.id, `status=${status}`);
  res.json({ data });
});

// Audit logs
router.get('/audit-logs', requireAdmin, async (_req: Request, res: Response) => {
  const data = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ data });
});

// 解析イベント集計（直近30日の検索キーワード・閲覧ランキング）
router.get('/event-stats', requireAdmin, async (_req: Request, res: Response) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [byType, topKeywordsRaw, topViewedRaw] = await Promise.all([
    prisma.analyticsEvent.groupBy({ by: ['type'], where: { createdAt: { gte: since } }, _count: { id: true } }),
    prisma.analyticsEvent.groupBy({
      by: ['keyword'],
      where: { type: 'search', keyword: { not: null }, createdAt: { gte: since } },
      _count: { keyword: true },
      orderBy: { _count: { keyword: 'desc' } },
      take: 15,
    }),
    prisma.analyticsEvent.groupBy({
      by: ['subsidyId'],
      where: { type: 'view', subsidyId: { not: null }, createdAt: { gte: since } },
      _count: { subsidyId: true },
      orderBy: { _count: { subsidyId: 'desc' } },
      take: 15,
    }),
  ]);

  // 閲覧ランキングに補助金タイトルを付与
  const viewedIds = topViewedRaw.map(v => v.subsidyId!).filter(Boolean);
  const viewedSubsidies = await prisma.subsidy.findMany({ where: { id: { in: viewedIds } }, select: { id: true, title: true } });
  const titleMap = Object.fromEntries(viewedSubsidies.map(s => [s.id, s.title]));

  res.json({
    data: {
      byType: byType.map(t => ({ type: t.type, count: t._count.id })),
      topKeywords: topKeywordsRaw.map(k => ({ keyword: k.keyword, count: k._count.keyword })),
      topViewed: topViewedRaw.map(v => ({ subsidyId: v.subsidyId, title: titleMap[v.subsidyId!] || '(削除済み)', count: v._count.subsidyId })),
    },
  });
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
