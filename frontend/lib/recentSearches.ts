// 最近の検索キーワードを localStorage に保持（匿名・最大8件）
const KEY = 'recent_searches_v1';
const MAX = 8;

export function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as string[];
  } catch { return []; }
}

export function addRecentSearch(keyword: string): void {
  if (typeof window === 'undefined') return;
  const k = keyword.trim();
  if (!k) return;
  try {
    const list = getRecentSearches().filter(x => x !== k);
    list.unshift(k);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch { /* ignore */ }
}

export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
