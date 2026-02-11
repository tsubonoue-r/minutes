/**
 * Analytics API endpoint - Meeting efficiency and cost analytics
 * @module app/api/analytics/route
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import { createAnalyticsService } from '@/services/analytics.service';
import { AnalyticsQuerySchema } from '@/types/analytics';
import type { MeetingAnalytics } from '@/types/analytics';
import {
  getCache,
  cacheKeyWithParams,
  CACHE_TTL,
} from '@/lib/cache';
import { createLarkClient } from '@/lib/lark/client';
import { createMeetingService, MeetingServiceError } from '@/services/meeting.service';

// ============================================================================
// Types
// ============================================================================

/**
 * API response wrapper - success
 */
interface SuccessResponse {
  readonly success: true;
  readonly data: MeetingAnalytics;
}

/**
 * API response wrapper - error
 */
interface ErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

// ============================================================================
// Constants
// ============================================================================

/** Cache key prefix for analytics */
const ANALYTICS_CACHE_KEY = 'analytics:stats';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create success response
 */
function createSuccessResponse(data: MeetingAnalytics): NextResponse<SuccessResponse> {
  return NextResponse.json({ success: true, data });
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
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Parse query parameters from URL
 */
function parseQueryParams(
  url: URL
): z.infer<typeof AnalyticsQuerySchema> {
  const rawParams: Record<string, string | undefined> = {};

  const paramNames = ['period', 'hourlyRate', 'currency'] as const;

  for (const name of paramNames) {
    const value = url.searchParams.get(name);
    if (value !== null) {
      rawParams[name] = value;
    }
  }

  return AnalyticsQuerySchema.parse(rawParams);
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/analytics
 *
 * Get meeting analytics including efficiency scores and cost estimates.
 *
 * Query Parameters:
 * - period: 'week' | 'month' | 'quarter' (default: 'month')
 * - hourlyRate: number (default: 5000, per person per hour)
 * - currency: string (default: 'JPY')
 *
 * Response:
 * - 200: MeetingAnalytics
 * - 400: Bad Request (invalid parameters)
 * - 401: Unauthorized
 * - 500: Internal Server Error
 *
 * @example
 * GET /api/analytics?period=month&hourlyRate=5000&currency=JPY
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
    let params: z.infer<typeof AnalyticsQuerySchema>;

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
    const cacheKeyValue = cacheKeyWithParams(ANALYTICS_CACHE_KEY, {
      period: params.period,
      hourlyRate: String(params.hourlyRate),
      currency: params.currency,
    });

    const cached = cache.get<MeetingAnalytics>(cacheKeyValue);
    if (cached.hit && cached.value !== undefined) {
      return createSuccessResponse(cached.value);
    }

    // Fetch meetings data
    const client = createLarkClient();
    const meetingService = createMeetingService(client, session.accessToken, session.user?.openId);
    const meetingsResponse = await meetingService.getMeetings({
      page: 1,
      limit: 500,
      filters: {},
      sort: { field: 'startTime', direction: 'desc' },
    });

    // Calculate analytics
    const analyticsService = createAnalyticsService();
    const analytics = analyticsService.calculateAnalyticsForPeriod(
      meetingsResponse.meetings,
      [], // Action items would come from another service in production
      params.period,
      params.hourlyRate,
      params.currency
    );

    // Store in cache with 10-minute TTL
    cache.set(cacheKeyValue, analytics, { ttlMs: CACHE_TTL.LONG });

    return createSuccessResponse(analytics);
  } catch (error) {
    console.error('[GET /api/analytics] Error:', error);

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
      'An unexpected error occurred while calculating analytics',
      500
    );
  }
}
