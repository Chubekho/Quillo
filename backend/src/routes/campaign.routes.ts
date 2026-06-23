// ── campaign.routes.ts ─────────────────────────────────────
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

// Placeholder — sẽ implement ở Day 3-4
router.get('/', (_req, res) => res.json({ campaigns: [] }));
router.post('/', (_req, res) => res.status(501).json({ error: 'Not implemented yet' }));

export default router;
