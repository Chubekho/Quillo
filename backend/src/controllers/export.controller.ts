import { Request, Response, NextFunction } from 'express';
import { ExportFormat } from '@prisma/client';
import { ExportService } from '../services/export.service';
import { AppError } from '../middlewares/errorHandler';

const VALID_FORMATS: ExportFormat[] = ['PDF', 'DOCX', 'HTML'];
const exportService = new ExportService();

export class ExportController {
  // POST /content/:id/export
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contentId = req.params.id;
      const { format } = req.body;

      if (!format || !VALID_FORMATS.includes(format as ExportFormat)) {
        throw new AppError(400, `format is required and must be one of: ${VALID_FORMATS.join(', ')}`);
      }

      const result = await exportService.exportContent(
        req.user!.orgId,
        contentId,
        format as ExportFormat,
      );

      res.status(201).json(result);
    } catch (err) { next(err); }
  };

  // GET /content/:id/exports
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contentId = req.params.id;
      const exports = await exportService.listExports(req.user!.orgId, contentId);
      res.json(exports);
    } catch (err) { next(err); }
  };
}
