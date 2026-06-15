/**
 * プロセスレベルのエラー監視を初期化する。
 * 将来的に Sentry 等へ転送する場合はここに送信処理を追加する（SENTRY_DSN）。
 */
export function initErrorMonitoring() {
  process.on('unhandledRejection', (reason: unknown) => {
    console.error('[unhandledRejection]', reason instanceof Error ? (reason.stack || reason.message) : reason);
  });

  process.on('uncaughtException', (err: Error) => {
    console.error('[uncaughtException]', err.stack || err.message);
    // 不整合な状態を避けるため終了。オーケストレーター（Railway/Docker）が再起動する。
    process.exit(1);
  });

  console.log('[monitoring] error monitoring initialized');
}
