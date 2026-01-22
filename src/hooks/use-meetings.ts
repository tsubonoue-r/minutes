'use client';

/**
 * Meetings data fetching hook
 * @module hooks/use-meetings
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  MeetingStatus,
  MeetingSortField,
  SortDirection,
} from '@/types/meeting';

/**
 * API response structure for meetings
 */
interface MeetingsApiResponse {
  readonly data: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly meetingNo: string;
    readonly startTime: string;
    readonly endTime: string;
    readonly durationMinutes: number;
    readonly status: MeetingStatus;
    readonly type: string;
    readonly host: {
      readonly id: string;
      readonly name: string;
      readonly avatarUrl?: string;
    };
    readonly participantCount: number;
    readonly hasRecording: boolean;
    readonly recordingUrl?: string;
    readonly minutesStatus: string;
    readonly createdAt: string;
    readonly updatedAt: string;
  }>;
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
    readonly hasMore: boolean;
  };
}

/**
 * Parsed meeting data for the frontend
 */
export interface MeetingData {
  readonly id: string;
  readonly title: string;
  readonly meetingNo: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly durationMinutes: number;
  readonly status: MeetingStatus;
  readonly type: string;
  readonly host: {
    readonly id: string;
    readonly name: string;
    readonly avatarUrl?: string | undefined;
  };
  readonly participantCount: number;
  readonly hasRecording: boolean;
  readonly recordingUrl?: string | undefined;
  readonly minutesStatus: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Filter parameters for meetings query
 */
export interface MeetingsFilterParams {
  readonly search?: string | undefined;
  readonly startDate?: Date | null | undefined;
  readonly endDate?: Date | null | undefined;
  readonly status?: MeetingStatus | null | undefined;
}

/**
 * Sort parameters for meetings query
 */
export interface MeetingsSortParams {
  readonly sortBy: MeetingSortField;
  readonly sortOrder: SortDirection;
}

/**
 * Pagination parameters
 */
export interface MeetingsPaginationParams {
  readonly page: number;
  readonly limit: number;
}

/**
 * Full query parameters
 */
export interface MeetingsQueryParams
  extends MeetingsFilterParams,
    MeetingsSortParams,
    MeetingsPaginationParams {}

/**
 * Meetings hook return value
 */
export interface UseMeetingsResult {
  /** Fetched meetings data */
  readonly meetings: readonly MeetingData[];
  /** Loading state */
  readonly isLoading: boolean;
  /** Error state */
  readonly error: Error | null;
  /** Total number of meetings */
  readonly total: number;
  /** Total number of pages */
  readonly totalPages: number;
  /** Current page */
  readonly currentPage: number;
  /** Whether there are more pages */
  readonly hasMore: boolean;
  /** Refetch meetings */
  readonly refetch: () => Promise<void>;
  /** Update filters */
  readonly setFilters: (filters: Partial<MeetingsFilterParams>) => void;
  /** Update sort */
  readonly setSort: (sort: Partial<MeetingsSortParams>) => void;
  /** Update page */
  readonly setPage: (page: number) => void;
  /** Current filter state */
  readonly filters: MeetingsFilterParams;
  /** Current sort state */
  readonly sort: MeetingsSortParams;
}

/**
 * Default query parameters
 */
const DEFAULT_QUERY_PARAMS: MeetingsQueryParams = {
  page: 1,
  limit: 20,
  sortBy: 'startTime',
  sortOrder: 'desc',
};

/**
 * Type guard for error response
 */
interface ApiErrorResponse {
  error: {
    message: string;
  };
}

function isApiErrorResponse(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as ApiErrorResponse).error === 'object' &&
    (data as ApiErrorResponse).error !== null &&
    'message' in (data as ApiErrorResponse).error &&
    typeof (data as ApiErrorResponse).error.message === 'string'
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

/**
 * Transform API response to frontend data
 */
function transformApiResponse(
  response: MeetingsApiResponse
): readonly MeetingData[] {
  return response.data.map((meeting) => ({
    id: meeting.id,
    title: meeting.title,
    meetingNo: meeting.meetingNo,
    startTime: new Date(meeting.startTime),
    endTime: new Date(meeting.endTime),
    durationMinutes: meeting.durationMinutes,
    status: meeting.status,
    type: meeting.type,
    host: meeting.host,
    participantCount: meeting.participantCount,
    hasRecording: meeting.hasRecording,
    recordingUrl: meeting.recordingUrl,
    minutesStatus: meeting.minutesStatus,
    createdAt: new Date(meeting.createdAt),
    updatedAt: new Date(meeting.updatedAt),
  }));
}

/**
 * Build URL search params from query parameters
 */
function buildSearchParams(params: MeetingsQueryParams): URLSearchParams {
  const searchParams = new URLSearchParams();

  searchParams.set('page', String(params.page));
  searchParams.set('limit', String(params.limit));
  searchParams.set('sortBy', params.sortBy);
  searchParams.set('sortOrder', params.sortOrder);

  if (params.search !== undefined && params.search !== '') {
    searchParams.set('search', params.search);
  }

  if (params.startDate !== undefined && params.startDate !== null) {
    searchParams.set('startDate', params.startDate.toISOString());
  }

  if (params.endDate !== undefined && params.endDate !== null) {
    searchParams.set('endDate', params.endDate.toISOString());
  }

  if (params.status !== undefined && params.status !== null) {
    searchParams.set('status', params.status);
  }

  return searchParams;
}

/**
 * Hook for fetching and managing meetings data
 *
 * @example
 * ```tsx
 * const {
 *   meetings,
 *   isLoading,
 *   error,
 *   setFilters,
 *   setSort,
 *   setPage,
 *   totalPages,
 *   currentPage,
 * } = useMeetings();
 * ```
 */
export function useMeetings(
  initialParams?: Partial<MeetingsQueryParams>
): UseMeetingsResult {
  // State
  const [meetings, setMeetings] = useState<readonly MeetingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Query params state
  const [queryParams, setQueryParams] = useState<MeetingsQueryParams>(() => ({
    ...DEFAULT_QUERY_PARAMS,
    ...initialParams,
  }));

  // Abort controller ref for canceling requests
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch meetings from API
   */
  const fetchMeetings = useCallback(async (): Promise<void> => {
    // Cancel previous request
    if (abortControllerRef.current !== null) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const searchParams = buildSearchParams(queryParams);
      const response = await fetch(`/api/meetings?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData: unknown = await response.json().catch(() => ({}));
        const errorMessage = extractErrorMessage(errorData, response.status);
        throw new Error(errorMessage);
      }

      const data = (await response.json()) as MeetingsApiResponse;
      const transformedMeetings = transformApiResponse(data);

      setMeetings(transformedMeetings);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
      setHasMore(data.pagination.hasMore);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      setMeetings([]);
      setTotal(0);
      setTotalPages(0);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [queryParams]);

  // Fetch on mount and when query params change
  useEffect(() => {
    void fetchMeetings();

    return (): void => {
      if (abortControllerRef.current !== null) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchMeetings]);

  /**
   * Update filter parameters
   */
  const setFilters = useCallback(
    (filters: Partial<MeetingsFilterParams>): void => {
      setQueryParams((prev) => ({
        ...prev,
        ...filters,
        page: 1, // Reset to first page on filter change
      }));
    },
    []
  );

  /**
   * Update sort parameters
   */
  const setSort = useCallback((sort: Partial<MeetingsSortParams>): void => {
    setQueryParams((prev) => ({
      ...prev,
      ...sort,
      page: 1, // Reset to first page on sort change
    }));
  }, []);

  /**
   * Update page
   */
  const setPage = useCallback((page: number): void => {
    setQueryParams((prev) => ({
      ...prev,
      page,
    }));
  }, []);

  /**
   * Manual refetch
   */
  const refetch = useCallback(async (): Promise<void> => {
    await fetchMeetings();
  }, [fetchMeetings]);

  return {
    meetings,
    isLoading,
    error,
    total,
    totalPages,
    currentPage: queryParams.page,
    hasMore,
    refetch,
    setFilters,
    setSort,
    setPage,
    filters: {
      search: queryParams.search,
      startDate: queryParams.startDate,
      endDate: queryParams.endDate,
      status: queryParams.status,
    },
    sort: {
      sortBy: queryParams.sortBy,
      sortOrder: queryParams.sortOrder,
    },
  };
}

/**
 * Debounce hook for search input
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return (): void => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
