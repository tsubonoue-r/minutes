/**
 * Template Auto-Select API endpoint
 * @module app/api/templates/select/route
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import {
  getTemplateService,
  TemplateServiceError,
} from '@/services/template.service';
import {
  validateTemplateSelectRequest,
  type TemplateSelectResponse,
} from '@/types/template';

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

/**
 * Success response type
 */
interface SelectResponse {
  readonly data: TemplateSelectResponse;
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

// ============================================================================
// POST /api/templates/select
// ============================================================================

/**
 * POST /api/templates/select
 *
 * Auto-select the best template based on meeting title.
 *
 * Request Body:
 * - meetingTitle: string (required) - Meeting title to analyze
 *
 * Response:
 * - 200: SelectResponse with template, confidence, detected type, and matched keywords
 * - 400: Bad Request (invalid input)
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

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        'INVALID_JSON',
        'Invalid JSON in request body',
        400
      );
    }

    // Validate input
    const validationResult = validateTemplateSelectRequest(body);
    if (!validationResult.success) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid request data',
        400,
        { errors: validationResult.error.issues }
      );
    }

    // Select template
    const service = getTemplateService();
    const result = service.selectByTitle(validationResult.data.meetingTitle);

    const response: SelectResponse = {
      data: result,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[POST /api/templates/select] Error:', error);

    if (error instanceof TemplateServiceError) {
      return createErrorResponse(
        error.code,
        error.message,
        error.statusCode
      );
    }

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
}
