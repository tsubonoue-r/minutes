/**
 * Action Item Detail API endpoint - Get, update, delete single action item
 * @module app/api/action-items/[id]/route
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import {
  createActionItemService,
  ActionItemServiceError,
  ActionItemNotFoundError,
} from '@/services/action-item.service';
import {
  ActionItemStatusSchema,
  PrioritySchema,
  SpeakerSchema,
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

/**
 * Route context with params
 */
interface RouteContext {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Request body schema for PATCH request
 */
const updateActionItemSchema = z.object({
  /** New content */
  content: z.string().min(1).optional(),
  /** New assignee */
  assignee: SpeakerSchema.optional(),
  /** New due date (YYYY-MM-DD) */
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be ISO date format YYYY-MM-DD')
    .optional(),
  /** New priority */
  priority: PrioritySchema.optional(),
  /** New status */
  status: ActionItemStatusSchema.optional(),
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

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/action-items/[id]
 *
 * Get a single action item by ID.
 *
 * Path Parameters:
 * - id: string - Action item ID
 *
 * Response:
 * - 200: ManagedActionItem
 * - 401: Unauthorized
 * - 404: Not found
 * - 500: Internal Server Error
 */
export async function GET(
  _request: Request,
  context: RouteContext
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

    // Get action item ID from path params
    const params = await context.params;
    const actionItemId = params.id;

    if (actionItemId === undefined || actionItemId.trim() === '') {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Action item ID is required',
        400
      );
    }

    // Get action item
    const service = createActionItemService();
    const actionItem = await service.getActionItem(actionItemId);

    if (actionItem === null) {
      return createErrorResponse(
        'NOT_FOUND',
        `Action item not found: ${actionItemId}`,
        404
      );
    }

    return createSuccessResponse(actionItem);
  } catch (error) {
    console.error('[GET /api/action-items/[id]] Error:', error);

    if (error instanceof ActionItemNotFoundError) {
      return createErrorResponse('NOT_FOUND', error.message, 404);
    }

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
 * PATCH /api/action-items/[id]
 *
 * Update an action item.
 *
 * Path Parameters:
 * - id: string - Action item ID
 *
 * Request Body:
 * {
 *   "content"?: string,
 *   "assignee"?: Speaker,
 *   "dueDate"?: string (YYYY-MM-DD),
 *   "priority"?: Priority,
 *   "status"?: ActionItemStatus
 * }
 *
 * Response:
 * - 200: Updated ManagedActionItem
 * - 400: Invalid request body
 * - 401: Unauthorized
 * - 404: Not found
 * - 500: Internal Server Error
 */
export async function PATCH(
  request: Request,
  context: RouteContext
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

    // Get action item ID from path params
    const params = await context.params;
    const actionItemId = params.id;

    if (actionItemId === undefined || actionItemId.trim() === '') {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Action item ID is required',
        400
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

    const validation = updateActionItemSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Invalid request body',
        400,
        { validationErrors: validation.error.errors }
      );
    }

    const validatedData = validation.data;

    // Build updates object with only defined properties
    const updates: Partial<
      Pick<
        import('@/types/action-item').ManagedActionItem,
        'content' | 'assignee' | 'dueDate' | 'priority' | 'status'
      >
    > = {};

    if (validatedData.content !== undefined) {
      updates.content = validatedData.content;
    }
    if (validatedData.assignee !== undefined) {
      updates.assignee = validatedData.assignee;
    }
    if (validatedData.dueDate !== undefined) {
      updates.dueDate = validatedData.dueDate;
    }
    if (validatedData.priority !== undefined) {
      updates.priority = validatedData.priority;
    }
    if (validatedData.status !== undefined) {
      updates.status = validatedData.status;
    }

    // Check if there are any updates
    if (Object.keys(updates).length === 0) {
      return createErrorResponse(
        'INVALID_PARAMS',
        'No update fields provided',
        400
      );
    }

    // Update action item
    const service = createActionItemService();
    const updatedItem = await service.updateActionItem(actionItemId, updates);

    return createSuccessResponse(updatedItem);
  } catch (error) {
    console.error('[PATCH /api/action-items/[id]] Error:', error);

    if (error instanceof ActionItemNotFoundError) {
      return createErrorResponse('NOT_FOUND', error.message, 404);
    }

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
 * DELETE /api/action-items/[id]
 *
 * Delete an action item.
 *
 * Path Parameters:
 * - id: string - Action item ID
 *
 * Response:
 * - 200: { message: "Deleted successfully" }
 * - 401: Unauthorized
 * - 404: Not found
 * - 500: Internal Server Error
 */
export async function DELETE(
  _request: Request,
  context: RouteContext
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

    // Get action item ID from path params
    const params = await context.params;
    const actionItemId = params.id;

    if (actionItemId === undefined || actionItemId.trim() === '') {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Action item ID is required',
        400
      );
    }

    // Delete action item
    const service = createActionItemService();
    await service.deleteActionItem(actionItemId);

    return createSuccessResponse({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/action-items/[id]] Error:', error);

    if (error instanceof ActionItemNotFoundError) {
      return createErrorResponse('NOT_FOUND', error.message, 404);
    }

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
