import { mapJGrantsToSubsidy } from '../utils/jgrants';

const now = new Date('2026-06-18T00:00:00Z');

describe('mapJGrantsToSubsidy', () => {
  it('代表的なレスポンスを変換する', () => {
    const m = mapJGrantsToSubsidy({
      id: 'a123',
      title: 'IT導入補助金2026',
      subsidy_catch_phrase: 'ITツール導入を支援',
      target_area_search: '全国',
      target_number_of_employees: '中小企業者',
      subsidy_max_limit: 4500000,
      acceptance_start_datetime: '2026-04-01T00:00:00+09:00',
      acceptance_end_datetime: '2026-12-31T00:00:00+09:00',
    }, now)!;
    expect(m.title).toBe('IT導入補助金2026');
    expect(m.prefecture).toBe('全国');
    expect(m.level).toBe('国');
    expect(m.maxAmount).toBe(4500000n);
    expect(m.applicationUrl).toBe('https://www.jgrants-portal.go.jp/subsidy/a123');
    expect(m.sourceId).toBe('jgrants:a123');
    expect(m.source).toBe('jgrants');
    expect(m.status).toBe('active');
  });

  it('地域が複数指定なら先頭を採用し都道府県扱い', () => {
    const m = mapJGrantsToSubsidy({ id: '1', title: 'X', target_area_search: '東京都/神奈川県' }, now)!;
    expect(m.prefecture).toBe('東京都');
    expect(m.level).toBe('都道府県');
  });

  it('締切超過は closed', () => {
    const m = mapJGrantsToSubsidy({ id: '2', title: 'Y', acceptance_end_datetime: '2026-01-01T00:00:00+09:00' }, now)!;
    expect(m.status).toBe('closed');
  });

  it('id か title が無ければ null', () => {
    expect(mapJGrantsToSubsidy({ title: 'no id' }, now)).toBeNull();
    expect(mapJGrantsToSubsidy({ id: 'x' }, now)).toBeNull();
  });

  it('上限額が不正なら null（金額なし）', () => {
    const m = mapJGrantsToSubsidy({ id: '3', title: 'Z', subsidy_max_limit: null }, now)!;
    expect(m.maxAmount).toBeNull();
  });
});
