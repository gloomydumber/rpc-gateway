import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import type {
  BalanceProviderPort,
  BalanceProviderResult,
} from '../../../../domain/ports/outbound/balance-provider.port.js';
import { withRetry, type RetryOptions } from '../retry.js';
import { ProviderError } from '../../../../domain/errors.js';
import { logger } from '../../../../infrastructure/logger/index.js';
import { sanitizeError } from '../../../../infrastructure/logger/sanitize.js';

export class InfuraProvider implements BalanceProviderPort {
  private readonly client;
  private readonly retryOptions: RetryOptions;
  public readonly name = 'Infura';

  constructor(url: string, timeoutMs: number, retryOptions: RetryOptions) {
    this.client = createPublicClient({
      chain: sepolia,
      transport: http(url, { timeout: timeoutMs, retryCount: 0 }),
    });
    this.retryOptions = retryOptions;
  }

  async getBalance(address: string): Promise<BalanceProviderResult> {
    const start = Date.now();
    try {
      const balance = await withRetry(
        () => this.client.getBalance({ address: address as `0x${string}` }),
        this.retryOptions,
      );
      logger.info(
        { provider: this.name, address, latencyMs: Date.now() - start },
        'Provider call succeeded',
      );
      return { balance, cached: false };
    } catch (error) {
      logger.error(
        { provider: this.name, address, error: sanitizeError(error), latencyMs: Date.now() - start },
        'Provider call failed',
      );
      throw new ProviderError(error);
    }
  }
}
