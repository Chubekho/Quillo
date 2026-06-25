import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { OrgController } from '../controllers/org.controller';

const router = Router();
const ctrl = new OrgController();

router.use(authenticate);

// GET  /api/v1/org  — any authenticated member can view org info + usage summary
router.get('/', ctrl.get);

// PATCH /api/v1/org — OWNER / ADMIN only (role check inside controller)
router.patch('/', ctrl.update);

export default router;
