import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const INDUSTRY_CATEGORY_MAP: Record<string, string[]> = {
  'IT・ソフトウェア': ['IT・デジタル', '創業支援'],
  '製造業': ['設備投資', 'IT・デジタル', '環境・エネルギー'],
  '飲食業': ['販路拡大', '創業支援', '雇用促進'],
  '小売業': ['販路拡大', 'IT・デジタル', '創業支援'],
  '農業・林業・漁業': ['農業・林業', '環境・エネルギー'],
  '建設業': ['設備投資', '雇用促進'],
  '医療・福祉': ['雇用促進', '設備投資'],
  '観光・宿泊': ['IT・デジタル', '販路拡大', '創業支援'],
  'その他サービス業': ['創業支援', '販路拡大', '雇用促進'],
};

export async function runMatching(params: { prefecture: string; industry: string; employees: string }) {
  const categories = INDUSTRY_CATEGORY_MAP[params.industry] || ['各種補助金'];
  const employeeCount = parseInt(params.employees) || 0;

  const subsidies = await prisma.subsidy.findMany({
    where: {
      status: 'active',
      OR: [
        { prefecture: params.prefecture },
        { prefecture: '全国' },
      ],
      category: { in: categories },
    },
    take: 30,
    orderBy: { maxAmount: 'desc' },
  });

  const scored = subsidies.map(s => {
    let score = 0;
    if (s.prefecture === params.prefecture) score += 30;
    if (s.level === '国') score += 10;
    if (s.level === '都道府県') score += 20;
    if (s.level === '市区町村') score += 25;
    if (categories.includes(s.category)) score += 20;
    if (employeeCount <= 20 && s.targetType.includes('小規模')) score += 15;
    if (employeeCount <= 300 && s.targetType.includes('中小企業')) score += 10;
    if (s.maxAmount && Number(s.maxAmount) > 1000000) score += 5;
    return { ...s, score };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 10);
}
