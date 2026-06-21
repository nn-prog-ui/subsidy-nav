import { buildConciergeMessages, parseRecommendations, ConciergeCandidate, ConciergeInput } from '../utils/aiConcierge';

const input: ConciergeInput = { situation: 'カフェを経営、ECで通販を始めたい', prefecture: '東京都' };
const candidates: ConciergeCandidate[] = [
  { id: 'c1', title: 'IT導入補助金', category: 'IT・デジタル', prefecture: '全国', level: '国', maxAmount: 4500000, summary: 'ITツール導入支援' },
  { id: 'c2', title: '持続化補助金', category: '販路拡大', prefecture: '全国', level: '国', maxAmount: 500000, summary: '販路開拓支援' },
];

describe('buildConciergeMessages', () => {
  it('状況・候補・出力形式をプロンプトに含める', () => {
    const { system, user } = buildConciergeMessages(input, candidates);
    expect(system).toContain('コンサルタント');
    expect(user).toContain('カフェを経営');
    expect(user).toContain('地域: 東京都');
    expect(user).toContain('[c1] IT導入補助金');
    expect(user).toContain('reason');
  });
  it('地域未指定・候補なしでも組み立てられる', () => {
    const { user } = buildConciergeMessages({ situation: 'x' }, []);
    expect(user).toContain('地域: 指定なし');
    expect(user).toContain('（候補なし）');
  });
});

describe('parseRecommendations', () => {
  it('候補内のidのみ・重複除去・理由保持', () => {
    const text = JSON.stringify([
      { id: 'c1', reason: 'ITツール導入に合致' },
      { id: 'c1', reason: '重複' },
      { id: 'ghost', reason: '存在しない' },
      { id: 'c2', reason: '販路拡大に合致' },
    ]);
    const r = parseRecommendations(text, ['c1', 'c2']);
    expect(r.map(x => x.id)).toEqual(['c1', 'c2']);
    expect(r[0].reason).toBe('ITツール導入に合致');
  });
  it('コードフェンス/前後ノイズ/{recommendations}形式に対応', () => {
    const body = JSON.stringify([{ id: 'c1', reason: 'r' }]);
    expect(parseRecommendations('```json\n' + body + '\n```', ['c1'])).toHaveLength(1);
    expect(parseRecommendations('結果:\n' + body, ['c1'])).toHaveLength(1);
    expect(parseRecommendations(JSON.stringify({ recommendations: [{ id: 'c1', reason: 'r' }] }), ['c1'])).toHaveLength(1);
  });
  it('最大5件に制限', () => {
    const valid = ['a', 'b', 'c', 'd', 'e', 'f'];
    const text = JSON.stringify(valid.map(id => ({ id, reason: 'r' })));
    expect(parseRecommendations(text, valid)).toHaveLength(5);
  });
  it('該当なし[]や解釈不能は空配列', () => {
    expect(parseRecommendations('[]', ['c1'])).toEqual([]);
    expect(parseRecommendations('テキスト', ['c1'])).toEqual([]);
  });
});
