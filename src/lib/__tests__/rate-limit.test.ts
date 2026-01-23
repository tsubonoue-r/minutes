/**
 * Tests for rate limiting utilities
 * @module lib/__tests__/rate-limit.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkRateLimit,
  generateClientKey,
  extractClientIp,
  getRateLimitHeaders,
  createRateLimitResponse,
  rateLimitRequest,
  resetStore,
  getStoreSize,
  startCleanup,
  stopCleanup,
  DEFAULT_RATE_LIMIT_CONFIG,
} from '../rate-limit';
import type { RateLimitConfig } from '../rate-limit';

describe('generateClientKey', () => {
  it('should generate key with IP only', () => {
    const key = generateClientKey('192.168.1.1');
    expect(key).toBe('rl:192.168.1.1');
  });

  it('should generate key with IP and user ID', () => {
    const key = generateClientKey('192.168.1.1', 'user123');
    expect(key).toBe('rl:192.168.1.1:user123');
  });

  it('should use custom prefix', () => {
    const key = generateClientKey('10.0.0.1', undefined, 'api');
    expect(key).toBe('api:10.0.0.1');
  });

  it('should handle IPv6 addresses', () => {
    const key = generateClientKey('::1', 'user1');
    expect(key).toBe('rl:::1:user1');
  });
});

describe('extractClientIp', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const headers = new Headers();
    headers.set('x-forwarded-for', '203.0.113.50, 70.41.3.18, 150.172.238.178');
    expect(extractClientIp(headers)).toBe('203.0.113.50');
  });

  it('should extract IP from x-real-ip header', () => {
    const headers = new Headers();
    headers.set('x-real-ip', '203.0.113.50');
    expect(extractClientIp(headers)).toBe('203.0.113.50');
  });

  it('should prefer x-forwarded-for over x-real-ip', () => {
    const headers = new Headers();
    headers.set('x-forwarded-for', '10.0.0.1');
    headers.set('x-real-ip', '10.0.0.2');
    expect(extractClientIp(headers)).toBe('10.0.0.1');
  });

  it('should return fallback IP when no headers present', () => {
    const headers = new Headers();
    expect(extractClientIp(headers)).toBe('127.0.0.1');
  });

  it('should trim whitespace from IP', () => {
    const headers = new Headers();
    headers.set('x-forwarded-for', '  10.0.0.1  , 10.0.0.2');
    expect(extractClientIp(headers)).toBe('10.0.0.1');
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow first request', () => {
    const result = checkRateLimit('client1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59); // 60 - 1
    expect(result.limit).toBe(60);
  });

  it('should decrement remaining count', () => {
    const config: RateLimitConfig = {
      maxRequests: 5,
      windowMs: 60000,
      includeHeaders: true,
      keyPrefix: 'test',
    };

    checkRateLimit('client2', config);
    checkRateLimit('client2', config);
    const result = checkRateLimit('client2', config);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2); // 5 - 3
  });

  it('should block when limit is exceeded', () => {
    const config: RateLimitConfig = {
      maxRequests: 3,
      windowMs: 60000,
      includeHeaders: true,
      keyPrefix: 'test',
    };

    checkRateLimit('client3', config);
    checkRateLimit('client3', config);
    checkRateLimit('client3', config);
    const result = checkRateLimit('client3', config);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset after window expires', () => {
    const config: RateLimitConfig = {
      maxRequests: 2,
      windowMs: 1000,
      includeHeaders: true,
      keyPrefix: 'test',
    };

    checkRateLimit('client4', config);
    checkRateLimit('client4', config);

    // Advance past window
    vi.advanceTimersByTime(1001);

    const result = checkRateLimit('client4', config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('should use sliding window (partial expiration)', () => {
    const config: RateLimitConfig = {
      maxRequests: 3,
      windowMs: 1000,
      includeHeaders: true,
      keyPrefix: 'test',
    };

    // T=0: First request
    checkRateLimit('client5', config);

    // T=400: Second request
    vi.advanceTimersByTime(400);
    checkRateLimit('client5', config);

    // T=800: Third request
    vi.advanceTimersByTime(400);
    checkRateLimit('client5', config);

    // T=1001: First request expired, window slides
    vi.advanceTimersByTime(201);
    const result = checkRateLimit('client5', config);

    // First request should have expired, so we should have room
    expect(result.allowed).toBe(true);
  });

  it('should track separate clients independently', () => {
    const config: RateLimitConfig = {
      maxRequests: 2,
      windowMs: 60000,
      includeHeaders: true,
      keyPrefix: 'test',
    };

    checkRateLimit('clientA', config);
    checkRateLimit('clientA', config);
    checkRateLimit('clientB', config);

    const resultA = checkRateLimit('clientA', config);
    const resultB = checkRateLimit('clientB', config);

    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });

  it('should provide correct resetAt timestamp', () => {
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));

    const config: RateLimitConfig = {
      maxRequests: 5,
      windowMs: 60000,
      includeHeaders: true,
      keyPrefix: 'test',
    };

    const result = checkRateLimit('client6', config);

    // resetAt should be approximately now + windowMs (in seconds)
    const expectedResetAt = Math.ceil((Date.now() + 60000) / 1000);
    expect(result.resetAt).toBe(expectedResetAt);
  });

  it('should provide retryAfterMs when rate limited', () => {
    const config: RateLimitConfig = {
      maxRequests: 1,
      windowMs: 5000,
      includeHeaders: true,
      keyPrefix: 'test',
    };

    checkRateLimit('client7', config);

    // Advance 2 seconds
    vi.advanceTimersByTime(2000);

    const result = checkRateLimit('client7', config);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(5000);
  });

  it('should use default config when none provided', () => {
    const result = checkRateLimit('client8');
    expect(result.limit).toBe(DEFAULT_RATE_LIMIT_CONFIG.maxRequests);
  });
});

describe('getRateLimitHeaders', () => {
  it('should generate headers for allowed request', () => {
    const headers = getRateLimitHeaders({
      allowed: true,
      limit: 60,
      remaining: 55,
      resetAt: 1704067260,
      retryAfterMs: 0,
    });

    expect(headers['X-RateLimit-Limit']).toBe('60');
    expect(headers['X-RateLimit-Remaining']).toBe('55');
    expect(headers['X-RateLimit-Reset']).toBe('1704067260');
    expect(headers['Retry-After']).toBeUndefined();
  });

  it('should include Retry-After for blocked request', () => {
    const headers = getRateLimitHeaders({
      allowed: false,
      limit: 60,
      remaining: 0,
      resetAt: 1704067260,
      retryAfterMs: 30000,
    });

    expect(headers['X-RateLimit-Remaining']).toBe('0');
    expect(headers['Retry-After']).toBe('30');
  });
});

describe('createRateLimitResponse', () => {
  it('should create 429 response', async () => {
    const result = {
      allowed: false,
      limit: 60,
      remaining: 0,
      resetAt: 1704067260,
      retryAfterMs: 15000,
    };

    const response = createRateLimitResponse(result);

    expect(response.status).toBe(429);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('Retry-After')).toBe('15');

    const body = await response.json() as { error: string; message: string; retryAfter: number };
    expect(body.error).toBe('Too Many Requests');
    expect(body.retryAfter).toBe(15);
  });
});

describe('rateLimitRequest', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should extract IP and check rate limit', () => {
    const request = new Request('https://example.com/api/test', {
      headers: {
        'x-forwarded-for': '10.0.0.1',
      },
    });

    const result = rateLimitRequest(request);
    expect(result.allowed).toBe(true);
  });

  it('should use userId when provided', () => {
    const request = new Request('https://example.com/api/test', {
      headers: {
        'x-forwarded-for': '10.0.0.1',
      },
    });

    const config: RateLimitConfig = {
      maxRequests: 2,
      windowMs: 60000,
      includeHeaders: true,
      keyPrefix: 'api',
    };

    rateLimitRequest(request, config, 'user1');
    rateLimitRequest(request, config, 'user1');
    const blocked = rateLimitRequest(request, config, 'user1');
    const allowed = rateLimitRequest(request, config, 'user2');

    expect(blocked.allowed).toBe(false);
    expect(allowed.allowed).toBe(true);
  });
});

describe('store management', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should report store size', () => {
    expect(getStoreSize()).toBe(0);

    checkRateLimit('a');
    checkRateLimit('b');
    checkRateLimit('c');

    expect(getStoreSize()).toBe(3);
  });

  it('should reset store', () => {
    checkRateLimit('a');
    checkRateLimit('b');
    expect(getStoreSize()).toBe(2);

    resetStore();
    expect(getStoreSize()).toBe(0);
  });
});

describe('cleanup', () => {
  beforeEach(() => {
    resetStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopCleanup();
    vi.useRealTimers();
  });

  it('should remove expired entries on cleanup', () => {
    checkRateLimit('client1');
    checkRateLimit('client2');
    expect(getStoreSize()).toBe(2);

    startCleanup(1000);

    // Advance past cleanup interval + entry expiration (5 min)
    vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

    expect(getStoreSize()).toBe(0);
  });

  it('should not start multiple cleanup intervals', () => {
    startCleanup(1000);
    startCleanup(1000); // Should be a no-op
    stopCleanup();
  });
});
