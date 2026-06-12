import { scoreSubsidy, INDUSTRY_CATEGORY_MAP, type MatchCandidate, type MatchContext } from '../services/matching';

const now = new Date('2026-06-10T00:00:00Z');
const baseCtx: MatchContext = { prefecture: '東京都', categories: ['IT・デジタル'], employeeCount: 10, now };

function cand(over: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    category: 'IT・デジタル', prefecture: '東京都', level: '都道府県',
    targetType: '中小企業', maxAmount: 2000000n,
    applicationEnd: new Date('2026-12-31T00:00:00Z'), ...over,
  };
}

describe('scoreSubsidy', () => {
  it('地域・業種一致で高スコアと理由を返す', () => {
    const { matchScore, reasons } = scoreSubsidy(cand(), baseCtx);
    expect(matchScore).toBeGreaterThan(50);
    expect(reasons).toContain('お住まいの地域が対象');
    expect(reasons).toContain('業種・事業内容に合致');
  });

  it('全国対象は地域一致より低い加点になる', () => {
    const local = scoreSubsidy(cand({ prefecture: '東京都' }), baseCtx).score;
    const national = scoreSubsidy(cand({ prefecture: '全国' }), baseCtx).score;
    expect(local).toBeGreaterThan(national);
    expect(scoreSubsidy(cand({ prefecture: '全国' }), baseCtx).reasons).toContain('全国対象');
  });

  it('締切済みは大きく減点される', () => {
    const expired = scoreSubsidy(cand({ applicationEnd: new Date('2026-01-01T00:00:00Z') }), baseCtx).score;
    const valid = scoreSubsidy(cand(), baseCtx).score;
    expect(expired).toBeLessThan(valid);
  });

  it('締切間近は加点と理由が付く', () => {
    const soon = scoreSubsidy(cand({ applicationEnd: new Date('2026-06-25T00:00:00Z') }), baseCtx);
    expect(soon.reasons).toContain('まもなく締切（申請受付中）');
  });

  it('小規模事業者は従業員20名以下で加点', () => {
    const small = scoreSubsidy(cand({ targetType: '小規模事業者' }), { ...baseCtx, employeeCount: 5 });
    expect(small.reasons).toContain('小規模事業者向け');
  });

  it('matchScoreは0〜100に正規化される', () => {
    const r = scoreSubsidy(cand({ maxAmount: 50000000n }), baseCtx);
    expect(r.matchScore).toBeGreaterThanOrEqual(0);
    expect(r.matchScore).toBeLessThanOrEqual(100);
  });

  it('業種マッピングに観光カテゴリが含まれる', () => {
    expect(INDUSTRY_CATEGORY_MAP['観光・宿泊']).toContain('観光・まちづくり');
  });
});
