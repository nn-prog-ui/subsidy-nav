import { buildTsQuery, formatAmount, daysUntilDeadline, expandSynonyms } from '../utils/search';

describe('expandSynonyms', () => {
  it('同義語を展開し元の語を含む', () => {
    const r = expandSynonyms('IT');
    expect(r).toContain('IT');
    expect(r).toContain('デジタル');
    expect(r).toContain('DX');
  });

  it('双方向に展開する（起業→創業）', () => {
    expect(expandSynonyms('起業')).toContain('創業');
    expect(expandSynonyms('創業')).toContain('起業');
  });

  it('辞書に無い語はそのまま返す', () => {
    expect(expandSynonyms('補助金')).toEqual(['補助金']);
  });

  it('複数語をすべて展開し重複を排除する', () => {
    const r = expandSynonyms('IT 創業');
    expect(r).toContain('IT');
    expect(r).toContain('創業');
    expect(new Set(r).size).toBe(r.length);
  });

  it('空文字は空配列', () => {
    expect(expandSynonyms('')).toEqual([]);
  });
});

describe('buildTsQuery', () => {
  it('単一キーワードを前方一致に変換する', () => {
    expect(buildTsQuery('補助金')).toBe('補助金:*');
  });

  it('複数キーワードを AND 結合する', () => {
    expect(buildTsQuery('IT 導入')).toBe('IT:* & 導入:*');
  });

  it('前後の空白を無視する', () => {
    expect(buildTsQuery('  創業  ')).toBe('創業:*');
  });

  it('tsquery 特殊文字を除去する（SQLインジェクション対策）', () => {
    expect(buildTsQuery("test'); DROP TABLE")).toBe('test:* & DROP:* & TABLE:*');
  });

  it('特殊文字のみの語は除外する', () => {
    expect(buildTsQuery('IT & | !')).toBe('IT:*');
  });

  it('空文字列は空文字を返す', () => {
    expect(buildTsQuery('')).toBe('');
    expect(buildTsQuery('   ')).toBe('');
  });
});

describe('formatAmount', () => {
  it('数値を円表記にする', () => {
    expect(formatAmount(1000000)).toBe('¥1,000,000');
  });

  it('bigint を扱える', () => {
    expect(formatAmount(4500000n)).toBe('¥4,500,000');
  });

  it('null は「上限なし」', () => {
    expect(formatAmount(null)).toBe('上限なし');
  });
});

describe('daysUntilDeadline', () => {
  const now = new Date('2026-06-10T00:00:00Z');

  it('未来の締切までの日数を返す', () => {
    expect(daysUntilDeadline(new Date('2026-06-13T00:00:00Z'), now)).toBe(3);
  });

  it('過去の締切は null', () => {
    expect(daysUntilDeadline(new Date('2026-06-01T00:00:00Z'), now)).toBeNull();
  });

  it('締切なしは null', () => {
    expect(daysUntilDeadline(null, now)).toBeNull();
  });
});
