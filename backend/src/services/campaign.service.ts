import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middlewares/errorHandler';
import { CampaignStatus } from '@prisma/client';

export interface CreateCampaignDTO {
  name: string;
  description?: string;
  status?: CampaignStatus;
}

export interface UpdateCampaignDTO {
  name?: string;
  description?: string;
  status?: CampaignStatus;
}

export class CampaignService {
  async listCampaigns(orgId: string) {
    logger.info(`Listing campaigns for org: ${orgId}`);
    return await prisma.campaign.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCampaignById(id: string, orgId: string) {
    logger.info(`Fetching campaign ${id} for org ${orgId}`);
    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!campaign) {
      throw new AppError(404, 'Campaign not found');
    }
    return campaign;
  }

  async createCampaign(orgId: string, userId: string, data: CreateCampaignDTO) {
    logger.info(`Creating campaign for org ${orgId} by user ${userId}`);
    if (!data.name) {
      throw new AppError(400, 'name is required');
    }
    return await prisma.campaign.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        name: data.name,
        description: data.description || null,
        status: data.status || CampaignStatus.ACTIVE,
      },
    });
  }

  async updateCampaign(id: string, orgId: string, data: UpdateCampaignDTO) {
    logger.info(`Updating campaign ${id} for org ${orgId}`);
    await this.getCampaignById(id, orgId);

    return await prisma.campaign.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
  }

  async deleteCampaign(id: string, orgId: string) {
    logger.info(`Soft deleting campaign ${id} for org ${orgId}`);
    await this.getCampaignById(id, orgId);

    return await prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.ARCHIVED },
    });
  }
}
