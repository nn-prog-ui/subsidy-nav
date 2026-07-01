// 厚生労働省の主要な「国の雇用関係助成金」をキュレーションした一次データ。
// Jグランツ（経産省系）には載りにくい助成金カテゴリを補完する。
// 制度自体は安定しているが、支給額・要件は年度/コースで変動するため、
// 金額は「目安」、詳細は各公式ページで確認する前提の「入口情報」として扱う。

const MHLW_INDEX_URL = 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/index.html';
const NOTE = '※支給額・要件は年度・コースにより異なります。必ず厚生労働省の最新情報をご確認ください。';

export interface MhlwGrantSeed {
  slug: string;
  title: string;
  purpose: string;               // 制度の目的（安定的な説明）
  targetType: string;
  maxAmount: number | null;      // 代表的な上限の目安（不明・変動大は null）
  subsidyRate: string | null;
  url?: string;
}

export const MHLW_GRANTS: MhlwGrantSeed[] = [
  { slug: 'career-up', title: 'キャリアアップ助成金', purpose: '有期雇用労働者等の正社員化や処遇改善に取り組む事業主を支援。正社員化コースなど複数コースがある。', targetType: '事業主', maxAmount: 800000, subsidyRate: null },
  { slug: 'jinzai-kaihatsu', title: '人材開発支援助成金', purpose: '従業員への職業訓練等（OFF-JT/OJT）にかかる経費や訓練期間中の賃金の一部を助成。', targetType: '事業主', maxAmount: null, subsidyRate: null },
  { slug: 'koyou-chosei', title: '雇用調整助成金', purpose: '景気変動等で事業活動を縮小した際に、休業・教育訓練・出向で雇用を維持する事業主に休業手当等の一部を助成。', targetType: '事業主', maxAmount: null, subsidyRate: null },
  { slug: 'tokutei-kyushokusha', title: '特定求職者雇用開発助成金', purpose: '高年齢者・障害者・母子家庭の母等、就職が特に困難な求職者をハローワーク等の紹介で継続雇用する事業主を助成。', targetType: '事業主', maxAmount: 600000, subsidyRate: null },
  { slug: 'trial', title: 'トライアル雇用助成金', purpose: '職業経験の不足等で就職が困難な求職者を試行雇用（原則3か月）する事業主に、月額を助成。', targetType: '事業主', maxAmount: 120000, subsidyRate: null },
  { slug: 'ryoritsu-shien', title: '両立支援等助成金', purpose: '育児・介護と仕事の両立支援に取り組む事業主を支援（出生時両立支援・育児休業等支援コース等）。', targetType: '事業主', maxAmount: null, subsidyRate: null },
  { slug: 'gyomu-kaizen', title: '業務改善助成金', purpose: '事業場内最低賃金の引上げと生産性向上のための設備投資等を行う中小企業・小規模事業者を助成。', targetType: '中小企業・小規模事業者', maxAmount: 6000000, subsidyRate: null },
  { slug: '65over', title: '65歳超雇用推進助成金', purpose: '65歳以上への定年引上げ・定年廃止・高年齢者の雇用管理制度の整備等を行う事業主を助成。', targetType: '事業主', maxAmount: 1600000, subsidyRate: null },
  { slug: 'jinzai-kakuho', title: '人材確保等支援助成金', purpose: '魅力ある職場づくり（雇用管理制度の導入等）で人材の確保・定着に取り組む事業主を支援。', targetType: '事業主', maxAmount: null, subsidyRate: null },
  { slug: 'sangyo-koyou-antei', title: '産業雇用安定助成金', purpose: '在籍型出向により労働者の雇用を維持する場合等に、出向元・出向先の双方を助成。', targetType: '事業主', maxAmount: null, subsidyRate: null },
  { slug: 'chiiki-koyou', title: '地域雇用開発助成金', purpose: '雇用機会が不足する地域で事業所の設置・整備を行い、地域求職者等を雇い入れる事業主を助成。', targetType: '事業主', maxAmount: null, subsidyRate: null },
  { slug: 'chuto-saiyo', title: '中途採用等支援助成金', purpose: '中途採用の拡大や、UIJターンによる採用に取り組む事業主を支援。', targetType: '事業主', maxAmount: null, subsidyRate: null },
  { slug: 'shogaisha-koyou', title: '障害者雇用に関する各種助成金', purpose: '障害者の作業施設・設備の設置整備や、雇用管理・職場定着の支援に取り組む事業主を助成。', targetType: '事業主', maxAmount: null, subsidyRate: null },
  { slug: 'jinzai-kakuho-kaigo', title: '人材確保等支援助成金（介護・保育分野等）', purpose: '介護・保育等の分野で雇用管理改善や生産性向上に取り組み、離職率低下を図る事業主を支援。', targetType: '介護・保育等の事業主', maxAmount: null, subsidyRate: null },
];

export interface MhlwMappedSubsidy {
  title: string;
  description: string;
  category: string;
  targetType: string;
  prefecture: string;
  level: string;
  maxAmount: bigint | null;
  subsidyRate: string | null;
  applicationUrl: string;
  status: string;
  source: string;
  sourceId: string;
}

export function mapMhlwGrant(g: MhlwGrantSeed): MhlwMappedSubsidy {
  return {
    title: g.title,
    description: `${g.purpose}\n\n${NOTE}`,
    category: '雇用促進',
    targetType: g.targetType,
    prefecture: '全国',
    level: '国',
    maxAmount: g.maxAmount != null && g.maxAmount > 0 ? BigInt(g.maxAmount) : null,
    subsidyRate: g.subsidyRate,
    applicationUrl: g.url || MHLW_INDEX_URL,
    status: 'active',
    source: 'mhlw',
    sourceId: `mhlw:${g.slug}`,
  };
}
