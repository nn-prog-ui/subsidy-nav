import { buildReplyMessages, parseReply, ConsultingInput, ReplyCandidate } from '../utils/consultingReply';

const req: ConsultingInput = {
  name: '山田太郎',
  company: '山田商店',
  prefecture: '東京都',
  industry: '小売業',
  employees: '8名',
  budget: '100万円',
  message: 'ECサイトを立ち上げたいが資金が不安。使える補助金を知りたい。',
};

const candidates: ReplyCandidate[] = [
  { id: 'c1', title: 'IT導入補助金', category: 'IT・デジタル', prefecture: '全国', level: '国', maxAmount: 4500000, summary: 'ITツール導入支援' },
  { id: 'c2', title: '小規模事業者持続化補助金', category: '販路拡大', prefecture: '全国', level: '国', maxAmount: 500000, summary: '販路開拓支援' },
];

describe('buildReplyMessages', () => {
  it('相談内容・候補・出力キーをプロンプトに含める', () => {
    const { system, user } = buildReplyMessages(req, candidates);
    expect(system).toContain('プロのコンサルタント');
    expect(user).toContain('山田太郎');
    expect(user).toContain('ECサイト');
    expect(user).toContain('[c1] IT導入補助金');
    expect(user).toContain('¥4,500,000');
    expect(user).toContain('reply');
    expect(user).toContain('suggestedIds');
  });

  it('候補なしでも組み立てられる', () => {
    const { user } = buildReplyMessages(req, []);
    expect(user).toContain('（該当候補なし）');
  });
});

describe('parseReply', () => {
  it('正常JSONをパースし、候補内のidだけ残す', () => {
    const text = JSON.stringify({ reply: '山田様\n…\n補助金ナビ', suggestedIds: ['c1', 'c2', 'ghost'] });
    const r = parseReply(text, ['c1', 'c2']);
    expect(r.reply).toContain('山田様');
    expect(r.suggestedIds).toEqual(['c1', 'c2']); // 'ghost' は除去
  });

  it('コードフェンス/前後ノイズに強い', () => {
    const text = '```json\n' + JSON.stringify({ reply: '本文', suggestedIds: [] }) + '\n```';
    expect(parseReply(text, []).reply).toBe('本文');
  });

  it('ハルシネーションidは全除去', () => {
    const r = parseReply(JSON.stringify({ reply: '本文', suggestedIds: ['x', 'y'] }), ['c1']);
    expect(r.suggestedIds).toEqual([]);
  });

  it('reply欠落や解釈不能は例外', () => {
    expect(() => parseReply(JSON.stringify({ suggestedIds: ['c1'] }), ['c1'])).toThrow();
    expect(() => parseReply('ただの文章', ['c1'])).toThrow();
  });
});
