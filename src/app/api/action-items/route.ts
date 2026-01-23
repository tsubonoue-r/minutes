/**
 * Action Items API endpoint - List and create action items
 * @module app/api/action-items/route
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import {
  createActionItemService,
  ActionItemServiceError,
} from '@/services/action-item.service';
import {
  ActionItemSortFieldSchema,
  SortOrderSchema,
} from '@/types/action-item';
import {
  MinutesSchema,
  ActionItemStatusSchema,
  PrioritySchema,
} from '@/types/minutes';

// ============================================================================
// Types
// ============================================================================

/**
 * API response wrapper - success
 */
interface SuccessResponse<T> {
  readonly success: true;
  readonly data: T;
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
// Validation Schemas
// ============================================================================

/**
 * Query parameters schema for GET request
 */
const listQuerySchema = z.object({
  /** Filter by status (comma-separated) */
  status: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined;
      const statuses = val.split(',').map((s) => s.trim());
      const result = z.array(ActionItemStatusSchema).safeParse(statuses);
      return result.success ? result.data : undefined;
    }),
  /** Filter by priority (comma-separated) */
  priority: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined;
      const priorities = val.split(',').map((p) => p.trim());
      const result = z.array(PrioritySchema).safeParse(priorities);
      return result.success ? result.data : undefined;
    }),
  /** Filter by assignee ID */
  assigneeId: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  /** Filter by meeting ID */
  meetingId: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  /** Filter by overdue status */
  isOverdue: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined;
      return val === 'true';
    }),
  /** Text search query */
  searchQuery: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  /** Sort field */
  sortField: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return 'dueDate';
      const result = ActionItemSortFieldSchema.safeParse(val);
      return result.success ? result.data : 'dueDate';
    }),
  /** Sort order */
  sortOrder: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return 'asc';
      const result = SortOrderSchema.safeParse(val);
      return result.success ? result.data : 'asc';
    }),
  /** Page number (1-indexed) */
  page: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return 1;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }),
  /** Page size */
  pageSize: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return 20;
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || parsed < 1) return 20;
      return Math.min(parsed, 100); // Max 100
    }),
});

/**
 * Request body schema for POST request (create from minutes)
 */
const createFromMinutesSchema = z.object({
  /** Minutes data containing action items */
  minutes: MinutesSchema,
  /** Meeting information */
  meeting: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create success response
 */
function createSuccessResponse<T>(data: T): NextResponse<SuccessResponse<T>> {
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
function parseQueryParams(url: URL): z.infer<typeof listQuerySchema> {
  const rawParams: Record<string, string | undefined> = {};

  const paramNames = [
    'status',
    'priority',
    'assigneeId',
    'meetingId',
    'isOverdue',
    'searchQuery',
    'sortField',
    'sortOrder',
    'page',
    'pageSize',
  ] as const;

  for (const name of paramNames) {
    const value = url.searchParams.get(name);
    if (value !== null) {
      rawParams[name] = value;
    }
  }

  return listQuerySchema.parse(rawParams);
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/action-items
 *
 * List action items with pagination, filtering, and sorting.
 *
 * Query Parameters:
 * - status: string[] (comma-separated) - Filter by status
 * - priority: string[] (comma-separated) - Filter by priority
 * - assigneeId: string - Filter by assignee ID
 * - meetingId: string - Filter by meeting ID
 * - isOverdue: boolean - Filter by overdue status
 * - searchQuery: string - Text search
 * - sortField: 'dueDate' | 'priority' | 'status' | 'createdAt' | 'meetingDate'
 * - sortOrder: 'asc' | 'desc'
 * - page: number (default: 1)
 * - pageSize: number (default: 20, max: 100)
 *
 * Response:
 * - 200: ActionItemListResponse
 * - 400: Invalid parameters
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

    // Parse and validate query parameters
    const url = new URL(request.url);
    let params: z.infer<typeof listQuerySchema>;

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

    // Create service and fetch action items
    const service = createActionItemService();

    const result = await service.getActionItems(
      {
        status: params.status,
        priority: params.priority,
        assigneeId: params.assigneeId,
        meetingId: params.meetingId,
        isOverdue: params.isOverdue,
        searchQuery: params.searchQuery,
      },
      {
        field: params.sortField,
        order: params.sortOrder,
      },
      {
        page: params.page,
        pageSize: params.pageSize,
      }
    );

    return createSuccessResponse(result);
  } catch (error) {
    console.error('[GET /api/action-items] Error:', error);

    if (error instanceof ActionItemServiceError) {
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
 * POST /api/action-items
 *
 * Create action items from minutes.
 *
 * Request Body:
 * {
 *   "minutes": Minutes,
 *   "meeting": { "id": string, "title": string, "date": string }
 * }
 *
 * Response:
 * - 201: Created action items
 * - 400: Invalid request body
 * - 401: Unauthorized
 * - 500: Internal Server Error
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

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Invalid JSON in request body',
        400
      );
    }

    const validation = createFromMinutesSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Invalid request body',
        400,
        { validationErrors: validation.error.issues }
      );
    }

    const { minutes, meeting } = validation.data;

    // Create service and create action items
    const service = createActionItemService();
    const createdItems = await service.createFromMinutes(minutes, meeting);

    return NextResponse.json(
      { success: true, data: createdItems },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/action-items] Error:', error);

    if (error instanceof ActionItemServiceError) {
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
