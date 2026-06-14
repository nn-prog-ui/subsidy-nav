import express from 'express';
import request from 'supertest';
import { requestId } from '../middleware/requestId';

function makeApp() {
  const app = express();
  app.use(requestId);
  app.get('/x', (req, res) => res.json({ id: (req as any).id }));
  return app;
}

describe('requestId middleware', () => {
  it('X-Request-Id ヘッダを付与する', async () => {
    const res = await request(makeApp()).get('/x');
    expect(res.headers['x-request-id']).toBeTruthy();
    expect(res.body.id).toBe(res.headers['x-request-id']);
  });

  it('上流の X-Request-Id を引き継ぐ', async () => {
    const res = await request(makeApp()).get('/x').set('X-Request-Id', 'abc-123');
    expect(res.headers['x-request-id']).toBe('abc-123');
    expect(res.body.id).toBe('abc-123');
  });

  it('リクエストごとに異なるIDを生成する', async () => {
    const app = makeApp();
    const a = await request(app).get('/x');
    const b = await request(app).get('/x');
    expect(a.body.id).not.toBe(b.body.id);
  });
});
