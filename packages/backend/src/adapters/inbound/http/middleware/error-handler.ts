import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../../domain/errors.js';
import { logger } from '../../../../infrastructure/logger/index.js';
import { sanitizeError } from '../../../../infrastructure/logger/sanitize.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    const safeDetails = err.details ? sanitizeError(err.details) : undefined;
    logger.warn({ code: err.code, details: safeDetails, path: req.path }, err.message);
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  logger.error({ err: sanitizeError(err), path: req.path }, 'Unexpected error');
  res.status(500).json({
    error: 'An unexpected error occurred.',
    code: 'INTERNAL_ERROR',
  });
}
