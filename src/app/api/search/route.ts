/**
 * Full-text search API endpoint
 * @module app/api/search/route
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import {
  SearchQuerySchema,
  createEmptySearchResponse,
  type SearchQuery,
} from '@/types/search';
import {
  createSearchService,
  SearchServiceError,
  type SearchDataSources,
} from '@/services/search.service';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Helpers
// ============================================================================

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
 * Parse query parameters from URL
 */
function parseQueryParams(url: URL): Partial<SearchQuery> {
  const query = url.searchParams.get('q') ?? url.searchParams.get('query');
  const targets = url.searchParams.get('targets');
  const page = url.searchParams.get('page');
  const limit = url.searchParams.get('limit');
  const sortBy = url.searchParams.get('sortBy');
  const sortOrder = url.searchParams.get('sortOrder');

  // Parse filters
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');
  const participants = url.searchParams.get('participants');
  const meetingStatus = url.searchParams.get('meetingStatus');
  const actionItemStatus = url.searchParams.get('actionItemStatus');
  const priority = url.searchParams.get('priority');

  const params: Record<string, unknown> = {};

  if (query !== null) {
    params.query = query;
  }

  if (targets !== null) {
    params.targets = targets.split(',').filter((t) => t.trim() !== '');
  }

  if (page !== null) {
    const parsed = parseInt(page, 10);
    if (!isNaN(parsed) && parsed > 0) {
      params.page = parsed;
    }
  }

  if (limit !== null) {
    const parsed = parseInt(limit, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      params.limit = parsed;
    }
  }

  if (sortBy !== null) {
    params.sortBy = sortBy;
  }

  if (sortOrder !== null) {
    params.sortOrder = sortOrder;
  }

  // Build filters object
  const filters: Record<string, unknown> = {};

  if (dateFrom !== null || dateTo !== null) {
    filters.dateRange = {
      from: dateFrom ?? undefined,
      to: dateTo ?? undefined,
    };
  }

  if (participants !== null) {
    try {
      filters.participants = JSON.parse(participants);
    } catch {
      // Ignore invalid JSON
    }
  }

  if (meetingStatus !== null) {
    filters.meetingStatus = meetingStatus;
  }

  if (actionItemStatus !== null) {
    filters.actionItemStatus = actionItemStatus;
  }

  if (priority !== null) {
    filters.priority = priority;
  }

  if (Object.keys(filters).length > 0) {
    params.filters = filters;
  }

  return params;
}

/**
 * Mock data provider (replace with actual data fetching in production)
 *
 * In production, this should fetch data from:
 * - Lark API for meetings
 * - Lark Base for minutes and action items
 * - Stored transcripts
 */
function getSearchDataSources(): SearchDataSources {
  // TODO: Replace with actual data fetching
  // This is a placeholder that returns empty data
  // In production, you would:
  // 1. Fetch meetings from Lark VC API
  // 2. Fetch minutes from Lark Base
  // 3. Fetch transcripts from storage

  return {
    meetings: [],
    minutes: [],
    transcripts: [],
  };
}

// ============================================================================
// API Handler
// ============================================================================

/**
 * GET /api/search
 *
 * Full-text search across meetings, minutes, transcripts, and action items.
 *
 * Query Parameters:
 * - q (or query): Search query string (required)
 * - targets: Comma-separated list of targets (meetings, minutes, transcripts, action_items, all)
 * - page: Page number (1-based, default: 1)
 * - limit: Items per page (1-100, default: 20)
 * - sortBy: Sort field (relevance, date) - default: relevance
 * - sortOrder: Sort direction (asc, desc) - default: desc
 * - dateFrom: Filter by start date (ISO string)
 * - dateTo: Filter by end date (ISO string)
 * - participants: JSON array of participant filters
 * - meetingStatus: Filter by meeting status
 * - actionItemStatus: Filter by action item status
 * - priority: Filter by priority
 *
 * Response:
 * - 200: SearchResponse
 * - 400: Bad Request (invalid parameters)
 * - 401: Unauthorized
 * - 500: Internal Server Error
 *
 * @example
 * GET /api/search?q=project%20update&targets=meetings,minutes&page=1&limit=20
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
    const rawParams = parseQueryParams(url);

    // Validate with Zod schema
    const validationResult = SearchQuerySchema.safeParse(rawParams);

    if (!validationResult.success) {
      const message = validationResult.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');

      return createErrorResponse('INVALID_PARAMS', message, 400, {
        validationErrors: validationResult.error.errors,
      });
    }

    const searchQuery = validationResult.data;

    // Check if query is empty
    if (!searchQuery.query || searchQuery.query.trim() === '') {
      return NextResponse.json(createEmptySearchResponse(''));
    }

    // Get data sources
    const dataSources = await getSearchDataSources();

    // Execute search
    const searchService = createSearchService(dataSources);
    const results = await searchService.search(searchQuery);

    return NextResponse.json(results);
  } catch (error) {
    console.error('[GET /api/search] Error:', error);

    if (error instanceof SearchServiceError) {
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

/**
 * POST /api/search
 *
 * Full-text search with JSON body (alternative to GET for complex queries).
 *
 * Request Body: SearchQuery
 * - query: Search query string (required)
 * - targets: Array of targets to search
 * - filters: Search filters object
 * - page: Page number (1-based)
 * - limit: Items per page
 * - sortBy: Sort field
 * - sortOrder: Sort direction
 *
 * Response:
 * - 200: SearchResponse
 * - 400: Bad Request (invalid body)
 * - 401: Unauthorized
 * - 500: Internal Server Error
 *
 * @example
 * POST /api/search
 * {
 *   "query": "project update",
 *   "targets": ["meetings", "minutes"],
 *   "filters": {
 *     "dateRange": {
 *       "from": "2025-01-01T00:00:00Z",
 *       "to": "2025-01-31T23:59:59Z"
 *     }
 *   },
 *   "page": 1,
 *   "limit": 20
 * }
 */
export async function POST(request: Request): Promise<Response> {
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

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        'INVALID_JSON',
        'Request body must be valid JSON',
        400
      );
    }

    // Validate with Zod schema
    const validationResult = SearchQuerySchema.safeParse(body);

    if (!validationResult.success) {
      const message = validationResult.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');

      return createErrorResponse('INVALID_PARAMS', message, 400, {
        validationErrors: validationResult.error.errors,
      });
    }

    const searchQuery = validationResult.data;

    // Check if query is empty
    if (!searchQuery.query || searchQuery.query.trim() === '') {
      return NextResponse.json(createEmptySearchResponse(''));
    }

    // Get data sources
    const dataSources = await getSearchDataSources();

    // Execute search
    const searchService = createSearchService(dataSources);
    const results = await searchService.search(searchQuery);

    return NextResponse.json(results);
  } catch (error) {
    console.error('[POST /api/search] Error:', error);

    if (error instanceof SearchServiceError) {
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
