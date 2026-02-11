'use client';

/**
 * Analytics data fetching hook
 * @module hooks/use-analytics
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MeetingAnalytics, AnalyticsPeriod } from '@/types/analytics';

// ============================================================================
// Types
// ============================================================================

/**
 * API response structure for analytics
 */
interface AnalyticsApiResponse {
  readonly success: boolean;
  readonly data: MeetingAnalytics;
}

/**
 * API error response structure
 */
interface AnalyticsApiErrorResponse {
  readonly success: false;
  readonly error: {
    readonly message: string;
  };
}

/**
 * Analytics hook return value
 */
export interface UseAnalyticsResult {
  /** Fetched analytics data */
  readonly analytics: MeetingAnalytics | null;
  /** Loading state */
  readonly isLoading: boolean;
  /** Error state */
  readonly error: Error | null;
  /** Currently selected period */
  readonly period: AnalyticsPeriod;
  /** Update the selected period */
  readonly setPeriod: (period: AnalyticsPeriod) => void;
  /** Manual refetch */
  readonly refetch: () => Promise<void>;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for error response
 */
function isApiErrorResponse(
  data: unknown
): data is AnalyticsApiErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    (data as AnalyticsApiErrorResponse).success === false &&
    'error' in data &&
    typeof (data as AnalyticsApiErrorResponse).error === 'object' &&
    (data as AnalyticsApiErrorResponse).error !== null &&
    'message' in (data as AnalyticsApiErrorResponse).error
  );
}

/**
 * Extract error message from API response
 */
function extractErrorMessage(errorData: unknown, statusCode: number): string {
  if (isApiErrorResponse(errorData)) {
    return errorData.error.message;
  }
  return `Request failed with status ${statusCode}`;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for fetching and managing analytics data
 *
 * @param initialPeriod - Initial analytics period (default: 'month')
 * @param hourlyRate - Hourly rate for cost calculations (default: 5000)
 * @param currency - Currency code (default: 'JPY')
 * @returns Analytics data, loading state, error state, and control functions
 *
 * @example
 * ```tsx
 * const { analytics, isLoading, error, period, setPeriod } = useAnalytics('month');
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error message={error.message} />;
 * if (analytics === null) return null;
 *
 * return <AnalyticsOverview analytics={analytics} />;
 * ```
 */
export function useAnalytics(
  initialPeriod: AnalyticsPeriod = 'month',
  hourlyRate: number = 5000,
  currency: string = 'JPY'
): UseAnalyticsResult {
  // State
  const [analytics, setAnalytics] = useState<MeetingAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>(initialPeriod);

  // Abort controller ref for canceling requests
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch analytics from API
   */
  const fetchAnalytics = useCallback(async (): Promise<void> => {
    // Cancel previous request
    if (abortControllerRef.current !== null) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      searchParams.set('period', period);
      searchParams.set('hourlyRate', String(hourlyRate));
      searchParams.set('currency', currency);

      const response = await fetch(
        `/api/analytics?${searchParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorData: unknown = await response.json().catch(() => ({}));
        const errorMessage = extractErrorMessage(errorData, response.status);
        throw new Error(errorMessage);
      }

      const data = (await response.json()) as AnalyticsApiResponse;
      setAnalytics(data.data);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      setError(
        err instanceof Error ? err : new Error('Unknown error occurred')
      );
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  }, [period, hourlyRate, currency]);

  // Fetch on mount and when parameters change
  useEffect(() => {
    void fetchAnalytics();

    return (): void => {
      if (abortControllerRef.current !== null) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAnalytics]);

  /**
   * Manual refetch
   */
  const refetch = useCallback(async (): Promise<void> => {
    await fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    period,
    setPeriod,
    refetch,
  };
}
