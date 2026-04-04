import express from 'express';
import type { BalanceQueryPort } from '../../../domain/ports/inbound/balance-query.port.js';
import { corsMiddleware } from './middleware/cors.js';
import { requestLogger } from './middleware/request-logger.js';
import { globalLimiter, ipLimiter } from './middleware/rate-limiter.js';
import { errorHandler } from './middleware/error-handler.js';
import { createBalanceRouter } from './routes/balance.route.js';

export function createApp(balanceService: BalanceQueryPort) {
  const app = express();

  // Global middleware
  app.use(corsMiddleware);
  app.use(requestLogger);
  app.use(globalLimiter);
  app.use(ipLimiter);

  // Routes
  app.use(createBalanceRouter(balanceService));

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
