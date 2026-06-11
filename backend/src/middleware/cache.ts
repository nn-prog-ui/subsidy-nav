import NodeCache from 'node-cache';
import { Request, Response, NextFunction } from 'express';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export function cacheMiddleware(ttl = 300) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();
    const key = req.originalUrl;
    const cached = cache.get(key);
    if (cached !== undefined) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }
    const origJson = res.json.bind(res);
    res.json = (body: any) => {
      cache.set(key, body, ttl);
      res.setHeader('X-Cache', 'MISS');
      return origJson(body);
    };
    next();
  };
}

export function invalidateCache(pattern?: string) {
  if (pattern) {
    const keys = cache.keys().filter(k => k.includes(pattern));
    cache.del(keys);
  } else {
    cache.flushAll();
  }
}

export { cache };
