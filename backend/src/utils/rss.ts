// RSS 2.0 フィードの最小実装。

/** XMLテキストのエスケープ。 */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface RssItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: Date;
  guid?: string;
}

export interface RssFeed {
  title: string;
  link: string;
  description: string;
  items: RssItem[];
}

/** RSS 2.0 のXML文字列を生成する。 */
export function buildRssFeed(feed: RssFeed): string {
  const items = feed.items.map(i => {
    const parts = [
      `      <title>${escapeXml(i.title)}</title>`,
      `      <link>${escapeXml(i.link)}</link>`,
      `      <guid isPermaLink="false">${escapeXml(i.guid || i.link)}</guid>`,
    ];
    if (i.pubDate) parts.push(`      <pubDate>${i.pubDate.toUTCString()}</pubDate>`);
    if (i.description) parts.push(`      <description>${escapeXml(i.description)}</description>`);
    return `    <item>\n${parts.join('\n')}\n    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(feed.title)}</title>
    <link>${escapeXml(feed.link)}</link>
    <description>${escapeXml(feed.description)}</description>
${items}
  </channel>
</rss>`;
}
