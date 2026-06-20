import express from 'express';
import request from 'supertest';
import { enableBigIntJson } from '../lib/serialization';

describe('enableBigIntJson', () => {
  it('パッチ未適用なら BigInt の JSON.stringify は例外を投げる（バグ再現）', () => {
    const saved = (BigInt.prototype as any).toJSON;
    delete (BigInt.prototype as any).toJSON;
    try {
      expect(() => JSON.stringify({ maxAmount: 10n })).toThrow(TypeError);
    } finally {
      if (saved) (BigInt.prototype as any).toJSON = saved; // 後続テストへ影響させない
    }
  });

  it('有効化後は JSON.stringify が BigInt を number として直列化する', () => {
    enableBigIntJson();
    expect(JSON.stringify({ maxAmount: 4500000n })).toBe('{"maxAmount":4500000}');
    expect(JSON.stringify({ nested: { v: 100n }, arr: [1n, 2n] })).toBe('{"nested":{"v":100},"arr":[1,2]}');
  });

  it('res.json が BigInt フィールド（maxAmount 相当）を 500 にせず number で返す', async () => {
    enableBigIntJson();
    const app = express();
    app.get('/x', (_req, res) => {
      res.json({ data: { id: 'a1', maxAmount: 4500000n, applicationGuide: { disbursementDays: 90 } } });
    });
    const r = await request(app).get('/x');
    expect(r.status).toBe(200);
    expect(r.body.data.maxAmount).toBe(4500000);
    expect(typeof r.body.data.maxAmount).toBe('number');
    expect(r.body.data.applicationGuide.disbursementDays).toBe(90);
  });

  it('null/通常値は影響を受けない', () => {
    enableBigIntJson();
    expect(JSON.stringify({ a: null, b: 'x', c: 3 })).toBe('{"a":null,"b":"x","c":3}');
  });
});
