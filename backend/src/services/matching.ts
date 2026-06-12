import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const INDUSTRY_CATEGORY_MAP: Record<string, string[]> = {
  'IT・ソフトウェア': ['IT・デジタル', '創業支援'],
  '製造業': ['設備投資', 'IT・デジタル', '環境・エネルギー'],
  '飲食業': ['販路拡大', '創業支援', '雇用促進'],
  '小売業': ['販路拡大', 'IT・デジタル', '創業支援'],
  '農業・林業・漁業': ['農業・林業', '環境・エネルギー'],
  '建設業': ['設備投資', '雇用促進'],
  '医療・福祉': ['雇用促進', '設備投資', '医療・介護'],
  '観光・宿泊': ['観光・まちづくり', 'IT・デジタル', '販路拡大', '創業支援'],
  'その他サービス業': ['創業支援', '販路拡大', '雇用促進'],
};

export interface MatchCandidate {
  category: string;
  prefecture: string;
  level: string;
  targetType: string;
  maxAmount: bigint | number | null;
  applicationEnd: Date | null;
}

export interface MatchContext {
  prefecture: string;
  categories: string[];
  employeeCount: number;
  now?: Date;
}

/**
 * 補助金1件のマッチ度を採点する純粋関数。理由配列と0-100の正規化スコアを返す。
 */
export function scoreSubsidy(s: MatchCandidate, ctx: MatchContext): { score: number; matchScore: number; reasons: string[] } {
  const now = ctx.now ?? new Date();
  let score = 0;
  const reasons: string[] = [];

  if (s.prefecture === ctx.prefecture && ctx.prefecture !== '全国') {
    score += 30; reasons.push('お住まいの地域が対象');
  } else if (s.prefecture === '全国') {
    score += 12; reasons.push('全国対象');
  }

  if (ctx.categories.includes(s.category)) {
    score += 25; reasons.push('業種・事業内容に合致');
  }

  if (s.level === '市区町村') { score += 12; reasons.push('地元自治体の制度'); }
  else if (s.level === '都道府県') { score += 8; }

  if (ctx.employeeCount > 0 && ctx.employeeCount <= 20 && s.targetType.includes('小規模')) {
    score += 15; reasons.push('小規模事業者向け');
  }
  if (ctx.employeeCount <= 300 && s.targetType.includes('中小企業')) {
    score += 12; reasons.push('中小企業向け');
  }

  if (s.maxAmount && Number(s.maxAmount) >= 10000000) {
    score += 8; reasons.push('高額の補助上限');
  } else if (s.maxAmount && Number(s.maxAmount) >= 1000000) {
    score += 4;
  }

  // 申請締切による調整
  if (s.applicationEnd) {
    const days = Math.ceil((s.applicationEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) {
      score -= 40; // 締切済みは大きく減点
    } else if (days <= 30) {
      score += 6; reasons.push('まもなく締切（申請受付中）');
    }
  }

  const matchScore = Math.max(0, Math.min(100, score));
  return { score, matchScore, reasons };
}

export async function runMatching(params: { prefecture: string; industry: string; employees: string }) {
  const categories = INDUSTRY_CATEGORY_MAP[params.industry] || ['各種補助金'];
  const employeeCount = parseInt(params.employees) || 0;
  const now = new Date();

  // 地域で候補を広めに取得し、スコアリングで関連度を判定（recall重視）
  const subsidies = await prisma.subsidy.findMany({
    where: {
      status: 'active',
      OR: [{ prefecture: params.prefecture }, { prefecture: '全国' }],
    },
    take: 80,
    orderBy: { maxAmount: 'desc' },
  });

  const ctx: MatchContext = { prefecture: params.prefecture, categories, employeeCount, now };

  const scored = subsidies
    .map(s => {
      const { score, matchScore, reasons } = scoreSubsidy(s as MatchCandidate, ctx);
      return { ...s, score, matchScore, reasons };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return scored;
}
