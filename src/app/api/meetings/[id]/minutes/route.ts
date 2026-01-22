/**
 * Minutes API endpoint - Get existing minutes for a meeting
 * @module app/api/meetings/[id]/minutes/route
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';

/**
 * Error response type
 */
interface ErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
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

/**
 * Create error response
 *
 * @param code - Error code
 * @param message - Error message
 * @param statusCode - HTTP status code
 * @returns NextResponse with error payload
 */
function createErrorResponse(
  code: string,
  message: string,
  statusCode: number
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * GET /api/meetings/[id]/minutes
 *
 * Get existing minutes for a specific meeting.
 * Currently returns 404 as minutes storage is not yet implemented.
 * This endpoint is prepared for future database integration.
 *
 * Path Parameters:
 * - id: string - Meeting ID
 *
 * Response:
 * - 401: Unauthorized (not authenticated)
 * - 404: Minutes not found (current default behavior)
 *
 * @example
 * ```typescript
 * // Error response (current behavior)
 * {
 *   "success": false,
 *   "error": {
 *     "code": "MINUTES_NOT_FOUND",
 *     "message": "Minutes not found for this meeting"
 *   }
 * }
 * ```
 */
export async function GET(
  _request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    // 1. Authentication check
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

    // 2. Get meeting ID from path params
    const params = await context.params;
    const meetingId = params.id;

    if (meetingId === undefined || meetingId.trim() === '') {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Meeting ID is required',
        400
      );
    }

    // 3. Future: Query database for existing minutes
    // For now, return 404 as minutes storage is not implemented
    return createErrorResponse(
      'MINUTES_NOT_FOUND',
      'Minutes not found for this meeting',
      404
    );
  } catch (error) {
    console.error('[GET /api/meetings/[id]/minutes] Error:', error);

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
}
