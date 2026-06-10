import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ScrapeTarget {
  code: string;
  name: string;
  prefecture: string;
  url: string;
  selectors: { list: string; title: string; link?: string };
}

const TARGETS: ScrapeTarget[] = [
  // 北海道・東北
  { code: '011002', name: '札幌市', prefecture: '北海道', url: 'https://www.city.sapporo.jp/keizai/shokogyo/hojokin/', selectors: { list: '.list-item', title: 'a', link: 'a' } },
  { code: '041009', name: '仙台市', prefecture: '宮城県', url: 'https://www.city.sendai.jp/keizai/business/shien/', selectors: { list: '.news-item', title: 'a', link: 'a' } },
  { code: '051004', name: '秋田市', prefecture: '秋田県', url: 'https://www.city.akita.lg.jp/business/shien/', selectors: { list: 'li', title: 'a', link: 'a' } },
  { code: '062014', name: '山形市', prefecture: '山形県', url: 'https://www.city.yamagata-yamagata.lg.jp/sangyo/hojokin/', selectors: { list: 'li', title: 'a', link: 'a' } },
  { code: '071005', name: '福島市', prefecture: '福島県', url: 'https://www.city.fukushima.fukushima.jp/sangyo/shien/', selectors: { list: '.item', title: 'a', link: 'a' } },
  { code: '022012', name: '青森市', prefecture: '青森県', url: 'https://www.city.aomori.aomori.jp/sangyo-rodo/kigyoshien/', selectors: { list: '.list', title: 'a', link: 'a' } },
  { code: '032018', name: '盛岡市', prefecture: '岩手県', url: 'https://www.city.morioka.iwate.jp/sangyo/shogyo/', selectors: { list: 'li', title: 'a', link: 'a' } },
  // 関東
  { code: '081009', name: '水戸市', prefecture: '茨城県', url: 'https://www.city.mito.lg.jp/001/sangyo/chusho/', selectors: { list: '.entry', title: 'a', link: 'a' } },
  { code: '091006', name: '宇都宮市', prefecture: '栃木県', url: 'https://www.city.utsunomiya.tochigi.jp/sangyo/kigyoshien/', selectors: { list: '.item', title: 'a', link: 'a' } },
  { code: '101001', name: '前橋市', prefecture: '群馬県', url: 'https://www.city.maebashi.gunma.jp/sangyo/shogyo/', selectors: { list: 'li', title: 'a', link: 'a' } },
  { code: '111003', name: 'さいたま市', prefecture: '埼玉県', url: 'https://www.city.saitama.jp/002/001/004/p000001.html', selectors: { list: '.list-news', title: 'a', link: 'a' } },
  { code: '121002', name: '千葉市', prefecture: '千葉県', url: 'https://www.city.chiba.jp/keizai/sangyo/shogyo/hojokin.html', selectors: { list: '.article', title: 'a', link: 'a' } },
  { code: '131016', name: '千代田区', prefecture: '東京都', url: 'https://www.city.chiyoda.lg.jp/koho/machizukuri/sangyo/shien/', selectors: { list: '.item', title: 'a', link: 'a' } },
  { code: '131041', name: '新宿区', prefecture: '東京都', url: 'https://www.city.shinjuku.lg.jp/sangyo/shien/', selectors: { list: '.entry', title: 'a', link: 'a' } },
  { code: '131130', name: '渋谷区', prefecture: '東京都', url: 'https://www.city.shibuya.tokyo.jp/sangyo/kigyoshien/', selectors: { list: 'li', title: 'a', link: 'a' } },
  { code: '131202', name: '練馬区', prefecture: '東京都', url: 'https://www.city.nerima.tokyo.jp/sangyo/shien/', selectors: { list: '.news', title: 'a', link: 'a' } },
  { code: '132012', name: '八王子市', prefecture: '東京都', url: 'https://www.city.hachioji.tokyo.jp/contents/00012901.html', selectors: { list: '.list', title: 'a', link: 'a' } },
  { code: '141003', name: '横浜市', prefecture: '神奈川県', url: 'https://www.city.yokohama.lg.jp/business/support/hojokin/', selectors: { list: '.article', title: 'a', link: 'a' } },
  { code: '141402', name: '川崎市', prefecture: '神奈川県', url: 'https://www.city.kawasaki.jp/280/category/34-1-0-0-0-0-0-0-0-0.html', selectors: { list: '.item', title: 'a', link: 'a' } },
  { code: '141801', name: '相模原市', prefecture: '神奈川県', url: 'https://www.city.sagamihara.kanagawa.jp/sangyo/support/', selectors: { list: 'li', title: 'a', link: 'a' } },
  // 中部
  { code: '151009', name: '新潟市', prefecture: '新潟県', url: 'https://www.city.niigata.lg.jp/business/sangyo/shien/', selectors: { list: '.item', title: 'a', link: 'a' } },
  { code: '172014', name: '金沢市', prefecture: '石川県', url: 'https://www4.city.kanazawa.lg.jp/11105/index.html', selectors: { list: '.list', title: 'a', link: 'a' } },
  { code: '221007', name: '静岡市', prefecture: '静岡県', url: 'https://www.city.shizuoka.lg.jp/categories/biz/000001/', selectors: { list: '.news', title: 'a', link: 'a' } },
  { code: '221309', name: '浜松市', prefecture: '静岡県', url: 'https://www.city.hamamatsu.shizuoka.jp/sangyo/shien/', selectors: { list: '.entry', title: 'a', link: 'a' } },
  { code: '231003', name: '名古屋市', prefecture: '愛知県', url: 'https://www.city.nagoya.jp/keizai/page/0000003594.html', selectors: { list: '.article', title: 'a', link: 'a' } },
  { code: '232017', name: '豊橋市', prefecture: '愛知県', url: 'https://www.city.toyohashi.lg.jp/item/18523.htm', selectors: { list: 'li', title: 'a', link: 'a' } },
  { code: '212015', name: '岐阜市', prefecture: '岐阜県', url: 'https://www.city.gifu.lg.jp/business/sangyo/', selectors: { list: '.item', title: 'a', link: 'a' } },
  // 近畿
  { code: '252018', name: '大津市', prefecture: '滋賀県', url: 'https://www.city.otsu.lg.jp/sangyo/kigyoshien/', selectors: { list: 'li', title: 'a', link: 'a' } },
  { code: '261009', name: '京都市', prefecture: '京都府', url: 'https://www.city.kyoto.lg.jp/sankan/page/0000011547.html', selectors: { list: '.news', title: 'a', link: 'a' } },
  { code: '271004', name: '大阪市', prefecture: '大阪府', url: 'https://www.city.osaka.lg.jp/keizaisenryaku/page/0000009749.html', selectors: { list: '.item', title: 'a', link: 'a' } },
  { code: '271403', name: '堺市', prefecture: '大阪府', url: 'https://www.city.sakai.lg.jp/sangyo/shien/', selectors: { list: '.entry', title: 'a', link: 'a' } },
  { code: '281005', name: '神戸市', prefecture: '兵庫県', url: 'https://www.city.kobe.lg.jp/a62406/sangyo/support/', selectors: { list: '.list', title: 'a', link: 'a' } },
  { code: '282014', name: '姫路市', prefecture: '兵庫県', url: 'https://www.city.himeji.lg.jp/s130/sangyo/shien/', selectors: { list: 'li', title: 'a', link: 'a' } },
  { code: '292010', name: '奈良市', prefecture: '奈良県', url: 'https://www.city.nara.lg.jp/site/sangyoshinko/', selectors: { list: '.item', title: 'a', link: 'a' } },
  // 中国・四国
  { code: '331007', name: '岡山市', prefecture: '岡山県', url: 'https://www.city.okayama.jp/keizai/0000007613.html', selectors: { list: '.article', title: 'a', link: 'a' } },
  { code: '341003', name: '広島市', prefecture: '広島県', url: 'https://www.city.hiroshima.lg.jp/site/business/7474.html', selectors: { list: '.item', title: 'a', link: 'a' } },
  { code: '342063', name: '福山市', prefecture: '広島県', url: 'https://www.city.fukuyama.hiroshima.jp/site/sangyo/8937.html', selectors: { list: 'li', title: 'a', link: 'a' } },
  { code: '352012', name: '下関市', prefecture: '山口県', url: 'https://www.city.shimonoseki.yamaguchi.jp/sangyo/sangyo01/', selectors: { list: '.list', title: 'a', link: 'a' } },
  { code: '372013', name: '高松市', prefecture: '香川県', url: 'https://www.city.takamatsu.kagawa.jp/business/sangyo/', selectors: { list: '.news', title: 'a', link: 'a' } },
  { code: '382019', name: '松山市', prefecture: '愛媛県', url: 'https://www.city.matsuyama.ehime.jp/sangyo/sangyo/', selectors: { list: '.item', title: 'a', link: 'a' } },
  { code: '392014', name: '高知市', prefecture: '高知県', url: 'https://www.city.kochi.kochi.jp/soshiki/35/', selectors: { list: 'li', title: 'a', link: 'a' } },
  // 九州・沖縄
  { code: '401005', name: '福岡市', prefecture: '福岡県', url: 'https://www.city.fukuoka.lg.jp/keizai/r-support/business/', selectors: { list: '.article', title: 'a', link: 'a' } },
  { code: '402015', name: '北九州市', prefecture: '福岡県', url: 'https://www.city.kitakyushu.lg.jp/san-kei/file_0259.html', selectors: { list: '.item', title: 'a', link: 'a' } },
  { code: '412015', name: '佐賀市', prefecture: '佐賀県', url: 'https://www.city.saga.lg.jp/main/22015.html', selectors: { list: 'li', title: 'a', link: 'a' } },
  { code: '422011', name: '長崎市', prefecture: '長崎県', url: 'https://www.city.nagasaki.lg.jp/sangyo/130000/132000/p000573.html', selectors: { list: '.list', title: 'a', link: 'a' } },
  { code: '431009', name: '熊本市', prefecture: '熊本県', url: 'https://www.city.kumamoto.jp/hpKiji/pub/detail.aspx?c_id=5&id=18', selectors: { list: '.news', title: 'a', link: 'a' } },
  { code: '442011', name: '大分市', prefecture: '大分県', url: 'https://www.city.oita.oita.jp/o166/shigotosangyo/sangyo/', selectors: { list: '.item', title: 'a', link: 'a' } },
  { code: '452017', name: '宮崎市', prefecture: '宮崎県', url: 'https://www.city.miyazaki.miyazaki.jp/sangyo/kigyo/', selectors: { list: 'li', title: 'a', link: 'a' } },
  { code: '462012', name: '鹿児島市', prefecture: '鹿児島県', url: 'https://www.city.kagoshima.lg.jp/sangyouroudou/sangyo/shogyo/', selectors: { list: '.entry', title: 'a', link: 'a' } },
  { code: '472018', name: '那覇市', prefecture: '沖縄県', url: 'https://www.city.naha.okinawa.jp/kurashi/sangyo/shogyo/', selectors: { list: '.article', title: 'a', link: 'a' } },
  { code: '472026', name: '沖縄市', prefecture: '沖縄県', url: 'https://www.city.okinawa.okinawa.jp/sangyo/shien/', selectors: { list: 'li', title: 'a', link: 'a' } },
  { code: '102016', name: '高崎市', prefecture: '群馬県', url: 'https://www.city.takasaki.gunma.jp/docs/2013080700016/', selectors: { list: '.list', title: 'a', link: 'a' } },
  { code: '082015', name: 'つくば市', prefecture: '茨城県', url: 'https://www.city.tsukuba.lg.jp/sangyo/shien/', selectors: { list: '.item', title: 'a', link: 'a' } },
];

