import { Request, Response, NextFunction } from 'express';
import { usageService } from '../services/usage.service';

export class UsageController {
  // GET /usage
  getSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await usageService.getUsageSummary(req.user!.orgId);
      res.json(summary);
    } catch (err) {
      next(err);
    }
  };
}
