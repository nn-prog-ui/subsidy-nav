import { API } from './auth';

type EventType = 'view' | 'search' | 'match';

/**
 * 解析イベントをサーバーへ送信する（fire-and-forget・失敗は無視）。
 * 可能なら sendBeacon を使い、ページ離脱時も確実に送る。
 */
export function trackEvent(type: EventType, payload: { subsidyId?: string; keyword?: string } = {}): void {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify({ type, ...payload });
  try {
    const url = `${API}/api/events`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    }
  } catch { /* ignore */ }
}
