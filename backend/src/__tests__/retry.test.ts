import { withRetry } from '../utils/retry';

describe('withRetry', () => {
  it('成功すればそのまま返す', async () => {
    const r = await withRetry(async () => 42, { baseDelayMs: 1 });
    expect(r).toBe(42);
  });

  it('失敗しても retries 回まで再試行して成功する', async () => {
    let calls = 0;
    const r = await withRetry(async () => {
      calls++;
      if (calls < 3) throw new Error('fail');
      return 'ok';
    }, { retries: 3, baseDelayMs: 1 });
    expect(r).toBe('ok');
    expect(calls).toBe(3);
  });

  it('全試行が失敗すると最後のエラーを投げる', async () => {
    let calls = 0;
    await expect(withRetry(async () => { calls++; throw new Error('boom'); }, { retries: 2, baseDelayMs: 1 }))
      .rejects.toThrow('boom');
    expect(calls).toBe(3); // 初回 + 2回再試行
  });

  it('再試行時に onRetry が呼ばれる', async () => {
    const onRetry = jest.fn();
    let calls = 0;
    await withRetry(async () => { calls++; if (calls < 2) throw new Error('x'); return 1; },
      { retries: 2, baseDelayMs: 1, onRetry });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
