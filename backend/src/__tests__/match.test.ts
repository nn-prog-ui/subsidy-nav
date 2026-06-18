import { matchesSavedSearch, MatchableSubsidy } from '../utils/match';

const base = (over: Partial<MatchableSubsidy> = {}): MatchableSubsidy => ({
  title: 'IT導入補助金',
  description: 'ITツール導入を支援',
  category: 'IT・デジタル',
  prefecture: '東京都',
  level: '国',
  difficulty: 'medium',
  maxAmount: 4500000,
  applicationEnd: null,
  ...over,
});

describe('matchesSavedSearch', () => {
  it('空クエリは常にマッチ', () => {
    expect(matchesSavedSearch(base(), '')).toBe(true);
  });

  it('カテゴリ一致/不一致', () => {
    expect(matchesSavedSearch(base(), 'category=IT・デジタル')).toBe(true);
    expect(matchesSavedSearch(base(), 'category=設備投資')).toBe(false);
  });

  it('地域は対象県または全国にマッチ', () => {
    expect(matchesSavedSearch(base({ prefecture: '東京都' }), 'prefecture=東京都')).toBe(true);
    expect(matchesSavedSearch(base({ prefecture: '全国' }), 'prefecture=東京都')).toBe(true);
    expect(matchesSavedSearch(base({ prefecture: '大阪府' }), 'prefecture=東京都')).toBe(false);
  });

  it('キーワードは title/description 部分一致（大文字小文字無視）', () => {
    expect(matchesSavedSearch(base(), 'keyword=ツール')).toBe(true);
    expect(matchesSavedSearch(base(), 'keyword=it')).toBe(true);
    expect(matchesSavedSearch(base(), 'keyword=農業')).toBe(false);
  });

  it('金額レンジ', () => {
    expect(matchesSavedSearch(base({ maxAmount: 4500000 }), 'amountMin=1000000')).toBe(true);
    expect(matchesSavedSearch(base({ maxAmount: 500000 }), 'amountMin=1000000')).toBe(false);
    expect(matchesSavedSearch(base({ maxAmount: null }), 'amountMin=1')).toBe(false);
  });

  it('複数条件はAND', () => {
    expect(matchesSavedSearch(base(), 'category=IT・デジタル&level=国')).toBe(true);
    expect(matchesSavedSearch(base(), 'category=IT・デジタル&level=市区町村')).toBe(false);
  });

  it('closingSoon は締切30日以内のみ', () => {
    const soon = new Date('2026-06-20T00:00:00Z');
    const now = new Date('2026-06-16T00:00:00Z');
    expect(matchesSavedSearch(base({ applicationEnd: soon }), 'closingSoon=true', now)).toBe(true);
    expect(matchesSavedSearch(base({ applicationEnd: null }), 'closingSoon=true', now)).toBe(false);
    const far = new Date('2026-09-01T00:00:00Z');
    expect(matchesSavedSearch(base({ applicationEnd: far }), 'closingSoon=true', now)).toBe(false);
  });
});
