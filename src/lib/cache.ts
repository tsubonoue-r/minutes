/**
 * In-memory cache with TTL, LRU eviction, and pattern-based invalidation
 * @module lib/cache
 *
 * NOTE: In serverless environments (e.g., Vercel Edge Functions), each cold start
 * creates a new cache instance. The cache is ephemeral and scoped to the lifetime
 * of the server process. For persistent caching across instances, consider an
 * external store (Redis, Memcached). This implementation is suitable for reducing
 * API call frequency within a single process lifecycle.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for the cache instance
 */
export interface CacheConfig {
  /** Maximum number of entries before LRU eviction (default: 1000) */
  readonly maxEntries: number;
  /** Default TTL in milliseconds (default: 5 minutes) */
  readonly defaultTtlMs: number;
  /** Whether to enable cache statistics tracking (default: true) */
  readonly enableStats: boolean;
}

/**
 * Internal cache entry with metadata
 */
interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Timestamp when entry expires (ms since epoch) */
  expiresAt: number;
  /** Timestamp when entry was created (ms since epoch) */
  createdAt: number;
  /** Timestamp of last access (ms since epoch) - used for LRU */
  lastAccessedAt: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Number of cache hits */
  readonly hits: number;
  /** Number of cache misses */
  readonly misses: number;
  /** Current number of entries in cache */
  readonly size: number;
  /** Total number of evictions performed */
  readonly evictions: number;
  /** Hit rate as a percentage (0-100) */
  readonly hitRate: number;
}

/**
 * Options for a specific cache set operation
 */
export interface CacheSetOptions {
  /** TTL in milliseconds for this specific entry (overrides default) */
  readonly ttlMs?: number | undefined;
}

/**
 * Result of a cache get operation with metadata
 */
export interface CacheGetResult<T> {
  /** The cached value, or undefined if not found/expired */
  readonly value: T | undefined;
  /** Whether the value was found in cache (hit) */
  readonly hit: boolean;
}

// =============================================================================
// Cache Implementation
// =============================================================================

/**
 * In-memory cache with TTL support and LRU eviction
 *
 * Features:
 * - TTL (Time-to-Live) per entry
 * - LRU (Least Recently Used) eviction when maxEntries is reached
 * - Pattern-based cache invalidation
 * - Cache hit/miss statistics
 * - Type-safe get/set operations
 *
 * @example
 * ```typescript
 * const cache = createCache({ maxEntries: 100, defaultTtlMs: 60_000 });
 *
 * // Set a value with default TTL
 * cache.set('meetings:list', meetingsData);
 *
 * // Set a value with custom TTL
 * cache.set('dashboard:stats', statsData, { ttlMs: 600_000 });
 *
 * // Get a value
 * const result = cache.get<MeetingsData>('meetings:list');
 * if (result.hit) {
 *   return result.value;
 * }
 *
 * // Invalidate specific key
 * cache.invalidate('meetings:list');
 *
 * // Invalidate by pattern
 * cache.invalidateByPattern(/^meetings:/);
 *
 * // Get statistics
 * const stats = cache.getStats();
 * console.log(`Hit rate: ${stats.hitRate}%`);
 * ```
 */
