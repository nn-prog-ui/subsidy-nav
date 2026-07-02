import { parseFeedItems, isSubsidyLike, detectPrefecture, mapJnet21Item } from '../utils/jnet21';

const RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>支援情報ヘッドライン</title>
  <item>
    <title>東京都 中小企業向け設備投資補助金の募集</title>
    <link>https://example.jp/tokyo-setsubi</link>
    <description><![CDATA[<p>東京都内の中小企業を対象とした設備投資の補助金です。</p>]]></description>
  </item>
  <item>
    <title>創業セミナーのご案内</title>
    <link>https://example.jp/seminar</link>
    <description>創業を考えている方向けのセミナー。</description>
  </item>
  <item>
    <title>令和6年度 人材開発助成金の受付開始</title>
    <link>https://example.jp/jinzai</link>
    <description>人材育成に取り組む事業主向け。</description>
  </item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry><title>大阪府 販路開拓補助金</title><link href="https://example.jp/osaka"/><summary>販路開拓を支援。</summary></entry>
</feed>`;

describe('parseFeedItems', () => {
  it('RSS2.0のitemを抽出する', () => {
    const items = parseFeedItems(RSS);
    expect(items).toHaveLength(3);
    expect(items[0].title).toContain('設備投資補助金');
    expect(items[0].link).toBe('https://example.jp/tokyo-setsubi');
  });
  it('Atomのentry(link href)も抽出する', () => {
    const items = parseFeedItems(ATOM);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('大阪府 販路開拓補助金');
    expect(items[0].link).toBe('https://example.jp/osaka');
  });
  it('壊れた入力でも例外を投げず空配列', () => {
    expect(parseFeedItems('not xml at all')).toEqual([]);
  });
});

describe('isSubsidyLike', () => {
  it('補助金/助成金系のみ true', () => {
    expect(isSubsidyLike('設備投資補助金の募集')).toBe(true);
    expect(isSubsidyLike('人材開発助成金')).toBe(true);
    expect(isSubsidyLike('創業セミナーのご案内')).toBe(false);
  });
});

describe('detectPrefecture', () => {
  it('都道府県名を検出、無ければnull', () => {
    expect(detectPrefecture('東京都 中小企業向け')).toBe('東京都');
    expect(detectPrefecture('全国対象の制度')).toBeNull();
  });
});

describe('mapJnet21Item', () => {
  it('補助金系はマップ、都道府県を検出、HTMLを除去', () => {
    const items = parseFeedItems(RSS);
    const mapped = items.map(mapJnet21Item);
    // item0: 東京都補助金 → マップされ 東京都/都道府県
    expect(mapped[0]).not.toBeNull();
    expect(mapped[0]!.prefecture).toBe('東京都');
    expect(mapped[0]!.level).toBe('都道府県');
    expect(mapped[0]!.description).not.toContain('<p>');
    expect(mapped[0]!.confidence).toBe('low');
    // item1: セミナー → 除外(null)
    expect(mapped[1]).toBeNull();
    // item2: 人材開発助成金（地域名なし）→ 全国/国
    expect(mapped[2]).not.toBeNull();
    expect(mapped[2]!.prefecture).toBe('全国');
    expect(mapped[2]!.level).toBe('国');
  });
});
