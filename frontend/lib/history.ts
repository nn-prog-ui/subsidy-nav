// 閲覧履歴をlocalStorageで管理（匿名ユーザー対応・サーバー送信なし）
const KEY = 'view_history_v1';
const MAX = 30;

export interface ViewedSubsidy {
  id: string;
  title: string;
  category: string;
  prefecture: string;
  level: string;
  maxAmount: number | null;
  viewedAt: number;
}

export function recordView(s: Omit<ViewedSubsidy, 'viewedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getHistory().filter(h => h.id !== s.id);
    list.unshift({ ...s, viewedAt: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch { /* ignore quota errors */ }
}

export function getHistory(): ViewedSubsidy[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as ViewedSubsidy[];
  } catch { return []; }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}

/** 履歴から上位カテゴリ・都道府県を頻度順で抽出（レコメンドのシード） */
export function getPreferences(): { categories: string[]; prefectures: string[]; recentIds: string[] } {
  const history = getHistory();
  const catCount = new Map<string, number>();
  const prefCount = new Map<string, number>();
  for (const h of history) {
    catCount.set(h.category, (catCount.get(h.category) || 0) + 1);
    if (h.prefecture && h.prefecture !== '全国') {
      prefCount.set(h.prefecture, (prefCount.get(h.prefecture) || 0) + 1);
    }
  }
  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(e => e[0]);
  return {
    categories: top(catCount, 3),
    prefectures: top(prefCount, 3),
    recentIds: history.map(h => h.id),
  };
}
