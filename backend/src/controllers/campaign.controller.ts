import { Request, Response, NextFunction } from 'express';
import { CampaignService } from '../services/campaign.service';

export class CampaignController {
  private campaignService = new CampaignService();

  // GET /campaigns
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaigns = await this.campaignService.listCampaigns(req.user!.orgId);
      res.status(200).json(campaigns);
    } catch (err) {
      next(err);
    }
  };

  // POST /campaigns
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaign = await this.campaignService.createCampaign(
        req.user!.orgId,
        req.user!.userId,
        req.body
      );
      res.status(201).json(campaign);
    } catch (err) {
      next(err);
    }
  };

  // GET /campaigns/:id
  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaign = await this.campaignService.getCampaignById(
        req.params.id,
        req.user!.orgId
      );
      res.status(200).json(campaign);
    } catch (err) {
      next(err);
    }
  };

  // PATCH /campaigns/:id
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaign = await this.campaignService.updateCampaign(
        req.params.id,
        req.user!.orgId,
        req.body
      );
      res.status(200).json(campaign);
    } catch (err) {
      next(err);
    }
  };

  // DELETE /campaigns/:id
  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.campaignService.deleteCampaign(req.params.id, req.user!.orgId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
