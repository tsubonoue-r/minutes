/**
 * Action Items Stats API endpoint - Get action item statistics
 * @module app/api/action-items/stats/route
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import {
  createActionItemService,
  ActionItemServiceError,
} from '@/services/action-item.service';

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
 * GET /api/action-items/stats
 *
 * Get statistics about all action items.
 *
 * Response:
 * - 200: ActionItemStats
 *   {
 *     "total": number,
 *     "pending": number,
 *     "inProgress": number,
 *     "completed": number,
 *     "overdue": number
 *   }
 * - 401: Unauthorized
 * - 500: Internal Server Error
 */
export async function GET(_request: Request): Promise<Response> {
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

    // Get statistics
    const service = createActionItemService();
    const stats = await service.getStats();

    return createSuccessResponse(stats);
  } catch (error) {
    console.error('[GET /api/action-items/stats] Error:', error);

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
