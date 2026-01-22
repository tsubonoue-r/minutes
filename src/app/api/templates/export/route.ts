/**
 * Template Export API endpoint
 * @module app/api/templates/export/route
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import {
  getTemplateService,
  TemplateServiceError,
} from '@/services/template.service';
import { z } from 'zod';
import type { TemplateExportData } from '@/types/template';

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
 * Export request schema
 */
const ExportRequestSchema = z.object({
  /** Optional array of template IDs to export */
  templateIds: z.array(z.string()).optional(),
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
// POST /api/templates/export
// ============================================================================

/**
 * POST /api/templates/export
 *
 * Export templates to JSON format.
 *
 * Request Body:
 * - templateIds: string[] (optional) - IDs of templates to export.
 *   If not provided, exports all user-created templates.
 *
 * Response:
 * - 200: TemplateExportData
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
    let body: unknown = {};
    try {
      const text = await request.text();
      if (text.trim() !== '') {
        body = JSON.parse(text);
      }
    } catch {
      return createErrorResponse(
        'INVALID_JSON',
        'Invalid JSON in request body',
        400
      );
    }

    // Validate input
    const validationResult = ExportRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid request data',
        400,
        { errors: validationResult.error.errors }
      );
    }

    // Export templates
    const service = getTemplateService();
    const exportData: TemplateExportData = service.export(
      validationResult.data.templateIds
    );

    // Set headers for download
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="templates-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('[POST /api/templates/export] Error:', error);

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
