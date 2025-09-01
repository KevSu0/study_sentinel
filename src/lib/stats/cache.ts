export type CacheKey = string;

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheOptions {
  ttlMs?: number; // default TTL in ms
  now?: () => number; // injectable clock for tests
  maxEntries?: number; // soft cap to avoid unbounded growth
}

/**
 * A tiny in-memory TTL cache with prefix invalidation.
 * Designed for memoizing stats selectors safely.
 */
export class StatsCache<T = unknown> {
  private store = new Map<CacheKey, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly maxEntries: number | undefined;

  constructor(opts?: CacheOptions) {
    this.ttlMs = Math.max(0, opts?.ttlMs ?? 30_000);
    this.now = opts?.now ?? (() => Date.now());
    this.maxEntries = opts?.maxEntries;
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return this.now() > entry.expiresAt;
  }

  get(key: CacheKey): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: CacheKey, value: T, ttlMs?: number): void {
    const ttl = Math.max(0, ttlMs ?? this.ttlMs);
    const entry: CacheEntry<T> = {
      value,
      expiresAt: this.now() + ttl,
    };
    // simple LRU-ish pruning if over capacity
    if (this.maxEntries && this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value as CacheKey | undefined;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, entry);
  }

  has(key: CacheKey): boolean {
    return this.get(key) !== undefined;
  }

  invalidate(key: CacheKey): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) this.store.delete(k);
    }
  }

  clear(): void {
    this.store.clear();
  }
}

export function createStatsCache<T = unknown>(opts?: CacheOptions) {
  return new StatsCache<T>(opts);
}

