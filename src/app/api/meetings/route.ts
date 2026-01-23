/**
 * Meetings API endpoint - List meetings with pagination and filters
 * @module app/api/meetings/route
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import { createMeetingService, MeetingServiceError } from '@/services/meeting.service';
import type { MeetingStatus } from '@/types/meeting';
import {
  getCache,
  cacheKeyWithParams,
  CACHE_TTL,
  CACHE_KEYS,
} from '@/lib/cache';

/**
 * Query parameters validation schema
 */
const meetingsQuerySchema = z.object({
  /** Page number (1-based) */
  page: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return 1;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }),
  /** Items per page */
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return 20;
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || parsed < 1) return 20;
      return Math.min(parsed, 100); // Max 100
    }),
  /** Search keyword */
  search: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  /** Filter by start date (ISO string) */
  startDate: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined;
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : date;
    }),
  /** Filter by end date (ISO string) */
  endDate: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined;
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : date;
    }),
  /** Filter by status */
  status: z
    .enum(['scheduled', 'in_progress', 'ended', 'cancelled'])
    .optional(),
  /** Sort field */
  sortBy: z
    .enum(['startTime', 'title'])
    .optional()
    .default('startTime'),
  /** Sort direction */
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),
});

type MeetingsQueryParams = z.infer<typeof meetingsQuerySchema>;

/**
 * Error response type
 */
interface ErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

/**
 * Success response type for meetings list
 */
interface MeetingsResponse {
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
 * Parse query parameters from URL
 */
function parseQueryParams(url: URL): MeetingsQueryParams {
  const rawParams: Record<string, string | undefined> = {};

  // Extract all relevant query parameters
  const paramNames = [
    'page',
    'limit',
    'search',
    'startDate',
    'endDate',
    'status',
    'sortBy',
    'sortOrder',
  ] as const;

  for (const name of paramNames) {
    const value = url.searchParams.get(name);
    if (value !== null) {
      rawParams[name] = value;
    }
  }

  return meetingsQuerySchema.parse(rawParams);
}

/**
 * Create error response
 */
function createErrorResponse(
  code: string,
  message: string,
  statusCode: number,
  details?: unknown
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * GET /api/meetings
 *
 * List meetings with pagination and filtering support.
 *
 * Query Parameters:
 * - page: number (default: 1) - Page number
 * - limit: number (default: 20, max: 100) - Items per page
 * - search: string (optional) - Search keyword for title, meeting number, or host
 * - startDate: ISO string (optional) - Filter meetings starting from this date
 * - endDate: ISO string (optional) - Filter meetings until this date
 * - status: MeetingStatus (optional) - Filter by status
 * - sortBy: 'startTime' | 'title' (default: 'startTime') - Sort field
 * - sortOrder: 'asc' | 'desc' (default: 'desc') - Sort direction
 *
 * Response:
 * - 200: PaginatedMeetings
 * - 400: Bad Request (invalid parameters)
 * - 401: Unauthorized
 * - 500: Internal Server Error
 */
export async function GET(request: Request): Promise<Response> {
  try {
    // Authentication check
    const session = await getSession();

    if (session === null || !session.isAuthenticated) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'Authentication required',
        401
      );
    }

    if (session.accessToken === undefined) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'Access token not found',
        401
      );
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    let params: MeetingsQueryParams;

    try {
      params = parseQueryParams(url);
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? error.issues.map((e) => e.message).join(', ')
          : 'Invalid query parameters';

      return createErrorResponse('INVALID_PARAMS', message, 400, {
        validationError: error instanceof z.ZodError ? error.issues : undefined,
      });
    }

    // Check cache first
    const cache = getCache();
    const cacheKeyValue = cacheKeyWithParams(CACHE_KEYS.MEETINGS_LIST, {
      page: String(params.page),
      limit: String(params.limit),
      search: params.search,
      startDate: params.startDate?.toISOString(),
      endDate: params.endDate?.toISOString(),
      status: params.status,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    });

    const cached = cache.get<MeetingsResponse>(cacheKeyValue);
    if (cached.hit && cached.value !== undefined) {
      return NextResponse.json(cached.value);
    }

    // Create service and fetch meetings
    const client = createLarkClient();
    const meetingService = createMeetingService(client, session.accessToken);

    const result = await meetingService.getMeetings({
      page: params.page,
      limit: params.limit,
      filters: {
        search: params.search,
        startDate: params.startDate,
        endDate: params.endDate,
        status: params.status,
      },
      sort: {
        field: params.sortBy,
        direction: params.sortOrder,
      },
    });

    // Transform response to API format (serialize dates)
    const response: MeetingsResponse = {
      data: result.meetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        meetingNo: meeting.meetingNo,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
        durationMinutes: meeting.durationMinutes,
        status: meeting.status,
        type: meeting.type,
        host: {
          id: meeting.host.id,
          name: meeting.host.name,
          ...(meeting.host.avatarUrl !== undefined && {
            avatarUrl: meeting.host.avatarUrl,
          }),
        },
        participantCount: meeting.participantCount,
        hasRecording: meeting.hasRecording,
        ...(meeting.recordingUrl !== undefined && {
          recordingUrl: meeting.recordingUrl,
        }),
        minutesStatus: meeting.minutesStatus,
        createdAt: meeting.createdAt.toISOString(),
        updatedAt: meeting.updatedAt.toISOString(),
      })),
      pagination: {
        page: result.pagination.page,
        limit: result.pagination.pageSize,
        total: result.pagination.total,
        totalPages: Math.ceil(result.pagination.total / result.pagination.pageSize),
        hasMore: result.pagination.hasMore,
      },
    };

    // Store in cache with 5-minute TTL
    cache.set(cacheKeyValue, response, { ttlMs: CACHE_TTL.MEDIUM });

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/meetings] Error:', error);

    if (error instanceof MeetingServiceError) {
      return createErrorResponse(
        error.code,
        error.message,
        error.statusCode,
        error.details
      );
    }

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
}
