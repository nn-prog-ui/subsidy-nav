// jGrants（Jグランツ）公開APIのレスポンスを当アプリの Subsidy へマッピングする。
// 公開APIのフィールド名に追従しつつ、欠損に強い防御的実装にする。

export interface JGrantsRaw {
  id?: string;
  name?: string;
  title?: string;
  subsidy_catch_phrase?: string;
  detail?: string;
  use_purpose?: string;
  target_area_search?: string;     // 例: "全国" / "東京都" / "東京都/神奈川県"
  target_number_of_employees?: string; // 例: "中小企業者" / "従業員数の制限なし"
  subsidy_max_limit?: number | string | null;
  acceptance_start_datetime?: string | null;
  acceptance_end_datetime?: string | null;
  [k: string]: unknown;
}

export interface MappedSubsidy {
  title: string;
  description: string;
  category: string;
  targetType: string;
  prefecture: string;
  level: string;
  maxAmount: bigint | null;
  applicationStart: Date | null;
  applicationEnd: Date | null;
  applicationUrl: string;
  status: string;
  source: string;
  sourceId: string;
}

function parseDate(v: unknown): Date | null {
  if (!v || typeof v !== 'string') return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function firstArea(area: string | undefined): string {
  if (!area) return '全国';
  const first = area.split(/[\/、,\s]+/).filter(Boolean)[0];
  return first || '全国';
}

/**
 * jGrants の1件を Subsidy 形式へ変換する。
 * category は当アプリの分類に厳密一致しないため「各種補助金」を既定とし、管理者レビューで補正する想定。
 */
export function mapJGrantsToSubsidy(raw: JGrantsRaw, now: Date = new Date()): MappedSubsidy | null {
  const id = raw.id ? String(raw.id) : null;
  const title = (raw.title || raw.name || '').trim();
  if (!id || !title) return null;

  const prefecture = firstArea(raw.target_area_search);
  const end = parseDate(raw.acceptance_end_datetime);
  const maxRaw = raw.subsidy_max_limit;
  const maxNum = typeof maxRaw === 'number' ? maxRaw : (maxRaw ? Number(String(maxRaw).replace(/[^\d]/g, '')) : NaN);

  return {
    title,
    description: (raw.detail || raw.subsidy_catch_phrase || raw.use_purpose || '（詳細はリンク先をご確認ください）').toString().slice(0, 2000),
    category: '各種補助金',
    targetType: (raw.target_number_of_employees || '制限なし').toString().slice(0, 100),
    prefecture,
    level: prefecture === '全国' ? '国' : '都道府県',
    maxAmount: Number.isFinite(maxNum) && maxNum > 0 ? BigInt(Math.round(maxNum)) : null,
    applicationStart: parseDate(raw.acceptance_start_datetime),
    applicationEnd: end,
    applicationUrl: `https://www.jgrants-portal.go.jp/subsidy/${id}`,
    status: end && end.getTime() < now.getTime() ? 'closed' : 'active',
    source: 'jgrants',
    sourceId: `jgrants:${id}`,
  };
}
