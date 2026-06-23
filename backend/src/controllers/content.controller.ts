import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { GenerationQueueService } from '../services/ai/generationQueue.service';
import { ContentStatus } from '@prisma/client';

const queueService = new GenerationQueueService();

export class ContentController {
  // GET /content
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { campaignId, type, status, page = '1', limit = '20' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where = {
        organizationId: req.user!.orgId,
        ...(campaignId ? { campaignId: String(campaignId) } : {}),
        ...(type ? { type: String(type) as any } : {}),
        ...(status ? { status: String(status) as any } : {}),
      };

      const [items, total] = await Promise.all([
        prisma.contentPiece.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip,
          take: Number(limit),
          include: {
            persona: { select: { id: true, name: true, tone: true } },
            campaign: { select: { id: true, name: true } },
          },
        }),
        prisma.contentPiece.count({ where }),
      ]);

      res.json({ items, total, page: Number(page), limit: Number(limit) });
    } catch (err) { next(err); }
  };

  // POST /content
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, type, brief, campaignId, personaId, targetAudience, meta } = req.body;
      if (!title || !type || !brief) throw new AppError(400, 'title, type, brief are required');

      const piece = await prisma.contentPiece.create({
        data: {
          organizationId: req.user!.orgId,
          title, type, brief, campaignId, personaId, targetAudience,
          meta: meta || {},
          status: 'DRAFT',
        },
      });

      res.status(201).json(piece);
    } catch (err) { next(err); }
  };

  // GET /content/:id
  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const piece = await this._findOwned(req.params.id, req.user!.orgId);
      const activeVersion = await prisma.contentVersion.findFirst({
        where: { contentId: piece.id, isActive: true },
        orderBy: { versionNo: 'desc' },
      });
      res.json({ ...piece, activeVersion });
    } catch (err) { next(err); }
  };

  // PATCH /content/:id
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this._findOwned(req.params.id, req.user!.orgId);
      const { title, campaignId, personaId, targetAudience, meta } = req.body;
      const updated = await prisma.contentPiece.update({
        where: { id: req.params.id },
        data: { title, campaignId, personaId, targetAudience, meta },
      });
      res.json(updated);
    } catch (err) { next(err); }
  };

  // DELETE /content/:id
  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this._findOwned(req.params.id, req.user!.orgId);
      await prisma.contentPiece.update({
        where: { id: req.params.id },
        data: { status: 'ARCHIVED' },
      });
      res.json({ message: 'Content archived' });
    } catch (err) { next(err); }
  };

  // POST /content/:id/generate — đẩy job generate vào SQS
  generate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const piece = await this._findOwned(req.params.id, req.user!.orgId);
      const job = await queueService.enqueue({
        contentId: piece.id,
        orgId: req.user!.orgId,
        operation: 'generate',
      });
      // Update status ngay lập tức
      await prisma.contentPiece.update({ where: { id: piece.id }, data: { status: 'GENERATING' } });
      res.status(202).json({ jobId: job.id, status: 'queued', message: 'Generation started' });
    } catch (err) { next(err); }
  };

  // POST /content/:id/rewrite
  rewrite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const piece = await this._findOwned(req.params.id, req.user!.orgId);
      const { instruction } = req.body; // optional: "viết lại theo hướng tích cực hơn"
      const job = await queueService.enqueue({
        contentId: piece.id,
        orgId: req.user!.orgId,
        operation: 'rewrite',
        payload: { instruction },
      });
      res.status(202).json({ jobId: job.id, status: 'queued' });
    } catch (err) { next(err); }
  };

  // POST /content/:id/expand
  expand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const piece = await this._findOwned(req.params.id, req.user!.orgId);
      const job = await queueService.enqueue({
        contentId: piece.id,
        orgId: req.user!.orgId,
        operation: 'expand',
      });
      res.status(202).json({ jobId: job.id, status: 'queued' });
    } catch (err) { next(err); }
  };

  // POST /content/:id/shorten
  shorten = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const piece = await this._findOwned(req.params.id, req.user!.orgId);
      const job = await queueService.enqueue({
        contentId: piece.id,
        orgId: req.user!.orgId,
        operation: 'shorten',
      });
      res.status(202).json({ jobId: job.id, status: 'queued' });
    } catch (err) { next(err); }
  };

  // GET /content/:id/jobs/:jobId — frontend poll endpoint
  getJobStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this._findOwned(req.params.id, req.user!.orgId);
      const job = await prisma.generationJob.findFirst({
        where: { id: req.params.jobId, contentId: req.params.id },
      });
      if (!job) throw new AppError(404, 'Job not found');

      // Nếu completed, trả kèm version mới nhất
      let result = null;
      if (job.status === 'COMPLETED') {
        result = await prisma.contentVersion.findFirst({
          where: { contentId: req.params.id, isActive: true },
          orderBy: { versionNo: 'desc' },
          select: { id: true, versionNo: true, body: true, source: true, createdAt: true },
        });
      }

      res.json({ job, result });
    } catch (err) { next(err); }
  };

  // GET /content/:id/versions
  getVersions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this._findOwned(req.params.id, req.user!.orgId);
      const versions = await prisma.contentVersion.findMany({
        where: { contentId: req.params.id },
        orderBy: { versionNo: 'desc' },
        select: { id: true, versionNo: true, source: true, isActive: true, createdAt: true, inputTokens: true, outputTokens: true },
      });
      res.json(versions);
    } catch (err) { next(err); }
  };

  // POST /content/:id/versions/:versionId/restore
  restoreVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this._findOwned(req.params.id, req.user!.orgId);
      await prisma.$transaction([
        prisma.contentVersion.updateMany({ where: { contentId: req.params.id }, data: { isActive: false } }),
        prisma.contentVersion.update({ where: { id: req.params.versionId }, data: { isActive: true } }),
      ]);
      res.json({ message: 'Version restored' });
    } catch (err) { next(err); }
  };

  private _findOwned = async (id: string, orgId: string) => {
    const piece = await prisma.contentPiece.findFirst({
      where: { id, organizationId: orgId },
      include: {
        persona: true,
        campaign: true,
      },
    });
    if (!piece) throw new AppError(404, 'Content piece not found');
    return piece;
  };
}
