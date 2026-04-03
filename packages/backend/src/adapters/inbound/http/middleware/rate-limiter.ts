import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { config } from '../../../../config/index.js';
import { logger } from '../../../../infrastructure/logger/index.js';

const rateLimitResponse = (_req: Request, res: Response) => {
  res.status(429).json({
    error: 'Too many requests. Please try again later.',
    code: 'RATE_LIMITED',
  });
};

export const globalLimiter = rateLimit({
  windowMs: config.rateLimit.global.windowMs,
  max: config.rateLimit.global.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({ layer: 'global', ip: req.ip }, 'Rate limit hit');
    rateLimitResponse(req, res);
  },
});

export const ipLimiter = rateLimit({
  windowMs: config.rateLimit.ip.windowMs,
  max: config.rateLimit.ip.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({ layer: 'per-ip', ip: req.ip }, 'Rate limit hit');
    rateLimitResponse(req, res);
  },
});

export const addressLimiter = rateLimit({
  windowMs: config.rateLimit.address.windowMs,
  max: config.rateLimit.address.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const address = (req.query['address'] as string) ?? 'unknown';
    return address.toLowerCase();
  },
  handler: (req, res) => {
    logger.warn(
      { layer: 'per-address', ip: req.ip, address: req.query['address'] },
      'Rate limit hit',
    );
    rateLimitResponse(req, res);
  },
});
