/**
 * Reminder API endpoint - Get, update, and delete a specific reminder
 * @module app/api/reminders/[id]/route
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import {
  createReminderService,
  ReminderServiceError,
  ReminderNotFoundError,
  InvalidReminderStateError,
} from '@/services/reminder.service';
import { UpdateReminderSchema } from '@/types/reminder';

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

/**
 * Route params type
 */
interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

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

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/reminders/[id]
 *
 * Get a specific reminder by ID.
 *
 * Response:
 * - 200: Reminder object
 * - 401: Unauthorized
 * - 404: Reminder not found
 * - 500: Internal Server Error
 */
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<Response> {
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

    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Create service and fetch reminder
    const service = createReminderService();
    const reminder = await service.getReminder(id);

    if (reminder === null) {
      return createErrorResponse(
        'NOT_FOUND',
        `Reminder with id '${id}' not found`,
        404
      );
    }

    return createSuccessResponse(reminder);
  } catch (error) {
    console.error('[GET /api/reminders/[id]] Error:', error);

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
 * PATCH /api/reminders/[id]
 *
 * Update a specific reminder.
 *
 * Request Body:
 * {
 *   "title": string (optional),
 *   "message": string (optional),
 *   "schedule": ReminderSchedule (optional),
 *   "language": "ja" | "en" (optional)
 * }
 *
 * Response:
 * - 200: Updated reminder
 * - 400: Invalid request body or invalid state
 * - 401: Unauthorized
 * - 404: Reminder not found
 * - 500: Internal Server Error
 */
export async function PATCH(
  request: Request,
  { params }: RouteParams
): Promise<Response> {
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

    const resolvedParams = await params;
    const { id } = resolvedParams;

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

    const validation = UpdateReminderSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Invalid request body',
        400,
        { validationErrors: validation.error.errors }
      );
    }

    // Create service and update reminder
    const service = createReminderService();
    const updatedReminder = await service.updateReminder(id, validation.data);

    return createSuccessResponse(updatedReminder);
  } catch (error) {
    console.error('[PATCH /api/reminders/[id]] Error:', error);

    if (error instanceof ReminderNotFoundError) {
      return createErrorResponse(
        error.code,
        error.message,
        error.statusCode,
        error.details
      );
    }

    if (error instanceof InvalidReminderStateError) {
      return createErrorResponse(
        error.code,
        error.message,
        error.statusCode,
        error.details
      );
    }

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
 * DELETE /api/reminders/[id]
 *
 * Cancel or delete a reminder.
 *
 * Query Parameters:
 * - permanent: boolean (default: false) - If true, permanently deletes the reminder
 *
 * Response:
 * - 200: Cancelled reminder (when permanent=false)
 * - 204: No content (when permanent=true)
 * - 400: Invalid state for cancellation
 * - 401: Unauthorized
 * - 404: Reminder not found
 * - 500: Internal Server Error
 */
export async function DELETE(
  request: Request,
  { params }: RouteParams
): Promise<Response> {
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

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const url = new URL(request.url);
    const permanent = url.searchParams.get('permanent') === 'true';

    // Create service
    const service = createReminderService();

    if (permanent) {
      // Permanently delete the reminder
      await service.deleteReminder(id);
      return new NextResponse(null, { status: 204 });
    } else {
      // Cancel the reminder (change status to cancelled)
      const cancelledReminder = await service.cancelReminder(id);
      return createSuccessResponse(cancelledReminder);
    }
  } catch (error) {
    console.error('[DELETE /api/reminders/[id]] Error:', error);

    if (error instanceof ReminderNotFoundError) {
      return createErrorResponse(
        error.code,
        error.message,
        error.statusCode,
        error.details
      );
    }

    if (error instanceof InvalidReminderStateError) {
      return createErrorResponse(
        error.code,
        error.message,
        error.statusCode,
        error.details
      );
    }

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
