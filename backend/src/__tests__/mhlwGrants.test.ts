import { MHLW_GRANTS, mapMhlwGrant } from '../utils/mhlwGrants';

describe('MHLW_GRANTS', () => {
  it('主要助成金がキュレーションされている', () => {
    expect(MHLW_GRANTS.length).toBeGreaterThanOrEqual(10);
    const titles = MHLW_GRANTS.map(g => g.title);
    expect(titles).toContain('キャリアアップ助成金');
    expect(titles).toContain('業務改善助成金');
  });

  it('slug は一意', () => {
    const slugs = MHLW_GRANTS.map(g => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('mapMhlwGrant', () => {
  it('国・全国・雇用促進・mhlw ソースにマッピングする', () => {
    const m = mapMhlwGrant(MHLW_GRANTS[0]);
    expect(m.level).toBe('国');
    expect(m.prefecture).toBe('全国');
    expect(m.category).toBe('雇用促進');
    expect(m.source).toBe('mhlw');
    expect(m.sourceId).toBe(`mhlw:${MHLW_GRANTS[0].slug}`);
    expect(m.status).toBe('active');
    expect(m.applicationUrl).toMatch(/^https?:\/\//);
    expect(m.description).toContain('最新情報をご確認');
  });

  it('金額の目安がある場合は BigInt、無ければ null', () => {
    const withAmount = mapMhlwGrant({ slug: 'x', title: 'X', purpose: 'p', targetType: 't', maxAmount: 6000000, subsidyRate: null });
    expect(withAmount.maxAmount).toBe(6000000n);
    const noAmount = mapMhlwGrant({ slug: 'y', title: 'Y', purpose: 'p', targetType: 't', maxAmount: null, subsidyRate: null });
    expect(noAmount.maxAmount).toBeNull();
  });
});
