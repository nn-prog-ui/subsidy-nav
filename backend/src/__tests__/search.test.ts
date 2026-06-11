import { buildTsQuery, formatAmount, daysUntilDeadline } from '../utils/search';

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
