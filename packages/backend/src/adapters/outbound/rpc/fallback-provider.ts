import type {
  BalanceProviderPort,
  BalanceProviderResult,
} from '../../../domain/ports/outbound/balance-provider.port.js';
import { ProviderError } from '../../../domain/errors.js';
import { logger } from '../../../infrastructure/logger/index.js';

interface NamedProvider extends BalanceProviderPort {
  readonly name: string;
}

export class FallbackProvider implements BalanceProviderPort {
  public readonly name = 'Fallback';

  constructor(private readonly providers: NamedProvider[]) {
    if (providers.length === 0) {
      throw new Error('At least one provider is required');
    }
  }

  async getBalance(address: string): Promise<BalanceProviderResult> {
    let lastError: unknown;

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i]!;
      try {
        return await provider.getBalance(address);
      } catch (error) {
        lastError = error;
        if (i < this.providers.length - 1) {
          logger.warn(
            { fromProvider: provider.name, toProvider: this.providers[i + 1]!.name, address },
            'Fallback triggered',
          );
        }
      }
    }

    throw lastError instanceof ProviderError
      ? lastError
      : new ProviderError(lastError);
  }
}
