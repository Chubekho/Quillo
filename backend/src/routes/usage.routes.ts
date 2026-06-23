import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/', (_req, res) => res.json({ usage: [] }));

export default router;
