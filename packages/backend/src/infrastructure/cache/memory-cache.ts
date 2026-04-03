interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache<T = unknown> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private cleanupTimer: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly cleanupIntervalMs = 60_000) {
    this.cleanupTimer = setInterval(() => this.evictExpired(), this.cleanupIntervalMs);
    // Allow the process to exit without waiting for the timer
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.store.clear();
  }
}
