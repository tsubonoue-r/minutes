/**
 * Tests for retry utilities
 * @module lib/__tests__/retry.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateDelay,
  sleep,
  retry,
  retryOrThrow,
  withRetry,
  retryLinear,
  retryFixed,
  defaultShouldRetry,
  createRetryPredicate,
  RetryExhaustedError,
  isRetryExhaustedError,
} from '../retry';
import { createRetryConfig } from '@/types/webhook';

describe('calculateDelay', () => {
  const baseConfig = createRetryConfig({
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: false,
  });

  it('should return initial delay for first attempt', () => {
    const delay = calculateDelay(0, baseConfig);
    expect(delay).toBe(1000);
  });

  it('should apply exponential backoff', () => {
    expect(calculateDelay(0, baseConfig)).toBe(1000);
    expect(calculateDelay(1, baseConfig)).toBe(2000);
    expect(calculateDelay(2, baseConfig)).toBe(4000);
    expect(calculateDelay(3, baseConfig)).toBe(8000);
  });

  it('should cap at maxDelayMs', () => {
    const delay = calculateDelay(10, baseConfig);
    expect(delay).toBe(30000);
  });

  it('should add jitter when enabled', () => {
    const configWithJitter = createRetryConfig({
      ...baseConfig,
      jitter: true,
    });

    // Run multiple times to verify randomness
    const delays = Array.from({ length: 10 }, () =>
      calculateDelay(0, configWithJitter)
    );

    // Base delay is 1000, jitter adds up to 10% (100ms)
    delays.forEach((delay) => {
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(1100);
    });

    // Check that we get some variation (not all same)
    const uniqueDelays = new Set(delays);
    expect(uniqueDelays.size).toBeGreaterThan(1);
  });

  it('should work with custom backoff multiplier', () => {
    const config = createRetryConfig({
      initialDelayMs: 1000,
      maxDelayMs: 100000,
      backoffMultiplier: 3,
      jitter: false,
    });

    expect(calculateDelay(0, config)).toBe(1000);
    expect(calculateDelay(1, config)).toBe(3000);
    expect(calculateDelay(2, config)).toBe(9000);
  });
});

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve after specified time', async () => {
    const promise = sleep(1000);
    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
  });
});

describe('defaultShouldRetry', () => {
  it('should retry on network errors', () => {
    expect(defaultShouldRetry(new Error('network error'))).toBe(true);
    expect(defaultShouldRetry(new Error('ECONNREFUSED'))).toBe(true);
    expect(defaultShouldRetry(new Error('ECONNRESET'))).toBe(true);
    expect(defaultShouldRetry(new Error('socket hang up'))).toBe(true);
    expect(defaultShouldRetry(new Error('fetch failed'))).toBe(true);
    expect(defaultShouldRetry(new Error('timeout'))).toBe(true);
  });

  it('should retry on 5xx errors', () => {
    expect(defaultShouldRetry(new Error('HTTP 500: Internal Server Error'))).toBe(true);
    expect(defaultShouldRetry(new Error('HTTP 502: Bad Gateway'))).toBe(true);
    expect(defaultShouldRetry(new Error('HTTP 503: Service Unavailable'))).toBe(true);
  });

  it('should retry on status object with 5xx', () => {
    expect(defaultShouldRetry({ status: 500 })).toBe(true);
    expect(defaultShouldRetry({ status: 502 })).toBe(true);
    expect(defaultShouldRetry({ status: 429 })).toBe(true); // Rate limit
  });

  it('should not retry on 4xx errors', () => {
    expect(defaultShouldRetry(new Error('HTTP 400: Bad Request'))).toBe(false);
    expect(defaultShouldRetry(new Error('HTTP 401: Unauthorized'))).toBe(false);
    expect(defaultShouldRetry(new Error('HTTP 404: Not Found'))).toBe(false);
    expect(defaultShouldRetry({ status: 400 })).toBe(false);
    expect(defaultShouldRetry({ status: 404 })).toBe(false);
  });

  it('should not retry on general errors', () => {
    expect(defaultShouldRetry(new Error('Invalid input'))).toBe(false);
    expect(defaultShouldRetry(new Error('Validation failed'))).toBe(false);
  });
});

describe('retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return success on first try', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const resultPromise = retry({ fn, config: { maxRetries: 3 } });
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const resultPromise = retry({
      fn,
      config: { maxRetries: 3, initialDelayMs: 100, jitter: false },
    });

    // First attempt fails
    await vi.advanceTimersByTimeAsync(0);
    // Wait for delay and second attempt
    await vi.advanceTimersByTimeAsync(100);
    // Wait for delay and third attempt
    await vi.advanceTimersByTimeAsync(200);

    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should fail after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network error'));

    const resultPromise = retry({
      fn,
      config: { maxRetries: 2, initialDelayMs: 100, jitter: false },
    });

    // Run through all retries
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toBe('network error');
    expect(result.attempts).toBe(3); // Initial + 2 retries
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should respect custom shouldRetry predicate', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('do not retry'));

    const shouldRetry = vi.fn().mockReturnValue(false);

    const resultPromise = retry({
      fn,
      config: { maxRetries: 3 },
      shouldRetry,
    });

    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
    expect(shouldRetry).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry callback', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const onRetry = vi.fn();

    const resultPromise = retry({
      fn,
      config: { maxRetries: 3, initialDelayMs: 100, jitter: false },
      onRetry,
    });

    await vi.runAllTimersAsync();
    await resultPromise;

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), 100);
  });

  it('should track total time', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    vi.useRealTimers(); // Use real timers for this test

    const result = await retry({
      fn,
      config: { maxRetries: 3 },
    });

    expect(result.totalTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.totalTimeMs).toBeLessThan(100); // Should be very fast
  });
});

describe('retryOrThrow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return data on success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const resultPromise = retryOrThrow({ fn, config: { maxRetries: 1 } });
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe('success');
  });

  it('should throw RetryExhaustedError on failure', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network error'));

    // Store error to avoid unhandled rejection
    let caughtError: RetryExhaustedError | null = null;

    const resultPromise = retryOrThrow({
      fn,
      config: { maxRetries: 1, initialDelayMs: 100, jitter: false },
      operationName: 'testOperation',
    }).catch((error: RetryExhaustedError) => {
      caughtError = error;
    });

    await vi.runAllTimersAsync();
    await resultPromise;

    expect(caughtError).not.toBeNull();
    expect(caughtError).toBeInstanceOf(RetryExhaustedError);
    expect(caughtError?.attempts).toBe(2);
    expect(caughtError?.operationName).toBe('testOperation');
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create a retry wrapper', async () => {
    const originalFn = vi.fn().mockResolvedValue('success');
    const wrappedFn = withRetry(originalFn, { maxRetries: 1 });

    const resultPromise = wrappedFn();
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(originalFn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to wrapped function', async () => {
    const originalFn = vi.fn().mockResolvedValue('success');
    const wrappedFn = withRetry(originalFn, { maxRetries: 1 });

    const resultPromise = wrappedFn('arg1', 'arg2');
    await vi.runAllTimersAsync();
    await resultPromise;

    expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('retryLinear', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should use linear backoff', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const onRetry = vi.fn();

    const resultPromise = retryLinear({
      fn,
      config: { maxRetries: 3, initialDelayMs: 100, jitter: false },
      onRetry,
    });

    await vi.runAllTimersAsync();
    await resultPromise;

    // All delays should be the same (linear)
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), 100);
    expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error), 100);
  });
});

describe('retryFixed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should use fixed delay', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const onRetry = vi.fn();

    const resultPromise = retryFixed(
      {
        fn,
        config: { maxRetries: 3 },
        onRetry,
      },
      500
    );

    await vi.runAllTimersAsync();
    await resultPromise;

    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), 500);
  });
});

describe('createRetryPredicate', () => {
  it('should match error names', () => {
    const shouldRetry = createRetryPredicate(['NetworkError', 'TimeoutError']);

    const networkError = new Error('Connection failed');
    networkError.name = 'NetworkError';
    expect(shouldRetry(networkError, 0)).toBe(true);

    const timeoutError = new Error('Request timed out');
    timeoutError.name = 'TimeoutError';
    expect(shouldRetry(timeoutError, 0)).toBe(true);

    const otherError = new Error('Unknown error');
    expect(shouldRetry(otherError, 0)).toBe(false);
  });

  it('should match error message patterns', () => {
    const shouldRetry = createRetryPredicate(['rate limit', 'too many requests']);

    expect(shouldRetry(new Error('rate limit exceeded'), 0)).toBe(true);
    expect(shouldRetry(new Error('Error: too many requests'), 0)).toBe(true);
    expect(shouldRetry(new Error('invalid input'), 0)).toBe(false);
  });

  it('should match regex patterns', () => {
    const shouldRetry = createRetryPredicate([/rate.?limit/i, /5\d{2}/]);

    expect(shouldRetry(new Error('Rate Limit exceeded'), 0)).toBe(true);
    expect(shouldRetry(new Error('rate_limit'), 0)).toBe(true);
    expect(shouldRetry(new Error('HTTP 500'), 0)).toBe(true);
    expect(shouldRetry(new Error('HTTP 503'), 0)).toBe(true);
    expect(shouldRetry(new Error('HTTP 400'), 0)).toBe(false);
  });

  it('should return false for non-Error values', () => {
    const shouldRetry = createRetryPredicate(['test']);
    expect(shouldRetry('test', 0)).toBe(false);
    expect(shouldRetry({ message: 'test' }, 0)).toBe(false);
    expect(shouldRetry(null, 0)).toBe(false);
  });
});

describe('RetryExhaustedError', () => {
  it('should create error with all properties', () => {
    const lastError = new Error('last error');
    const error = new RetryExhaustedError(
      'Operation failed',
      3,
      lastError,
      'myOperation'
    );

    expect(error.name).toBe('RetryExhaustedError');
    expect(error.message).toBe('Operation failed');
    expect(error.attempts).toBe(3);
    expect(error.lastError).toBe(lastError);
    expect(error.operationName).toBe('myOperation');
  });

  it('should create error using static factory', () => {
    const lastError = new Error('network failure');
    const error = RetryExhaustedError.create(3, lastError, 'fetchData');

    expect(error.message).toContain('fetchData');
    expect(error.message).toContain('3 attempts');
    expect(error.message).toContain('network failure');
    expect(error.attempts).toBe(3);
    expect(error.operationName).toBe('fetchData');
  });

  it('should use default operation name in factory', () => {
    const lastError = new Error('error');
    const error = RetryExhaustedError.create(2, lastError);

    expect(error.message).toContain('operation');
    expect(error.operationName).toBeUndefined();
  });
});

describe('isRetryExhaustedError', () => {
  it('should return true for RetryExhaustedError', () => {
    const error = new RetryExhaustedError('test', 1, new Error('cause'));
    expect(isRetryExhaustedError(error)).toBe(true);
  });

  it('should return false for other errors', () => {
    expect(isRetryExhaustedError(new Error('test'))).toBe(false);
    expect(isRetryExhaustedError(new TypeError('test'))).toBe(false);
    expect(isRetryExhaustedError('string')).toBe(false);
    expect(isRetryExhaustedError(null)).toBe(false);
    expect(isRetryExhaustedError(undefined)).toBe(false);
  });
});
