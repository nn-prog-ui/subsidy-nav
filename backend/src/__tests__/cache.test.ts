import express from 'express';
import request from 'supertest';
import { cacheMiddleware, invalidateCache, flushCache } from '../middleware/cache';

function makeApp() {
  const app = express();
  let counter = 0;
  app.get('/data', cacheMiddleware(60), (_req, res) => {
    counter++;
    res.json({ value: counter });
  });
  app.post('/data', async (_req, res) => {
    await invalidateCache('/data');
    res.json({ ok: true });
  });
  return app;
}

describe('cacheMiddleware', () => {
  beforeEach(async () => { await flushCache(); });

  it('2回目のGETはキャッシュから返す（X-Cache: HIT）', async () => {
    const app = makeApp();
    const first = await request(app).get('/data');
    expect(first.headers['x-cache']).toBe('MISS');
    expect(first.body.value).toBe(1);

    const second = await request(app).get('/data');
    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.body.value).toBe(1); // counter は進まない
  });

  it('invalidateCache 後は再計算される', async () => {
    const app = makeApp();
    await request(app).get('/data'); // value=1, cached
    await request(app).post('/data'); // invalidate
    const after = await request(app).get('/data');
    expect(after.headers['x-cache']).toBe('MISS');
    expect(after.body.value).toBe(2);
  });
});
