// Phase 32: 公式サイト/告示ページを Claude で構造化し、補助金候補（ExtractedSubsidy）として保存する。
// 承認時に Subsidy へ公開。ANTHROPIC_API_KEY 未設定の環境（CI 等）では呼び出さないフェイルセーフ設計。
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { prisma } from '../lib/prisma';
import { invalidateCache } from '../middleware/cache';
import { withRetry } from '../utils/retry';
import { htmlToText, buildExtractionMessages, parseExtractions } from '../utils/extraction';

const MODEL = 'claude-opus-4-8';

export class ExtractionError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'ExtractionError';
    this.statusCode = statusCode;
  }
}

/**
 * URL のページを取得し、Claude で補助金候補を抽出して ExtractedSubsidy に保存する。
 * 返り値は保存した候補件数。
 */
export async function extractFromUrl(sourceUrl: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ExtractionError('ANTHROPIC_API_KEY が未設定のため、AI抽出を実行できません。', 503);
  }
  if (!/^https?:\/\//i.test(sourceUrl)) {
    throw new ExtractionError('有効なURL（http/https）を指定してください。', 400);
  }

  let html: string;
  try {
    const res = await withRetry(
      () => axios.get<string>(sourceUrl, {
        timeout: 15000,
        responseType: 'text',
        headers: { 'User-Agent': 'Mozilla/5.0 SubsidyNavigatorBot/1.0' },
      }),
      { retries: 2, baseDelayMs: 1000 },
    );
    html = typeof res.data === 'string' ? res.data : String(res.data);
  } catch {
    throw new ExtractionError('ページの取得に失敗しました。URLをご確認ください。', 502);
  }

  const text = htmlToText(html);
  if (text.length < 50) {
    throw new ExtractionError('本文を取得できませんでした（JavaScript描画ページの可能性）。', 422);
  }

  const { system, user } = buildExtractionMessages(text, sourceUrl);
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    system,
    messages: [{ role: 'user', content: user }],
  });

  const out = response.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n')
    .trim();

  const candidates = parseExtractions(out);
  if (candidates.length === 0) {
    return { saved: 0 };
  }

  await Promise.all(
    candidates.map((c) =>
      prisma.extractedSubsidy.create({
        data: {
          sourceUrl,
          title: c.title,
          description: c.description,
          category: c.category,
          targetType: c.targetType,
          prefecture: c.prefecture,
          municipalityName: c.municipalityName,
          level: c.municipalityName ? '市区町村' : (c.prefecture === '全国' ? '国' : '都道府県'),
          maxAmount: c.maxAmount != null ? BigInt(c.maxAmount) : null,
          subsidyRate: c.subsidyRate,
          applicationStart: c.applicationStart ? new Date(c.applicationStart) : null,
          applicationEnd: c.applicationEnd ? new Date(c.applicationEnd) : null,
          applicationUrl: c.applicationUrl || sourceUrl,
          confidence: c.confidence,
          model: MODEL,
        },
      }),
    ),
  );

  return { saved: candidates.length };
}

/** 候補を承認して Subsidy として公開する。 */
export async function approveExtraction(id: string, now: Date = new Date()) {
  const c = await prisma.extractedSubsidy.findUnique({ where: { id } });
  if (!c) throw new ExtractionError('候補が見つかりません', 404);
  if (c.status === 'approved') throw new ExtractionError('この候補は既に公開済みです', 409);

  const status = c.applicationEnd && c.applicationEnd.getTime() < now.getTime() ? 'closed' : 'active';
  const subsidy = await prisma.subsidy.create({
    data: {
      title: c.title,
      description: c.description,
      category: c.category,
      targetType: c.targetType,
      prefecture: c.prefecture,
      municipalityName: c.municipalityName,
      level: c.level,
      maxAmount: c.maxAmount,
      subsidyRate: c.subsidyRate,
      applicationStart: c.applicationStart,
      applicationEnd: c.applicationEnd,
      applicationUrl: c.applicationUrl,
      status,
      source: 'ai-extract',
      sourceId: `ai-extract:${c.id}`,
    },
  });

  await prisma.extractedSubsidy.update({
    where: { id },
    data: { status: 'approved', publishedId: subsidy.id },
  });

  invalidateCache('/api/subsidies');
  return subsidy;
}

/** 候補を却下する。 */
export async function rejectExtraction(id: string) {
  const c = await prisma.extractedSubsidy.findUnique({ where: { id } });
  if (!c) throw new ExtractionError('候補が見つかりません', 404);
  await prisma.extractedSubsidy.update({ where: { id }, data: { status: 'rejected' } });
  return { id, status: 'rejected' };
}
