import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { cacheGet, cacheSet, cacheDel, CACHE_TTL } from '../config/redis';

export class PersonaController {
  // GET /personas
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cacheKey = `personas:${req.user!.orgId}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return res.json(cached);

      const personas = await prisma.brandPersona.findMany({
        where: { organizationId: req.user!.orgId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });

      await cacheSet(cacheKey, personas, CACHE_TTL.PERSONA);
      res.json(personas);
    } catch (err) { next(err); }
  };

  // POST /personas
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name, tone, voice, targetAudience, ageRange, industry,
        language, formalityLevel, keywords, avoidWords, exampleOutputs, isDefault,
      } = req.body;

      if (!name || !tone || !targetAudience) {
        throw new AppError(400, 'name, tone, targetAudience are required');
      }

      const persona = await prisma.brandPersona.create({
        data: {
          organizationId: req.user!.orgId,
          name, tone, voice, targetAudience, ageRange, industry,
          language: language || 'vi',
          formalityLevel: formalityLevel || 3,
          keywords: keywords || [],
          avoidWords: avoidWords || [],
          exampleOutputs: exampleOutputs || [],
          isDefault: isDefault || false,
        },
      });

      await cacheDel(`personas:${req.user!.orgId}`);
      res.status(201).json(persona);
    } catch (err) { next(err); }
  };

  // GET /personas/:id
  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const persona = await this._findOwned(req.params.id, req.user!.orgId);
      res.json(persona);
    } catch (err) { next(err); }
  };

  // PUT /personas/:id
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this._findOwned(req.params.id, req.user!.orgId);
      const persona = await prisma.brandPersona.update({
        where: { id: req.params.id },
        data: req.body,
      });
      await cacheDel(`personas:${req.user!.orgId}`);
      res.json(persona);
    } catch (err) { next(err); }
  };

  // DELETE /personas/:id
  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this._findOwned(req.params.id, req.user!.orgId);
      await prisma.brandPersona.delete({ where: { id: req.params.id } });
      await cacheDel(`personas:${req.user!.orgId}`);
      res.json({ message: 'Persona deleted' });
    } catch (err) { next(err); }
  };

  // PATCH /personas/:id/set-default
  setDefault = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this._findOwned(req.params.id, req.user!.orgId);
      await prisma.$transaction([
        prisma.brandPersona.updateMany({
          where: { organizationId: req.user!.orgId },
          data: { isDefault: false },
        }),
        prisma.brandPersona.update({
          where: { id: req.params.id },
          data: { isDefault: true },
        }),
      ]);
      await cacheDel(`personas:${req.user!.orgId}`);
      res.json({ message: 'Default persona updated' });
    } catch (err) { next(err); }
  };

  private _findOwned = async (id: string, orgId: string) => {
    const p = await prisma.brandPersona.findFirst({ where: { id, organizationId: orgId } });
    if (!p) throw new AppError(404, 'Persona not found');
    return p;
  };
}
