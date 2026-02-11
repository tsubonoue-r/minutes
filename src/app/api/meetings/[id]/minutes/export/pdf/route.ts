/**
 * PDF Export API endpoint - Generate PDF HTML for meeting minutes
 * @module app/api/meetings/[id]/minutes/export/pdf/route
 *
 * Returns an HTML document optimized for PDF printing.
 * The client can either display this directly or use the
 * browser's print-to-PDF functionality.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { minutesToPdfHtml, PdfExportError } from '@/services/pdf-export.service';
import { MinutesSchema } from '@/types/minutes';
import { auditInfo, auditWarn, createActorFromRequest } from '@/lib/audit-log';

// =============================================================================
// Types
// =============================================================================

/**
 * Error response type
 */
interface PdfExportErrorResponse {
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

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a JSON error response
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
): NextResponse<PdfExportErrorResponse> {
  const response: PdfExportErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  return NextResponse.json(response, { status: statusCode });
}

// =============================================================================
// Route Handler
// =============================================================================

/**
 * POST /api/meetings/[id]/minutes/export/pdf
 *
 * Generate a PDF-ready HTML document from meeting minutes.
 * Returns the HTML as text/html content type for direct
 * rendering or print-to-PDF.
 *
 * Path Parameters:
 * - id: string - Meeting ID (validated against minutes data)
 *
 * Request Body:
 * - minutes: Minutes - The minutes data to export (required)
 *
 * Response:
 * - 200: HTML document (text/html)
 * - 400: Invalid request body or parameters
 * - 401: Unauthorized (not authenticated)
 * - 500: Internal server error
 *
 * @example
 * ```typescript
 * // Request
 * POST /api/meetings/meeting-123/minutes/export/pdf
 * Content-Type: application/json
 * {
 *   "minutes": { ... }
 * }
 *
 * // Success response
 * Content-Type: text/html
 * <!DOCTYPE html>...
 *
 * // Error response
 * {
 *   "success": false,
 *   "error": {
 *     "code": "INVALID_REQUEST",
 *     "message": "..."
 *   }
 * }
 * ```
 */
export async function POST(
  request: Request,
  context: RouteContext
): Promise<Response> {
  const startTime = Date.now();

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

    // 3. Parse and validate request body
    const contentType = request.headers.get('content-type');

    if (contentType === null || !contentType.includes('application/json')) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Content-Type must be application/json',
        400
      );
    }

    let body: unknown;
    try {
      const text = await request.text();
      if (text.trim() === '') {
        return createErrorResponse(
          'INVALID_REQUEST',
          'Request body is required',
          400
        );
      }
      body = JSON.parse(text);
    } catch {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Invalid JSON in request body',
        400
      );
    }

    // Validate minutes data
    const bodyObj = body as Record<string, unknown> | null;
    if (bodyObj === null || typeof bodyObj !== 'object') {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Request body must be a JSON object',
        400
      );
    }

    const minutesResult = MinutesSchema.safeParse(bodyObj['minutes']);

    if (!minutesResult.success) {
      const errorMessage = minutesResult.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      return createErrorResponse(
        'INVALID_REQUEST',
        `Invalid minutes data: ${errorMessage}`,
        400
      );
    }

    const minutes = minutesResult.data;

    // 4. Verify meeting ID matches minutes data
    if (minutes.meetingId !== meetingId) {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Meeting ID in URL does not match minutes data',
        400
      );
    }

    // 5. Generate PDF HTML
    let html: string;
    try {
      html = minutesToPdfHtml(minutes);
    } catch (error) {
      if (error instanceof PdfExportError) {
        return createErrorResponse(
          error.code,
          error.message,
          error.statusCode
        );
      }
      throw error;
    }

    // 6. Audit log
    const actor = createActorFromRequest(
      request.headers,
      session.user?.openId,
      session.user?.name
    );

    auditInfo('export.pdf', actor, {
      target: {
        type: 'minutes',
        id: minutes.id,
        name: minutes.title,
      },
      metadata: {
        meetingId,
        htmlSize: html.length,
      },
      durationMs: Date.now() - startTime,
    });

    // 7. Return HTML response
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${encodeURIComponent(minutes.title)}-minutes.html"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error(
      '[POST /api/meetings/[id]/minutes/export/pdf] Unexpected error:',
      error
    );

    // Audit log the failure
    try {
      const actor = createActorFromRequest(request.headers);
      auditWarn('export.pdf', actor, {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          durationMs: Date.now() - startTime,
        },
      });
    } catch {
      // Ignore audit log errors
    }

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred during PDF export',
      500
    );
  }
}
