import { describe, it, expect, beforeEach } from 'vitest';
import { recordView, getHistory, clearHistory, getPreferences } from '../history';

const base = (over: Partial<Parameters<typeof recordView>[0]> = {}) => ({
  id: 'a', title: 'A補助金', category: 'IT・デジタル', prefecture: '東京都', level: '国', maxAmount: 1000000, ...over,
});

describe('閲覧履歴 history.ts', () => {
  beforeEach(() => localStorage.clear());

  it('記録した補助金を取得できる', () => {
    recordView(base());
    const h = getHistory();
    expect(h).toHaveLength(1);
    expect(h[0].id).toBe('a');
    expect(typeof h[0].viewedAt).toBe('number');
  });

  it('同じIDは重複せず先頭に移動する', () => {
    recordView(base({ id: 'a' }));
    recordView(base({ id: 'b' }));
    recordView(base({ id: 'a' }));
    const h = getHistory();
    expect(h.map(x => x.id)).toEqual(['a', 'b']);
  });

  it('最大30件に制限される', () => {
    for (let i = 0; i < 35; i++) recordView(base({ id: `id${i}` }));
    expect(getHistory()).toHaveLength(30);
    // 最新が先頭
    expect(getHistory()[0].id).toBe('id34');
  });

  it('clearHistoryで空になる', () => {
    recordView(base());
    clearHistory();
    expect(getHistory()).toEqual([]);
  });

  it('getPreferencesは頻出カテゴリ・地域を返し全国を地域から除外する', () => {
    recordView(base({ id: '1', category: 'IT・デジタル', prefecture: '東京都' }));
    recordView(base({ id: '2', category: 'IT・デジタル', prefecture: '全国' }));
    recordView(base({ id: '3', category: '設備投資', prefecture: '東京都' }));
    const p = getPreferences();
    expect(p.categories[0]).toBe('IT・デジタル');
    expect(p.prefectures).toContain('東京都');
    expect(p.prefectures).not.toContain('全国');
    expect(p.recentIds).toHaveLength(3);
  });
});
