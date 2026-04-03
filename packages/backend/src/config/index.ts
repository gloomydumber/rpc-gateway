import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

function envInt(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (raw === undefined) return defaultValue;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) return defaultValue;
  return parsed;
}

function envStr(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const config = {
  port: envInt('PORT', 3000),
  nodeEnv: envStr('NODE_ENV', 'development'),

  rpc: {
    primaryUrl: process.env['RPC_PRIMARY_URL'] ?? '',
    fallbackUrl: process.env['RPC_FALLBACK_URL'] ?? '',
    timeoutMs: envInt('RPC_TIMEOUT_MS', 5000),
    retryMaxAttempts: envInt('RPC_RETRY_MAX_ATTEMPTS', 2),
    retryBaseDelayMs: envInt('RPC_RETRY_BASE_DELAY_MS', 500),
    retryMaxDelayMs: envInt('RPC_RETRY_MAX_DELAY_MS', 3000),
  },

  cache: {
    ttlMs: envInt('CACHE_TTL_MS', 15000),
  },

  rateLimit: {
    global: {
      max: envInt('RATE_LIMIT_GLOBAL_MAX', 100),
      windowMs: envInt('RATE_LIMIT_GLOBAL_WINDOW_MS', 60000),
    },
    ip: {
      max: envInt('RATE_LIMIT_IP_MAX', 30),
      windowMs: envInt('RATE_LIMIT_IP_WINDOW_MS', 60000),
    },
    address: {
      max: envInt('RATE_LIMIT_ADDRESS_MAX', 10),
      windowMs: envInt('RATE_LIMIT_ADDRESS_WINDOW_MS', 60000),
    },
  },

  logLevel: envStr('LOG_LEVEL', 'info'),
  corsOrigin: envStr('CORS_ORIGIN', 'http://localhost:5173'),
} as const;

export type Config = typeof config;
