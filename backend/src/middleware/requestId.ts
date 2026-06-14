import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * 各リクエストに一意のIDを付与し、X-Request-Id レスポンスヘッダで返す。
 * 既に上流(プロキシ等)から X-Request-Id が来ていればそれを引き継ぐ。
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers['x-request-id'];
  const id = (typeof incoming === 'string' && incoming) ? incoming : randomUUID();
  (req as any).id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
