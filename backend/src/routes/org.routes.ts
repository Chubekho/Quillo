import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/', (_req, res) => res.status(501).json({ error: 'Not implemented yet' }));

export default router;
