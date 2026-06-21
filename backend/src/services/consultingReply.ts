// Phase 37: 相談リクエストに対する返信ドラフトを Claude で生成する（管理者向け）。
// DBの補助金から候補を選び、相談内容に合うものを本文で薦める。返信はDB保存しない。
// ANTHROPIC_API_KEY 未設定の環境（CI 等）では呼び出さないフェイルセーフ設計。
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import {
  buildReplyMessages,
  parseReply,
  ReplyCandidate,
  ConsultingInput,
} from '../utils/consultingReply';

const MODEL = 'claude-opus-4-8';

export class ConsultingReplyError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'ConsultingReplyError';
    this.statusCode = statusCode;
  }
}

export interface SuggestedSubsidy {
  id: string;
  title: string;
  category: string;
  prefecture: string;
  level: string;
  maxAmount: number | null;
}

export async function generateConsultingReply(requestId: string): Promise<{ reply: string; suggested: SuggestedSubsidy[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ConsultingReplyError('ANTHROPIC_API_KEY が未設定のため、AI返信ドラフトを生成できません。', 503);
  }

  const reqRow = await prisma.consultingRequest.findUnique({ where: { id: requestId } });
  if (!reqRow) throw new ConsultingReplyError('相談リクエストが見つかりません', 404);

  // 候補補助金: 募集中で、相談者の都道府県該当 or 全国施策。閲覧数の多い順に最大30件。
  const where: any = { status: 'active' };
  if (reqRow.prefecture) where.OR = [{ prefecture: reqRow.prefecture }, { level: '国' }];
  const subs = await prisma.subsidy.findMany({ where, orderBy: { viewCount: 'desc' }, take: 30 });

  const candidates: ReplyCandidate[] = subs.map((s) => ({
    id: s.id,
    title: s.title,
    category: s.category,
    prefecture: s.prefecture,
    level: s.level,
    maxAmount: s.maxAmount != null ? Number(s.maxAmount) : null,
    summary: (s.description || '').slice(0, 120),
  }));

  const input: ConsultingInput = {
    name: reqRow.name,
    company: reqRow.company,
    prefecture: reqRow.prefecture,
    industry: reqRow.industry,
    employees: reqRow.employees,
    budget: reqRow.budget,
    message: reqRow.message,
  };

  const { system, user } = buildReplyMessages(input, candidates);
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system,
    messages: [{ role: 'user', content: user }],
  });

  const text = response.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n')
    .trim();

  let content;
  try {
    content = parseReply(text, candidates.map((c) => c.id));
  } catch {
    throw new ConsultingReplyError('AIの応答を解析できませんでした。時間をおいて再試行してください。', 502);
  }

  const byId = new Map(candidates.map((c) => [c.id, c]));
  const suggested: SuggestedSubsidy[] = content.suggestedIds
    .map((id) => byId.get(id))
    .filter((c): c is ReplyCandidate => !!c)
    .map((c) => ({ id: c.id, title: c.title, category: c.category, prefecture: c.prefecture, level: c.level, maxAmount: c.maxAmount }));

  return { reply: content.reply, suggested };
}
