/**
 * Template Import API endpoint
 * @module app/api/templates/import/route
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import {
  getTemplateService,
  TemplateServiceError,
} from '@/services/template.service';
import { z } from 'zod';
import type { Template } from '@/types/template';

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
interface ImportResponse {
  readonly data: {
    readonly imported: Template[];
    readonly skipped: string[];
    readonly errors: string[];
    readonly summary: {
      readonly importedCount: number;
      readonly skippedCount: number;
      readonly errorCount: number;
    };
  };
}

/**
 * Import request schema
 */
const ImportRequestSchema = z.object({
  /** Export data to import */
  exportData: z.unknown(),
  /** Whether to overwrite existing templates */
  overwriteExisting: z.boolean().optional(),
});

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
// POST /api/templates/import
// ============================================================================

/**
 * POST /api/templates/import
 *
 * Import templates from JSON data.
 *
 * Request Body:
 * - exportData: object (required) - The export data object
 * - overwriteExisting: boolean (optional) - Whether to overwrite existing templates
 *
 * Response:
 * - 200: ImportResponse with import results
 * - 400: Bad Request (invalid input or data)
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
    const validationResult = ImportRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid request data',
        400,
        { errors: validationResult.error.issues }
      );
    }

    // Import templates
    const service = getTemplateService();
    const overwriteExisting = validationResult.data.overwriteExisting === true;
    const result = service.import(
      validationResult.data.exportData,
      { overwriteExisting }
    );

    const response: ImportResponse = {
      data: {
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
        summary: {
          importedCount: result.imported.length,
          skippedCount: result.skipped.length,
          errorCount: result.errors.length,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[POST /api/templates/import] Error:', error);

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
