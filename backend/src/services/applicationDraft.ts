// Phase 35: Claude で会員向けに申請書ドラフトを生成する。
// プライバシー配慮のため申請者情報はDBに保存せず、生成結果だけ返す（ステートレス）。
// ANTHROPIC_API_KEY 未設定の環境（CI 等）では呼び出さないフェイルセーフ設計。
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';
import {
  buildDraftMessages,
  parseDraft,
  DraftProfile,
  DraftSubsidyInput,
  ApplicationDraftContent,
} from '../utils/applicationDraft';

const MODEL = 'claude-opus-4-8';

export class DraftError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'DraftError';
    this.statusCode = statusCode;
  }
}

export async function generateApplicationDraft(
  subsidyId: string,
  profile: DraftProfile,
): Promise<ApplicationDraftContent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new DraftError('ANTHROPIC_API_KEY が未設定のため、AI申請書ドラフトを生成できません。', 503);
  }

  const subsidy = await prisma.subsidy.findUnique({ where: { id: subsidyId } });
  if (!subsidy) throw new DraftError('補助金が見つかりません', 404);

  const { system, user } = buildDraftMessages(subsidy as DraftSubsidyInput, profile);

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

  try {
    return parseDraft(text);
  } catch {
    throw new DraftError('AIの応答を解析できませんでした。時間をおいて再試行してください。', 502);
  }
}
