// 検索フィルタ ↔ クエリ文字列の相互変換と、人間可読の要約

export interface SearchFilters {
  prefecture?: string;
  category?: string;
  level?: string;
  keyword?: string;
  amountMin?: string;
  amountMax?: string;
  closingSoon?: boolean;
  difficulty?: string;
  sort?: string;
}

/** フィルタを正規化したクエリ文字列に変換する（page等は含めない）。 */
export function buildSearchQuery(f: SearchFilters): string {
  const p = new URLSearchParams();
  if (f.prefecture) p.set('prefecture', f.prefecture);
  if (f.category) p.set('category', f.category);
  if (f.level) p.set('level', f.level);
  if (f.keyword) p.set('keyword', f.keyword);
  if (f.amountMin) p.set('amountMin', f.amountMin);
  if (f.amountMax) p.set('amountMax', f.amountMax);
  if (f.closingSoon) p.set('closingSoon', 'true');
  if (f.difficulty) p.set('difficulty', f.difficulty);
  if (f.sort && f.sort !== 'newest') p.set('sort', f.sort);
  return p.toString();
}

const DIFFICULTY_LABEL: Record<string, string> = { easy: '易しい', medium: '普通', hard: '難しい' };

/** フィルタを保存名候補となる人間可読の文字列に要約する。 */
export function summarizeFilters(f: SearchFilters): string {
  const parts: string[] = [];
  if (f.keyword) parts.push(`「${f.keyword}」`);
  if (f.category) parts.push(f.category);
  if (f.prefecture) parts.push(f.prefecture);
  if (f.level) parts.push(f.level);
  if (f.difficulty) parts.push(DIFFICULTY_LABEL[f.difficulty] || f.difficulty);
  if (f.closingSoon) parts.push('締切30日以内');
  if (f.amountMin || f.amountMax) parts.push(`金額${f.amountMin || '0'}〜${f.amountMax || ''}`);
  return parts.length ? parts.join(' / ') : 'すべての補助金';
}
