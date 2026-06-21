// Phase 38: 会員向けAIコンシェルジュの純粋関数群（プロンプト組立・応答パース）。
// Claude 呼び出し本体は services/aiConcierge.ts。APIキー不要でテスト可能。

export interface ConciergeInput {
  situation: string;        // 事業内容・やりたいこと（自由文）
  prefecture?: string | null;
}

export interface ConciergeCandidate {
  id: string;
  title: string;
  category: string;
  prefecture: string;
  level: string;
  maxAmount: number | null;
  summary: string;
}

export interface Recommendation {
  id: string;
  reason: string;
}

export const CONCIERGE_SYSTEM_PROMPT = [
  'あなたは日本の補助金・助成金を専門とするプロのコンサルタントです。',
  '相談者の状況を読み取り、提示された候補補助金の中から最も適したものを最大5件、適合度の高い順に選びます。',
  '- 各補助金について、なぜ相談者に合うのかを1〜2文で具体的に説明する。',
  '- 候補内のものだけを選び、idは候補のものをそのまま使う。適切なものが無ければ空配列を返す。',
  '- 事実の創作はしない。',
  '必ず指定のJSON配列のみで回答し、前後に説明文やコードフェンス（```）を付けないこと。',
].join('\n');

function fmtAmount(v: number | null): string {
  if (v === null || v === undefined || !Number.isFinite(v) || v <= 0) return '記載なし';
  return `¥${v.toLocaleString('ja-JP')}`;
}

export function buildConciergeMessages(input: ConciergeInput, candidates: ConciergeCandidate[]): { system: string; user: string } {
  const list = candidates.length
    ? candidates.map(c => `- [${c.id}] ${c.title}（${c.category}／${c.prefecture}・${c.level}／上限${fmtAmount(c.maxAmount)}）: ${c.summary}`).join('\n')
    : '（候補なし）';
  const user = [
    '次の相談者に合う補助金を、候補の中から選んで提案してください。',
    '',
    '# 相談者の状況',
    input.prefecture ? `- 地域: ${input.prefecture}` : '- 地域: 指定なし',
    `- 内容: ${(input.situation || '').slice(0, 1500)}`,
    '',
    '# 候補補助金（この中からのみ選ぶ）',
    list,
    '',
    '# 出力するJSON（配列。適合度の高い順、最大5件。該当なしは []）',
    '[',
    '  { "id": "候補のid", "reason": "この相談者に合う理由（1〜2文）" }',
    ']',
  ].join('\n');
  return { system: CONCIERGE_SYSTEM_PROMPT, user };
}

function stripCodeFence(text: string): string {
  const t = text.trim();
  const fenced = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return (fenced ? fenced[1] : t).trim();
}

/**
 * Claude のテキスト応答を Recommendation[] に変換する。
 * id は候補(validIds)内のものに限定し、重複・ハルシネーションを除去。最大5件。
 */
export function parseRecommendations(text: string, validIds: string[]): Recommendation[] {
  const cleaned = stripCodeFence(text);
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start >= 0 && end > start) {
      try { parsed = JSON.parse(cleaned.slice(start, end + 1)); } catch { /* fallthrough */ }
    }
  }
  const arr: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.recommendations)
      ? parsed.recommendations
      : [];

  const valid = new Set(validIds);
  const seen = new Set<string>();
  const out: Recommendation[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const id = typeof item.id === 'string' ? item.id : '';
    if (!id || !valid.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, reason: typeof item.reason === 'string' ? item.reason.trim().slice(0, 500) : '' });
    if (out.length >= 5) break;
  }
  return out;
}
