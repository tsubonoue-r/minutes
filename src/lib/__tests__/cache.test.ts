/**
 * Tests for cache utilities
 * @module lib/__tests__/cache.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  Cache,
  createCache,
  getCache,
  resetGlobalCache,
  cacheKey,
  cacheKeyWithParams,
  CACHE_TTL,
  CACHE_KEYS,
  CACHE_PATTERNS,
} from '../cache';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Advance fake timers and flush microtasks
 */
function advanceTime(ms: number): void {
  vi.advanceTimersByTime(ms);
}

// =============================================================================
// Tests
// =============================================================================

describe('Cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetGlobalCache();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetGlobalCache();
  });

  // ---------------------------------------------------------------------------
  // Basic get/set
  // ---------------------------------------------------------------------------

  describe('get/set', () => {
    it('should store and retrieve a value', () => {
      const cache = createCache();
      cache.set('key1', 'value1');

      const result = cache.get<string>('key1');
      expect(result.hit).toBe(true);
      expect(result.value).toBe('value1');
    });

    it('should return miss for non-existent key', () => {
      const cache = createCache();

      const result = cache.get<string>('nonexistent');
      expect(result.hit).toBe(false);
      expect(result.value).toBeUndefined();
    });

    it('should handle various value types', () => {
      const cache = createCache();

      cache.set('string', 'hello');
      cache.set('number', 42);
      cache.set('boolean', true);
      cache.set('null', null);
      cache.set('object', { foo: 'bar' });
      cache.set('array', [1, 2, 3]);

      expect(cache.get<string>('string').value).toBe('hello');
      expect(cache.get<number>('number').value).toBe(42);
      expect(cache.get<boolean>('boolean').value).toBe(true);
      expect(cache.get<null>('null').value).toBeNull();
      expect(cache.get<{ foo: string }>('object').value).toEqual({ foo: 'bar' });
      expect(cache.get<number[]>('array').value).toEqual([1, 2, 3]);
    });

    it('should overwrite existing value with same key', () => {
      const cache = createCache();

      cache.set('key', 'value1');
      cache.set('key', 'value2');

      const result = cache.get<string>('key');
      expect(result.hit).toBe(true);
      expect(result.value).toBe('value2');
    });

    it('should store complex objects by reference', () => {
      const cache = createCache();
      const data = { meetings: [{ id: '1', title: 'Test' }] };

      cache.set('meetings', data);

      const result = cache.get<typeof data>('meetings');
      expect(result.hit).toBe(true);
      expect(result.value).toBe(data); // Same reference
    });
  });

  // ---------------------------------------------------------------------------
  // TTL (Time-to-Live)
  // ---------------------------------------------------------------------------

  describe('TTL', () => {
    it('should expire entries after default TTL', () => {
      const cache = createCache({ defaultTtlMs: 1000 });

      cache.set('key', 'value');

      // Still valid before TTL
      advanceTime(999);
      expect(cache.get<string>('key').hit).toBe(true);

      // Expired after TTL
      advanceTime(1);
      expect(cache.get<string>('key').hit).toBe(false);
    });

    it('should support custom TTL per entry', () => {
      const cache = createCache({ defaultTtlMs: 1000 });

      cache.set('short', 'value', { ttlMs: 500 });
      cache.set('long', 'value', { ttlMs: 5000 });

      advanceTime(600);

      expect(cache.get<string>('short').hit).toBe(false);
      expect(cache.get<string>('long').hit).toBe(true);
    });

    it('should remove expired entry on access', () => {
      const cache = createCache({ defaultTtlMs: 1000 });

      cache.set('key', 'value');
      expect(cache.size).toBe(1);

      advanceTime(1001);

      cache.get<string>('key');
      expect(cache.size).toBe(0);
    });

    it('should use CACHE_TTL constants correctly', () => {
      const cache = createCache();

      cache.set('short', 'value', { ttlMs: CACHE_TTL.SHORT });
      cache.set('medium', 'value', { ttlMs: CACHE_TTL.MEDIUM });
      cache.set('long', 'value', { ttlMs: CACHE_TTL.LONG });

      // After 2 minutes - SHORT expired
      advanceTime(2 * 60 * 1000);
      expect(cache.get<string>('short').hit).toBe(false);
      expect(cache.get<string>('medium').hit).toBe(true);
      expect(cache.get<string>('long').hit).toBe(true);

      // After 6 minutes total - MEDIUM expired
      advanceTime(4 * 60 * 1000);
      expect(cache.get<string>('medium').hit).toBe(false);
      expect(cache.get<string>('long').hit).toBe(true);

      // After 11 minutes total - LONG expired
      advanceTime(5 * 60 * 1000);
      expect(cache.get<string>('long').hit).toBe(false);
    });

    it('should reset TTL when overwriting a key', () => {
      const cache = createCache({ defaultTtlMs: 1000 });

      cache.set('key', 'value1');
      advanceTime(800);

      // Overwrite resets TTL
      cache.set('key', 'value2');
      advanceTime(800);

      // Should still be valid (800ms since last set)
      const result = cache.get<string>('key');
      expect(result.hit).toBe(true);
      expect(result.value).toBe('value2');
    });
  });

  // ---------------------------------------------------------------------------
  // LRU Eviction
  // ---------------------------------------------------------------------------

  describe('LRU eviction', () => {
    it('should evict least recently used entry when at capacity', () => {
      const cache = createCache({ maxEntries: 3 });

      cache.set('a', 'value-a');
      advanceTime(10);
      cache.set('b', 'value-b');
      advanceTime(10);
      cache.set('c', 'value-c');
      advanceTime(10);

      // Cache is full. Adding a new entry should evict 'a' (oldest access)
      cache.set('d', 'value-d');

      expect(cache.get<string>('a').hit).toBe(false); // Evicted
      expect(cache.get<string>('b').hit).toBe(true);
      expect(cache.get<string>('c').hit).toBe(true);
      expect(cache.get<string>('d').hit).toBe(true);
    });

    it('should update access time on get', () => {
      const cache = createCache({ maxEntries: 3 });

      cache.set('a', 'value-a');
      advanceTime(10);
      cache.set('b', 'value-b');
      advanceTime(10);
      cache.set('c', 'value-c');
      advanceTime(10);

      // Access 'a' to make it recently used
      cache.get<string>('a');
      advanceTime(10);

      // Adding 'd' should now evict 'b' (least recently used)
      cache.set('d', 'value-d');

      expect(cache.get<string>('a').hit).toBe(true); // Kept (recently accessed)
      expect(cache.get<string>('b').hit).toBe(false); // Evicted
      expect(cache.get<string>('c').hit).toBe(true);
      expect(cache.get<string>('d').hit).toBe(true);
    });

    it('should track eviction count in stats', () => {
      const cache = createCache({ maxEntries: 2 });

      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3'); // Evicts 'a'
      cache.set('d', '4'); // Evicts 'b'

      const stats = cache.getStats();
      expect(stats.evictions).toBe(2);
    });

    it('should not evict when updating existing key', () => {
      const cache = createCache({ maxEntries: 2 });

      cache.set('a', '1');
      cache.set('b', '2');

      // Updating existing key should not trigger eviction
      cache.set('a', 'updated');

      expect(cache.size).toBe(2);
      expect(cache.getStats().evictions).toBe(0);
      expect(cache.get<string>('a').value).toBe('updated');
      expect(cache.get<string>('b').hit).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Invalidation
  // ---------------------------------------------------------------------------

  describe('invalidate', () => {
    it('should remove a specific key', () => {
      const cache = createCache();

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const removed = cache.invalidate('key1');

      expect(removed).toBe(true);
      expect(cache.get<string>('key1').hit).toBe(false);
      expect(cache.get<string>('key2').hit).toBe(true);
    });

    it('should return false for non-existent key', () => {
      const cache = createCache();

      const removed = cache.invalidate('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('invalidateByPattern', () => {
    it('should remove all keys matching pattern', () => {
      const cache = createCache();

      cache.set('meetings:list:page-1', 'data1');
      cache.set('meetings:list:page-2', 'data2');
      cache.set('meetings:detail:123', 'data3');
      cache.set('dashboard:stats', 'data4');

      const count = cache.invalidateByPattern(/^meetings:/);

      expect(count).toBe(3);
      expect(cache.get<string>('meetings:list:page-1').hit).toBe(false);
      expect(cache.get<string>('meetings:list:page-2').hit).toBe(false);
      expect(cache.get<string>('meetings:detail:123').hit).toBe(false);
      expect(cache.get<string>('dashboard:stats').hit).toBe(true);
    });

    it('should return 0 when no keys match', () => {
      const cache = createCache();

      cache.set('key1', 'value1');

      const count = cache.invalidateByPattern(/^nonexistent/);
      expect(count).toBe(0);
    });

    it('should support CACHE_PATTERNS constants', () => {
      const cache = createCache();

      cache.set('meetings:list', 'data');
      cache.set('dashboard:stats', 'data');
      cache.set('action-items:stats', 'data');

      cache.invalidateByPattern(CACHE_PATTERNS.ALL_STATS);

      expect(cache.get<string>('meetings:list').hit).toBe(true);
      expect(cache.get<string>('dashboard:stats').hit).toBe(false);
      expect(cache.get<string>('action-items:stats').hit).toBe(false);
    });

    it('should handle CACHE_PATTERNS.MEETINGS pattern', () => {
      const cache = createCache();

      cache.set('meetings:list', 'data');
      cache.set('meetings:detail:1', 'data');
      cache.set('dashboard:stats', 'data');

      cache.invalidateByPattern(CACHE_PATTERNS.MEETINGS);

      expect(cache.get<string>('meetings:list').hit).toBe(false);
      expect(cache.get<string>('meetings:detail:1').hit).toBe(false);
      expect(cache.get<string>('dashboard:stats').hit).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // has
  // ---------------------------------------------------------------------------

  describe('has', () => {
    it('should return true for existing non-expired key', () => {
      const cache = createCache();
      cache.set('key', 'value');
      expect(cache.has('key')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      const cache = createCache();
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false and remove expired key', () => {
      const cache = createCache({ defaultTtlMs: 1000 });
      cache.set('key', 'value');

      advanceTime(1001);

      expect(cache.has('key')).toBe(false);
      expect(cache.size).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  describe('statistics', () => {
    it('should track hits and misses', () => {
      const cache = createCache();

      cache.set('key1', 'value1');

      cache.get<string>('key1'); // Hit
      cache.get<string>('key1'); // Hit
      cache.get<string>('key2'); // Miss
      cache.get<string>('key3'); // Miss
      cache.get<string>('key4'); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(3);
      expect(stats.hitRate).toBe(40);
    });

    it('should report correct size', () => {
      const cache = createCache();

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.getStats().size).toBe(3);

      cache.invalidate('b');
      expect(cache.getStats().size).toBe(2);
    });

    it('should calculate hit rate correctly', () => {
      const cache = createCache();

      // No requests yet
      expect(cache.getStats().hitRate).toBe(0);

      cache.set('key', 'value');

      // 1 hit out of 1
      cache.get<string>('key');
      expect(cache.getStats().hitRate).toBe(100);

      // 1 hit out of 2
      cache.get<string>('nonexistent');
      expect(cache.getStats().hitRate).toBe(50);
    });

    it('should reset stats without affecting data', () => {
      const cache = createCache();

      cache.set('key', 'value');
      cache.get<string>('key'); // Hit
      cache.get<string>('miss'); // Miss

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
      expect(stats.hitRate).toBe(0);

      // Data should still be there
      expect(cache.get<string>('key').hit).toBe(true);
    });

    it('should not track stats when disabled', () => {
      const cache = createCache({ enableStats: false });

      cache.set('key', 'value');
      cache.get<string>('key');
      cache.get<string>('nonexistent');

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // cleanup
  // ---------------------------------------------------------------------------

  describe('cleanup', () => {
    it('should remove all expired entries', () => {
      const cache = createCache({ defaultTtlMs: 1000 });

      cache.set('expire1', 'value', { ttlMs: 500 });
      cache.set('expire2', 'value', { ttlMs: 500 });
      cache.set('keep', 'value', { ttlMs: 5000 });

      advanceTime(600);

      const removed = cache.cleanup();

      expect(removed).toBe(2);
      expect(cache.size).toBe(1);
      expect(cache.get<string>('keep').hit).toBe(true);
    });

    it('should return 0 when no entries are expired', () => {
      const cache = createCache({ defaultTtlMs: 10000 });

      cache.set('key1', 'value');
      cache.set('key2', 'value');

      const removed = cache.cleanup();
      expect(removed).toBe(0);
      expect(cache.size).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // clear
  // ---------------------------------------------------------------------------

  describe('clear', () => {
    it('should remove all entries', () => {
      const cache = createCache();

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.get<number>('a').hit).toBe(false);
      expect(cache.get<number>('b').hit).toBe(false);
      expect(cache.get<number>('c').hit).toBe(false);
    });
  });
});

// =============================================================================
// Cache Key Helpers
// =============================================================================

describe('cacheKey', () => {
  it('should join parts with colon separator', () => {
    expect(cacheKey('meetings', 'list')).toBe('meetings:list');
    expect(cacheKey('dashboard', 'stats', 'period-month')).toBe(
      'dashboard:stats:period-month'
    );
  });

  it('should handle single part', () => {
    expect(cacheKey('simple')).toBe('simple');
  });

  it('should handle empty parts', () => {
    expect(cacheKey('a', '', 'b')).toBe('a::b');
  });
});

describe('cacheKeyWithParams', () => {
  it('should append sorted params to prefix', () => {
    const key = cacheKeyWithParams('meetings:list', {
      page: '1',
      limit: '20',
      search: 'test',
    });

    expect(key).toBe('meetings:list:limit=20&page=1&search=test');
  });

  it('should exclude undefined params', () => {
    const key = cacheKeyWithParams('meetings:list', {
      page: '1',
      search: undefined,
      limit: '20',
    });

    expect(key).toBe('meetings:list:limit=20&page=1');
  });

  it('should return prefix only when no params', () => {
    const key = cacheKeyWithParams('meetings:list', {});
    expect(key).toBe('meetings:list');
  });

  it('should return prefix when all params are undefined', () => {
    const key = cacheKeyWithParams('meetings:list', {
      search: undefined,
      status: undefined,
    });
    expect(key).toBe('meetings:list');
  });

  it('should produce consistent keys regardless of param order', () => {
    const key1 = cacheKeyWithParams('prefix', { b: '2', a: '1' });
    const key2 = cacheKeyWithParams('prefix', { a: '1', b: '2' });

    expect(key1).toBe(key2);
  });
});

// =============================================================================
// Global Cache
// =============================================================================

describe('getCache / resetGlobalCache', () => {
  beforeEach(() => {
    resetGlobalCache();
  });

  afterEach(() => {
    resetGlobalCache();
  });

  it('should return the same instance on multiple calls', () => {
    const cache1 = getCache();
    const cache2 = getCache();

    expect(cache1).toBe(cache2);
  });

  it('should accept config on first call', () => {
    const cache = getCache({ maxEntries: 5 });

    // Fill to capacity
    for (let i = 0; i < 6; i++) {
      cache.set(`key${i}`, `value${i}`);
    }

    // Should have evicted one entry
    expect(cache.size).toBe(5);
  });

  it('should reset global cache', () => {
    const cache = getCache();
    cache.set('key', 'value');

    resetGlobalCache();

    const newCache = getCache();
    expect(newCache.get<string>('key').hit).toBe(false);
    expect(newCache).not.toBe(cache);
  });
});

// =============================================================================
// Constants
// =============================================================================

describe('CACHE_TTL constants', () => {
  it('should have correct values', () => {
    expect(CACHE_TTL.SHORT).toBe(60_000);
    expect(CACHE_TTL.MEDIUM).toBe(300_000);
    expect(CACHE_TTL.LONG).toBe(600_000);
    expect(CACHE_TTL.EXTENDED).toBe(1_800_000);
  });
});

describe('CACHE_KEYS constants', () => {
  it('should have expected key prefixes', () => {
    expect(CACHE_KEYS.MEETINGS_LIST).toBe('meetings:list');
    expect(CACHE_KEYS.DASHBOARD_STATS).toBe('dashboard:stats');
    expect(CACHE_KEYS.ACTION_ITEMS_STATS).toBe('action-items:stats');
  });
});

describe('CACHE_PATTERNS constants', () => {
  it('should match expected patterns', () => {
    expect(CACHE_PATTERNS.MEETINGS.test('meetings:list')).toBe(true);
    expect(CACHE_PATTERNS.MEETINGS.test('meetings:detail:1')).toBe(true);
    expect(CACHE_PATTERNS.MEETINGS.test('dashboard:stats')).toBe(false);

    expect(CACHE_PATTERNS.DASHBOARD.test('dashboard:stats')).toBe(true);
    expect(CACHE_PATTERNS.DASHBOARD.test('meetings:list')).toBe(false);

    expect(CACHE_PATTERNS.ACTION_ITEMS.test('action-items:stats')).toBe(true);
    expect(CACHE_PATTERNS.ACTION_ITEMS.test('meetings:list')).toBe(false);

    expect(CACHE_PATTERNS.ALL_STATS.test('dashboard:stats')).toBe(true);
    expect(CACHE_PATTERNS.ALL_STATS.test('action-items:stats')).toBe(true);
    expect(CACHE_PATTERNS.ALL_STATS.test('meetings:list')).toBe(false);
  });
});
