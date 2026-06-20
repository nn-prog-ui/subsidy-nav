// Phase 35: AI申請書ドラフト生成のための純粋関数群（プロンプト組立・応答パース）。
// Claude 呼び出し本体は services/applicationDraft.ts。APIキー不要でテスト可能。

export interface DraftProfile {
  companyName: string;   // 事業者名
  industry: string;      // 業種
  employees: string;     // 従業員規模（例: 5名 / 10〜50名）
  businessSummary: string; // 事業概要
  projectPlan: string;   // 今回申請したい取り組み
}

export interface DraftSubsidyInput {
  title: string;
  description: string;
  category: string;
  targetType: string;
  prefecture: string;
  level: string;
  maxAmount: bigint | number | null;
  subsidyRate?: string | null;
  requirements?: string | null;
}

export interface ApplicationDraftContent {
  summary: string;         // 事業計画の要約
  motivation: string;      // 申請動機・背景
  plan: string;            // 取り組み内容・実施計画
  expectedOutcome: string; // 期待される効果・成果
  appeal: string;          // 審査でのアピールポイント
}

export const DRAFT_SYSTEM_PROMPT = [
  'あなたは日本の補助金・助成金の申請書作成を支援するプロのコンサルタント兼ライターです。',
  '申請者の情報と対象補助金の趣旨をふまえ、採択されやすい申請書（事業計画書）の下書きを作成します。',
  '- 補助金の目的に申請内容を結びつけ、政策的意義・地域/社会への波及効果を織り込む。',
  '- 抽象論で埋めず、申請者が記入・推敲しやすい具体的な文章にする。事実が不明な箇所は[ ]で補記を促す。',
  '- 誇張・虚偽は避け、申請者が後から事実に合わせて調整できる「たたき台」として書く。',
  '必ず指定のJSON形式のみで回答し、前後に説明文やコードフェンス（```）を付けないこと。',
].join('\n');

function fmtAmount(v: bigint | number | null): string {
  if (v === null || v === undefined) return '記載なし';
  const n = typeof v === 'bigint' ? Number(v) : v;
  if (!Number.isFinite(n) || n <= 0) return '記載なし';
  return `¥${n.toLocaleString('ja-JP')}`;
}

export function buildDraftMessages(s: DraftSubsidyInput, p: DraftProfile): { system: string; user: string } {
  const user = [
    '以下の申請者情報と対象補助金にもとづき、申請書（事業計画書）の下書きを作成してください。',
    '',
    '# 対象補助金',
    `- 名称: ${s.title}`,
    `- カテゴリ: ${s.category} / 地域・レベル: ${s.prefecture}（${s.level}）`,
    `- 対象: ${s.targetType}`,
    `- 補助上限額: ${fmtAmount(s.maxAmount)} / 補助率: ${s.subsidyRate || '記載なし'}`,
    `- 概要: ${(s.description || '').slice(0, 1200)}`,
    `- 申請要件: ${(s.requirements || '記載なし').slice(0, 800)}`,
    '',
    '# 申請者情報',
    `- 事業者名: ${p.companyName}`,
    `- 業種: ${p.industry}`,
    `- 従業員規模: ${p.employees}`,
    `- 事業概要: ${p.businessSummary}`,
    `- 申請したい取り組み: ${p.projectPlan}`,
    '',
    '# 出力するJSON（このキー構成を厳守。各値は日本語の文章）',
    '{',
    '  "summary": "事業計画の要約（200字程度）",',
    '  "motivation": "申請動機・背景（この補助金で何を解決するか、政策趣旨との整合）",',
    '  "plan": "取り組み内容・実施計画（具体的なステップや実施体制）",',
    '  "expectedOutcome": "期待される効果・成果（可能なら定量目標と定性効果）",',
    '  "appeal": "審査でのアピールポイント（優位性・実現可能性・地域/社会への波及）"',
    '}',
  ].join('\n');
  return { system: DRAFT_SYSTEM_PROMPT, user };
}

function stripCodeFence(text: string): string {
  const t = text.trim();
  const fenced = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return (fenced ? fenced[1] : t).trim();
}

function toText(v: unknown): string {
  return typeof v === 'string' ? v.trim().slice(0, 4000) : '';
}

/**
 * Claude のテキスト応答を ApplicationDraftContent に変換する。
 * コードフェンス/前後ノイズに強い。最低限 summary か plan が無ければ例外。
 */
export function parseDraft(text: string): ApplicationDraftContent {
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
  const content: ApplicationDraftContent = {
    summary: toText(obj.summary),
    motivation: toText(obj.motivation),
    plan: toText(obj.plan),
    expectedOutcome: toText(obj.expectedOutcome),
    appeal: toText(obj.appeal),
  };
  if (!content.summary && !content.plan) {
    throw new Error('AIが有効な下書きを生成できませんでした');
  }
  return content;
}
