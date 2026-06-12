import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding...');

  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin1234', 10);
  await prisma.adminUser.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@subsidy-nav.jp' },
    update: {},
    create: { email: process.env.ADMIN_EMAIL || 'admin@subsidy-nav.jp', passwordHash: hash },
  });

  const subsidies = [
    // ===== 国（50件）=====
    { title: 'IT導入補助金2024', description: 'ITツール導入を支援。中小企業・小規模事業者のデジタル化を促進。業務プロセスの改善や業務効率化に役立つソフトウェアの導入費用を補助。', category: 'IT・デジタル', targetType: '中小企業・小規模事業者', level: '国', prefecture: '全国', maxAmount: 4500000n, subsidyRate: '最大3/4', applicationStart: new Date('2024-04-01'), applicationEnd: new Date('2024-12-31'), status: 'active', applicationUrl: 'https://www.it-hojo.jp/' },
    { title: 'ものづくり補助金（通常枠）', description: '革新的な製品・サービス開発や生産プロセスの改善支援。設備投資・試作開発に活用できる。', category: '設備投資', targetType: '中小企業', level: '国', prefecture: '全国', maxAmount: 12500000n, subsidyRate: '1/2〜2/3', applicationStart: new Date('2024-03-01'), applicationEnd: new Date('2024-11-30'), status: 'active', applicationUrl: 'https://portal.monodukuri-hojo.jp/' },
    { title: '小規模事業者持続化補助金', description: '小規模事業者の販路開拓や生産性向上を支援。チラシ作成・ウェブサイト制作・展示会出展等。', category: '販路拡大', targetType: '小規模事業者', level: '国', prefecture: '全国', maxAmount: 2000000n, subsidyRate: '2/3', applicationStart: new Date('2024-02-01'), applicationEnd: new Date('2024-10-31'), status: 'active', applicationUrl: 'https://jizokukahojokin.info/' },
    { title: '事業再構築補助金', description: 'ポストコロナ時代の経済社会変化に対応するための事業再構築を支援。新分野展開・業態転換等。', category: '事業再構築', targetType: '中小企業', level: '国', prefecture: '全国', maxAmount: 150000000n, subsidyRate: '1/2〜2/3', applicationStart: new Date('2024-04-01'), applicationEnd: new Date('2024-09-30'), status: 'active', applicationUrl: 'https://jigyou-saikouchiku.go.jp/' },
    { title: '雇用調整助成金', description: '経済上の理由で事業活動の縮小を余儀なくされた事業主への休業手当等の助成。', category: '雇用促進', targetType: '全事業者', level: '国', prefecture: '全国', maxAmount: 9000n, subsidyRate: '2/3〜4/5', status: 'active' },
    { title: 'キャリアアップ助成金', description: '非正規労働者の正規雇用化・処遇改善を支援。有期→無期・正規転換に最大72万円。', category: '雇用促進', targetType: '全事業者', level: '国', prefecture: '全国', maxAmount: 720000n, subsidyRate: '定額', status: 'active' },
    { title: '地方創生推進交付金', description: '地方公共団体の自主的・主体的な取り組みを支援する交付金。SDGs未来都市等。', category: '地方創生', targetType: '地方公共団体', level: '国', prefecture: '全国', maxAmount: 500000000n, subsidyRate: '1/2', status: 'active' },
    { title: '省エネルギー投資促進支援補助金', description: '工場・事業場における省エネルギー設備への投資支援。エネルギー診断から実施まで。', category: '環境・エネルギー', targetType: '全事業者', level: '国', prefecture: '全国', maxAmount: 150000000n, subsidyRate: '1/3〜1/2', status: 'active' },
    { title: '創業促進補助金（特定創業支援等事業）', description: '市区町村から特定創業支援を受けた創業者への経費補助。', category: '創業支援', targetType: '創業者', level: '国', prefecture: '全国', maxAmount: 2000000n, subsidyRate: '2/3', status: 'active' },
    { title: 'ものづくり補助金（デジタル枠）', description: 'DX化・デジタル技術を活用した革新的製品・サービス開発支援。サイバーセキュリティ対策も対象。', category: 'IT・デジタル', targetType: '中小企業', level: '国', prefecture: '全国', maxAmount: 12500000n, subsidyRate: '2/3〜3/4', status: 'active', applicationUrl: 'https://portal.monodukuri-hojo.jp/' },
    { title: '輸出促進補助金（新輸出大国コンソーシアム）', description: '中小企業の海外展開・輸出拡大を一貫支援。海外展示会出展・広告宣伝費等補助。', category: '海外展開', targetType: '中小企業', level: '国', prefecture: '全国', maxAmount: 5000000n, subsidyRate: '1/2', status: 'active' },
    { title: 'BCP策定・運用助成（中小企業強靱化対策）', description: '中小企業の事業継続計画（BCP）策定・更新・運用の専門家費用を補助。', category: '経営支援', targetType: '中小企業', level: '国', prefecture: '全国', maxAmount: 2000000n, subsidyRate: '2/3', status: 'active' },
    { title: '働き方改革推進支援助成金（時間外労働上限設定コース）', description: '時間外労働の上限規制への対応を促進する中小企業への助成。', category: '雇用促進', targetType: '中小企業', level: '国', prefecture: '全国', maxAmount: 1000000n, subsidyRate: '3/4', status: 'active' },
    { title: 'IoT推進ラボ支援（スマート工場実証事業）', description: 'IoT・AI等先進技術を活用したスマート工場化の実証支援。', category: 'IT・デジタル', targetType: '製造業', level: '国', prefecture: '全国', maxAmount: 30000000n, subsidyRate: '1/2', status: 'active' },
    { title: '再生可能エネルギー導入補助金（ZEB実証）', description: '太陽光・蓄電池・ZEB化を含む再エネ設備導入支援。', category: '環境・エネルギー', targetType: '全事業者', level: '国', prefecture: '全国', maxAmount: 100000000n, subsidyRate: '1/3〜1/2', applicationStart: new Date('2024-05-01'), applicationEnd: new Date('2025-01-31'), status: 'active' },
    { title: '障害者雇用促進助成金（障害者雇用相談援助コース）', description: '障害者を雇用する事業主の職場環境整備・就業支援機器購入を助成。', category: '雇用促進', targetType: '全事業者', level: '国', prefecture: '全国', maxAmount: 6000000n, subsidyRate: '3/4', status: 'active' },
    { title: '地域未来投資促進補助金', description: '地域の特性を活かした企業の地域経済牽引事業を総合的に支援。', category: '地方創生', targetType: '全事業者', level: '国', prefecture: '全国', maxAmount: 300000000n, subsidyRate: '1/2〜2/3', status: 'active' },
    { title: '食品輸出促進補助金（農林水産物・食品輸出基盤強化）', description: '農林水産物・食品の輸出拡大への取り組み支援。HACCP対応・海外プロモーション等。', category: '農業・林業', targetType: '農業・食品事業者', level: '国', prefecture: '全国', maxAmount: 10000000n, subsidyRate: '1/2', status: 'active' },
    { title: 'サイバーセキュリティ対策促進助成金', description: '中小企業のサイバーセキュリティ対策（セキュリティ診断・ツール導入）支援。', category: 'IT・デジタル', targetType: '中小企業', level: '国', prefecture: '全国', maxAmount: 1500000n, subsidyRate: '1/2', applicationStart: new Date('2024-06-01'), applicationEnd: new Date('2025-02-28'), status: 'active' },
    { title: 'J-Startup スタートアップ支援補助金', description: '革新的技術・ビジネスモデルを持つスタートアップへの集中支援プログラム。', category: '創業支援', targetType: 'スタートアップ', level: '国', prefecture: '全国', maxAmount: 50000000n, subsidyRate: '1/2〜2/3', status: 'active', applicationUrl: 'https://j-startup.go.jp/' },
    { title: '農業次世代人材投資資金（就農準備型）', description: '農業経営を担う次世代担い手の就農準備段階への支援。研修費用等。', category: '農業・林業', targetType: '農業従事者', level: '国', prefecture: '全国', maxAmount: 1500000n, subsidyRate: '定額', status: 'active' },
    { title: 'トライアル雇用助成金（一般トライアルコース）', description: '安定就職が困難な求職者を試行的に短期雇用した事業主への助成。', category: '雇用促進', targetType: '全事業者', level: '国', prefecture: '全国', maxAmount: 40000n, subsidyRate: '定額/月', status: 'active' },
    { title: '中小企業デジタル化応援隊事業', description: 'ITに詳しい専門家が中小企業のデジタル化・IT活用を低廉な費用で支援。', category: 'IT・デジタル', targetType: '中小企業', level: '国', prefecture: '全国', maxAmount: 300000n, subsidyRate: '補助率あり', status: 'active' },
    { title: '商店街活性化補助金（にぎわい創出事業）', description: '商店街の空き店舗解消・集客イベント・アーケード改修等の活性化支援。', category: '販路拡大', targetType: '商店街組合', level: '国', prefecture: '全国', maxAmount: 10000000n, subsidyRate: '2/3', status: 'active' },
    { title: '地域おこし企業人交流プログラム', description: '三大都市圏の民間企業社員が地方公共団体のプロジェクトで活躍する仕組みを支援。', category: '地方創生', targetType: '地方公共団体', level: '国', prefecture: '全国', maxAmount: 4800000n, subsidyRate: '定額', status: 'active' },
    { title: '女性活躍推進助成金（職場環境整備コース）', description: '女性が活躍しやすい職場環境整備に取り組む中小企業への助成。', category: '雇用促進', targetType: '中小企業', level: '国', prefecture: '全国', maxAmount: 5000000n, subsidyRate: '3/4', status: 'active' },
    { title: 'ものづくり補助金（グリーン枠）', description: '温室効果ガスの排出削減に資する革新的製品・サービス開発支援。グリーンイノベーション。', category: '環境・エネルギー', targetType: '中小企業', level: '国', prefecture: '全国', maxAmount: 12500000n, subsidyRate: '2/3〜3/4', status: 'active' },
    { title: '事業継承・引継ぎ補助金', description: 'M&Aや事業承継後の経営革新・設備投資等を補助。廃業・再チャレンジも対象。', category: '経営支援', targetType: '中小企業', level: '国', prefecture: '全国', maxAmount: 6000000n, subsidyRate: '2/3', applicationStart: new Date('2024-04-01'), applicationEnd: new Date('2025-01-31'), status: 'active' },
    { title: '中小企業経営力強化補助金（海外展開型）', description: '海外展開計画を持つ中小企業の事業費補助。現地調査・プロモーション等。', category: '海外展開', targetType: '中小企業', level: '国', prefecture: '全国', maxAmount: 3000000n, subsidyRate: '1/2', status: 'active' },
    { title: '農村振興補助金（中山間地域等直接支払交付金）', description: '急傾斜地等の条件不利地域の農業維持・農村環境保全への直接支払い。', category: '農業・林業', targetType: '農業従事者', level: '国', prefecture: '全国', maxAmount: 210000n, subsidyRate: '定額', status: 'active' },
    { title: '水産業経営強化補助金', description: '漁業者の経営強化・省力化のための機器・設備導入支援。', category: '農業・林業', targetType: '漁業者', level: '国', prefecture: '全国', maxAmount: 10000000n, subsidyRate: '1/2', status: 'active' },
    { title: '林業成長産業化事業補助金', description: '林業の成長産業化に向けた高性能林業機械導入・路網整備支援。', category: '農業・林業', targetType: '林業事業者', level: '国', prefecture: '全国', maxAmount: 50000000n, subsidyRate: '1/2', status: 'active' },
    { title: '観光振興補助金（観光地域づくり法人形成・確立事業）', description: 'DMO形成・確立に向けた地域の観光マーケティング・プロモーション支援。', category: '観光・まちづくり', targetType: '観光事業者', level: '国', prefecture: '全国', maxAmount: 30000000n, subsidyRate: '定額', status: 'active' },
    { title: '文化芸術活動補助金（文化庁芸術文化振興基金）', description: '芸術文化創造・普及活動への助成。演劇・音楽・美術・映画等。', category: '文化・芸術', targetType: '芸術団体・個人', level: '国', prefecture: '全国', maxAmount: 20000000n, subsidyRate: '定額', status: 'active' },
    { title: 'NPO等社会活動支援補助金', description: 'NPO法人等の社会貢献活動・地域課題解決の取り組みへの補助。', category: '社会福祉', targetType: 'NPO・社会福祉法人', level: '国', prefecture: '全国', maxAmount: 5000000n, subsidyRate: '定額', status: 'active' },
    { title: 'ユニバーサルデザイン推進補助金', description: '公共施設・民間施設のバリアフリー化・UD化促進補助。', category: '社会福祉', targetType: '全事業者', level: '国', prefecture: '全国', maxAmount: 10000000n, subsidyRate: '1/2', status: 'active' },
    { title: '医療機器・ヘルスケア産業補助金', description: '革新的医療機器・ヘルスケア製品の開発・実用化支援。', category: '医療・介護', targetType: '医療機器メーカー', level: '国', prefecture: '全国', maxAmount: 50000000n, subsidyRate: '1/2〜2/3', status: 'active' },
    { title: '介護人材確保補助金（介護職員処遇改善加算）', description: '介護職員の処遇改善（賃上げ・職場環境改善）に取り組む事業者支援。', category: '医療・介護', targetType: '介護事業者', level: '国', prefecture: '全国', maxAmount: 2400000n, subsidyRate: '定額', status: 'active' },
    { title: '子ども・子育て支援交付金（保育所整備）', description: '保育所・認定こども園等の整備費補助。待機児童解消促進。', category: '子育て・教育', targetType: '保育事業者', level: '国', prefecture: '全国', maxAmount: 200000000n, subsidyRate: '1/2', status: 'active' },
    { title: '放課後子ども総合プラン補助金', description: '放課後児童クラブ・放課後子ども教室の設置・運営支援。', category: '子育て・教育', targetType: '地方公共団体・NPO', level: '国', prefecture: '全国', maxAmount: 15000000n, subsidyRate: '1/2', status: 'active' },
    { title: '外国人受入れ環境整備補助金', description: '外国人労働者・外国人住民の生活・就労環境整備支援。日本語教育等。', category: '雇用促進', targetType: '全事業者・地方公共団体', level: '国', prefecture: '全国', maxAmount: 3000000n, subsidyRate: '定額', status: 'active' },
    { title: '産学連携補助金（産学官連携技術開発事業）', description: '大学・研究機関と連携した中小企業の技術開発・実用化支援。', category: '研究開発', targetType: '中小企業', level: '国', prefecture: '全国', maxAmount: 100000000n, subsidyRate: '2/3', status: 'active' },
    { title: 'SBIR（中小企業技術革新制度）補助金', description: '政府の技術開発ニーズに応える中小企業の研究開発活動への補助。', category: '研究開発', targetType: '中小企業', level: '国', prefecture: '全国', maxAmount: 30000000n, subsidyRate: '2/3', status: 'active' },
    { title: '建設業デジタル化支援補助金', description: '建設業のICT活用・BIM/CIM導入・ドローン活用等のDX推進支援。', category: 'IT・デジタル', targetType: '建設業', level: '国', prefecture: '全国', maxAmount: 5000000n, subsidyRate: '1/2', applicationStart: new Date('2024-07-01'), applicationEnd: new Date('2025-03-31'), status: 'active' },
    { title: '運輸・物流業DX補助金', description: 'トラック事業者等の配送効率化・EV車両導入・デジタル化支援。', category: 'IT・デジタル', targetType: '運輸・物流業', level: '国', prefecture: '全国', maxAmount: 10000000n, subsidyRate: '1/2', status: 'active' },
    { title: '中小企業知財支援補助金', description: '中小企業の知的財産（特許・商標等）取得・活用への費用補助。', category: '経営支援', targetType: '中小企業', level: '国', prefecture: '全国', maxAmount: 3000000n, subsidyRate: '1/2〜2/3', status: 'active' },
    { title: '中心市街地活性化補助金（まちなか再生）', description: '商業集積・都市機能の回復・まちなかへの来訪者増加を目的とした活性化支援。', category: '観光・まちづくり', targetType: '地方公共団体・商業者', level: '国', prefecture: '全国', maxAmount: 50000000n, subsidyRate: '1/2', status: 'active' },
    { title: '空き家活用補助金（空き家対策総合支援事業）', description: '空き家の除却・活用・跡地整備等の支援。地域の安全・安心の確保。', category: '観光・まちづくり', targetType: '地方公共団体', level: '国', prefecture: '全国', maxAmount: 20000000n, subsidyRate: '1/2', status: 'active' },
    { title: '持続可能な地域公共交通補助金', description: '地方部の公共交通維持・活性化のための取り組みへの支援。', category: '観光・まちづくり', targetType: '地方公共団体・交通事業者', level: '国', prefecture: '全国', maxAmount: 30000000n, subsidyRate: '1/2', status: 'active' },
    { title: 'GI推進補助金（地理的表示保護制度）', description: '地域の農林水産品・食品のGI認定取得・ブランド化支援。', category: '農業・林業', targetType: '農業・食品事業者', level: '国', prefecture: '全国', maxAmount: 5000000n, subsidyRate: '定額', status: 'active' },
    { title: '防災・減災補助金（国土強靱化地域計画）', description: '地域の防災・減災・強靱化に向けた施設整備・計画策定支援。', category: '防災・安全', targetType: '地方公共団体・民間', level: '国', prefecture: '全国', maxAmount: 100000000n, subsidyRate: '1/2', status: 'active' },

    // ===== 都道府県（30件）=====
    { title: '北海道中小企業デジタル化推進補助金', description: '道内中小企業のIT活用・デジタル化支援。クラウド導入・ECサイト構築費用補助。', category: 'IT・デジタル', targetType: '中小企業', level: '都道府県', prefecture: '北海道', maxAmount: 2000000n, subsidyRate: '1/2', applicationStart: new Date('2024-05-01'), applicationEnd: new Date('2024-11-30'), status: 'active' },
    { title: '北海道農業担い手育成補助金', description: '道内の農業後継者・新規就農者の経営確立を支援する補助金。', category: '農業・林業', targetType: '農業従事者', level: '都道府県', prefecture: '北海道', maxAmount: 3000000n, subsidyRate: '1/2', status: 'active' },
    { title: '青森県農業参入支援補助金', description: '農業への新規参入や経営拡大を目指す事業者を支援。スマート農業設備補助も含む。', category: '農業・林業', targetType: '農業従事者', level: '都道府県', prefecture: '青森県', maxAmount: 5000000n, subsidyRate: '1/2', status: 'active' },
    { title: '宮城県ものづくり産業振興補助金', description: '県内製造業の技術開発・設備投資・DX推進を総合的に支援。', category: '設備投資', targetType: '製造業', level: '都道府県', prefecture: '宮城県', maxAmount: 10000000n, subsidyRate: '1/2', applicationStart: new Date('2024-04-01'), applicationEnd: new Date('2025-01-31'), status: 'active' },
    { title: '秋田県移住・定住促進補助金', description: '秋田県への移住・定住を促進する各種支援。住宅取得・改修補助含む。', category: '地方創生', targetType: '移住者', level: '都道府県', prefecture: '秋田県', maxAmount: 2000000n, subsidyRate: '定額', status: 'active' },
    { title: '山形県食産業振興補助金', description: '山形県産農林水産物を活用した食品加工・6次産業化支援。', category: '農業・林業', targetType: '農業・食品事業者', level: '都道府県', prefecture: '山形県', maxAmount: 5000000n, subsidyRate: '1/2', status: 'active' },
    { title: '東京都創業助成事業', description: '都内での創業・創業後5年未満の中小企業者を支援。賃借料・人件費等補助。', category: '創業支援', targetType: '創業者', level: '都道府県', prefecture: '東京都', maxAmount: 3000000n, subsidyRate: '2/3', applicationStart: new Date('2024-04-01'), applicationEnd: new Date('2024-09-30'), status: 'active', applicationUrl: 'https://startup-station.metro.tokyo.lg.jp/' },
    { title: '東京都中小企業省エネルギー設備導入助成', description: '都内中小企業の省エネ設備（照明・空調・ボイラー等）導入助成。', category: '環境・エネルギー', targetType: '中小企業', level: '都道府県', prefecture: '東京都', maxAmount: 5000000n, subsidyRate: '1/2', applicationStart: new Date('2024-06-01'), applicationEnd: new Date('2025-01-31'), status: 'active' },
    { title: '東京都テレワーク推進支援補助金', description: '都内中小企業のテレワーク環境整備（機器・ソフトウェア・セキュリティ）支援。', category: 'IT・デジタル', targetType: '中小企業', level: '都道府県', prefecture: '東京都', maxAmount: 2500000n, subsidyRate: '1/2', status: 'active' },
    { title: '神奈川県ゼロカーボン推進補助金', description: 'CO2削減に取り組む県内事業者の設備投資・技術開発支援。EV導入も対象。', category: '環境・エネルギー', targetType: '全事業者', level: '都道府県', prefecture: '神奈川県', maxAmount: 3000000n, subsidyRate: '1/2', status: 'active' },
    { title: '神奈川県スタートアップ・エコシステム強化補助金', description: '革新的ビジネスモデルを持つスタートアップの事業加速支援。', category: '創業支援', targetType: 'スタートアップ', level: '都道府県', prefecture: '神奈川県', maxAmount: 5000000n, subsidyRate: '2/3', applicationStart: new Date('2024-07-01'), applicationEnd: new Date('2024-12-31'), status: 'active' },
    { title: '愛知県ものづくり競争力強化補助金', description: '県内製造業の生産性向上・新製品開発・スマートファクトリー化支援。', category: '設備投資', targetType: '製造業', level: '都道府県', prefecture: '愛知県', maxAmount: 15000000n, subsidyRate: '1/2', status: 'active' },
    { title: '愛知県次世代自動車産業支援補助金', description: 'EV・FCV・自動運転関連の研究開発・部品製造事業者支援。', category: '研究開発', targetType: '自動車関連製造業', level: '都道府県', prefecture: '愛知県', maxAmount: 30000000n, subsidyRate: '1/2〜2/3', status: 'active' },
    { title: '大阪府中小企業融資・補助制度', description: '中小企業の資金調達を支援するための補助・融資あっせん制度。', category: '経営支援', targetType: '中小企業', level: '都道府県', prefecture: '大阪府', maxAmount: 1000000n, subsidyRate: '一部補助', status: 'active' },
    { title: '大阪府イノベーション創出支援補助金', description: '大阪発の革新的技術・製品開発に取り組む企業への集中支援。', category: '研究開発', targetType: '中小企業・スタートアップ', level: '都道府県', prefecture: '大阪府', maxAmount: 20000000n, subsidyRate: '1/2', applicationStart: new Date('2024-05-01'), applicationEnd: new Date('2024-11-30'), status: 'active' },
    { title: '京都府伝統産業振興補助金', description: '伝統的工芸品の製造技術継承・新デザイン開発・海外展開支援。', category: '伝統産業', targetType: '伝統産業事業者', level: '都道府県', prefecture: '京都府', maxAmount: 3000000n, subsidyRate: '1/2', status: 'active' },
    { title: '兵庫県農業基盤整備補助金', description: '農業基盤（農道・水路・圃場整備等）の整備・改修補助。', category: '農業・林業', targetType: '農業者・農業団体', level: '都道府県', prefecture: '兵庫県', maxAmount: 50000000n, subsidyRate: '1/2〜2/3', status: 'active' },
    { title: '広島県産業DX加速補助金', description: '県内産業全般のデジタルトランスフォーメーションを加速する補助金。', category: 'IT・デジタル', targetType: '全事業者', level: '都道府県', prefecture: '広島県', maxAmount: 5000000n, subsidyRate: '1/2', applicationStart: new Date('2024-06-01'), applicationEnd: new Date('2025-02-28'), status: 'active' },
    { title: '山口県脱炭素・省エネ補助金', description: '温室効果ガス削減・省エネ設備導入に取り組む県内事業者支援。', category: '環境・エネルギー', targetType: '全事業者', level: '都道府県', prefecture: '山口県', maxAmount: 5000000n, subsidyRate: '1/3〜1/2', status: 'active' },
    { title: '福岡県スタートアップ支援補助金', description: '革新的ビジネスモデルを持つ県内スタートアップの事業化支援。', category: '創業支援', targetType: 'スタートアップ', level: '都道府県', prefecture: '福岡県', maxAmount: 5000000n, subsidyRate: '2/3', status: 'active' },
    { title: '福岡県農業ICT化推進補助金', description: 'スマート農業・ICT活用による農業生産性向上支援。', category: 'IT・デジタル', targetType: '農業従事者', level: '都道府県', prefecture: '福岡県', maxAmount: 2000000n, subsidyRate: '1/2', status: 'active' },
    { title: '熊本県半導体関連産業振興補助金', description: 'TSMC進出を契機とした半導体関連産業の集積・育成支援。', category: '設備投資', targetType: '製造業', level: '都道府県', prefecture: '熊本県', maxAmount: 100000000n, subsidyRate: '1/2', applicationStart: new Date('2024-04-01'), applicationEnd: new Date('2025-03-31'), status: 'active' },
    { title: '沖縄県観光産業振興補助金', description: '観光DX・MICE誘致・国際競争力強化に取り組む県内観光事業者支援。', category: '観光・まちづくり', targetType: '観光事業者', level: '都道府県', prefecture: '沖縄県', maxAmount: 5000000n, subsidyRate: '1/2', status: 'active' },
    { title: '長野県移住就農支援補助金', description: '長野県への移住と農業参入を同時に支援。住居費・農業研修費等補助。', category: '農業・林業', targetType: '移住者・新規就農者', level: '都道府県', prefecture: '長野県', maxAmount: 3000000n, subsidyRate: '定額', status: 'active' },
    { title: '静岡県食品加工業高度化補助金', description: '食品製造・加工業の設備近代化・HACCP対応・輸出対応支援。', category: '設備投資', targetType: '食品加工業', level: '都道府県', prefecture: '静岡県', maxAmount: 10000000n, subsidyRate: '1/2', status: 'active' },
    { title: '北海道観光産業デジタル化補助金', description: '道内観光関連事業者のDX推進・インバウンド対応支援。多言語化等。', category: 'IT・デジタル', targetType: '観光事業者', level: '都道府県', prefecture: '北海道', maxAmount: 1500000n, subsidyRate: '2/3', status: 'active' },
    { title: '岩手県木材産業振興補助金', description: '県産木材の利用促進・林業経営体の体質強化支援。', category: '農業・林業', targetType: '林業・木材事業者', level: '都道府県', prefecture: '岩手県', maxAmount: 8000000n, subsidyRate: '1/2', status: 'active' },
    { title: '茨城県研究開発型企業支援補助金', description: '研究開発・技術革新に取り組む県内企業の設備・人件費補助。', category: '研究開発', targetType: '全事業者', level: '都道府県', prefecture: '茨城県', maxAmount: 20000000n, subsidyRate: '1/2', applicationStart: new Date('2024-05-01'), applicationEnd: new Date('2024-12-31'), status: 'active' },
    { title: '石川県能登復興支援補助金', description: '令和6年能登半島地震被災事業者の事業再建・設備復旧支援。', category: '事業再構築', targetType: '被災事業者', level: '都道府県', prefecture: '石川県', maxAmount: 30000000n, subsidyRate: '3/4', applicationStart: new Date('2024-03-01'), applicationEnd: new Date('2025-03-31'), status: 'active' },
    { title: '鹿児島県畜産振興補助金', description: '黒毛和牛等畜産業の経営基盤強化・飼料自給率向上支援。', category: '農業・林業', targetType: '畜産農家', level: '都道府県', prefecture: '鹿児島県', maxAmount: 5000000n, subsidyRate: '1/2', status: 'active' },

    // ===== 市区町村（25件）=====
    { title: '札幌市中小企業デジタル化推進補助金', description: '市内中小企業のデジタル化・DX化を支援。ソフトウェア・クラウド・システム導入費補助。', category: 'IT・デジタル', targetType: '中小企業', level: '市区町村', prefecture: '北海道', municipalityCode: '011002', municipalityName: '札幌市', maxAmount: 1000000n, subsidyRate: '1/2', applicationStart: new Date('2024-06-01'), applicationEnd: new Date('2024-12-31'), status: 'active' },
    { title: '仙台市創業支援補助金', description: '市内での創業・起業を支援。店舗改装費・設備費・広告費等を補助。', category: '創業支援', targetType: '創業者', level: '市区町村', prefecture: '宮城県', municipalityCode: '041009', municipalityName: '仙台市', maxAmount: 1500000n, subsidyRate: '2/3', applicationStart: new Date('2024-04-01'), applicationEnd: new Date('2024-10-31'), status: 'active' },
    { title: 'さいたま市脱炭素・省エネ補助金', description: '市内事業者の省エネ設備・太陽光発電・蓄電池導入支援。', category: '環境・エネルギー', targetType: '全事業者', level: '市区町村', prefecture: '埼玉県', municipalityCode: '110001', municipalityName: 'さいたま市', maxAmount: 2000000n, subsidyRate: '1/3', status: 'active' },
    { title: '千葉市中小企業経営強化補助金', description: '市内中小企業の経営改善・DX・設備投資を総合支援。', category: '経営支援', targetType: '中小企業', level: '市区町村', prefecture: '千葉県', municipalityCode: '120006', municipalityName: '千葉市', maxAmount: 2000000n, subsidyRate: '1/2', status: 'active' },
    { title: '横浜市ものづくり中小企業振興補助金', description: '市内製造業の設備投資・技術開発・スマート化を支援。', category: '設備投資', targetType: '製造業', level: '市区町村', prefecture: '神奈川県', municipalityCode: '141003', municipalityName: '横浜市', maxAmount: 5000000n, subsidyRate: '1/2', applicationStart: new Date('2024-04-01'), applicationEnd: new Date('2025-01-31'), status: 'active' },
    { title: '川崎市産業DX推進補助金', description: '市内企業のデジタルトランスフォーメーション推進支援。', category: 'IT・デジタル', targetType: '全事業者', level: '市区町村', prefecture: '神奈川県', municipalityCode: '141305', municipalityName: '川崎市', maxAmount: 3000000n, subsidyRate: '1/2', status: 'active' },
    { title: '名古屋市省エネ設備導入補助金', description: '市内事業者の省エネ・再エネ設備（高効率空調・LED・太陽光）導入補助。', category: '環境・エネルギー', targetType: '全事業者', level: '市区町村', prefecture: '愛知県', municipalityCode: '231003', municipalityName: '名古屋市', maxAmount: 2000000n, subsidyRate: '1/3', applicationStart: new Date('2024-05-01'), applicationEnd: new Date('2024-12-31'), status: 'active' },
    { title: '京都市伝統産業振興補助金', description: '伝統工芸品の製造・販売・後継者育成・海外展開に取り組む事業者支援。', category: '伝統産業', targetType: '伝統産業事業者', level: '市区町村', prefecture: '京都府', municipalityCode: '261009', municipalityName: '京都市', maxAmount: 3000000n, subsidyRate: '1/2', applicationStart: new Date('2024-06-01'), applicationEnd: new Date('2025-02-28'), status: 'active' },
    { title: '大阪市女性起業家支援補助金', description: '大阪市内で起業する女性・子育て中の女性を対象とした補助金。', category: '創業支援', targetType: '女性起業家', level: '市区町村', prefecture: '大阪府', municipalityCode: '271004', municipalityName: '大阪市', maxAmount: 2000000n, subsidyRate: '2/3', status: 'active' },
    { title: '神戸市海洋・港湾産業振興補助金', description: '海洋・港湾関連産業の振興・新事業創出・技術開発支援。', category: '産業振興', targetType: '海洋・港湾関連事業者', level: '市区町村', prefecture: '兵庫県', municipalityCode: '281005', municipalityName: '神戸市', maxAmount: 5000000n, subsidyRate: '1/2', status: 'active' },
    { title: '広島市中小企業テレワーク・DX導入補助金', description: 'テレワーク環境整備・業務デジタル化を行う市内中小企業支援。', category: 'IT・デジタル', targetType: '中小企業', level: '市区町村', prefecture: '広島県', municipalityCode: '341003', municipalityName: '広島市', maxAmount: 1000000n, subsidyRate: '2/3', applicationStart: new Date('2024-07-01'), applicationEnd: new Date('2025-01-31'), status: 'active' },
    { title: '北九州市製造業DX支援補助金', description: '製造業のスマートファクトリー化・IoT導入・省力化支援。', category: 'IT・デジタル', targetType: '製造業', level: '市区町村', prefecture: '福岡県', municipalityCode: '401005', municipalityName: '北九州市', maxAmount: 5000000n, subsidyRate: '1/2', status: 'active' },
    { title: '福岡市スタートアップ促進補助金', description: '市内スタートアップの事業化・プロトタイプ開発・海外展開支援。', category: '創業支援', targetType: 'スタートアップ', level: '市区町村', prefecture: '福岡県', municipalityCode: '401307', municipalityName: '福岡市', maxAmount: 3000000n, subsidyRate: '2/3', applicationStart: new Date('2024-04-01'), applicationEnd: new Date('2024-11-30'), status: 'active' },
    { title: '熊本市農業新技術導入補助金', description: 'スマート農業・ドローン・センサー等の新技術導入支援。', category: '農業・林業', targetType: '農業従事者', level: '市区町村', prefecture: '熊本県', municipalityCode: '431009', municipalityName: '熊本市', maxAmount: 3000000n, subsidyRate: '1/2', status: 'active' },
    { title: '那覇市観光DX推進補助金', description: '市内観光事業者のデジタル化・インバウンド対応強化支援。', category: 'IT・デジタル', targetType: '観光事業者', level: '市区町村', prefecture: '沖縄県', municipalityCode: '471003', municipalityName: '那覇市', maxAmount: 1500000n, subsidyRate: '2/3', status: 'active' },
    { title: '浜松市ものづくり企業DX補助金', description: '遠州・三河の製造業拠点でのDX・スマート化支援。', category: 'IT・デジタル', targetType: '製造業', level: '市区町村', prefecture: '静岡県', municipalityCode: '221309', municipalityName: '浜松市', maxAmount: 3000000n, subsidyRate: '1/2', applicationStart: new Date('2024-05-01'), applicationEnd: new Date('2024-12-31'), status: 'active' },
    { title: '岡山市農業スマート化補助金', description: '農業ICT・スマート農業設備の導入補助。', category: '農業・林業', targetType: '農業従事者', level: '市区町村', prefecture: '岡山県', municipalityCode: '331007', municipalityName: '岡山市', maxAmount: 2000000n, subsidyRate: '1/2', status: 'active' },
    { title: '新潟市食品加工業振興補助金', description: '市内食品加工業の設備高度化・6次産業化・ブランド化支援。', category: '設備投資', targetType: '食品加工業', level: '市区町村', prefecture: '新潟県', municipalityCode: '151009', municipalityName: '新潟市', maxAmount: 5000000n, subsidyRate: '1/2', status: 'active' },
    { title: '静岡市茶産業振興補助金', description: '静岡茶の産業振興・後継者育成・海外輸出促進への補助。', category: '農業・林業', targetType: '茶業従事者', level: '市区町村', prefecture: '静岡県', municipalityCode: '221007', municipalityName: '静岡市', maxAmount: 2000000n, subsidyRate: '1/2', status: 'active' },
    { title: '堺市ものづくり産業活性化補助金', description: '国内屈指の工業都市・堺の製造業活性化支援。', category: '設備投資', targetType: '製造業', level: '市区町村', prefecture: '大阪府', municipalityCode: '272001', municipalityName: '堺市', maxAmount: 5000000n, subsidyRate: '1/2', status: 'active' },
    { title: '相模原市中小企業SDGs推進補助金', description: 'SDGsに取り組む市内中小企業の設備投資・認証取得支援。', category: '環境・エネルギー', targetType: '中小企業', level: '市区町村', prefecture: '神奈川県', municipalityCode: '141307', municipalityName: '相模原市', maxAmount: 1000000n, subsidyRate: '1/2', applicationStart: new Date('2024-06-01'), applicationEnd: new Date('2025-01-31'), status: 'active' },
    { title: '宇都宮市スタートアップ創出補助金', description: '宇都宮市内での新事業創出・起業を支援する補助金。', category: '創業支援', targetType: '創業者・スタートアップ', level: '市区町村', prefecture: '栃木県', municipalityCode: '092011', municipalityName: '宇都宮市', maxAmount: 1500000n, subsidyRate: '2/3', status: 'active' },
    { title: '松山市観光活性化補助金', description: '松山城・道後温泉等の観光資源を活用した観光産業振興支援。', category: '観光・まちづくり', targetType: '観光事業者', level: '市区町村', prefecture: '愛媛県', municipalityCode: '382019', municipalityName: '松山市', maxAmount: 2000000n, subsidyRate: '1/2', status: 'active' },
    { title: '高松市水産業振興補助金', description: '市内水産業の経営強化・漁船更新・養殖業振興への補助。', category: '農業・林業', targetType: '漁業者', level: '市区町村', prefecture: '香川県', municipalityCode: '371004', municipalityName: '高松市', maxAmount: 3000000n, subsidyRate: '1/2', status: 'active' },
    { title: '長崎市観光業デジタル化補助金', description: '観光DX・多言語化・VR/AR活用等を推進する市内観光業者支援。', category: 'IT・デジタル', targetType: '観光事業者', level: '市区町村', prefecture: '長崎県', municipalityCode: '422011', municipalityName: '長崎市', maxAmount: 1500000n, subsidyRate: '2/3', applicationStart: new Date('2024-07-01'), applicationEnd: new Date('2025-02-28'), status: 'active' },
    { title: '鹿児島市農業6次産業化補助金', description: '農業生産から加工・販売まで一貫した6次産業化取り組みへの支援。', category: '農業・林業', targetType: '農業事業者', level: '市区町村', prefecture: '鹿児島県', municipalityCode: '462011', municipalityName: '鹿児島市', maxAmount: 3000000n, subsidyRate: '1/2', status: 'active' },
  ];

  // 難易度・所要日数を補助額と区分から推定
  const deriveMeta = (s: any): { difficulty: string; estimatedDays: number } => {
    const amount = s.maxAmount ? Number(s.maxAmount) : 0;
    if (s.level === '国' && amount >= 10000000) return { difficulty: 'hard', estimatedDays: 60 };
    if (amount >= 10000000) return { difficulty: 'hard', estimatedDays: 45 };
    if (s.level === '市区町村' || amount < 2000000) return { difficulty: 'easy', estimatedDays: 14 };
    return { difficulty: 'medium', estimatedDays: 30 };
  };

  // upsertを使って重複エラーを避ける
  let count = 0;
  for (const s of subsidies) {
    try {
      await prisma.subsidy.create({ data: { ...s, ...deriveMeta(s) } as any });
      count++;
    } catch {
      // skip duplicates on re-seed
    }
  }

  const templates = [
    { title: '補助金申請書（基本テンプレート）', category: '申請書', description: '一般的な補助金申請に使用できる基本テンプレート。', fileName: 'application_basic.pdf' },
    { title: '事業計画書テンプレート', category: '事業計画書', description: 'ものづくり補助金等で必要な事業計画書の作成テンプレート。', fileName: 'business_plan.pdf' },
    { title: '収支計画書テンプレート', category: '財務書類', description: '補助事業の収支計画を作成するためのテンプレート。', fileName: 'financial_plan.pdf' },
    { title: '実績報告書テンプレート', category: '報告書', description: '補助金交付後の実績報告に使用するテンプレート。', fileName: 'result_report.pdf' },
    { title: '見積書確認チェックリスト', category: 'チェックリスト', description: '補助金申請時の見積書確認に使用するチェックリスト。', fileName: 'estimate_checklist.pdf' },
    { title: 'IT導入補助金申請書テンプレート', category: '申請書', description: 'IT導入補助金の申請に特化したテンプレート。', fileName: 'it_application.pdf' },
    { title: '雇用助成金申請書テンプレート', category: '申請書', description: '雇用関連の助成金申請に使用するテンプレート。', fileName: 'employment_application.pdf' },
  ];

  for (const t of templates) {
    try {
      await prisma.template.create({ data: t });
    } catch { /* skip */ }
  }

  console.log(`Seeded ${count} subsidies, ${templates.length} templates.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
