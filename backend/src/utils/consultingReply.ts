// Phase 37: 相談リクエストへのAI返信ドラフト生成の純粋関数群（プロンプト組立・応答パース）。
// Claude 呼び出し本体は services/consultingReply.ts。APIキー不要でテスト可能。

export interface ConsultingInput {
  name: string;
  company?: string | null;
  prefecture?: string | null;
  industry?: string | null;
  employees?: string | null;
  budget?: string | null;
  message: string;
}

export interface ReplyCandidate {
  id: string;
  title: string;
  category: string;
  prefecture: string;
  level: string;
  maxAmount: number | null;
  summary: string;
}

export interface ConsultingReplyContent {
  reply: string;          // 返信メール本文
  suggestedIds: string[]; // 本文で薦めた補助金ID（候補内に限定）
}

export const REPLY_SYSTEM_PROMPT = [
  'あなたは日本の補助金・助成金を専門とするプロのコンサルタントです。',
  '無料相談に申し込んだ相談者へ、丁寧でプロフェッショナルな返信メールの本文を作成します。',
  '- 相談内容に共感を示しつつ、提示された候補補助金から相談内容に合うものを2〜3件、本文中で名称を挙げて簡潔に薦める。',
  '- 候補に適切なものが無ければ無理に薦めず、ヒアリングを提案する。事実の創作はしない。',
  '- 末尾で個別の無料相談（面談/オンライン）を案内し、署名は「補助金ナビ コンサルティングチーム」とする。',
  '必ず指定のJSON形式のみで回答し、前後に説明文やコードフェンス（```）を付けないこと。',
].join('\n');

function fmtAmount(v: number | null): string {
  if (v === null || v === undefined || !Number.isFinite(v) || v <= 0) return '記載なし';
  return `¥${v.toLocaleString('ja-JP')}`;
}

export function buildReplyMessages(req: ConsultingInput, candidates: ReplyCandidate[]): { system: string; user: string } {
  const list = candidates.length
    ? candidates.map(c => `- [${c.id}] ${c.title}（${c.category}／${c.prefecture}・${c.level}／上限${fmtAmount(c.maxAmount)}）: ${c.summary}`).join('\n')
    : '（該当候補なし）';
  const user = [
    '次の相談者へ返信メールの本文を作成してください。',
    '',
    '# 相談内容',
    `- 氏名: ${req.name}`,
    `- 会社/屋号: ${req.company || '記載なし'}`,
    `- 地域: ${req.prefecture || '記載なし'}`,
    `- 業種: ${req.industry || '記載なし'}`,
    `- 従業員規模: ${req.employees || '記載なし'}`,
    `- 想定予算: ${req.budget || '記載なし'}`,
    `- ご相談: ${(req.message || '').slice(0, 1500)}`,
    '',
    '# 提案候補（この中からのみ選ぶこと。本文で薦めたものの id を suggestedIds に列挙）',
    list,
    '',
    '# 出力するJSON（このキー構成を厳守）',
    '{',
    '  "reply": "返信メールの本文（挨拶〜署名まで。日本語）",',
    '  "suggestedIds": ["本文で薦めた補助金のid（候補内のもの。0〜3件）"]',
    '}',
  ].join('\n');
  return { system: REPLY_SYSTEM_PROMPT, user };
}

function stripCodeFence(text: string): string {
  const t = text.trim();
  const fenced = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return (fenced ? fenced[1] : t).trim();
}

/**
 * Claude のテキスト応答を ConsultingReplyContent に変換する。
 * suggestedIds は候補(validIds)内のものに限定し、ハルシネーションを除去。
 */
export function parseReply(text: string, validIds: string[]): ConsultingReplyContent {
  const cleaned = stripCodeFence(text);
  let obj: any;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { obj = JSON.parse(cleaned.slice(start, end + 1)); } catch { /* fallthrough */ }
    }
  }
  if (!obj || typeof obj !== 'object') {
    throw new Error('AI応答をJSONとして解析できませんでした');
  }
  const reply = typeof obj.reply === 'string' ? obj.reply.trim().slice(0, 4000) : '';
  const valid = new Set(validIds);
  const ids = Array.isArray(obj.suggestedIds) ? obj.suggestedIds : [];
  const suggestedIds = ids.map((x: unknown) => String(x)).filter((id: string) => valid.has(id)).slice(0, 5);
  if (!reply) throw new Error('AIが有効な返信を生成できませんでした');
  return { reply, suggestedIds };
}
