/**
 * Retry utilities with exponential backoff
 * @module lib/retry
 */

import type { RetryConfig } from '@/types/webhook';
import { createRetryConfig } from '@/types/webhook';

// =============================================================================
// Types
// =============================================================================

/**
 * Function that can be retried
 */
export type RetryableFunction<T> = () => Promise<T>;

/**
 * Predicate to determine if an error should trigger a retry
 */
export type ShouldRetryPredicate = (error: unknown, attempt: number) => boolean;

/**
 * Options for retry operation
 */
export interface RetryOptions<T> {
  /** Function to execute */
  readonly fn: RetryableFunction<T>;
  /** Retry configuration */
  readonly config?: Partial<RetryConfig> | undefined;
  /** Custom predicate to determine if retry should happen */
  readonly shouldRetry?: ShouldRetryPredicate | undefined;
  /** Callback for each retry attempt */
  readonly onRetry?: ((attempt: number, error: unknown, delayMs: number) => void) | undefined;
  /** Operation name for logging */
  readonly operationName?: string | undefined;
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  /** Whether the operation succeeded */
  readonly success: boolean;
  /** Result data if successful */
  readonly data?: T | undefined;
  /** Final error if failed */
  readonly error?: Error | undefined;
  /** Number of attempts made */
  readonly attempts: number;
  /** Total time spent (including delays) */
  readonly totalTimeMs: number;
}

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown when all retry attempts are exhausted
 */
export class RetryExhaustedError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error,
    public readonly operationName?: string | undefined
  ) {
    super(message);
    this.name = 'RetryExhaustedError';
  }

  /**
   * Create error with details
   */
  static create(
    attempts: number,
    lastError: Error,
    operationName?: string
  ): RetryExhaustedError {
    const opName = operationName ?? 'operation';
    return new RetryExhaustedError(
      `${opName} failed after ${attempts} attempts: ${lastError.message}`,
      attempts,
      lastError,
      operationName
    );
  }
}

// =============================================================================
// Delay Calculation
// =============================================================================

/**
 * Calculate delay with exponential backoff
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 *
 * @example
 * ```typescript
 * const config = createRetryConfig();
 * const delay1 = calculateDelay(0, config); // ~1000ms
 * const delay2 = calculateDelay(1, config); // ~2000ms
 * const delay3 = calculateDelay(2, config); // ~4000ms
 * ```
 */
export function calculateDelay(attempt: number, config: RetryConfig): number {
  const { initialDelayMs, maxDelayMs, backoffMultiplier, jitter } = config;

  // Calculate base delay with exponential backoff
  const baseDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt);

  // Cap at maximum delay
  const cappedDelay = Math.min(baseDelay, maxDelayMs);

  // Add jitter if enabled (random value between 0 and delay)
  if (jitter) {
    const jitterAmount = Math.random() * cappedDelay * 0.1; // 10% jitter
    return Math.floor(cappedDelay + jitterAmount);
  }

  return Math.floor(cappedDelay);
}

/**
 * Sleep for specified duration
 *
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Retry Logic
// =============================================================================

/**
 * Default predicate for determining if an error should trigger a retry
 *
 * Retries on network errors and 5xx server errors.
 *
 * @param error - The error that occurred
 * @returns True if the operation should be retried
 */
export function defaultShouldRetry(error: unknown): boolean {
  // Always retry on generic errors (likely network issues)
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network-related errors
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('socket hang up') ||
      message.includes('fetch failed')
    ) {
      return true;
    }

    // Server errors (5xx) - check for HTTP status in message
    const statusMatch = /\b5\d{2}\b/.exec(message);
    if (statusMatch !== null) {
      return true;
    }
  }

  // Check for response object with status
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  ) {
    const status = (error as { status: number }).status;
    // Retry on 5xx errors and 429 (rate limit)
    return status >= 500 || status === 429;
  }

  return false;
}

/**
 * Execute a function with retry logic
 *
 * Implements exponential backoff with optional jitter.
 *
 * @param options - Retry options
 * @returns Retry result
 *
 * @example
 * ```typescript
 * const result = await retry({
 *   fn: async () => {
 *     const response = await fetch(url);
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *     return response.json();
 *   },
 *   config: { maxRetries: 3, initialDelayMs: 1000 },
 *   operationName: 'fetchData',
 *   onRetry: (attempt, error, delay) => {
 *     console.log(`Retry ${attempt} after ${delay}ms: ${error}`);
 *   },
 * });
 *
 * if (result.success) {
 *   console.log('Data:', result.data);
 * } else {
 *   console.error('Failed:', result.error);
 * }
 * ```
 */
