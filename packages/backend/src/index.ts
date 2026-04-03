import { config } from './config/index.js';
import { logger } from './infrastructure/logger/index.js';
import { MemoryCache } from './infrastructure/cache/memory-cache.js';
import { InfuraProvider } from './adapters/outbound/rpc/providers/infura.provider.js';
import { AlchemyProvider } from './adapters/outbound/rpc/providers/alchemy.provider.js';
import { FallbackProvider } from './adapters/outbound/rpc/fallback-provider.js';
import { CachedBalanceProvider } from './adapters/outbound/rpc/cached-balance-provider.js';
import { BalanceService } from './domain/services/balance.service.js';
import { createApp } from './adapters/inbound/http/app.js';
import type { RetryOptions } from './adapters/outbound/rpc/retry.js';

const retryOptions: RetryOptions = {
  maxAttempts: config.rpc.retryMaxAttempts,
  baseDelayMs: config.rpc.retryBaseDelayMs,
  maxDelayMs: config.rpc.retryMaxDelayMs,
};

// Build providers
const providers: (InfuraProvider | AlchemyProvider)[] = [];

if (config.rpc.primaryUrl) {
  providers.push(new InfuraProvider(config.rpc.primaryUrl, config.rpc.timeoutMs, retryOptions));
}
if (config.rpc.fallbackUrl) {
  providers.push(new AlchemyProvider(config.rpc.fallbackUrl, config.rpc.timeoutMs, retryOptions));
}

if (providers.length === 0) {
  logger.error('No RPC provider URLs configured. Set RPC_PRIMARY_URL in .env');
  process.exit(1);
}

const fallbackProvider = new FallbackProvider(providers);

// Wrap with cache
const cache = new MemoryCache<bigint>();
const cachedProvider = new CachedBalanceProvider(fallbackProvider, cache, config.cache.ttlMs);

// Domain service
const balanceService = new BalanceService(cachedProvider);

// HTTP app
const app = createApp(balanceService);

app.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      providers: providers.map((p) => p.name),
      cacheTtlMs: config.cache.ttlMs,
    },
    'RPC Gateway started',
  );
});
