import { Router, type Request, type Response, type NextFunction } from 'express';
import type { BalanceQueryPort } from '../../../../domain/ports/inbound/balance-query.port.js';
import { addressLimiter } from '../middleware/rate-limiter.js';

export function createBalanceRouter(balanceService: BalanceQueryPort): Router {
  const router = Router();

  router.get(
    '/balance',
    addressLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const address = req.query['address'] as string | undefined;
        if (!address) {
          res.status(400).json({
            error: 'Missing required query parameter: address',
            code: 'VALIDATION_ERROR',
          });
          return;
        }

        const result = await balanceService.getBalance(address);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
