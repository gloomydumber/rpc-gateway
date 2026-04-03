import type {
  BalanceProviderPort,
  BalanceProviderResult,
} from '../../../domain/ports/outbound/balance-provider.port.js';
import type { MemoryCache } from '../../../infrastructure/cache/memory-cache.js';
import { logger } from '../../../infrastructure/logger/index.js';

export class CachedBalanceProvider implements BalanceProviderPort {
  public readonly name = 'CachedProvider';

  constructor(
    private readonly inner: BalanceProviderPort,
    private readonly cache: MemoryCache<bigint>,
    private readonly ttlMs: number,
  ) {}

  async getBalance(address: string): Promise<BalanceProviderResult> {
    const key = `balance:${address.toLowerCase()}`;
    const cached = this.cache.get(key);

    if (cached !== undefined) {
      logger.debug({ address }, 'Cache hit');
      return { balance: cached, cached: true };
    }

    logger.debug({ address }, 'Cache miss');
    const result = await this.inner.getBalance(address);
    this.cache.set(key, result.balance, this.ttlMs);
    return result;
  }
}
