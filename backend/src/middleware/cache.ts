import NodeCache from 'node-cache';
import { Request, Response, NextFunction } from 'express';

// キャッシュストアの抽象化。REDIS_URL があれば Redis、無ければインメモリ。
interface CacheStore {
  get(key: string): Promise<unknown>;
  set(key: string, val: unknown, ttl: number): Promise<void>;
  delPattern(pattern: string): Promise<void>;
  flushAll(): Promise<void>;
}

class MemoryStore implements CacheStore {
  private c = new NodeCache({ stdTTL: 300, checkperiod: 60 });
  async get(key: string) {
    const v = this.c.get(key);
    return v === undefined ? undefined : v;
  }
  async set(key: string, val: unknown, ttl: number) {
    this.c.set(key, val, ttl);
  }
  async delPattern(pattern: string) {
    this.c.del(this.c.keys().filter(k => k.includes(pattern)));
  }
  async flushAll() {
    this.c.flushAll();
  }
}

class RedisStore implements CacheStore {
  constructor(private client: any) {}
  async get(key: string) {
    const v = await this.client.get(key);
    return v ? JSON.parse(v) : undefined;
  }
  async set(key: string, val: unknown, ttl: number) {
    await this.client.set(key, JSON.stringify(val), 'EX', ttl);
  }
  async delPattern(pattern: string) {
    const keys = await this.client.keys(`*${pattern}*`);
    if (keys.length) await this.client.del(keys);
  }
  async flushAll() {
    await this.client.flushdb();
  }
}

let store: CacheStore = new MemoryStore();

// Redis が設定されていれば非同期に切り替え（失敗時はメモリのまま）
if (process.env.REDIS_URL) {
  import('ioredis')
    .then(({ default: Redis }) => {
      const client = new Redis(process.env.REDIS_URL as string);
      client.on('error', (e: Error) => console.error('[Cache] Redis error:', e.message));
      store = new RedisStore(client);
      console.log('[Cache] Using Redis store');
    })
    .catch(e => console.error('[Cache] Redis init failed, using memory store:', e.message));
}

export function cacheMiddleware(ttl = 300) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();
    const key = req.originalUrl;
    try {
      const cached = await store.get(key);
      if (cached !== undefined) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }
    } catch { /* キャッシュ障害時はそのまま処理続行 */ }

    const origJson = res.json.bind(res);
    res.json = (body: any) => {
      store.set(key, body, ttl).catch(() => {});
      res.setHeader('X-Cache', 'MISS');
      return origJson(body);
    };
    next();
  };
}

export async function invalidateCache(pattern?: string) {
  try {
    if (pattern) await store.delPattern(pattern);
    else await store.flushAll();
  } catch { /* ignore */ }
}

/** テスト用: 全キャッシュをクリアする */
export async function flushCache() {
  await store.flushAll();
}
