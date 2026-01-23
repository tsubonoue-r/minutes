/**
 * Reminders API endpoint - List and create reminders
 * @module app/api/reminders/route
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import {
  createReminderService,
  ReminderServiceError,
} from '@/services/reminder.service';
import {
  CreateReminderSchema,
  ReminderStatusSchema,
  ReminderTypeSchema,
} from '@/types/reminder';

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
  /** Filter by status */
  status: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined;
      const result = ReminderStatusSchema.safeParse(val);
      return result.success ? result.data : undefined;
    }),
  /** Filter by type */
  type: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined;
      const result = ReminderTypeSchema.safeParse(val);
      return result.success ? result.data : undefined;
    }),
  /** Filter by recipient ID */
  recipientId: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  /** Filter by action item ID */
  actionItemId: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  /** Filter by minutes ID */
  minutesId: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  /** Filter by meeting ID */
  meetingId: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  /** Filter by scheduled date range start */
  fromDate: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  /** Filter by scheduled date range end */
  toDate: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
  /** Filter for due reminders only */
  isDue: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined;
      return val === 'true';
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
    'type',
    'recipientId',
    'actionItemId',
    'minutesId',
    'meetingId',
    'fromDate',
    'toDate',
    'isDue',
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
 * GET /api/reminders
 *
 * List reminders with pagination and filtering.
 *
 * Query Parameters:
 * - status: 'active' | 'sent' | 'cancelled' | 'failed'
 * - type: 'action_item_due' | 'minutes_review' | 'custom'
 * - recipientId: string
 * - actionItemId: string
 * - minutesId: string
 * - meetingId: string
 * - fromDate: ISO 8601 datetime
 * - toDate: ISO 8601 datetime
 * - isDue: boolean
 * - page: number (default: 1)
 * - pageSize: number (default: 20, max: 100)
 *
 * Response:
 * - 200: ReminderListResponse
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

    // Create service and fetch reminders
    const service = createReminderService();

    const result = await service.getReminders(
      {
        status: params.status,
        type: params.type,
        recipientId: params.recipientId,
        actionItemId: params.actionItemId,
        minutesId: params.minutesId,
        meetingId: params.meetingId,
        fromDate: params.fromDate,
        toDate: params.toDate,
        isDue: params.isDue,
      },
      {
        page: params.page,
        pageSize: params.pageSize,
      }
    );

    return createSuccessResponse(result);
  } catch (error) {
    console.error('[GET /api/reminders] Error:', error);

    if (error instanceof ReminderServiceError) {
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
 * POST /api/reminders
 *
 * Create a new reminder.
 *
 * Request Body:
 * {
 *   "type": "action_item_due" | "minutes_review" | "custom",
 *   "title": string,
 *   "message": string (optional),
 *   "schedule": ReminderSchedule,
 *   "recipient": ReminderRecipient,
 *   "actionItemRef": ActionItemReminderRef (optional, required for action_item_due),
 *   "minutesRef": MinutesReminderRef (optional, required for minutes_review),
 *   "customData": object (optional),
 *   "language": "ja" | "en" (default: "ja")
 * }
 *
 * Response:
 * - 201: Created reminder
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

    const validation = CreateReminderSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Invalid request body',
        400,
        { validationErrors: validation.error.issues }
      );
    }

    // Create service and create reminder
    const service = createReminderService();
    const createdReminder = await service.createReminder(
      validation.data,
      session.user?.openId
    );

    return NextResponse.json(
      { success: true, data: createdReminder },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/reminders] Error:', error);

    if (error instanceof ReminderServiceError) {
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
