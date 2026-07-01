import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { logger } from './logger';

let _prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (_prisma) return _prisma;

  // DATABASE_URL guaranteed set by loadSecrets() before first use
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);

  _prisma = new PrismaClient({
    adapter,
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
      ...(process.env.NODE_ENV === 'development'
        ? [{ level: 'query' as const, emit: 'event' as const }]
        : []),
    ],
  });

  (_prisma as any).$on('warn', (e: any) => logger.warn('Prisma warning:', e));
  (_prisma as any).$on('error', (e: any) => logger.error('Prisma error:', e));

  if (process.env.NODE_ENV === 'development') {
    (_prisma as any).$on('query', (e: any) => {
      logger.debug(`Query (${e.duration}ms): ${e.query}`);
    });
  }

  return _prisma;
}

// Proxy: API giống hệt export cũ, KHÔNG cần sửa bất kỳ file nào khác
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    return (getPrisma() as any)[prop];
  },
});
