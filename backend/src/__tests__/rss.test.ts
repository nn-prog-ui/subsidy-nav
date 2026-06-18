import { buildRssFeed, escapeXml } from '../utils/rss';

describe('escapeXml', () => {
  it('XML特殊文字をエスケープする', () => {
    expect(escapeXml('a & b < c > d "e" \'f\'')).toBe('a &amp; b &lt; c &gt; d &quot;e&quot; &apos;f&apos;');
  });
});

describe('buildRssFeed', () => {
  const xml = buildRssFeed({
    title: '補助金ナビ 新着',
    link: 'https://subsidy-nav.jp',
    description: '新着補助金',
    items: [
      { title: 'IT導入補助金 & 助成', link: 'https://subsidy-nav.jp/subsidies/1', guid: '1', pubDate: new Date('2026-06-18T00:00:00Z'), description: '説明' },
    ],
  });

  it('RSS 2.0 のルート構造を持つ', () => {
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0">');
    expect(xml).toContain('<channel>');
    expect(xml).toContain('</rss>');
  });

  it('チャンネルのタイトル/リンク/説明を含む', () => {
    expect(xml).toContain('<title>補助金ナビ 新着</title>');
    expect(xml).toContain('<link>https://subsidy-nav.jp</link>');
  });

  it('アイテムをエスケープして出力する', () => {
    expect(xml).toContain('<title>IT導入補助金 &amp; 助成</title>');
    expect(xml).toContain('<guid isPermaLink="false">1</guid>');
    expect(xml).toContain('<pubDate>');
  });

  it('itemが空でも壊れない', () => {
    const empty = buildRssFeed({ title: 'T', link: 'L', description: 'D', items: [] });
    expect(empty).toContain('<channel>');
    expect(empty).not.toContain('<item>');
  });
});
