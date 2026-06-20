// Phase 36: AIルート（申請ガイド/AI抽出/申請書ドラフト）のHTTP統合テスト。
// サービス層は全てモックし、ANTHROPIC_API_KEY 無しでも auth/validation/エラー写像/直列化を検証する。
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { enableBigIntJson } from '../lib/serialization';

// prisma: recordAudit と /extractions が触る範囲だけ用意
jest.mock('../lib/prisma', () => ({
  prisma: {
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    extractedSubsidy: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'e1', title: '創業支援補助金', status: 'pending', confidence: 'high', prefecture: '東京都', maxAmount: 500000n, createdAt: new Date('2026-06-01').toISOString() },
      ]),
    },
  },
}));

// cache: redis 取り込みを避けるためモック
jest.mock('../middleware/cache', () => ({
  cacheMiddleware: () => (_req: any, _res: any, next: any) => next(),
  invalidateCache: jest.fn(),
  flushCache: jest.fn(),
}));

jest.mock('../services/applicationGuide', () => {
  class GuideError extends Error { statusCode: number; constructor(m: string, s = 500) { super(m); this.statusCode = s; } }
  return { generateApplicationGuide: jest.fn(), GuideError };
});
jest.mock('../services/aiExtraction', () => {
  class ExtractionError extends Error { statusCode: number; constructor(m: string, s = 500) { super(m); this.statusCode = s; } }
  return { extractFromUrl: jest.fn(), approveExtraction: jest.fn(), rejectExtraction: jest.fn(), ExtractionError };
});
jest.mock('../services/applicationDraft', () => {
  class DraftError extends Error { statusCode: number; constructor(m: string, s = 500) { super(m); this.statusCode = s; } }
  return { generateApplicationDraft: jest.fn(), DraftError };
});

import adminRouter from '../routes/admin';
import subsidiesRouter from '../routes/subsidies';
import { generateApplicationGuide, GuideError } from '../services/applicationGuide';
import { extractFromUrl, approveExtraction, ExtractionError } from '../services/aiExtraction';
import { generateApplicationDraft, DraftError } from '../services/applicationDraft';

enableBigIntJson();
const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);
app.use('/api/subsidies', subsidiesRouter);

const SECRET = process.env.JWT_SECRET || 'secret';
const adminToken = jwt.sign({ id: 'a1', email: 'admin@test' }, SECRET);
const userToken = jwt.sign({ id: 'u1', email: 'user@test' }, SECRET);
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

beforeEach(() => jest.clearAllMocks());

describe('POST /api/admin/subsidies/:id/guide', () => {
  it('トークン無しは401', async () => {
    const r = await request(app).post('/api/admin/subsidies/s1/guide');
    expect(r.status).toBe(401);
  });
  it('成功時は200でガイドを返す', async () => {
    (generateApplicationGuide as jest.Mock).mockResolvedValue({ id: 'g1', overview: '概要' });
    const r = await request(app).post('/api/admin/subsidies/s1/guide').set(bearer(adminToken));
    expect(r.status).toBe(200);
    expect(r.body.guide.id).toBe('g1');
    expect(generateApplicationGuide).toHaveBeenCalledWith('s1');
  });
  it('APIキー未設定(GuideError 503)は503に写像', async () => {
    (generateApplicationGuide as jest.Mock).mockRejectedValue(new GuideError('no key', 503));
    const r = await request(app).post('/api/admin/subsidies/s1/guide').set(bearer(adminToken));
    expect(r.status).toBe(503);
    expect(r.body.error).toContain('no key');
  });
});

describe('POST /api/admin/extract', () => {
  it('url欠落は400', async () => {
    const r = await request(app).post('/api/admin/extract').set(bearer(adminToken)).send({});
    expect(r.status).toBe(400);
  });
  it('成功時は200で件数を返す', async () => {
    (extractFromUrl as jest.Mock).mockResolvedValue({ saved: 3 });
    const r = await request(app).post('/api/admin/extract').set(bearer(adminToken)).send({ url: 'https://city.example.jp/h' });
    expect(r.status).toBe(200);
    expect(r.body.saved).toBe(3);
  });
});

describe('GET /api/admin/extractions', () => {
  it('候補一覧を返し、maxAmount(BigInt)はnumberで直列化される', async () => {
    const r = await request(app).get('/api/admin/extractions').set(bearer(adminToken));
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveLength(1);
    expect(r.body.data[0].maxAmount).toBe(500000);
    expect(typeof r.body.data[0].maxAmount).toBe('number');
  });
});

describe('POST /api/admin/extractions/:id/approve', () => {
  it('成功時は200で公開した補助金を返す', async () => {
    (approveExtraction as jest.Mock).mockResolvedValue({ id: 'sub1', title: '創業支援補助金', maxAmount: 100n });
    const r = await request(app).post('/api/admin/extractions/e1/approve').set(bearer(adminToken));
    expect(r.status).toBe(200);
    expect(r.body.subsidy.id).toBe('sub1');
    expect(r.body.subsidy.maxAmount).toBe(100);
  });
  it('重複(ExtractionError 409)は409に写像', async () => {
    (approveExtraction as jest.Mock).mockRejectedValue(new ExtractionError('already', 409));
    const r = await request(app).post('/api/admin/extractions/e1/approve').set(bearer(adminToken));
    expect(r.status).toBe(409);
  });
});

describe('POST /api/subsidies/:id/draft', () => {
  const full = { companyName: 'A社', industry: '飲食', employees: '5名', businessSummary: '概要', projectPlan: '計画' };
  it('トークン無しは401', async () => {
    const r = await request(app).post('/api/subsidies/s1/draft').send(full);
    expect(r.status).toBe(401);
  });
  it('入力欠落は400', async () => {
    const r = await request(app).post('/api/subsidies/s1/draft').set(bearer(userToken)).send({ companyName: 'A社' });
    expect(r.status).toBe(400);
  });
  it('成功時は200でドラフトを返す', async () => {
    (generateApplicationDraft as jest.Mock).mockResolvedValue({ summary: '要約', plan: '計画' });
    const r = await request(app).post('/api/subsidies/s1/draft').set(bearer(userToken)).send(full);
    expect(r.status).toBe(200);
    expect(r.body.data.summary).toBe('要約');
    expect(generateApplicationDraft).toHaveBeenCalledWith('s1', expect.objectContaining({ companyName: 'A社' }));
  });
  it('APIキー未設定(DraftError 503)は503に写像', async () => {
    (generateApplicationDraft as jest.Mock).mockRejectedValue(new DraftError('no key', 503));
    const r = await request(app).post('/api/subsidies/s1/draft').set(bearer(userToken)).send(full);
    expect(r.status).toBe(503);
  });
});
