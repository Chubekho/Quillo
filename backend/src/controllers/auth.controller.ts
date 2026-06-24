import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../config/logger';

export class AuthController {
  // POST /auth/register
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name, orgName } = req.body;

      if (!email || !password || !name || !orgName) {
        throw new AppError(400, 'email, password, name, orgName are required');
      }
      if (password.length < 8) {
        throw new AppError(400, 'Password must be at least 8 characters');
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) throw new AppError(409, 'Email already registered');

      const passwordHash = await bcrypt.hash(password, 12);

      // Transaction: tạo org + user đầu tiên (OWNER) cùng lúc
      const { user, org } = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: orgName,
            slug: orgName.toLowerCase().replace(/\s+/g, '-') + '-' + uuidv4().slice(0, 6),
          },
        });

        const user = await tx.user.create({
          data: {
            organizationId: org.id,
            email,
            name,
            passwordHash,
            role: 'OWNER',
          },
        });

        return { user, org };
      });

      const { accessToken, refreshToken } = await this._issueTokens(user.id, org.id, user.role, user.email);

      logger.info(`New org registered: ${org.name} (${org.id})`);

      res.status(201).json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        org: { id: org.id, name: org.name, slug: org.slug, plan: org.plan },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      next(err);
    }
  };

  // POST /auth/login
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) throw new AppError(400, 'email and password required');

      const user = await prisma.user.findUnique({
        where: { email, isActive: true },
        include: { organization: { select: { id: true, name: true, slug: true, plan: true } } },
      });

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new AppError(401, 'Invalid email or password');
      }

      const { accessToken, refreshToken } = await this._issueTokens(
        user.id, user.organizationId, user.role, user.email,
      );

      res.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        org: user.organization,
        accessToken,
        refreshToken,
      });
    } catch (err) {
      next(err);
    }
  };

  // POST /auth/refresh
  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) throw new AppError(400, 'refreshToken required');

      const stored = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!stored || stored.expiresAt < new Date()) {
        throw new AppError(401, 'Invalid or expired refresh token');
      }

      // Rotate refresh token (security best practice)
      await prisma.refreshToken.delete({ where: { id: stored.id } });

      const { accessToken, refreshToken: newRefreshToken } = await this._issueTokens(
        stored.user.id, stored.user.organizationId, stored.user.role, stored.user.email,
      );

      res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (err) {
      next(err);
    }
  };

  // POST /auth/logout
  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
      }
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  };

  // GET /auth/me
  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true, email: true, name: true, role: true, avatarUrl: true,
          organization: { select: { id: true, name: true, slug: true, plan: true, monthlyTokenQuota: true, currentMonthTokens: true } },
        },
      });
      if (!user) throw new AppError(404, 'User not found');
      res.json(user);
    } catch (err) {
      next(err);
    }
  };

  private _issueTokens = async (userId: string, orgId: string, role: string, email: string) => {
    const accessToken = jwt.sign(
      { userId, orgId, role, email },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] },
    );

    const rawRefresh = uuidv4() + uuidv4(); // 72-char opaque token
    await prisma.refreshToken.create({
      data: {
        userId,
        token: rawRefresh,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return { accessToken, refreshToken: rawRefresh };
  };
}
