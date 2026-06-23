import { Router } from 'express';
import { prisma } from '../config/database';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: { postgres: 'up', api: 'up' },
    });
  } catch {
    res.status(503).json({ status: 'degraded', services: { postgres: 'down' } });
  }
});

export default router;
