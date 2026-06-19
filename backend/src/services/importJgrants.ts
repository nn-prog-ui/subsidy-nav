import axios from 'axios';
import { prisma } from '../lib/prisma';
import { withRetry } from '../utils/retry';
import { mapJGrantsToSubsidy, JGrantsRaw } from '../utils/jgrants';

const BASE = process.env.JGRANTS_API_BASE || 'https://api.jgrants-portal.go.jp/exp/v1/public';

// 網羅性を上げるための広めの検索語（jGrants検索はキーワード必須のため）
const DEFAULT_KEYWORDS = ['補助金', '助成金', 'IT', '設備', '創業', '雇用', '環境', '販路', '事業', '人材'];

function extractList(data: unknown): JGrantsRaw[] {
  if (Array.isArray(data)) return data as JGrantsRaw[];
  const d = data as { result?: unknown; subsidies?: unknown } | null;
  if (d && Array.isArray(d.result)) return d.result as JGrantsRaw[];
  if (d && Array.isArray(d.subsidies)) return d.subsidies as JGrantsRaw[];
  return [];
}

async function fetchByKeyword(keyword: string): Promise<JGrantsRaw[]> {
  const url = `${BASE}/subsidies`;
  const { data } = await withRetry(
    () => axios.get(url, {
      params: { keyword, sort: 'created_date', order: 'DESC', acceptance: '1' },
      timeout: 15000,
      headers: { 'User-Agent': 'SubsidyNavigator/1.0' },
    }),
    { retries: 2, baseDelayMs: 1000 },
  );
  return extractList(data);
}

/**
 * jGrants 公開APIから補助金を取り込み、sourceId で upsert する。
 * 取り込み時はカテゴリ等の管理者編集済みフィールドを上書きしない（status/締切/金額のみ更新）。
 */
export async function importFromJGrants(keywords: string[] = DEFAULT_KEYWORDS): Promise<{ imported: number; updated: number; errors: number }> {
  const seen = new Map<string, ReturnType<typeof mapJGrantsToSubsidy>>();
  let errors = 0;

  for (const kw of keywords) {
    try {
      const list = await fetchByKeyword(kw);
      for (const raw of list) {
        const mapped = mapJGrantsToSubsidy(raw);
        if (mapped) seen.set(mapped.sourceId, mapped);
      }
    } catch (e: any) {
      errors++;
      console.error(`[jGrants] keyword "${kw}" failed:`, e?.message);
    }
  }

  let imported = 0, updated = 0;
  for (const m of seen.values()) {
    if (!m) continue;
    try {
      const existing = await prisma.subsidy.findUnique({ where: { sourceId: m.sourceId }, select: { id: true } });
      if (existing) {
        // 管理者が整備したcategory/難易度/ステップ等は保持し、変動する項目のみ更新
        await prisma.subsidy.update({
          where: { sourceId: m.sourceId },
          data: {
            title: m.title, description: m.description, maxAmount: m.maxAmount,
            applicationStart: m.applicationStart, applicationEnd: m.applicationEnd,
            applicationUrl: m.applicationUrl, status: m.status,
          },
        });
        updated++;
      } else {
        await prisma.subsidy.create({ data: m as any });
        imported++;
      }
    } catch (e: any) {
      errors++;
      console.error(`[jGrants] upsert failed for ${m.sourceId}:`, e?.message);
    }
  }

  // 取り込み結果を ScrapeLog に記録（管理画面で可視化）
  await prisma.scrapeLog.create({
    data: {
      targetCode: 'jgrants', targetName: 'Jグランツ公式API',
      status: errors > 0 && imported + updated === 0 ? 'error' : 'success',
      subsidiesFound: imported + updated,
      errorMessage: errors > 0 ? `${errors}件の取得/保存エラー` : null,
    },
  }).catch(() => {});

  console.log(`[jGrants] imported=${imported} updated=${updated} errors=${errors}`);
  return { imported, updated, errors };
}
