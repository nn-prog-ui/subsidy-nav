import { describe, it, expect } from 'vitest';
import { buildSearchQuery, summarizeFilters } from '../searchQuery';

describe('buildSearchQuery', () => {
  it('設定された項目のみをクエリ化する', () => {
    const q = buildSearchQuery({ category: 'IT・デジタル', prefecture: '東京都' });
    const p = new URLSearchParams(q);
    expect(p.get('category')).toBe('IT・デジタル');
    expect(p.get('prefecture')).toBe('東京都');
    expect(p.get('level')).toBeNull();
  });

  it('closingSoon は true のときのみ含める', () => {
    expect(new URLSearchParams(buildSearchQuery({ closingSoon: true })).get('closingSoon')).toBe('true');
    expect(new URLSearchParams(buildSearchQuery({ closingSoon: false })).get('closingSoon')).toBeNull();
  });

  it('sort=newest は既定なので含めない', () => {
    expect(buildSearchQuery({ sort: 'newest' })).toBe('');
    expect(new URLSearchParams(buildSearchQuery({ sort: 'amount_desc' })).get('sort')).toBe('amount_desc');
  });

  it('空フィルタは空文字', () => {
    expect(buildSearchQuery({})).toBe('');
  });
});

describe('summarizeFilters', () => {
  it('主要項目を結合する', () => {
    const s = summarizeFilters({ keyword: 'IT', category: '創業支援', prefecture: '大阪府', difficulty: 'easy' });
    expect(s).toContain('「IT」');
    expect(s).toContain('創業支援');
    expect(s).toContain('大阪府');
    expect(s).toContain('易しい');
  });

  it('空なら「すべての補助金」', () => {
    expect(summarizeFilters({})).toBe('すべての補助金');
  });
});
