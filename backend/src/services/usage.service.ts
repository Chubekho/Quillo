import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';

// ── Types ─────────────────────────────────────────────────────

export interface MonthUsageTotals {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number; // USD as float
}

export interface ModelUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number; // USD as float
  requestCount: number;
}

export interface UsageSummary {
  month: string; // 'YYYY-MM'
  quota: number | null;
  used: number;
  remaining: number | null;
  percentUsed: number | null;
  byModel: ModelUsage[];
}

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  quota: number | null;
  remaining: number | null;
}

// ── Helpers ───────────────────────────────────────────────────

/** Returns [start, end) of the current calendar month in UTC. */
function currentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

function decimalToFloat(d: Prisma.Decimal | null | undefined): number {
  if (d == null) return 0;
  return Number(d.toString());
}

// ── Service ───────────────────────────────────────────────────

export class UsageService {
  /**
   * Sum all usage_logs for `orgId` in the current calendar month.
   * Returns zeros if no logs exist — never throws for empty data.
   */
  async getCurrentMonthUsage(orgId: string): Promise<MonthUsageTotals> {
    const { start, end } = currentMonthRange();

    const agg = await prisma.usageLog.aggregate({
      where: {
        organizationId: orgId,
        createdAt: { gte: start, lt: end },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        estimatedCostUsd: true,
      },
    });

    const totalInputTokens = agg._sum.inputTokens ?? 0;
    const totalOutputTokens = agg._sum.outputTokens ?? 0;

    return {
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      totalCost: decimalToFloat(agg._sum.estimatedCostUsd),
    };
  }

  /**
   * Group usage_logs for `orgId` in the current calendar month by model.
   * Returns an empty array if no logs exist.
   */
  async getUsageByModel(orgId: string): Promise<ModelUsage[]> {
    const { start, end } = currentMonthRange();

    const groups = await prisma.usageLog.groupBy({
      by: ['model'],
      where: {
        organizationId: orgId,
        createdAt: { gte: start, lt: end },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        estimatedCostUsd: true,
      },
      _count: {
        id: true,
      },
    });

    return groups.map((g) => {
      const inputTokens = g._sum.inputTokens ?? 0;
      const outputTokens = g._sum.outputTokens ?? 0;
      return {
        model: g.model,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        cost: decimalToFloat(g._sum.estimatedCostUsd),
        requestCount: g._count.id,
      };
    });
  }

  /**
   * Returns a full usage summary for the current month, including quota info.
   * quota / percentUsed are null when the org has no monthlyTokenQuota set.
   */
  async getUsageSummary(orgId: string): Promise<UsageSummary> {
    // Run month totals + per-model + org load in parallel
    const [totals, byModel, org] = await Promise.all([
      this.getCurrentMonthUsage(orgId),
      this.getUsageByModel(orgId),
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { monthlyTokenQuota: true },
      }),
    ]);

    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    const quota: number | null = org?.monthlyTokenQuota ?? null;
    const used = totals.totalTokens;

    const remaining = quota !== null ? Math.max(0, quota - used) : null;
    const percentUsed =
      quota !== null && quota > 0 ? Math.round((used / quota) * 100) : null;

    return {
      month,
      quota,
      used,
      remaining,
      percentUsed,
      byModel,
    };
  }
  /**
   * Check whether `orgId` is within its monthly token quota.
   * - quota null  → unlimited, always allowed.
   * - used >= quota → blocked (allowed=false).
   */
  async checkQuota(orgId: string): Promise<QuotaCheckResult> {
    const [totals, org] = await Promise.all([
      this.getCurrentMonthUsage(orgId),
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { monthlyTokenQuota: true },
      }),
    ]);

    const quota: number | null = org?.monthlyTokenQuota ?? null;
    const used = totals.totalTokens;
    const remaining = quota !== null ? Math.max(0, quota - used) : null;

    // null quota = unlimited
    const allowed = quota === null ? true : used < quota;

    return { allowed, used, quota, remaining };
  }
}

export const usageService = new UsageService();
