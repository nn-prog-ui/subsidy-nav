import { prisma } from '../lib/prisma';
import { MHLW_GRANTS, mapMhlwGrant } from '../utils/mhlwGrants';

/**
 * 厚労省の主要「雇用関係助成金」をキュレーション一覧から upsert する。
 * jGrants と同様、既存レコードは管理者編集を保持し、変動しうる項目のみ更新する。
 */
export async function importMhlwGrants(): Promise<{ imported: number; updated: number; errors: number }> {
  let imported = 0, updated = 0, errors = 0;

  for (const g of MHLW_GRANTS) {
    const m = mapMhlwGrant(g);
    try {
      const existing = await prisma.subsidy.findUnique({ where: { sourceId: m.sourceId }, select: { id: true } });
      if (existing) {
        await prisma.subsidy.update({
          where: { sourceId: m.sourceId },
          data: {
            title: m.title, description: m.description, maxAmount: m.maxAmount,
            subsidyRate: m.subsidyRate, applicationUrl: m.applicationUrl, status: m.status,
          },
        });
        updated++;
      } else {
        await prisma.subsidy.create({ data: m as any });
        imported++;
      }
    } catch (e: any) {
      errors++;
      console.error(`[mhlw] upsert failed for ${m.sourceId}:`, e?.message);
    }
  }

  await prisma.scrapeLog.create({
    data: {
      targetCode: 'mhlw', targetName: '厚労省 雇用関係助成金',
      status: errors > 0 && imported + updated === 0 ? 'error' : 'success',
      subsidiesFound: imported + updated,
      errorMessage: errors > 0 ? `${errors}件の保存エラー` : null,
    },
  }).catch(() => {});

  console.log(`[mhlw] imported=${imported} updated=${updated} errors=${errors}`);
  return { imported, updated, errors };
}
