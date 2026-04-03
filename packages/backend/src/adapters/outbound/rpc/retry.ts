import { logger } from '../../../infrastructure/logger/index.js';

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('timeout') ||
      msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('fetch failed') ||
      msg.includes('429') ||
      msg.includes('rate limit') ||
      msg.includes('503') ||
      msg.includes('502')
    );
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryable(error) || attempt === options.maxAttempts - 1) {
        throw lastError;
      }

      const delay = Math.min(options.baseDelayMs * Math.pow(2, attempt), options.maxDelayMs);
      const jitter = delay * (0.5 + Math.random() * 0.5);

      logger.warn(
        { attempt: attempt + 1, maxAttempts: options.maxAttempts, delayMs: Math.round(jitter) },
        'Retrying after transient error',
      );

      await sleep(jitter);
    }
  }

  throw lastError ?? new Error('Retry failed');
}
