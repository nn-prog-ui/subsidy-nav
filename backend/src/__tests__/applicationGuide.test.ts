import { buildGuideMessages, parseGuide, GuideSubsidyInput } from '../utils/applicationGuide';

const sample: GuideSubsidyInput = {
  title: 'IT導入補助金2026',
  description: 'ITツール導入を支援する補助金です。',
  category: 'IT・デジタル',
  prefecture: '全国',
  level: '国',
  targetType: '中小企業者',
  maxAmount: 4500000n,
  subsidyRate: '1/2',
  applicationEnd: new Date('2026-12-31T00:00:00+09:00'),
  applicationSteps: ['事業計画策定', '電子申請'],
  requiredDocuments: ['履歴事項全部証明書', '決算書'],
};

describe('buildGuideMessages', () => {
  it('補助金の主要情報と出力キー構成をプロンプトに含める', () => {
    const { system, user } = buildGuideMessages(sample);
    expect(system).toContain('プロのコンサルタント');
    expect(user).toContain('IT導入補助金2026');
    expect(user).toContain('¥4,500,000');
    expect(user).toContain('履歴事項全部証明書');
    // 厳守させる出力キー
    for (const key of ['overview', 'writingTips', 'preparation', 'schedule', 'disbursementDays', 'pitfalls']) {
      expect(user).toContain(key);
    }
  });

  it('金額・日付・配列が欠損でも「記載なし/なし」で安全に組み立てる', () => {
    const { user } = buildGuideMessages({
      title: 'X', description: '', category: 'その他', prefecture: '東京都',
      level: '都道府県', targetType: '制限なし', maxAmount: null,
    });
    expect(user).toContain('補助上限額: 記載なし');
    expect(user).toContain('申請締切: 記載なし');
    expect(user).toContain('公表されている申請ステップ: なし');
  });
});

describe('parseGuide', () => {
  const valid = JSON.stringify({
    overview: 'この補助金は…',
    writingTips: ['コツ1', 'コツ2'],
    preparation: ['書類A'],
    schedule: ['申請', '審査', '入金'],
    disbursementDays: 90,
    pitfalls: ['不採択理由1'],
  });

  it('正常なJSONをパースする', () => {
    const g = parseGuide(valid);
    expect(g.overview).toBe('この補助金は…');
    expect(g.writingTips).toEqual(['コツ1', 'コツ2']);
    expect(g.schedule).toHaveLength(3);
    expect(g.disbursementDays).toBe(90);
  });

  it('```json コードフェンスを剥がしてパースする', () => {
    const g = parseGuide('```json\n' + valid + '\n```');
    expect(g.disbursementDays).toBe(90);
    expect(g.pitfalls).toEqual(['不採択理由1']);
  });

  it('前後にノイズ文があっても {} を抽出する', () => {
    const g = parseGuide('以下が結果です。\n' + valid + '\nご確認ください。');
    expect(g.overview).toBe('この補助金は…');
  });

  it('配列でないフィールドは空配列、日数不正は null に寄せる', () => {
    const g = parseGuide(JSON.stringify({
      overview: 123, writingTips: 'not-array', disbursementDays: '不明',
    }));
    expect(g.overview).toBe('');
    expect(g.writingTips).toEqual([]);
    expect(g.disbursementDays).toBeNull();
  });

  it('JSONとして解釈不能なら例外', () => {
    expect(() => parseGuide('まったくJSONではない文章')).toThrow();
  });
});
