import Redis from 'ioredis';
import { logger } from './logger';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null; // stop retrying
    return Math.min(times * 100, 3000);
  },
  lazyConnect: true,
});

redis.on('connect', () => logger.debug('Redis connected'));
redis.on('error', (err) => logger.error('Redis error:', err));

// ── Cache helpers ───────────────────────────────────────────
const CACHE_TTL = {
  PERSONA: 60 * 30,       // 30 min — personas ít thay đổi
  JOB_STATUS: 60 * 5,     // 5 min
  ORG_QUOTA: 60 * 60,     // 1 hour
} as const;

async function cacheGet<T>(key: string): Promise<T | null> {
  const val = await redis.get(key);
  return val ? (JSON.parse(val) as T) : null;
}

async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

async function cacheDel(key: string): Promise<void> {
  await redis.del(key);
}

// ── Rate limiter helper (per org) ──────────────────────────
async function checkOrgRateLimit(orgId: string, limit: number): Promise<boolean> {
  const key = `ratelimit:org:${orgId}:${new Date().getMinutes()}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  return count <= limit;
}

export { redis, cacheGet, cacheSet, cacheDel, checkOrgRateLimit, CACHE_TTL };
