import type { BalanceResult } from '../../models/balance.js';

export interface BalanceQueryPort {
  getBalance(address: string): Promise<BalanceResult>;
}
