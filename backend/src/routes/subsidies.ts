import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { generateSubsidyPdf } from '../services/pdf';
import { cacheMiddleware } from '../middleware/cache';
import { buildTsQuery, expandSynonyms } from '../utils/search';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  const { prefecture, category, level, keyword, targetType, amountMin, amountMax, sort, closingSoon, difficulty, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  const orderBy: Prisma.SubsidyOrderByWithRelationInput =
    sort === 'amount_desc' ? { maxAmount: 'desc' } :
    sort === 'amount_asc' ? { maxAmount: 'asc' } :
    sort === 'deadline' ? { applicationEnd: 'asc' } :
    { createdAt: 'desc' };

  // Full-text search via raw SQL when keyword provided
  if (keyword && keyword.trim()) {
    const sanitized = buildTsQuery(keyword);
    const conditions: string[] = [`status = 'active'`];
    const params: (string | number)[] = [sanitized];
    let pi = 2;

    if (prefecture && prefecture !== '全国') {
      conditions.push(`(prefecture = $${pi} OR prefecture = '全国')`);
      params.push(prefecture); pi++;
    }
    if (category) { conditions.push(`category = $${pi}`); params.push(category); pi++; }
    if (level) { conditions.push(`level = $${pi}`); params.push(level); pi++; }
    if (targetType) { conditions.push(`"targetType" ILIKE $${pi}`); params.push(`%${targetType}%`); pi++; }
    if (amountMin) { conditions.push(`"maxAmount" >= $${pi}`); params.push(Number(amountMin)); pi++; }
    if (amountMax) { conditions.push(`"maxAmount" <= $${pi}`); params.push(Number(amountMax)); pi++; }
    if (closingSoon === 'true') { conditions.push(`"applicationEnd" >= NOW() AND "applicationEnd" <= NOW() + INTERVAL '30 days'`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const ftsWhere = conditions.length
      ? `WHERE (${conditions.slice(1).join(' AND ')}) AND ("searchVector" @@ to_tsquery('simple', $1) OR title ILIKE '%' || $1 || '%')`
      : `WHERE "searchVector" @@ to_tsquery('simple', $1) OR title ILIKE '%' || $1 || '%'`;

    try {
      const [countResult, rows] = await Promise.all([
        prisma.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(*) as count FROM "Subsidy" ${ftsWhere}`, ...params
        ),
        prisma.$queryRawUnsafe<any[]>(
          `SELECT *, ts_rank("searchVector", to_tsquery('simple', $1)) as rank
           FROM "Subsidy" ${ftsWhere}
           ORDER BY rank DESC, "createdAt" DESC
           LIMIT $${pi} OFFSET $${pi + 1}`,
          ...params, limitNum, skip
        ),
      ]);
      const total = Number(countResult[0]?.count || 0);
      return res.json({ data: rows, meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } });
    } catch {
      // fallback to ILIKE if tsvector not available
    }
  }

  // Standard Prisma query (no keyword or fallback)
  const where: Prisma.SubsidyWhereInput = { status: 'active' };
  if (category) where.category = category;
  if (level) where.level = level;
  if (targetType) where.targetType = { contains: targetType };

  // 地域・キーワードは AND で結合（双方が OR を持つため上書きを避ける）
  const and: Prisma.SubsidyWhereInput[] = [];
  if (prefecture && prefecture !== '全国') {
    and.push({ OR: [{ prefecture }, { prefecture: '全国' }] });
  }
  if (keyword) {
    // 同義語・表記ゆれを展開して再現率を高める
    const terms = expandSynonyms(keyword);
    and.push({
      OR: terms.flatMap(t => [
        { title: { contains: t, mode: 'insensitive' as const } },
        { description: { contains: t, mode: 'insensitive' as const } },
      ]),
    });
  }
  if (and.length) where.AND = and;

  // 金額レンジ（補助上限額でフィルタ）
  if (amountMin || amountMax) {
    where.maxAmount = {};
    if (amountMin) (where.maxAmount as any).gte = BigInt(amountMin);
    if (amountMax) (where.maxAmount as any).lte = BigInt(amountMax);
  }
  // 締切30日以内
  if (closingSoon === 'true') {
    where.applicationEnd = { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
  }
  if (difficulty) where.difficulty = difficulty;

  const [total, data] = await Promise.all([
    prisma.subsidy.count({ where }),
    prisma.subsidy.findMany({ where, skip, take: limitNum, orderBy }),
  ]);
  res.json({ data, meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } });
});

router.get('/stats', cacheMiddleware(600), async (_req: Request, res: Response) => {
  const [total, byLevel, byCategory] = await Promise.all([
    prisma.subsidy.count({ where: { status: 'active' } }),
    prisma.subsidy.groupBy({ by: ['level'], where: { status: 'active' }, _count: { id: true } }),
    prisma.subsidy.groupBy({ by: ['category'], where: { status: 'active' }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 8 }),
  ]);
  res.json({ data: { total, byLevel, byCategory } });
});

router.get('/analytics', cacheMiddleware(600), async (_req: Request, res: Response) => {
  const where = { status: 'active' as const };
  const [total, byLevel, byCategory, byPrefecture, amountStats, deadlineCount] = await Promise.all([
    prisma.subsidy.count({ where }),
    prisma.subsidy.groupBy({ by: ['level'], where, _count: { id: true } }),
    prisma.subsidy.groupBy({ by: ['category'], where, _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.subsidy.groupBy({ by: ['prefecture'], where, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 12 }),
    prisma.subsidy.aggregate({ where: { ...where, maxAmount: { not: null } }, _avg: { maxAmount: true }, _max: { maxAmount: true }, _min: { maxAmount: true } }),
    prisma.subsidy.count({ where: { ...where, applicationEnd: { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } } }),
  ]);

  res.json({
    data: {
      total,
      byLevel: byLevel.map(l => ({ label: l.level, count: l._count.id })),
      byCategory: byCategory.map(c => ({ label: c.category, count: c._count.id })),
      byPrefecture: byPrefecture.map(p => ({ label: p.prefecture, count: p._count.id })),
      amount: {
        avg: amountStats._avg.maxAmount ? Number(amountStats._avg.maxAmount) : 0,
        max: amountStats._max.maxAmount ? Number(amountStats._max.maxAmount) : 0,
        min: amountStats._min.maxAmount ? Number(amountStats._min.maxAmount) : 0,
      },
      deadlineSoon: deadlineCount,
    },
  });
});

// 閲覧履歴ベースのレコメンド（カテゴリ・都道府県の嗜好から推薦）
router.get('/reco/personalized', async (req: Request, res: Response) => {
  const { categories, prefectures, exclude, limit = '6' } = req.query as Record<string, string>;
  const cats = categories ? categories.split(',').filter(Boolean) : [];
  const prefs = prefectures ? prefectures.split(',').filter(Boolean) : [];
  const excludeIds = exclude ? exclude.split(',').filter(Boolean) : [];
  const take = Math.min(parseInt(limit) || 6, 20);

  // 嗜好が無い場合は新着を返す
  if (cats.length === 0 && prefs.length === 0) {
    const data = await prisma.subsidy.findMany({
      where: { status: 'active', id: { notIn: excludeIds.length ? excludeIds : undefined } },
      take, orderBy: { createdAt: 'desc' },
    });
    return res.json({ data, basis: 'recent' });
  }

  const orConditions: any[] = [];
  if (cats.length) orConditions.push({ category: { in: cats } });
  if (prefs.length) orConditions.push({ prefecture: { in: prefs } });

  const data = await prisma.subsidy.findMany({
    where: {
      status: 'active',
      id: excludeIds.length ? { notIn: excludeIds } : undefined,
      OR: orConditions,
    },
    take, orderBy: { createdAt: 'desc' },
  });

  // 件数が足りなければ新着で補完
  if (data.length < take) {
    const fillIds = [...excludeIds, ...data.map(d => d.id)];
    const fill = await prisma.subsidy.findMany({
      where: { status: 'active', id: { notIn: fillIds } },
      take: take - data.length, orderBy: { createdAt: 'desc' },
    });
    data.push(...fill);
  }

  res.json({ data, basis: 'personalized' });
});

router.get('/:id', async (req: Request, res: Response) => {
  const data = await prisma.subsidy.findUnique({ where: { id: req.params.id } });
  if (!data) return res.status(404).json({ error: 'Not found' });

  // Related subsidies: same category + prefecture
  const related = await prisma.subsidy.findMany({
    where: {
      id: { not: data.id },
      status: 'active',
      OR: [
        { category: data.category, prefecture: data.prefecture },
        { category: data.category },
      ],
    },
    take: 4,
    orderBy: { createdAt: 'desc' },
  });

  res.json({ data, related });
});

router.get('/:id/pdf', async (req: Request, res: Response) => {
  const subsidy = await prisma.subsidy.findUnique({ where: { id: req.params.id } });
  if (!subsidy) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="subsidy_${subsidy.id}.pdf"`);
  generateSubsidyPdf(subsidy as any).pipe(res);
});

export default router;

router.get('/calendar/events', async (req: Request, res: Response) => {
  const { year, month } = req.query as Record<string, string>;
  const y = parseInt(year || String(new Date().getFullYear()));
  const m = parseInt(month || String(new Date().getMonth() + 1));
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59);

  const data = await prisma.subsidy.findMany({
    where: {
      status: 'active',
      OR: [
        { applicationStart: { gte: start, lte: end } },
        { applicationEnd: { gte: start, lte: end } },
        { applicationStart: { lte: start }, applicationEnd: { gte: end } },
      ],
    },
    select: { id: true, title: true, category: true, level: true, applicationStart: true, applicationEnd: true, maxAmount: true, prefecture: true },
    orderBy: { applicationEnd: 'asc' },
  });
  res.json({ data });
});
