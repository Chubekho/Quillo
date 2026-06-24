import { Router } from 'express';
import { ExportController } from '../controllers/export.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const ctrl = new ExportController();

// Tất cả routes đều cần auth
router.use(authenticate);

// POST /content/:id/export — tạo export mới (PDF/DOCX/HTML)
router.post('/:id/export', ctrl.create);

// GET /content/:id/exports — list exports của content piece
router.get('/:id/exports', ctrl.list);

export default router;
