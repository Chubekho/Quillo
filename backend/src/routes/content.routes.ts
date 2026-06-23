import { Router } from 'express';
import { ContentController } from '../controllers/content.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const ctrl = new ContentController();

// Tất cả routes đều cần auth
router.use(authenticate);

// CRUD
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.get);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

// AI operations — tất cả đều trả về jobId, frontend poll để lấy kết quả
router.post('/:id/generate', ctrl.generate);         // generate lần đầu
router.post('/:id/rewrite', ctrl.rewrite);           // viết lại toàn bộ
router.post('/:id/expand', ctrl.expand);             // mở rộng nội dung
router.post('/:id/shorten', ctrl.shorten);           // rút gọn nội dung

// Job polling — frontend dùng endpoint này để hỏi trạng thái
router.get('/:id/jobs/:jobId', ctrl.getJobStatus);

// Versions
router.get('/:id/versions', ctrl.getVersions);
router.post('/:id/versions/:versionId/restore', ctrl.restoreVersion);

export default router;
