/**
 * Templates API endpoint - List and create templates
 * @module app/api/templates/route
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import {
  getTemplateService,
  TemplateServiceError,
} from '@/services/template.service';
import {
  validateTemplateCreateInput,
  MeetingTypeSchema,
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
 * Success response type for templates list
 */
interface TemplatesListResponse {
  readonly data: readonly Template[];
  readonly total: number;
}

/**
 * Success response type for single template
 */
interface TemplateResponse {
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
// GET /api/templates
// ============================================================================

/**
 * GET /api/templates
 *
 * List all templates with optional filtering by meeting type.
 *
 * Query Parameters:
 * - meetingType: MeetingType (optional) - Filter by meeting type
 *
 * Response:
 * - 200: TemplatesListResponse
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

    // Parse query parameters
    const url = new URL(request.url);
    const meetingTypeParam = url.searchParams.get('meetingType');

    const parsed = meetingTypeParam !== null
      ? MeetingTypeSchema.safeParse(meetingTypeParam)
      : null;
    const meetingType = parsed?.success === true ? parsed.data : undefined;

    // Get templates
    const service = getTemplateService();
    let templates: Template[];

    if (meetingType !== undefined) {
      templates = service.getByMeetingType(meetingType);
    } else {
      templates = service.getAll();
    }

    const response: TemplatesListResponse = {
      data: templates,
      total: templates.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/templates] Error:', error);

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
// POST /api/templates
// ============================================================================

/**
 * POST /api/templates
 *
 * Create a new template.
 *
 * Request Body:
 * - name: string (required)
 * - meetingType: MeetingType (required)
 * - structure: TemplateStructure (required)
 * - promptTemplate: string (required)
 * - isDefault: boolean (optional)
 *
 * Response:
 * - 201: TemplateResponse
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
    const validationResult = validateTemplateCreateInput(body);
    if (!validationResult.success) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid template data',
        400,
        { errors: validationResult.error.issues }
      );
    }

    // Create template
    const service = getTemplateService();
    const template = service.create(validationResult.data);

    const response: TemplateResponse = {
      data: template,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[POST /api/templates] Error:', error);

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
