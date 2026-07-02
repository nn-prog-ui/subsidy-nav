// J-Net21「支援情報ヘッドライン」等の RSS/Atom フィードを解析し、
// 「補助金/助成金」らしい項目だけを ExtractedSubsidy 候補（レビューキュー）へ変換する純粋関数群。
// ネットワークは services/importJnet21.ts が担当。ここはAPI/ネット不要でテスト可能。
import * as cheerio from 'cheerio';

export const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県',
  '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県',
  '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

export interface FeedItem {
  title: string;
  link: string;
  description: string;
}

/**
 * RSS2.0 / RSS1.0(RDF) / Atom いずれのフィードXMLからも item を抽出する（欠損に強い）。
 */
export function parseFeedItems(xml: string): FeedItem[] {
  const $ = cheerio.load(xml, { xml: true }); // cheerio 1.0: XMLモード（RSS/Atomの<link>テキスト等を正しく解釈）
  const items: FeedItem[] = [];
  const nodes = $('item').length ? $('item') : $('entry'); // RSS/RDF は item, Atom は entry
  nodes.each((_i, el) => {
    const $el = $(el);
    const title = $el.find('title').first().text().trim();
    // RSS は <link>URL</link>、Atom は <link href="URL"/>
    let link = $el.find('link').first().text().trim();
    if (!link) link = ($el.find('link').first().attr('href') || '').trim();
    const description = $el.find('description, summary').first().text().trim();
    if (title) items.push({ title, link, description });
  });
  return items;
}

const SUBSIDY_RE = /補助金|助成金|給付金|支援金|補助|助成/;

/** タイトルが補助金・助成金系か（イベント/セミナー等のノイズを除外するための緩いフィルタ） */
export function isSubsidyLike(title: string): boolean {
  return SUBSIDY_RE.test(title || '');
}

/** テキストから都道府県名を検出（無ければ null） */
export function detectPrefecture(text: string): string | null {
  for (const p of PREFECTURES) {
    if (text.includes(p)) return p;
  }
  return null;
}

export interface Jnet21Candidate {
  sourceUrl: string;
  title: string;
  description: string;
  category: string;
  targetType: string;
  prefecture: string;
  level: string;
  applicationUrl: string;
  confidence: string;
}

/**
 * フィード1件を ExtractedSubsidy 候補へ変換。補助金系でない/タイトル無しは null。
 */
export function mapJnet21Item(item: FeedItem): Jnet21Candidate | null {
  if (!item || !item.title || !isSubsidyLike(item.title)) return null;
  const pref = detectPrefecture(`${item.title} ${item.description}`);
  const desc = (item.description || '')
    .replace(/<[^>]+>/g, ' ')  // 記述内のHTMLタグを除去
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1000);
  return {
    sourceUrl: item.link || '',
    title: item.title.slice(0, 200),
    description: desc || '（詳細はリンク先をご確認ください）',
    category: '各種補助金',
    targetType: '制限なし',
    prefecture: pref || '全国',
    level: pref ? '都道府県' : '国',
    applicationUrl: item.link || '',
    confidence: 'low',
  };
}
