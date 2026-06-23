import 'dotenv/config';
import app from './app';
import { logger } from './config/logger';
import { prisma } from './config/database';
import { redis } from './config/redis';

const PORT = process.env.PORT || 3001;

async function bootstrap() {
  try {
    // Kiểm tra DB connection
    await prisma.$connect();
    logger.info('✓ PostgreSQL connected');

    // Kiểm tra Redis
    await redis.ping();
    logger.info('✓ Redis connected');

    app.listen(PORT, () => {
      logger.info(`✓ Quillo API running on http://localhost:${PORT}`);
      logger.info(`  Environment: ${process.env.NODE_ENV}`);
      logger.info(`  API prefix:  ${process.env.API_PREFIX || '/api/v1'}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

bootstrap();
