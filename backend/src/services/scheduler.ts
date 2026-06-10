import cron from 'node-cron';
import { runScrape } from './scraper';
import { sendWeeklyDigest, sendDeadlineAlerts } from './email';

export function startScheduler() {
  // 毎週月曜 AM2:00 JST スクレイピング
  cron.schedule('0 2 * * 1', async () => {
    console.log('[Scheduler] Starting weekly scrape...');
    await runScrape().catch(console.error);
  }, { timezone: 'Asia/Tokyo' });

  // 毎週月曜 AM8:00 JST 週次ダイジェスト
  cron.schedule('0 8 * * 1', async () => {
    console.log('[Scheduler] Sending weekly digest...');
    await sendWeeklyDigest().catch(console.error);
  }, { timezone: 'Asia/Tokyo' });

  // 毎日 AM9:00 JST 締切アラート
  cron.schedule('0 9 * * *', async () => {
    console.log('[Scheduler] Sending deadline alerts...');
    await sendDeadlineAlerts().catch(console.error);
  }, { timezone: 'Asia/Tokyo' });

  console.log('[Scheduler] Jobs scheduled: scrape(Mon 2am), digest(Mon 8am), deadline-alerts(daily 9am)');
}
