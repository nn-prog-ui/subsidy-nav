// Phase 32: 公式サイト/告示テキストから補助金を構造化抽出するための純粋関数群。
// Claude API 呼び出し本体は services/aiExtraction.ts。ここはネットワーク/APIキー不要でテスト可能。
import * as cheerio from 'cheerio';

// 当アプリのカテゴリ分類（抽出時の分類ヒント。該当なしは「各種補助金」）
export const KNOWN_CATEGORIES = [
  'IT・デジタル', '設備投資', '創業支援', '雇用促進', '環境・エネルギー', '販路拡大',
  '農業・林業', '事業再構築', '経営支援', '地方創生', '海外展開', '伝統産業',
  '観光・まちづくり', '研究開発', '医療・介護', '子育て・教育', '防災・安全',
  '文化・芸術', '社会福祉', '産業振興',
] as const;

export interface ExtractedCandidate {
  title: string;
  description: string;
  category: string;
  targetType: string;
  prefecture: string;
  municipalityName: string | null;
  maxAmount: number | null;
  subsidyRate: string | null;
  applicationStart: string | null; // YYYY-MM-DD（不明なら null）
  applicationEnd: string | null;
  applicationUrl: string | null;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * HTMLから本文テキストを抽出する。script/style/nav等のノイズを除去し空白を圧縮。
 * maxChars で上限を切り、トークン超過を防ぐ。
 */
export function htmlToText(html: string, maxChars = 12000): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, svg, nav, header, footer, form, iframe').remove();
  const raw = $('main').text() || $('body').text() || $.root().text();
  const text = raw.replace(/[ \t ]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
  return text.slice(0, maxChars);
}

export function buildExtractionMessages(text: string, sourceUrl: string): { system: string; user: string } {
  const system = [
    'あなたは日本の自治体・官公庁の補助金/助成金の告示文を読み取り、構造化データに変換する専門家です。',
    '本文中に明記された情報のみを抽出し、推測で値を埋めないこと（不明な項目は null）。',
    '補助金の公募・募集に該当しないページ（一般的な案内・トップページ等）の場合は空配列を返すこと。',
    '必ず指定のJSON配列のみで回答し、前後に説明文やコードフェンス（```）を付けないこと。',
  ].join('\n');

  const user = [
    `次のページ本文から、募集中・募集予定の補助金/助成金を抽出してください。出典URL: ${sourceUrl}`,
    '',
    '# 出力するJSON（配列。該当なしは [] ）',
    '[',
    '  {',
    '    "title": "制度名",',
    '    "description": "概要（200字以内）",',
    `    "category": "次のいずれか、該当なしは『各種補助金』: ${KNOWN_CATEGORIES.join('・')}",`,
    '    "targetType": "対象者（例: 中小企業者 / 個人事業主 / 市民）",',
    '    "prefecture": "都道府県名（例: 東京都）",',
    '    "municipalityName": "市区町村名（無ければnull）",',
    '    "maxAmount": 補助上限額（円。整数。不明ならnull）,',
    '    "subsidyRate": "補助率（例: 1/2。不明ならnull）",',
    '    "applicationStart": "募集開始日 YYYY-MM-DD（不明ならnull）",',
    '    "applicationEnd": "募集締切日 YYYY-MM-DD（不明ならnull）",',
    '    "applicationUrl": "申請/詳細ページURL（不明ならnull）",',
    '    "confidence": "high|medium|low（本文記載の明確さ）"',
    '  }',
    ']',
    '',
    '# ページ本文',
    text,
  ].join('\n');

  return { system, user };
}

function stripCodeFence(text: string): string {
  const t = text.trim();
  const fenced = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return (fenced ? fenced[1] : t).trim();
}

function toNullableString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s && s.toLowerCase() !== 'null' ? s : null;
}

function toAmount(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^\d]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function toIsoDate(v: unknown): string | null {
  const s = toNullableString(v);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function toConfidence(v: unknown): 'high' | 'medium' | 'low' {
  return v === 'high' || v === 'low' ? v : 'medium';
}

/**
 * Claudeのテキスト応答を ExtractedCandidate[] に変換する。
 * コードフェンス/前後ノイズに強く、title が無い要素は除外。最大20件。
 */
export function parseExtractions(text: string): ExtractedCandidate[] {
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
  const list: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.subsidies)
      ? parsed.subsidies
      : [];

  const out: ExtractedCandidate[] = [];
  for (const item of list.slice(0, 20)) {
    if (!item || typeof item !== 'object') continue;
    const title = toNullableString(item.title);
    if (!title) continue;
    out.push({
      title: title.slice(0, 200),
      description: (toNullableString(item.description) || '').slice(0, 1500),
      category: toNullableString(item.category) || '各種補助金',
      targetType: (toNullableString(item.targetType) || '制限なし').slice(0, 100),
      prefecture: toNullableString(item.prefecture) || '全国',
      municipalityName: toNullableString(item.municipalityName),
      maxAmount: toAmount(item.maxAmount),
      subsidyRate: toNullableString(item.subsidyRate),
      applicationStart: toIsoDate(item.applicationStart),
      applicationEnd: toIsoDate(item.applicationEnd),
      applicationUrl: toNullableString(item.applicationUrl),
      confidence: toConfidence(item.confidence),
    });
  }
  return out;
}
