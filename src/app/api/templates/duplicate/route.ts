/**
 * Template Duplicate API endpoint
 * @module app/api/templates/duplicate/route
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import {
  getTemplateService,
  TemplateServiceError,
} from '@/services/template.service';
import {
  validateTemplateDuplicateRequest,
  type Template,
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
interface DuplicateResponse {
  readonly data: Template;
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
// POST /api/templates/duplicate
// ============================================================================

/**
 * POST /api/templates/duplicate
 *
 * Duplicate an existing template.
 *
 * Request Body:
 * - sourceId: string (required) - ID of template to duplicate
 * - newName: string (optional) - Name for the duplicated template
 *
 * Response:
 * - 201: DuplicateResponse with the duplicated template
 * - 400: Bad Request (invalid input)
 * - 401: Unauthorized
 * - 404: Source template not found
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
    const validationResult = validateTemplateDuplicateRequest(body);
    if (!validationResult.success) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid request data',
        400,
        { errors: validationResult.error.issues }
      );
    }

    // Duplicate template
    const service = getTemplateService();
    const duplicated = service.duplicate(
      validationResult.data.sourceId,
      validationResult.data.newName
    );

    const response: DuplicateResponse = {
      data: duplicated,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[POST /api/templates/duplicate] Error:', error);

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
