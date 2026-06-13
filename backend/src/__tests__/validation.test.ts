import express from 'express';
import request from 'supertest';
import { validateBody, registerSchema, consultingSchema, matchingSchema } from '../utils/validation';

function appWith(schema: any) {
  const app = express();
  app.use(express.json());
  app.post('/t', validateBody(schema), (req, res) => res.json({ ok: true, body: req.body }));
  return app;
}

describe('registerSchema', () => {
  const app = appWith(registerSchema);
  it('正しい入力を通す', async () => {
    const r = await request(app).post('/t').send({ email: 'a@example.com', password: 'password123' });
    expect(r.status).toBe(200);
  });
  it('不正なメールを弾く', async () => {
    const r = await request(app).post('/t').send({ email: 'bad', password: 'password123' });
    expect(r.status).toBe(400);
    expect(r.body.field).toBe('email');
  });
  it('短すぎるパスワードを弾く', async () => {
    const r = await request(app).post('/t').send({ email: 'a@example.com', password: 'short' });
    expect(r.status).toBe(400);
    expect(r.body.field).toBe('password');
  });
});

describe('consultingSchema', () => {
  const app = appWith(consultingSchema);
  it('name/email/messageが揃えば通る', async () => {
    const r = await request(app).post('/t').send({ name: '山田', email: 'y@example.com', message: '相談内容' });
    expect(r.status).toBe(200);
  });
  it('messageが空だと弾く', async () => {
    const r = await request(app).post('/t').send({ name: '山田', email: 'y@example.com', message: '' });
    expect(r.status).toBe(400);
  });
});

describe('matchingSchema', () => {
  const app = appWith(matchingSchema);
  it('3項目揃えば通る', async () => {
    const r = await request(app).post('/t').send({ prefecture: '東京都', industry: 'IT・ソフトウェア', employees: '1〜5名' });
    expect(r.status).toBe(200);
  });
  it('項目欠落で弾く', async () => {
    const r = await request(app).post('/t').send({ prefecture: '東京都' });
    expect(r.status).toBe(400);
  });
});
