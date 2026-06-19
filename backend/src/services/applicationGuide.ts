// Phase 31: Claude API で補助金ごとの申請ガイド（コンサル納品物）を生成する。
// ANTHROPIC_API_KEY が無い環境（CI 等）では呼び出さずにエラーを返すフェイルセーフ設計。
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import { invalidateCache } from '../middleware/cache';
import {
  buildGuideMessages,
  parseGuide,
  GuideSubsidyInput,
  ApplicationGuideContent,
} from '../utils/applicationGuide';

const MODEL = 'claude-opus-4-8';

export class GuideError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'GuideError';
    this.statusCode = statusCode;
  }
}

/**
 * 指定補助金の申請ガイドを生成し、ApplicationGuide に upsert して返す。
 * - APIキー未設定: 503 相当の GuideError
 * - 補助金が無い: 404 相当の GuideError
 */
export async function generateApplicationGuide(subsidyId: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new GuideError('ANTHROPIC_API_KEY が未設定のため、AI申請ガイドを生成できません。', 503);
  }

  const subsidy = await prisma.subsidy.findUnique({ where: { id: subsidyId } });
  if (!subsidy) throw new GuideError('補助金が見つかりません', 404);

  const { system, user } = buildGuideMessages(subsidy as GuideSubsidyInput);

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

  let content: ApplicationGuideContent;
  try {
    content = parseGuide(text);
  } catch {
    throw new GuideError('AIの応答を解析できませんでした。時間をおいて再試行してください。', 502);
  }
  if (!content.overview && content.writingTips.length === 0) {
    throw new GuideError('AIが有効なガイドを生成できませんでした。', 502);
  }

  const guide = await prisma.applicationGuide.upsert({
    where: { subsidyId },
    create: { subsidyId, ...content, model: MODEL },
    update: { ...content, model: MODEL, generatedAt: new Date() },
  });

  invalidateCache('/api/subsidies');
  return guide;
}
