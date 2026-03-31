import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { config } from './config';

export const corsMiddleware = cors({
  origin: config.corsOrigins.includes('*') ? '*' : config.corsOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Tracking-Key'],
});

export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

export function trackingKeyCheck(req: Request, res: Response, next: NextFunction): void {
  if (!config.trackingKey) {
    next();
    return;
  }
  const provided = req.headers['x-tracking-key'] as string;
  if (provided !== config.trackingKey) {
    res.status(403).json({ error: 'Invalid tracking key' });
    return;
  }
  next();
}
