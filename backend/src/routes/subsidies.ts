import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { generateSubsidyPdf } from '../services/pdf';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  const { prefecture, category, level, keyword, targetType, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  // Full-text search via raw SQL when keyword provided
  if (keyword && keyword.trim()) {
    const sanitized = keyword.trim().split(/\s+/).map(w => w + ':*').join(' & ');
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
  if (prefecture && prefecture !== '全国') (where as any).OR = [{ prefecture }, { prefecture: '全国' }];
  if (category) where.category = category;
  if (level) where.level = level;
  if (targetType) where.targetType = { contains: targetType };
  if (keyword) where.OR = [
    { title: { contains: keyword, mode: 'insensitive' } },
    { description: { contains: keyword, mode: 'insensitive' } },
  ];

  const [total, data] = await Promise.all([
    prisma.subsidy.count({ where }),
    prisma.subsidy.findMany({ where, skip, take: limitNum, orderBy: { createdAt: 'desc' } }),
  ]);
  res.json({ data, meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) } });
});

router.get('/stats', async (_req: Request, res: Response) => {
  const [total, byLevel, byCategory] = await Promise.all([
    prisma.subsidy.count({ where: { status: 'active' } }),
    prisma.subsidy.groupBy({ by: ['level'], where: { status: 'active' }, _count: { id: true } }),
    prisma.subsidy.groupBy({ by: ['category'], where: { status: 'active' }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 8 }),
  ]);
  res.json({ data: { total, byLevel, byCategory } });
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
