// Phase 38: 会員向けAIコンシェルジュ。相談者の自由文から、DBの補助金を理由つきで提案する。
// ANTHROPIC_API_KEY 未設定の環境（CI 等）では呼び出さないフェイルセーフ設計。
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import {
  buildConciergeMessages,
  parseRecommendations,
  ConciergeCandidate,
  ConciergeInput,
} from '../utils/aiConcierge';

const MODEL = 'claude-opus-4-8';

export class ConciergeError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'ConciergeError';
    this.statusCode = statusCode;
  }
}

export interface RecommendedSubsidy {
  id: string;
  title: string;
  category: string;
  prefecture: string;
  level: string;
  maxAmount: number | null;
  targetType: string;
  reason: string;
}

export async function recommendSubsidies(input: ConciergeInput): Promise<RecommendedSubsidy[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ConciergeError('ANTHROPIC_API_KEY が未設定のため、AIコンシェルジュを利用できません。', 503);
  }

  const where: any = { status: 'active' };
  if (input.prefecture) where.OR = [{ prefecture: input.prefecture }, { level: '国' }];
  const subs = await prisma.subsidy.findMany({ where, orderBy: { viewCount: 'desc' }, take: 40 });
  if (subs.length === 0) return [];

  const candidates: ConciergeCandidate[] = subs.map((s) => ({
    id: s.id,
    title: s.title,
    category: s.category,
    prefecture: s.prefecture,
    level: s.level,
    maxAmount: s.maxAmount != null ? Number(s.maxAmount) : null,
    summary: (s.description || '').slice(0, 120),
  }));

  const { system, user } = buildConciergeMessages(input, candidates);
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    system,
    messages: [{ role: 'user', content: user }],
  });

  const text = response.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n')
    .trim();

  const recs = parseRecommendations(text, candidates.map((c) => c.id));

  const subById = new Map(subs.map((s) => [s.id, s]));
  const result: RecommendedSubsidy[] = [];
  for (const r of recs) {
    const s = subById.get(r.id);
    if (!s) continue;
    result.push({
      id: s.id,
      title: s.title,
      category: s.category,
      prefecture: s.prefecture,
      level: s.level,
      maxAmount: s.maxAmount != null ? Number(s.maxAmount) : null,
      targetType: s.targetType,
      reason: r.reason,
    });
  }
  return result;
}
