import axios from 'axios';

export async function sendLineNotify(message: string, token?: string): Promise<void> {
  const t = token || process.env.LINE_NOTIFY_TOKEN;
  if (!t) return;
  try {
    await axios.post(
      'https://notify-api.line.me/api/notify',
      new URLSearchParams({ message }),
      { headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
  } catch (e: any) {
    console.error('LINE Notify error:', e.message);
  }
}

export async function notifyNewSubsidy(title: string, prefecture: string, maxAmount: bigint | null): Promise<void> {
  const amount = maxAmount ? `¥${Number(maxAmount).toLocaleString()}` : '金額未定';
  await sendLineNotify(`\n【新着補助金】\n${title}\n地域: ${prefecture}\n上限: ${amount}`);
}

export async function notifyDeadlineSoon(title: string, endDate: Date): Promise<void> {
  const days = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  await sendLineNotify(`\n【締切間近】\n${title}\n締切: ${endDate.toLocaleDateString('ja-JP')}（あと${days}日）`);
}

export async function notifyScrapeComplete(success: number, failed: number): Promise<void> {
  await sendLineNotify(`\n【スクレイピング完了】\n成功: ${success}件 / 失敗: ${failed}件\n${new Date().toLocaleString('ja-JP')}`);
}
