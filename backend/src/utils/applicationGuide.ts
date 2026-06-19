// Phase 31: AI申請ガイド生成のための純粋関数群（プロンプト組み立て・応答パース）。
// Claude API 呼び出し本体は services/applicationGuide.ts にあり、ここはAPIキー不要でテスト可能。

export interface GuideSubsidyInput {
  title: string;
  description: string;
  category: string;
  prefecture: string;
  level: string;
  targetType: string;
  maxAmount: bigint | number | null;
  subsidyRate?: string | null;
  requirements?: string | null;
  applicationEnd?: Date | string | null;
  applicationSteps?: string[];
  requiredDocuments?: string[];
}

export interface ApplicationGuideContent {
  overview: string;
  writingTips: string[];
  preparation: string[];
  schedule: string[];
  disbursementDays: number | null;
  pitfalls: string[];
}

export const GUIDE_SYSTEM_PROMPT = [
  'あなたは日本の補助金・助成金申請を専門とする経験豊富なプロのコンサルタントです。',
  'クライアントが採択を勝ち取り、確実に入金まで到達できるよう、具体的で実践的な申請ガイドを作成します。',
  '一般論ではなく、提示された補助金の性質・対象・金額に即した助言を行ってください。',
  '必ず指定のJSON形式のみで回答し、前後に説明文やコードフェンス（```）を付けないこと。',
].join('\n');

function fmtAmount(v: bigint | number | null): string {
  if (v === null || v === undefined) return '記載なし';
  const n = typeof v === 'bigint' ? Number(v) : v;
  if (!Number.isFinite(n) || n <= 0) return '記載なし';
  return `¥${n.toLocaleString('ja-JP')}`;
}

function fmtDate(v: Date | string | null | undefined): string {
  if (!v) return '記載なし';
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? '記載なし' : d.toLocaleDateString('ja-JP');
}

/**
 * 補助金1件から Claude へ送る system / user メッセージを組み立てる。
 * 出力キー構成（overview/writingTips/preparation/schedule/disbursementDays/pitfalls）を厳守させる。
 */
export function buildGuideMessages(s: GuideSubsidyInput): { system: string; user: string } {
  const steps = (s.applicationSteps || []).filter(Boolean).join(' / ') || 'なし';
  const docs = (s.requiredDocuments || []).filter(Boolean).join(' / ') || 'なし';
  const user = [
    '以下の補助金について、申請者向けの実践的な申請ガイドを作成してください。',
    '',
    '# 補助金情報',
    `- 名称: ${s.title}`,
    `- カテゴリ: ${s.category}`,
    `- 地域 / レベル: ${s.prefecture} / ${s.level}`,
    `- 対象: ${s.targetType}`,
    `- 補助上限額: ${fmtAmount(s.maxAmount)}`,
    `- 補助率: ${s.subsidyRate || '記載なし'}`,
    `- 申請締切: ${fmtDate(s.applicationEnd)}`,
    `- 概要: ${(s.description || '').slice(0, 1500)}`,
    `- 申請要件: ${(s.requirements || '記載なし').slice(0, 1000)}`,
    `- 公表されている申請ステップ: ${steps}`,
    `- 公表されている必要書類: ${docs}`,
    '',
    '# 出力するJSONの形（このキー構成を厳守）',
    '{',
    '  "overview": "この補助金の狙いと採択のポイントを3〜4文で要約",',
    '  "writingTips": ["申請書（事業計画書）の各項目で何を強調すべきかなど、書き方のコツを5項目程度"],',
    '  "preparation": ["事前に準備すべき書類・体制・データを箇条書きで"],',
    '  "schedule": ["申請受付→審査→交付決定→事業実施→実績報告→入金 の想定スケジュールを段階ごとに"],',
    '  "disbursementDays": 申請から入金までの想定日数（整数。不明ならnull）,',
    '  "pitfalls": ["よくある不採択理由・つまずきと回避策を5項目程度"]',
    '}',
    '',
    '- 金額や日数が補助金情報から判断できない場合は、同種制度の一般的な相場で妥当な目安を示し、断定を避ける表現にする。',
    '- writingTips / preparation / schedule / pitfalls は各3〜6項目。日本語で簡潔に。',
  ].join('\n');
  return { system: GUIDE_SYSTEM_PROMPT, user };
}

function stripCodeFence(text: string): string {
  const t = text.trim();
  const fenced = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenced) return fenced[1].trim();
  return t;
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(x => String(x).trim()).filter(Boolean).slice(0, 8);
}

/**
 * Claude のテキスト応答を ApplicationGuideContent に変換する。
 * コードフェンスや前後ノイズに強く、欠損キーは安全側（空配列・null）へ寄せる。
 */
export function parseGuide(text: string): ApplicationGuideContent {
  const cleaned = stripCodeFence(text);
  let obj: any;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    // JSON以外の文が混ざっている場合、最初の { から最後の } までを抽出して再試行
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { obj = JSON.parse(cleaned.slice(start, end + 1)); } catch { /* fallthrough */ }
    }
  }
  if (!obj || typeof obj !== 'object') {
    throw new Error('AI応答をJSONとして解析できませんでした');
  }
  const days = Number(obj.disbursementDays);
  return {
    overview: typeof obj.overview === 'string' ? obj.overview.trim().slice(0, 1200) : '',
    writingTips: toStringArray(obj.writingTips),
    preparation: toStringArray(obj.preparation),
    schedule: toStringArray(obj.schedule),
    disbursementDays: Number.isFinite(days) && days > 0 ? Math.round(days) : null,
    pitfalls: toStringArray(obj.pitfalls),
  };
}
