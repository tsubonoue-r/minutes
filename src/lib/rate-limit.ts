/**
 * Rate limiting with sliding window algorithm
 * @module lib/rate-limit
 *
 * NOTE: This implementation uses in-memory storage.
 * In serverless environments (Vercel Edge, AWS Lambda), each instance
 * maintains its own state. For distributed rate limiting, consider
 * using an external store (Redis, Upstash, etc.).
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  readonly maxRequests: number;
  /** Window size in milliseconds */
  readonly windowMs: number;
  /** Whether to include rate limit headers in response */
  readonly includeHeaders: boolean;
  /** Custom key prefix for namespacing */
  readonly keyPrefix: string;
}

/**
 * Rate limit result returned after checking
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  readonly allowed: boolean;
  /** Maximum requests allowed in the window */
  readonly limit: number;
  /** Remaining requests in the current window */
  readonly remaining: number;
  /** Unix timestamp (seconds) when the window resets */
  readonly resetAt: number;
  /** Time in milliseconds until the window resets */
  readonly retryAfterMs: number;
}

/**
 * Rate limit headers to include in HTTP responses
 */
export interface RateLimitHeaders {
  readonly 'X-RateLimit-Limit': string;
  readonly 'X-RateLimit-Remaining': string;
  readonly 'X-RateLimit-Reset': string;
  readonly 'Retry-After'?: string;
}

/**
 * Internal record of a request timestamp
 */
interface RequestRecord {
  readonly timestamp: number;
}

/**
 * Default rate limit configuration
 * 60 requests per minute
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minute
  includeHeaders: true,
  keyPrefix: 'rl',
};

/**
 * In-memory store for rate limit records
 * Maps client identifier to array of request timestamps
 */
const store = new Map<string, RequestRecord[]>();

/**
 * Cleanup interval reference for automatic garbage collection
 */
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Generate a client identifier from IP address and optional user ID
 *
 * @param ip - Client IP address
 * @param userId - Optional authenticated user ID
 * @param prefix - Key prefix for namespacing
 * @returns Unique client identifier
 */
export function generateClientKey(
  ip: string,
  userId?: string,
  prefix: string = 'rl'
): string {
  const base = userId !== undefined ? `${ip}:${userId}` : ip;
  return `${prefix}:${base}`;
}

/**
 * Extract client IP from request headers
 * Checks common proxy headers in order of priority
 *
 * @param headers - Request headers
 * @returns Client IP address
 */
export function extractClientIp(headers: Headers): string {
  // Check forwarded headers (proxy/load balancer)
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor !== null) {
    const firstIp = xForwardedFor.split(',')[0];
    if (firstIp !== undefined) {
      return firstIp.trim();
    }
  }

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp !== null) {
    return xRealIp.trim();
  }

  // Fallback to a default value
  return '127.0.0.1';
}

/**
 * Remove expired records from the store for a given key
 *
 * @param key - Client identifier
 * @param windowMs - Window size in milliseconds
 * @param now - Current timestamp
 */
function pruneExpiredRecords(key: string, windowMs: number, now: number): void {
  const records = store.get(key);
  if (records === undefined) {
    return;
  }

  const windowStart = now - windowMs;
  const validRecords = records.filter((r) => r.timestamp > windowStart);

  if (validRecords.length === 0) {
    store.delete(key);
  } else {
    store.set(key, validRecords);
  }
}

/**
 * Check rate limit for a client using sliding window algorithm
 *
 * @param clientKey - Unique client identifier
 * @param config - Rate limit configuration (uses defaults if not provided)
 * @returns Rate limit result indicating if the request is allowed
 */
export function checkRateLimit(
  clientKey: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG
): RateLimitResult {
  const now = Date.now();
  const { maxRequests, windowMs } = config;

  // Prune expired records
  pruneExpiredRecords(clientKey, windowMs, now);

  // Get current records
  const records = store.get(clientKey) ?? [];
  const windowStart = now - windowMs;

  // Count requests in current window
  const requestsInWindow = records.filter((r) => r.timestamp > windowStart);
  const count = requestsInWindow.length;

  // Calculate reset time
  const oldestInWindow = requestsInWindow[0];
  const resetAt = oldestInWindow !== undefined
    ? Math.ceil((oldestInWindow.timestamp + windowMs) / 1000)
    : Math.ceil((now + windowMs) / 1000);

  const retryAfterMs = oldestInWindow !== undefined
    ? Math.max(0, (oldestInWindow.timestamp + windowMs) - now)
    : 0;

  if (count >= maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetAt,
      retryAfterMs,
    };
  }

  // Record this request
  const updatedRecords = [...requestsInWindow, { timestamp: now }];
  store.set(clientKey, updatedRecords);

  return {
    allowed: true,
    limit: maxRequests,
    remaining: maxRequests - count - 1,
    resetAt,
    retryAfterMs: 0,
  };
}

/**
 * Generate rate limit HTTP headers from a result
 *
 * @param result - Rate limit check result
 * @returns Headers object to include in the HTTP response
 */
export function getRateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetAt),
  };

  if (!result.allowed) {
    return {
      ...headers,
      'Retry-After': String(Math.ceil(result.retryAfterMs / 1000)),
    };
  }

  return headers;
}

/**
 * Create a 429 Too Many Requests response
 *
 * @param result - Rate limit check result
 * @returns Response object with appropriate status and headers
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const headers = getRateLimitHeaders(result);
  const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000);

  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
      retryAfter: retryAfterSeconds,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
  );
}

/**
 * Start automatic cleanup of expired entries
 * Runs every intervalMs to remove stale data from memory
 *
 * @param intervalMs - Cleanup interval in milliseconds (default: 60000)
 */
export function startCleanup(intervalMs: number = 60000): void {
  if (cleanupInterval !== null) {
    return;
  }

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];

    store.forEach((records, key) => {
      // Use a generous window (5 minutes) for cleanup
      const validRecords = records.filter(
        (r) => now - r.timestamp < 5 * 60 * 1000
      );
      if (validRecords.length === 0) {
        keysToDelete.push(key);
      } else {
        store.set(key, validRecords);
      }
    });

    keysToDelete.forEach((key) => store.delete(key));
  }, intervalMs);
}

/**
 * Stop the automatic cleanup interval
 */
export function stopCleanup(): void {
  if (cleanupInterval !== null) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Reset the rate limit store (primarily for testing)
 */
export function resetStore(): void {
  store.clear();
}

/**
 * Get the current store size (primarily for testing/monitoring)
 *
 * @returns Number of unique clients tracked
 */
export function getStoreSize(): number {
  return store.size;
}

/**
 * Rate limit middleware helper for Next.js API routes
 * Combines IP extraction, key generation, and rate limit checking
 *
 * @param request - Incoming request
 * @param config - Rate limit configuration
 * @param userId - Optional authenticated user ID
 * @returns Rate limit result
 */
export function rateLimitRequest(
  request: Request,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG,
  userId?: string
): RateLimitResult {
  const headers = new Headers(request.headers);
  const ip = extractClientIp(headers);
  const clientKey = generateClientKey(ip, userId, config.keyPrefix);
  return checkRateLimit(clientKey, config);
}