async function scrapeTarget(target: ScrapeTarget): Promise<number> {
  try {
    const { data: html } = await axios.get(target.url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 SubsidyNavigatorBot/1.0' },
    });
    const $ = cheerio.load(html);
    let count = 0;

    $(target.selectors.list).each((_, el) => {
      const titleEl = $(el).find(target.selectors.title).first();
      const title = titleEl.text().trim();
      if (!title || title.length < 5) return;

      const linkHref = titleEl.attr('href');
      const applicationUrl = linkHref
        ? linkHref.startsWith('http') ? linkHref : new URL(linkHref, target.url).href
        : target.url;

      prisma.subsidy.upsert({
        where: { id: `scraped_${target.code}_${Buffer.from(title).toString('base64').slice(0, 20)}` },
        update: { scrapedAt: new Date(), applicationUrl, status: 'active' },
        create: {
          id: `scraped_${target.code}_${Buffer.from(title).toString('base64').slice(0, 20)}`,
          title,
          description: `${target.name}が提供する補助金・助成金情報です。詳細はリンク先をご確認ください。`,
          category: '各種補助金',
          targetType: '中小企業・個人事業主',
          level: '市区町村',
          prefecture: target.prefecture,
          municipalityCode: target.code,
          municipalityName: target.name,
          status: 'active',
          applicationUrl,
          scrapeUrl: target.url,
          scrapedAt: new Date(),
        },
      }).catch(() => {});
      count++;
    });

    return count;
  } catch (err: any) {
    throw new Error(err.message);
  }
}

export async function runScrape() {
  console.log(`Starting scrape of ${TARGETS.length} targets...`);
  for (const target of TARGETS) {
    let status = 'success';
    let found = 0;
    let errorMessage: string | undefined;
    try {
      found = await scrapeTarget(target);
      console.log(`[${target.name}] ${found} items`);
    } catch (err: any) {
      status = 'error';
      errorMessage = err.message;
      console.error(`[${target.name}] error: ${err.message}`);
    }
    await prisma.scrapeLog.create({ data: { targetCode: target.code, targetName: target.name, status, subsidiesFound: found, errorMessage } });
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log('Scrape completed.');
}
