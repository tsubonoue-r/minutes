/**
 * Template API endpoint - Get, update, delete single template
 * @module app/api/templates/[id]/route
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import {
  getTemplateService,
  TemplateServiceError,
} from '@/services/template.service';
import {
  validateTemplateUpdateInput,
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
 * Success response type for single template
 */
interface TemplateResponse {
  readonly data: Template;
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
// GET /api/templates/[id]
// ============================================================================

/**
 * GET /api/templates/[id]
 *
 * Get a single template by ID.
 *
 * Response:
 * - 200: TemplateResponse
 * - 401: Unauthorized
 * - 404: Template not found
 * - 500: Internal Server Error
 */
export async function GET(
  _request: Request,
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

    // Get template
    const service = getTemplateService();
    const template = service.getById(id);

    if (template === undefined) {
      return createErrorResponse(
        'TEMPLATE_NOT_FOUND',
        `Template not found: ${id}`,
        404
      );
    }

    const response: TemplateResponse = {
      data: template,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/templates/[id]] Error:', error);

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

// ============================================================================
// PATCH /api/templates/[id]
// ============================================================================

/**
 * PATCH /api/templates/[id]
 *
 * Update a template.
 *
 * Request Body (all fields optional):
 * - name: string
 * - meetingType: MeetingType
 * - structure: TemplateStructure
 * - promptTemplate: string
 * - isDefault: boolean
 *
 * Response:
 * - 200: TemplateResponse
 * - 400: Bad Request (invalid input or cannot modify default)
 * - 401: Unauthorized
 * - 404: Template not found
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
    const validationResult = validateTemplateUpdateInput(body);
    if (!validationResult.success) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid template data',
        400,
        { errors: validationResult.error.issues }
      );
    }

    // Check if any fields to update
    if (Object.keys(validationResult.data).length === 0) {
      return createErrorResponse(
        'NO_FIELDS_TO_UPDATE',
        'No fields provided for update',
        400
      );
    }

    // Update template
    const service = getTemplateService();
    const template = service.update(id, validationResult.data);

    const response: TemplateResponse = {
      data: template,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[PATCH /api/templates/[id]] Error:', error);

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

// ============================================================================
// DELETE /api/templates/[id]
// ============================================================================

/**
 * DELETE /api/templates/[id]
 *
 * Delete a template.
 *
 * Response:
 * - 204: No Content (success)
 * - 400: Bad Request (cannot delete default template)
 * - 401: Unauthorized
 * - 404: Template not found
 * - 500: Internal Server Error
 */
export async function DELETE(
  _request: Request,
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

    // Delete template
    const service = getTemplateService();
    service.delete(id);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('[DELETE /api/templates/[id]] Error:', error);

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
