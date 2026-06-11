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
