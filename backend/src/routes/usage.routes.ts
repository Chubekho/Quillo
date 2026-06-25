import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { UsageController } from '../controllers/usage.controller';

const router = Router();
const ctrl = new UsageController();

router.use(authenticate);

// GET /api/v1/usage — returns current-month usage summary for the caller's org
router.get('/', ctrl.getSummary);

export default router;
