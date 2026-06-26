import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';

// Routes
import authRoutes from './routes/auth.routes';
import orgRoutes from './routes/org.routes';
import personaRoutes from './routes/persona.routes';
import campaignRoutes from './routes/campaign.routes';
import contentRoutes from './routes/content.routes';
import exportRoutes from './routes/export.routes';
import usageRoutes from './routes/usage.routes';
import healthRoutes from './routes/health.routes';

const app = express();
const API = process.env.API_PREFIX || '/api/v1';

// ── Security middleware ──────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 20000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// ── Body & utils ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(morgan('dev'));

// ── Routes ───────────────────────────────────────────────────
app.use(`${API}/health`, healthRoutes);
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/org`, orgRoutes);
app.use(`${API}/personas`, personaRoutes);
app.use(`${API}/campaigns`, campaignRoutes);
app.use(`${API}/content`, contentRoutes);
app.use(`${API}/content`, exportRoutes);
app.use(`${API}/usage`, usageRoutes);

// ── Error handlers ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
