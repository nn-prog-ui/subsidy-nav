export interface MatchableSubsidy {
  title: string;
  description: string;
  category: string;
  prefecture: string;
  level: string;
  difficulty: string | null;
  maxAmount: bigint | number | null;
  applicationEnd: Date | null;
}

/**
 * 補助金が保存検索（クエリ文字列）にマッチするか判定する。
 * 検索ページのフィルタと同じ意味論（地域は対象県 or 全国、キーワードは title/description 部分一致）。
 * 指定された条件をすべて満たす場合のみ true（AND）。
 */
export function matchesSavedSearch(s: MatchableSubsidy, query: string, now: Date = new Date()): boolean {
  const p = new URLSearchParams(query);

  const category = p.get('category');
  if (category && s.category !== category) return false;

  const level = p.get('level');
  if (level && s.level !== level) return false;

  const difficulty = p.get('difficulty');
  if (difficulty && s.difficulty !== difficulty) return false;

  const prefecture = p.get('prefecture');
  if (prefecture && prefecture !== '全国' && s.prefecture !== prefecture && s.prefecture !== '全国') return false;

  const keyword = p.get('keyword');
  if (keyword) {
    const hay = `${s.title} ${s.description}`.toLowerCase();
    if (!hay.includes(keyword.toLowerCase())) return false;
  }

  const amount = s.maxAmount == null ? null : Number(s.maxAmount);
  const amountMin = p.get('amountMin');
  if (amountMin) { if (amount == null || amount < Number(amountMin)) return false; }
  const amountMax = p.get('amountMax');
  if (amountMax) { if (amount == null || amount > Number(amountMax)) return false; }

  if (p.get('closingSoon') === 'true') {
    if (!s.applicationEnd) return false;
    const days = (s.applicationEnd.getTime() - now.getTime()) / 86400000;
    if (days < 0 || days > 30) return false;
  }

  return true;
}
