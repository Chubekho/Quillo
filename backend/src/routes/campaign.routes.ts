// ── campaign.routes.ts ─────────────────────────────────────
import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const ctrl = new CampaignController();

router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.get);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
