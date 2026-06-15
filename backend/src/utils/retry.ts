/**
 * 非同期処理を指数バックオフで再試行する。
 * @param fn 実行する関数（attempt は 0 始まり）
 * @param opts retries: 追加試行回数 / baseDelayMs: 初回待機 / onRetry: 失敗時コールバック
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number; onRetry?: (err: unknown, attempt: number) => void } = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        opts.onRetry?.(err, attempt);
        await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastErr;
}
