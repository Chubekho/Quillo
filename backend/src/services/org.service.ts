import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { usageService } from './usage.service';
import { OrgPlan } from '@prisma/client';

// ── Types ─────────────────────────────────────────────────────

export interface UpdateOrgInput {
  name?: string;
  monthlyTokenQuota?: number;
  plan?: OrgPlan;
}

// ── Service ───────────────────────────────────────────────────

export class OrgService {
  /**
   * Load org info and attach the current-month usage summary.
   */
  async getOrg(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        logoUrl: true,
        monthlyTokenQuota: true,
        currentMonthTokens: true,
        quotaResetAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!org) throw new AppError(404, 'Organization not found');

    const usage = await usageService.getUsageSummary(orgId);

    return { ...org, usage };
  }

  /**
   * Update allowed org fields. Only OWNER / ADMIN may call this.
   * Validates: monthlyTokenQuota >= 0.
   */
  async updateOrg(orgId: string, input: UpdateOrgInput) {
    if (input.monthlyTokenQuota !== undefined && input.monthlyTokenQuota < 0) {
      throw new AppError(400, 'monthlyTokenQuota must be >= 0');
    }

    // Build only the fields that were explicitly supplied
    const data: Record<string, unknown> = {};
    if (input.name !== undefined)               data.name = input.name;
    if (input.monthlyTokenQuota !== undefined)  data.monthlyTokenQuota = input.monthlyTokenQuota;
    if (input.plan !== undefined)               data.plan = input.plan;

    if (Object.keys(data).length === 0) {
      throw new AppError(400, 'No updatable fields provided');
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        logoUrl: true,
        monthlyTokenQuota: true,
        currentMonthTokens: true,
        quotaResetAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }
}

export const orgService = new OrgService();
