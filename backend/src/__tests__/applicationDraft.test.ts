import { buildDraftMessages, parseDraft, DraftSubsidyInput, DraftProfile } from '../utils/applicationDraft';

const subsidy: DraftSubsidyInput = {
  title: '小規模事業者持続化補助金',
  description: '販路開拓の取り組みを支援。',
  category: '販路拡大',
  targetType: '小規模事業者',
  prefecture: '全国',
  level: '国',
  maxAmount: 500000n,
  subsidyRate: '2/3',
  requirements: '商工会の支援を受けること',
};

const profile: DraftProfile = {
  companyName: '株式会社サンプル',
  industry: '飲食業',
  employees: '5名',
  businessSummary: '地域密着型のカフェを運営。',
  projectPlan: 'ECサイト構築とテイクアウト強化。',
};

describe('buildDraftMessages', () => {
  it('補助金と申請者情報・出力キーをプロンプトに含める', () => {
    const { system, user } = buildDraftMessages(subsidy, profile);
    expect(system).toContain('申請書');
    expect(user).toContain('小規模事業者持続化補助金');
    expect(user).toContain('株式会社サンプル');
    expect(user).toContain('ECサイト構築');
    expect(user).toContain('¥500,000');
    for (const key of ['summary', 'motivation', 'plan', 'expectedOutcome', 'appeal']) {
      expect(user).toContain(key);
    }
  });

  it('金額なしは「記載なし」', () => {
    const { user } = buildDraftMessages({ ...subsidy, maxAmount: null }, profile);
    expect(user).toContain('補助上限額: 記載なし');
  });
});

describe('parseDraft', () => {
  const valid = JSON.stringify({
    summary: '要約テキスト', motivation: '動機', plan: '計画',
    expectedOutcome: '効果', appeal: 'アピール',
  });

  it('正常なJSONをパースする', () => {
    const d = parseDraft(valid);
    expect(d.summary).toBe('要約テキスト');
    expect(d.plan).toBe('計画');
    expect(d.appeal).toBe('アピール');
  });

  it('コードフェンス/前後ノイズに強い', () => {
    expect(parseDraft('```json\n' + valid + '\n```').summary).toBe('要約テキスト');
    expect(parseDraft('以下です\n' + valid + '\n以上').plan).toBe('計画');
  });

  it('summary と plan が両方欠落なら例外', () => {
    expect(() => parseDraft(JSON.stringify({ motivation: 'x' }))).toThrow();
  });

  it('解釈不能なら例外', () => {
    expect(() => parseDraft('これはJSONではありません')).toThrow();
  });
});
