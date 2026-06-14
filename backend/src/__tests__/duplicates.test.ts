import { normalizeTitle, bigramSimilarity, findDuplicateGroups } from '../utils/duplicates';

describe('normalizeTitle', () => {
  it('年号と空白・記号を除去する', () => {
    expect(normalizeTitle('IT導入補助金 2024')).toBe('it導入補助金');
    expect(normalizeTitle('IT導入補助金2024年')).toBe('it導入補助金');
  });
  it('記号を除去する', () => {
    expect(normalizeTitle('ものづくり・商業 補助金')).toBe('ものづくり商業補助金');
  });
});

describe('bigramSimilarity', () => {
  it('同一文字列は1', () => {
    expect(bigramSimilarity('abcd', 'abcd')).toBe(1);
  });
  it('全く異なると低い', () => {
    expect(bigramSimilarity('abcd', 'wxyz')).toBeLessThan(0.2);
  });
  it('部分的に似ていると中間値', () => {
    const s = bigramSimilarity('itセミナー', 'itセミナ');
    expect(s).toBeGreaterThan(0.4);
    expect(s).toBeLessThanOrEqual(1);
  });
});

describe('findDuplicateGroups', () => {
  it('年号違いの同名をまとめる', () => {
    const groups = findDuplicateGroups([
      { id: '1', title: 'IT導入補助金2024' },
      { id: '2', title: 'IT導入補助金 2023' },
      { id: '3', title: 'ものづくり補助金' },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].map(g => g.id).sort()).toEqual(['1', '2']);
  });

  it('重複が無ければ空配列', () => {
    const groups = findDuplicateGroups([
      { id: '1', title: 'IT導入補助金' },
      { id: '2', title: '事業再構築補助金' },
    ]);
    expect(groups).toEqual([]);
  });
});
