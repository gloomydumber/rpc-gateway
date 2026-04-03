import { isValidEthAddress } from '@rpc-gateway/shared';
import { formatEther } from 'viem';
import type { BalanceResult } from '../models/balance.js';
import type { BalanceQueryPort } from '../ports/inbound/balance-query.port.js';
import type { BalanceProviderPort } from '../ports/outbound/balance-provider.port.js';
import { ValidationError } from '../errors.js';

export class BalanceService implements BalanceQueryPort {
  constructor(private readonly provider: BalanceProviderPort) {}

  async getBalance(address: string): Promise<BalanceResult> {
    if (!isValidEthAddress(address)) {
      throw new ValidationError('Invalid Ethereum address.');
    }

    const normalized = address.toLowerCase();
    const { balance, cached } = await this.provider.getBalance(normalized);

    return {
      address: normalized,
      balanceWei: balance.toString(),
      balanceEth: formatEther(balance),
      cached,
    };
  }
}
