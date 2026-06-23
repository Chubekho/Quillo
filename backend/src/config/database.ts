import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { logger } from './logger';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
    ...(process.env.NODE_ENV === 'development'
      ? [{ level: 'query' as const, emit: 'event' as const }]
      : []),
  ],
});

prisma.$on('warn', (e) => logger.warn('Prisma warning:', e));
prisma.$on('error', (e) => logger.error('Prisma error:', e));

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query (${e.duration}ms): ${e.query}`);
  });
}

export { prisma };
