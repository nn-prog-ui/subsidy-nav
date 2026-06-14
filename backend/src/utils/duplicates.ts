/**
 * タイトルを正規化する（空白・記号・年号(20xx)を除去し小文字化）。
 * 重複判定のキーおよび類似度計算の前処理に使う。
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/20[0-9]{2}年?/g, '') // 年号（2024 / 2024年）を除去
    .replace(/[\s　]/g, '')        // 半角・全角スペース
    .replace(/[^\p{L}\p{N}]/gu, ''); // 記号類
}

/** 文字バイグラム集合のJaccard類似度（0-1）。 */
export function bigramSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const grams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const ga = grams(a), gb = grams(b);
  let inter = 0;
  for (const g of ga) if (gb.has(g)) inter++;
  const union = ga.size + gb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export interface DupItem { id: string; title: string; }

/**
 * 重複・類似の可能性が高い補助金をグルーピングする（Union-Find）。
 * 正規化後タイトルの類似度が threshold 以上のペアを同一グループにまとめる。
 * 2件以上のグループのみ返す。
 */
export function findDuplicateGroups(items: DupItem[], threshold = 0.85): DupItem[][] {
  const norms = items.map(i => normalizeTitle(i.title));
  const parent = items.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a: number, b: number) => { parent[find(a)] = find(b); };

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (norms[i] && bigramSimilarity(norms[i], norms[j]) >= threshold) union(i, j);
    }
  }

  const groups = new Map<number, DupItem[]>();
  for (let i = 0; i < items.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(items[i]);
  }
  return [...groups.values()].filter(g => g.length > 1);
}