export class Cache {
  private readonly store: Map<string, CacheEntry<unknown>>;
  private readonly config: CacheConfig;
  private hits: number;
  private misses: number;
  private evictions: number;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxEntries: config?.maxEntries ?? 1000,
      defaultTtlMs: config?.defaultTtlMs ?? 5 * 60 * 1000, // 5 minutes
      enableStats: config?.enableStats ?? true,
    };
    this.store = new Map();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Get a value from the cache
   *
   * Returns the cached value if it exists and has not expired.
   * Expired entries are removed on access (lazy cleanup).
   *
   * @param key - Cache key
   * @returns Cache get result with value and hit status
   */
  get<T>(key: string): CacheGetResult<T> {
    const entry = this.store.get(key);

    if (entry === undefined) {
      if (this.config.enableStats) {
        this.misses++;
      }
      return { value: undefined, hit: false };
    }

    // Check if entry has expired
    const now = Date.now();
    if (now >= entry.expiresAt) {
      // Remove expired entry
      this.store.delete(key);
      if (this.config.enableStats) {
        this.misses++;
      }
      return { value: undefined, hit: false };
    }

    // Update last accessed time for LRU
    entry.lastAccessedAt = now;

    if (this.config.enableStats) {
      this.hits++;
    }

    return { value: entry.value as T, hit: true };
  }

  /**
   * Set a value in the cache
   *
   * If the cache is at capacity, the least recently used entry is evicted.
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Optional TTL override
   */
  set<T>(key: string, value: T, options?: CacheSetOptions): void {
    const now = Date.now();
    const ttlMs = options?.ttlMs ?? this.config.defaultTtlMs;

    // If key already exists, just update it
    if (this.store.has(key)) {
      const entry: CacheEntry<unknown> = {
        value,
        expiresAt: now + ttlMs,
        createdAt: now,
        lastAccessedAt: now,
      };
      this.store.delete(key); // Remove to re-insert at end (Map order)
      this.store.set(key, entry);
      return;
    }

    // Evict if at capacity
    if (this.store.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    const entry: CacheEntry<unknown> = {
      value,
      expiresAt: now + ttlMs,
      createdAt: now,
      lastAccessedAt: now,
    };

    this.store.set(key, entry);
  }

  /**
   * Check if a key exists in the cache (without updating access time)
   *
   * @param key - Cache key
   * @returns True if key exists and has not expired
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (entry === undefined) {
      return false;
    }

    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate (remove) a specific cache entry
   *
   * @param key - Cache key to invalidate
   * @returns True if the key was found and removed
   */
  invalidate(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Invalidate all cache entries whose keys match the given pattern
   *
   * @param pattern - RegExp pattern to match against cache keys
   * @returns Number of entries invalidated
   *
   * @example
   * ```typescript
   * // Invalidate all meeting-related cache entries
   * cache.invalidateByPattern(/^meetings:/);
   *
   * // Invalidate all stats
   * cache.invalidateByPattern(/stats$/);
   * ```
   */
  invalidateByPattern(pattern: RegExp): number {
    let count = 0;
    const keysToDelete: string[] = [];

    this.store.forEach((_value, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    });

    for (const key of keysToDelete) {
      this.store.delete(key);
      count++;
    }

    return count;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache statistics
   *
   * @returns Current cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0
      ? Math.round((this.hits / totalRequests) * 10000) / 100
      : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.store.size,
      evictions: this.evictions,
      hitRate,
    };
  }

  /**
   * Reset cache statistics (does not affect cached data)
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Remove all expired entries from the cache
   *
   * This is normally done lazily on access, but can be called
   * explicitly for periodic cleanup.
   *
   * @returns Number of expired entries removed
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    const keysToDelete: string[] = [];

    this.store.forEach((entry, key) => {
      if (now >= entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    for (const key of keysToDelete) {
      this.store.delete(key);
      removed++;
    }

    return removed;
  }

  /**
   * Get the current number of entries in the cache
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    this.store.forEach((entry, key) => {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    });

    if (oldestKey !== undefined) {
      this.store.delete(oldestKey);
      if (this.config.enableStats) {
        this.evictions++;
      }
    }
  }
}

// =============================================================================
// Cache Key Helpers
// =============================================================================

/**
 * Generate a cache key from component parts
 *
 * @param parts - Key components to join with ':'
 * @returns Formatted cache key
 *
 * @example
 * ```typescript
 * const key = cacheKey('meetings', 'list', 'page-1');
 * // Returns: 'meetings:list:page-1'
 * ```
 */
export function cacheKey(...parts: readonly string[]): string {
  return parts.join(':');
}

/**
 * Generate a cache key that includes query parameters for uniqueness
 *
 * @param prefix - Key prefix (e.g., 'meetings:list')
 * @param params - Query parameters to include in key
 * @returns Formatted cache key with sorted parameter hash
 *
 * @example
 * ```typescript
 * const key = cacheKeyWithParams('meetings:list', { page: '1', limit: '20' });
 * // Returns: 'meetings:list:limit=20&page=1'
 * ```
 */
export function cacheKeyWithParams(
  prefix: string,
  params: Record<string, string | undefined>
): string {
  const sortedEntries = Object.entries(params)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  if (sortedEntries.length === 0) {
    return prefix;
  }

  const paramString = sortedEntries
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return `${prefix}:${paramString}`;
}

// =============================================================================
// Singleton Instance
// =============================================================================

/**
 * Global cache instance for the application
 *
 * NOTE: In serverless environments, this instance is scoped to the process
 * lifetime. Each cold start creates a fresh cache. This is acceptable for
 * reducing API call frequency within request bursts on the same instance.
 */
let globalCache: Cache | null = null;

/**
 * Get or create the global cache instance
 *
 * @param config - Optional configuration (only used on first call)
 * @returns The global cache instance
 *
 * @example
 * ```typescript
 * import { getCache } from '@/lib/cache';
 *
 * const cache = getCache();
 * cache.set('key', value, { ttlMs: 300_000 });
 * ```
 */
export function getCache(config?: Partial<CacheConfig>): Cache {
  if (globalCache === null) {
    globalCache = new Cache(config);
  }
  return globalCache;
}

/**
 * Reset the global cache instance (primarily for testing)
 */
export function resetGlobalCache(): void {
  if (globalCache !== null) {
    globalCache.clear();
    globalCache = null;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new cache instance with custom configuration
 *
 * Use this when you need a separate cache from the global instance.
 *
 * @param config - Cache configuration
 * @returns New cache instance
 *
 * @example
 * ```typescript
 * const sessionCache = createCache({
 *   maxEntries: 100,
 *   defaultTtlMs: 30 * 60 * 1000, // 30 minutes
 * });
 * ```
 */
export function createCache(config?: Partial<CacheConfig>): Cache {
  return new Cache(config);
}

// =============================================================================
// Cache Constants
// =============================================================================

/**
 * Standard TTL values for different cache categories (in milliseconds)
 */
export const CACHE_TTL = {
  /** Short-lived cache: 1 minute */
  SHORT: 1 * 60 * 1000,
  /** Medium cache: 5 minutes */
  MEDIUM: 5 * 60 * 1000,
  /** Long cache: 10 minutes */
  LONG: 10 * 60 * 1000,
  /** Extended cache: 30 minutes */
  EXTENDED: 30 * 60 * 1000,
} as const;

/**
 * Cache key prefixes for different data domains
 */
export const CACHE_KEYS = {
  /** Meetings list cache prefix */
  MEETINGS_LIST: 'meetings:list',
  /** Dashboard stats cache prefix */
  DASHBOARD_STATS: 'dashboard:stats',
  /** Action items stats cache prefix */
  ACTION_ITEMS_STATS: 'action-items:stats',
} as const;

/**
 * Invalidation patterns for cache groups
 */
export const CACHE_PATTERNS = {
  /** All meeting-related caches */
  MEETINGS: /^meetings:/,
  /** All dashboard-related caches */
  DASHBOARD: /^dashboard:/,
  /** All action-items-related caches */
  ACTION_ITEMS: /^action-items:/,
  /** All stats caches */
  ALL_STATS: /stats$/,
} as const;
