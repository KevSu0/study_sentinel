import { createStatsCache } from '@/lib/stats/cache';

describe('StatsCache', () => {
  test('stores and retrieves with TTL', () => {
    let now = 1000;
    const cache = createStatsCache<string>({ ttlMs: 100, now: () => now });
    cache.set('k1', 'v1');
    expect(cache.get('k1')).toBe('v1');
    // advance just before expiry
    now = 1099;
    expect(cache.has('k1')).toBe(true);
    // advance past expiry
    now = 1201;
    expect(cache.get('k1')).toBeUndefined();
  });

  test('invalidate and prefix invalidation', () => {
    const cache = createStatsCache({ ttlMs: 10_000, now: () => 0 });
    cache.set('a:1', 1);
    cache.set('a:2', 2);
    cache.set('b:1', 3);
    cache.invalidate('a:1');
    expect(cache.get('a:1')).toBeUndefined();
    expect(cache.get('a:2')).toBe(2);
    cache.invalidatePrefix('a:');
    expect(cache.get('a:2')).toBeUndefined();
    expect(cache.get('b:1')).toBe(3);
  });

  test('respects maxEntries via simple pruning', () => {
    const cache = createStatsCache({ ttlMs: 10_000, now: () => 0, maxEntries: 2 });
    cache.set('k1', 1);
    cache.set('k2', 2);
    cache.set('k3', 3);
    const v1 = cache.get('k1');
    const v2 = cache.get('k2');
    const v3 = cache.get('k3');
    // one of the first two must be pruned; k3 must exist
    const prunedCount = [v1, v2].filter(v => v === undefined).length;
    expect(prunedCount).toBe(1);
    expect(v3).toBe(3);
  });

  test('clear empties the cache', () => {
    const cache = createStatsCache({ ttlMs: 10_000, now: () => 0 });
    cache.set('x', 42);
    expect(cache.has('x')).toBe(true);
    cache.clear();
    expect(cache.has('x')).toBe(false);
  });
});
