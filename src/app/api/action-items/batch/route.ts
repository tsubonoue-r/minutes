/**
 * Action Items Batch API endpoint - Batch update action items
 * @module app/api/action-items/batch/route
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import {
  createActionItemService,
  ActionItemServiceError,
} from '@/services/action-item.service';
import { ActionItemStatusUpdateSchema } from '@/types/action-item';

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
 * Request body schema for batch update
 */
const batchUpdateSchema = z.object({
  /** Array of updates to apply */
  updates: z
    .array(ActionItemStatusUpdateSchema)
    .min(1, 'At least one update is required')
    .max(100, 'Maximum 100 updates per request'),
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
 * PATCH /api/action-items/batch
 *
 * Batch update action item statuses.
 *
 * Request Body:
 * {
 *   "updates": [
 *     { "id": "action_xxx", "status": "completed" },
 *     { "id": "action_yyy", "status": "in_progress" }
 *   ]
 * }
 *
 * Response:
 * - 200: Array of updated ManagedActionItems
 * - 400: Invalid request body or partial failure
 * - 401: Unauthorized
 * - 500: Internal Server Error
 */
export async function PATCH(request: Request): Promise<Response> {
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

    const validation = batchUpdateSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Invalid request body',
        400,
        { validationErrors: validation.error.issues }
      );
    }

    const { updates } = validation.data;

    // Perform batch update
    const service = createActionItemService();

    try {
      const updatedItems = await service.updateStatusBatch(updates);
      return createSuccessResponse({
        updated: updatedItems,
        count: updatedItems.length,
      });
    } catch (error) {
      // Handle partial failure specifically
      if (
        error instanceof ActionItemServiceError &&
        error.code === 'BATCH_UPDATE_PARTIAL_FAILURE'
      ) {
        return createErrorResponse(
          error.code,
          error.message,
          error.statusCode,
          error.details
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('[PATCH /api/action-items/batch] Error:', error);

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
