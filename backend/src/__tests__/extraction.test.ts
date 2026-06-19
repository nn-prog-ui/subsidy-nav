import { htmlToText, buildExtractionMessages, parseExtractions, KNOWN_CATEGORIES } from '../utils/extraction';

describe('htmlToText', () => {
  it('script/styleを除去し本文テキストを返す', () => {
    const html = '<html><head><style>.a{}</style></head><body><script>var x=1</script><main>補助金の<b>募集</b>案内</main></body></html>';
    const t = htmlToText(html);
    expect(t).toContain('補助金の');
    expect(t).toContain('募集');
    expect(t).not.toContain('var x');
    expect(t).not.toContain('.a{}');
  });

  it('maxChars で長さを制限する', () => {
    const t = htmlToText('<body>' + 'あ'.repeat(500) + '</body>', 100);
    expect(t.length).toBeLessThanOrEqual(100);
  });
});

describe('buildExtractionMessages', () => {
  it('出典URL・カテゴリ候補・出力JSONキーをプロンプトに含める', () => {
    const { system, user } = buildExtractionMessages('本文テキスト', 'https://city.example.jp/hojo');
    expect(system).toContain('構造化データ');
    expect(user).toContain('https://city.example.jp/hojo');
    expect(user).toContain(KNOWN_CATEGORIES[0]);
    expect(user).toContain('本文テキスト');
    for (const key of ['title', 'maxAmount', 'applicationEnd', 'confidence', 'municipalityName']) {
      expect(user).toContain(key);
    }
  });
});

describe('parseExtractions', () => {
  const valid = JSON.stringify([
    {
      title: '創業支援補助金', description: '創業者を支援', category: '創業支援',
      targetType: '個人事業主', prefecture: '東京都', municipalityName: '渋谷区',
      maxAmount: 500000, subsidyRate: '1/2',
      applicationStart: '2026-04-01', applicationEnd: '2026-09-30',
      applicationUrl: 'https://city.example.jp/sogyo', confidence: 'high',
    },
  ]);

  it('正常なJSON配列をパースする', () => {
    const r = parseExtractions(valid);
    expect(r).toHaveLength(1);
    expect(r[0].title).toBe('創業支援補助金');
    expect(r[0].maxAmount).toBe(500000);
    expect(r[0].municipalityName).toBe('渋谷区');
    expect(r[0].applicationEnd).toBe('2026-09-30');
    expect(r[0].confidence).toBe('high');
  });

  it('コードフェンスを剥がし、前後ノイズから配列を抽出する', () => {
    expect(parseExtractions('```json\n' + valid + '\n```')).toHaveLength(1);
    expect(parseExtractions('結果:\n' + valid + '\n以上')).toHaveLength(1);
  });

  it('{ subsidies: [...] } 形式も受け付ける', () => {
    const r = parseExtractions(JSON.stringify({ subsidies: JSON.parse(valid) }));
    expect(r).toHaveLength(1);
  });

  it('title欠落の要素は除外し、欠損値は安全側に寄せる', () => {
    const r = parseExtractions(JSON.stringify([
      { description: 'no title' },
      { title: 'X', maxAmount: '1,000,000円', applicationEnd: 'unknown', confidence: 'bogus' },
    ]));
    expect(r).toHaveLength(1);
    expect(r[0].title).toBe('X');
    expect(r[0].maxAmount).toBe(1000000); // 文字列から数字のみ抽出
    expect(r[0].category).toBe('各種補助金');
    expect(r[0].prefecture).toBe('全国');
    expect(r[0].applicationEnd).toBeNull(); // 'unknown' は日付として無効 → null
    expect(r[0].confidence).toBe('medium'); // 'bogus' → 既定 medium
  });

  it('該当なし [] や解釈不能は空配列', () => {
    expect(parseExtractions('[]')).toEqual([]);
    expect(parseExtractions('該当する補助金はありません')).toEqual([]);
  });
});
