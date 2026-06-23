import { Router } from 'express';
import { PersonaController } from '../controllers/persona.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();
const ctrl = new PersonaController();

router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', requireRole('OWNER', 'ADMIN'), ctrl.create);
router.get('/:id', ctrl.get);
router.put('/:id', requireRole('OWNER', 'ADMIN'), ctrl.update);
router.delete('/:id', requireRole('OWNER', 'ADMIN'), ctrl.remove);
router.patch('/:id/set-default', requireRole('OWNER', 'ADMIN'), ctrl.setDefault);

export default router;
