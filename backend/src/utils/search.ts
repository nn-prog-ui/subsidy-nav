/**
 * キーワードを PostgreSQL to_tsquery('simple', ...) 用の安全な文字列に変換する。
 * 各語を前方一致（:*）にし、AND（&）で結合する。
 */
export function buildTsQuery(keyword: string): string {
  return keyword
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.replace(/[&|!:*()'\\]/g, '')) // tsquery 特殊文字を除去
    .filter(Boolean)
    .map(w => `${w}:*`)
    .join(' & ');
}

/**
 * 補助上限額を表示用文字列にフォーマットする。
 */
export function formatAmount(amount: bigint | number | null): string {
  if (amount === null || amount === undefined) return '上限なし';
  return `¥${Number(amount).toLocaleString('ja-JP')}`;
}

/**
 * 申請締切までの残日数を計算する（締切なし/過去は null）。
 */
export function daysUntilDeadline(end: Date | null, now: Date = new Date()): number | null {
  if (!end) return null;
  const diff = end.getTime() - now.getTime();
  if (diff < 0) return null;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// 補助金ドメインの同義語・表記ゆれ辞書（双方向展開のため各語にグループを持たせる）
const SYNONYM_GROUPS: string[][] = [
  ['IT', 'デジタル', 'ICT', 'DX', 'システム'],
  ['創業', '起業', 'スタートアップ', '開業'],
  ['設備', '機械', '装置', '設備投資'],
  ['雇用', '採用', '人材', '従業員'],
  ['環境', '省エネ', '脱炭素', 'カーボン', '再エネ'],
  ['農業', '農家', '就農', '農林'],
  ['観光', 'インバウンド', '旅行', '宿泊'],
  ['販路', '販売', '集客', 'マーケティング'],
];

const SYNONYM_MAP: Record<string, string[]> = (() => {
  const m: Record<string, string[]> = {};
  for (const group of SYNONYM_GROUPS) {
    for (const word of group) {
      m[word] = group;
    }
  }
  return m;
})();

/**
 * キーワードを同義語・表記ゆれを含む語のリストへ展開する（重複排除）。
 * 検索の再現率（recall）を高めるために ILIKE 検索の OR 条件として使用する。
 */
export function expandSynonyms(keyword: string): string[] {
  const terms = keyword.trim().split(/\s+/).filter(Boolean);
  const result = new Set<string>();
  for (const t of terms) {
    result.add(t);
    for (const syn of SYNONYM_MAP[t] || []) result.add(syn);
  }
  return [...result];
}
