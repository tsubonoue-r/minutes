/**
 * Dashboard Stats API endpoint - Get comprehensive dashboard statistics
 * @module app/api/dashboard/stats/route
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import {
  createDashboardService,
  DashboardServiceError,
} from '@/services/dashboard.service';
import { DashboardStatsQuerySchema } from '@/types/dashboard';
import type { DashboardStats } from '@/types/dashboard';
import {
  getCache,
  cacheKeyWithParams,
  CACHE_TTL,
  CACHE_KEYS,
} from '@/lib/cache';

// ============================================================================
// Types
// ============================================================================

/**
 * API response wrapper - success
 */
interface SuccessResponse {
  readonly success: true;
  readonly data: DashboardStats;
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
// Helper Functions
// ============================================================================

/**
 * Create success response
 */
function createSuccessResponse(data: DashboardStats): NextResponse<SuccessResponse> {
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
): z.infer<typeof DashboardStatsQuerySchema> {
  const rawParams: Record<string, string | undefined> = {};

  const paramNames = ['period', 'startDate', 'endDate'] as const;

  for (const name of paramNames) {
    const value = url.searchParams.get(name);
    if (value !== null) {
      rawParams[name] = value;
    }
  }

  return DashboardStatsQuerySchema.parse(rawParams);
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/dashboard/stats
 *
 * Get comprehensive dashboard statistics including:
 * - Meeting statistics (total, by status, frequency)
 * - Minutes generation statistics
 * - Action item statistics and completion rates
 * - Participant analysis
 * - Recent activity feed
 *
 * Query Parameters:
 * - period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom' (default: 'month')
 * - startDate: ISO string (optional, required for 'custom' period)
 * - endDate: ISO string (optional, required for 'custom' period)
 *
 * Response:
 * - 200: DashboardStats
 * - 400: Bad Request (invalid parameters)
 * - 401: Unauthorized
 * - 500: Internal Server Error
 *
 * @example
 * GET /api/dashboard/stats?period=month
 * GET /api/dashboard/stats?period=custom&startDate=2025-01-01&endDate=2025-01-31
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

    // Parse and validate query parameters
    const url = new URL(request.url);
    let params: z.infer<typeof DashboardStatsQuerySchema>;

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

    // Validate custom period has dates
    if (
      params.period === 'custom' &&
      (params.startDate === undefined || params.endDate === undefined)
    ) {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Custom period requires both startDate and endDate',
        400
      );
    }

    // Check cache first
    const cache = getCache();
    const cacheKeyValue = cacheKeyWithParams(CACHE_KEYS.DASHBOARD_STATS, {
      period: params.period,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    const cached = cache.get<DashboardStats>(cacheKeyValue);
    if (cached.hit && cached.value !== undefined) {
      return createSuccessResponse(cached.value);
    }

    // Get dashboard statistics
    const service = createDashboardService();
    const stats = await service.getStats(
      params.period,
      params.startDate,
      params.endDate
    );

    // Store in cache with 10-minute TTL
    cache.set(cacheKeyValue, stats, { ttlMs: CACHE_TTL.LONG });

    return createSuccessResponse(stats);
  } catch (error) {
    console.error('[GET /api/dashboard/stats] Error:', error);

    if (error instanceof DashboardServiceError) {
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
