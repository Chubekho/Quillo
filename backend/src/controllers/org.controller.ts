import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middlewares/errorHandler';
import { orgService } from '../services/org.service';
import { OrgPlan } from '@prisma/client';

const ALLOWED_PLANS = Object.values(OrgPlan) as string[];

export class OrgController {
  // GET /org
  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const org = await orgService.getOrg(req.user!.orgId);
      res.json(org);
    } catch (err) { next(err); }
  };

  // PATCH /org — OWNER / ADMIN only
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = req.user!.role;
      if (role !== 'OWNER' && role !== 'ADMIN') {
        throw new AppError(403, 'Only OWNER or ADMIN can update organization settings');
      }

      const { name, monthlyTokenQuota, plan } = req.body;

      // Validate plan if provided
      if (plan !== undefined && !ALLOWED_PLANS.includes(plan)) {
        throw new AppError(400, `Invalid plan. Must be one of: ${ALLOWED_PLANS.join(', ')}`);
      }

      // Validate monthlyTokenQuota type
      if (monthlyTokenQuota !== undefined) {
        const q = Number(monthlyTokenQuota);
        if (!Number.isInteger(q) || q < 0) {
          throw new AppError(400, 'monthlyTokenQuota must be a non-negative integer');
        }
      }

      const updated = await orgService.updateOrg(req.user!.orgId, {
        name: name !== undefined ? String(name) : undefined,
        monthlyTokenQuota: monthlyTokenQuota !== undefined ? Number(monthlyTokenQuota) : undefined,
        plan: plan !== undefined ? (plan as OrgPlan) : undefined,
      });

      res.json(updated);
    } catch (err) { next(err); }
  };
}