export async function retry<T>(options: RetryOptions<T>): Promise<RetryResult<T>> {
  const {
    fn,
    config: configOverrides,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  const config = createRetryConfig(configOverrides);
  const startTime = Date.now();

  let lastError: Error | undefined;
  let attempt = 0;

  while (attempt <= config.maxRetries) {
    try {
      const data = await fn();

      return {
        success: true,
        data,
        attempts: attempt + 1,
        totalTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt < config.maxRetries && shouldRetry(error, attempt)) {
        const delay = calculateDelay(attempt, config);

        // Call onRetry callback if provided
        if (onRetry !== undefined) {
          onRetry(attempt + 1, error, delay);
        }

        await sleep(delay);
        attempt++;
      } else {
        // No more retries
        break;
      }
    }
  }

  return {
    success: false,
    error: lastError ?? new Error('Unknown error'),
    attempts: attempt + 1,
    totalTimeMs: Date.now() - startTime,
  };
}

/**
 * Execute a function with retry logic, throwing on failure
 *
 * @param options - Retry options
 * @returns Result data
 * @throws RetryExhaustedError if all retries fail
 *
 * @example
 * ```typescript
 * try {
 *   const data = await retryOrThrow({
 *     fn: async () => fetchData(),
 *     config: { maxRetries: 3 },
 *     operationName: 'fetchData',
 *   });
 *   console.log('Success:', data);
 * } catch (error) {
 *   if (error instanceof RetryExhaustedError) {
 *     console.error(`Failed after ${error.attempts} attempts`);
 *   }
 * }
 * ```
 */
export async function retryOrThrow<T>(options: RetryOptions<T>): Promise<T> {
  const result = await retry(options);

  if (!result.success) {
    throw RetryExhaustedError.create(
      result.attempts,
      result.error ?? new Error('Unknown error'),
      options.operationName
    );
  }

  return result.data as T;
}

// =============================================================================
// Specialized Retry Functions
// =============================================================================

/**
 * Create a retry wrapper for a specific function
 *
 * @param fn - Function to wrap
 * @param config - Retry configuration
 * @param operationName - Operation name for logging
 * @returns Wrapped function with retry logic
 *
 * @example
 * ```typescript
 * const fetchWithRetry = withRetry(
 *   fetchData,
 *   { maxRetries: 3 },
 *   'fetchData'
 * );
 *
 * const data = await fetchWithRetry(); // Automatically retries on failure
 * ```
 */
export function withRetry<TArgs extends readonly unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config?: Partial<RetryConfig>,
  operationName?: string
): (...args: TArgs) => Promise<RetryResult<TResult>> {
  return async (...args: TArgs): Promise<RetryResult<TResult>> => {
    return retry({
      fn: () => fn(...args),
      config,
      operationName,
    });
  };
}

/**
 * Retry with linear backoff instead of exponential
 *
 * @param options - Retry options (backoffMultiplier is ignored)
 * @returns Retry result
 */
export async function retryLinear<T>(
  options: RetryOptions<T>
): Promise<RetryResult<T>> {
  return retry({
    ...options,
    config: {
      ...options.config,
      backoffMultiplier: 1,
    },
  });
}

/**
 * Retry with fixed delay (no backoff)
 *
 * @param options - Retry options
 * @param delayMs - Fixed delay between retries
 * @returns Retry result
 */
export async function retryFixed<T>(
  options: RetryOptions<T>,
  delayMs: number
): Promise<RetryResult<T>> {
  return retry({
    ...options,
    config: {
      ...options.config,
      initialDelayMs: delayMs,
      backoffMultiplier: 1,
      jitter: false,
    },
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if an error is a RetryExhaustedError
 *
 * @param error - Error to check
 * @returns True if error is RetryExhaustedError
 */
export function isRetryExhaustedError(
  error: unknown
): error is RetryExhaustedError {
  return error instanceof RetryExhaustedError;
}

/**
 * Create a should-retry predicate that limits retries for specific error types
 *
 * @param retryableErrors - Array of error names or message patterns to retry
 * @returns Should-retry predicate
 *
 * @example
 * ```typescript
 * const shouldRetry = createRetryPredicate([
 *   'NetworkError',
 *   'TimeoutError',
 *   /rate limit/i,
 * ]);
 *
 * const result = await retry({
 *   fn: myFunction,
 *   shouldRetry,
 * });
 * ```
 */
export function createRetryPredicate(
  retryableErrors: ReadonlyArray<string | RegExp>
): ShouldRetryPredicate {
  return (error: unknown): boolean => {
    if (!(error instanceof Error)) {
      return false;
    }

    return retryableErrors.some((pattern) => {
      if (typeof pattern === 'string') {
        return error.name === pattern || error.message.includes(pattern);
      }
      return pattern.test(error.message) || pattern.test(error.name);
    });
  };
}
