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
import { createLarkClient } from '@/lib/lark/client';
import { createMeetingService } from '@/services/meeting.service';
import { createLarkBaseServiceFromEnv, LarkBaseServiceError } from '@/services/lark-base.service';
import { createTranscriptService } from '@/services/transcript.service';
import type { Meeting } from '@/types/meeting';
import type { Minutes } from '@/types/minutes';
import type { Transcript } from '@/types/transcript';

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
 * Fetch search data sources from Lark APIs
 *
 * Retrieves meetings from Lark VC API, minutes from Lark Base,
 * and transcripts from the Transcript service.
 *
 * @param accessToken - User access token for API authentication
 * @returns Data sources populated from Lark services
 */
async function getSearchDataSources(accessToken: string): Promise<SearchDataSources> {
  const client = createLarkClient();

  // Fetch data sources concurrently for better performance
  const [meetingsResult, minutesResult, transcriptsResult] = await Promise.allSettled([
    fetchMeetings(client, accessToken),
    fetchMinutes(client, accessToken),
    fetchTranscripts(accessToken),
  ]);

  const meetings: Meeting[] =
    meetingsResult.status === 'fulfilled' ? meetingsResult.value : [];
  const minutes: Minutes[] =
    minutesResult.status === 'fulfilled' ? minutesResult.value : [];
  const transcripts: Transcript[] =
    transcriptsResult.status === 'fulfilled' ? transcriptsResult.value : [];

  // Log warnings for any failed data source fetches
  if (meetingsResult.status === 'rejected') {
    console.warn('[Search] Failed to fetch meetings:', meetingsResult.reason);
  }
  if (minutesResult.status === 'rejected') {
    console.warn('[Search] Failed to fetch minutes:', minutesResult.reason);
  }
  if (transcriptsResult.status === 'rejected') {
    console.warn('[Search] Failed to fetch transcripts:', transcriptsResult.reason);
  }

  return { meetings, minutes, transcripts };
}

/**
 * Fetch all meetings from Lark VC API
 *
 * @param client - Lark API client
 * @param accessToken - User access token
 * @returns Array of meetings
 */
async function fetchMeetings(
  client: ReturnType<typeof createLarkClient>,
  accessToken: string
): Promise<Meeting[]> {
  const meetingService = createMeetingService(client, accessToken);

  // Fetch recent meetings (up to 100 for search indexing)
  const result = await meetingService.getMeetings({
    page: 1,
    limit: 100,
    filters: {},
    sort: { field: 'startTime', direction: 'desc' },
  });

  return [...result.meetings];
}

/**
 * Fetch all minutes from Lark Base
 *
 * @param client - Lark API client
 * @param accessToken - User access token
 * @returns Array of minutes
 */
async function fetchMinutes(
  client: ReturnType<typeof createLarkClient>,
  accessToken: string
): Promise<Minutes[]> {
  const larkBaseService = createLarkBaseServiceFromEnv(client, accessToken);

  // Fetch meetings first to get their IDs for minutes lookup
  const meetingsResult = await larkBaseService.listMeetings({ pageSize: 100 });
  const allMinutes: Minutes[] = [];

  // Fetch minutes for each meeting (in parallel batches)
  const BATCH_SIZE = 10;
  for (let i = 0; i < meetingsResult.meetings.length; i += BATCH_SIZE) {
    const batch = meetingsResult.meetings.slice(i, i + BATCH_SIZE);
    const minutesPromises = batch.map((meeting) =>
      larkBaseService.getMinutes(meeting.id).catch(() => null)
    );

    const batchResults = await Promise.all(minutesPromises);
    for (const minutes of batchResults) {
      if (minutes !== null) {
        allMinutes.push(minutes);
      }
    }
  }

  return allMinutes;
}

/**
 * Fetch transcripts for meetings that have them
 *
 * @param accessToken - User access token
 * @returns Array of transcripts
 */
async function fetchTranscripts(accessToken: string): Promise<Transcript[]> {
  const transcriptService = createTranscriptService();
  const client = createLarkClient();
  const meetingService = createMeetingService(client, accessToken);

  // Get recent meetings to check for transcripts
  const meetingsResult = await meetingService.getMeetings({
    page: 1,
    limit: 50,
    filters: { status: 'ended' },
    sort: { field: 'startTime', direction: 'desc' },
  });

  const transcripts: Transcript[] = [];

  // Fetch transcripts in parallel batches
  const BATCH_SIZE = 5;
  for (let i = 0; i < meetingsResult.meetings.length; i += BATCH_SIZE) {
    const batch = meetingsResult.meetings.slice(i, i + BATCH_SIZE);
    const transcriptPromises = batch.map(async (meeting) => {
      try {
        const hasTranscript = await transcriptService.hasTranscript(
          accessToken,
          meeting.id
        );
        if (hasTranscript) {
          return transcriptService.getTranscript(accessToken, meeting.id);
        }
        return null;
      } catch {
        return null;
      }
    });

    const batchResults = await Promise.all(transcriptPromises);
    for (const transcript of batchResults) {
      if (transcript !== null) {
        transcripts.push(transcript);
      }
    }
  }

  return transcripts;
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

    if (session.accessToken === undefined) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'Access token not found',
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

    // Get data sources from Lark APIs
    const dataSources = await getSearchDataSources(session.accessToken);

    // Execute search
    const searchService = createSearchService(dataSources);
    const results = searchService.search(searchQuery);

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

    if (error instanceof LarkBaseServiceError) {
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

    if (session.accessToken === undefined) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'Access token not found',
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

    // Get data sources from Lark APIs
    const dataSources = await getSearchDataSources(session.accessToken);

    // Execute search
    const searchService = createSearchService(dataSources);
    const results = searchService.search(searchQuery);

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

    if (error instanceof LarkBaseServiceError) {
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
