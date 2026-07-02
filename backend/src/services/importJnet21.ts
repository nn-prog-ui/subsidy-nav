// J-Net21 のフィードから補助金系の項目を取り込み、ExtractedSubsidy（AI抽出レビューキュー）へ追加する。
// フィードURLは環境変数 JNET21_FEED_URL で差し替え可能（実フィードの形式は要確認）。
import axios from 'axios';
import { prisma } from '../lib/prisma';
import { withRetry } from '../utils/retry';
import { parseFeedItems, mapJnet21Item } from '../utils/jnet21';

const FEED_URL = process.env.JNET21_FEED_URL || 'https://j-net21.smrj.go.jp/rss/snavi.rdf';

export async function importFromJnet21(): Promise<{ saved: number; errors: number }> {
  let body: string;
  try {
    const res = await withRetry(
      () => axios.get<string>(FEED_URL, {
        timeout: 15000,
        responseType: 'text',
        headers: { 'User-Agent': 'SubsidyNavigator/1.0' },
      }),
      { retries: 2, baseDelayMs: 1000 },
    );
    body = typeof res.data === 'string' ? res.data : String(res.data);
  } catch (e: any) {
    await prisma.scrapeLog.create({
      data: { targetCode: 'jnet21', targetName: 'J-Net21 支援情報', status: 'error', subsidiesFound: 0, errorMessage: (e?.message || 'fetch failed').slice(0, 200) },
    }).catch(() => {});
    return { saved: 0, errors: 1 };
  }

  const candidates = parseFeedItems(body)
    .map(mapJnet21Item)
    .filter((c): c is NonNullable<typeof c> => !!c);

  let saved = 0, errors = 0;
  for (const c of candidates) {
    try {
      // 同一URL+タイトルの候補が既にあれば重複登録しない
      const dup = c.sourceUrl
        ? await prisma.extractedSubsidy.findFirst({ where: { sourceUrl: c.sourceUrl, title: c.title }, select: { id: true } })
        : null;
      if (dup) continue;
      await prisma.extractedSubsidy.create({ data: { ...c, model: 'jnet21-feed' } });
      saved++;
    } catch (e: any) {
      errors++;
      console.error('[jnet21] save failed:', e?.message);
    }
  }

  await prisma.scrapeLog.create({
    data: {
      targetCode: 'jnet21', targetName: 'J-Net21 支援情報',
      status: errors > 0 && saved === 0 ? 'error' : 'success',
      subsidiesFound: saved,
      errorMessage: errors > 0 ? `${errors}件の保存エラー` : null,
    },
  }).catch(() => {});

  console.log(`[jnet21] saved=${saved} errors=${errors}`);
  return { saved, errors };
}
