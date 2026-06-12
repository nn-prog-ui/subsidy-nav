import cron from 'node-cron';
import { runScrape } from './scraper';
import { sendWeeklyDigest, sendDeadlineAlerts, sendAnalyticsReport } from './email';
import { notifyScrapeComplete, notifyDeadlineSoon } from './notify';
import { closeExpiredSubsidies, activateUpcomingSubsidies } from './maintenance';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function startScheduler() {
  // 毎週月曜 AM2:00 JST スクレイピング + LINE通知
  cron.schedule('0 2 * * 1', async () => {
    console.log('[Scheduler] Starting weekly scrape...');
    const log = await runScrape().catch(console.error);
    await notifyScrapeComplete(
      (log as any)?.success ?? 0,
      (log as any)?.failed ?? 0
    );
  }, { timezone: 'Asia/Tokyo' });

  // 毎週月曜 AM8:00 JST 週次ダイジェスト
  cron.schedule('0 8 * * 1', async () => {
    console.log('[Scheduler] Sending weekly digest...');
    await sendWeeklyDigest().catch(console.error);
  }, { timezone: 'Asia/Tokyo' });

  // 毎週月曜 AM8:10 JST 週次分析レポート（管理者向け）
  cron.schedule('10 8 * * 1', async () => {
    console.log('[Scheduler] Sending analytics report...');
    await sendAnalyticsReport().catch(console.error);
  }, { timezone: 'Asia/Tokyo' });

  // 毎日 AM6:00 JST ステータス自動更新（締切超過→closed / 開始→active）
  cron.schedule('0 6 * * *', async () => {
    console.log('[Scheduler] Updating subsidy statuses...');
    await closeExpiredSubsidies().catch(console.error);
    await activateUpcomingSubsidies().catch(console.error);
  }, { timezone: 'Asia/Tokyo' });

  // 毎日 AM9:00 JST 締切アラート + LINE通知
  cron.schedule('0 9 * * *', async () => {
    console.log('[Scheduler] Sending deadline alerts...');
    await sendDeadlineAlerts().catch(console.error);
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const expiring = await prisma.subsidy.findMany({
      where: { applicationEnd: { lte: threeDaysLater, gte: new Date() }, status: 'active' },
      select: { title: true, applicationEnd: true },
    });
    for (const s of expiring) {
      if (s.applicationEnd) await notifyDeadlineSoon(s.title, s.applicationEnd);
    }
  }, { timezone: 'Asia/Tokyo' });

  console.log('[Scheduler] Jobs scheduled: scrape(Mon 2am), digest(Mon 8am), analytics-report(Mon 8:10am), status-update(daily 6am), deadline-alerts(daily 9am)');
}
