/**
 * Minutes Export API endpoint - Export minutes to Lark Docs
 * @module app/api/meetings/[id]/minutes/export/route
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import {
  createDocsExportService,
  DocsExportError,
  type DocsExportInput,
} from '@/services/docs-export.service';
import { MinutesSchema } from '@/types/minutes';

// =============================================================================
// Zod Schemas for Request Validation
// =============================================================================

/**
 * Schema for export options
 */
const ExportOptionsSchema = z.object({
  title: z.string().min(1).optional(),
  folderId: z.string().min(1).optional(),
  shareWithAttendees: z.boolean().default(true),
  permission: z.enum(['view', 'edit']).default('view'),
  language: z.enum(['ja', 'en']).default('ja'),
});

/**
 * Schema for export request body
 */
const ExportRequestSchema = z.object({
  minutes: MinutesSchema,
  options: ExportOptionsSchema.optional(),
});

/**
 * Validated export request type
 */
type ExportRequest = z.infer<typeof ExportRequestSchema>;

// =============================================================================
// Types
// =============================================================================

/**
 * Success response type
 */
interface ExportMinutesSuccessResponse {
  readonly success: true;
  readonly data: {
    readonly documentId: string;
    readonly documentUrl: string;
    readonly title: string;
    readonly sharedWith: readonly string[];
  };
}

/**
 * Error response type
 */
interface ExportMinutesErrorResponse {
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
 * Create success response
 *
 * @param data - Export result data
 * @returns NextResponse with success payload
 */
function createSuccessResponse(data: {
  documentId: string;
  documentUrl: string;
  title: string;
  sharedWith: readonly string[];
}): NextResponse<ExportMinutesSuccessResponse> {
  const response: ExportMinutesSuccessResponse = {
    success: true,
    data: {
      documentId: data.documentId,
      documentUrl: data.documentUrl,
      title: data.title,
      sharedWith: data.sharedWith,
    },
  };

  return NextResponse.json(response);
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
): NextResponse<ExportMinutesErrorResponse> {
  const response: ExportMinutesErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Parse and validate request body using Zod
 *
 * @param request - Request object
 * @returns Parsed and validated request body or null with error details
 */
async function parseRequestBody(
  request: Request
): Promise<{ data: ExportRequest } | { error: string }> {
  try {
    const contentType = request.headers.get('content-type');

    if (contentType === null || !contentType.includes('application/json')) {
      return { error: 'Content-Type must be application/json' };
    }

    const text = await request.text();

    if (text.trim() === '') {
      return { error: 'Request body is required' };
    }

    const body = JSON.parse(text) as unknown;
    const result = ExportRequestSchema.safeParse(body);

    if (!result.success) {
      const errorMessage = result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      return { error: errorMessage };
    }

    return { data: result.data };
  } catch (parseError) {
    if (parseError instanceof SyntaxError) {
      return { error: 'Invalid JSON in request body' };
    }
    return { error: 'Failed to parse request body' };
  }
}

/**
 * Build DocsExportInput from validated request
 *
 * @param request - Validated export request
 * @returns DocsExportInput for service
 */
function buildExportInput(request: ExportRequest): DocsExportInput {
  const options = request.options;

  // Use defaults when options is undefined
  if (options === undefined) {
    return {
      minutes: request.minutes,
      options: {
        shareWithAttendees: true,
        permission: 'view',
        language: 'ja',
      },
    };
  }

  return {
    minutes: request.minutes,
    options: {
      title: options.title,
      folderId: options.folderId,
      shareWithAttendees: options.shareWithAttendees,
      permission: options.permission,
      language: options.language,
    },
  };
}

// =============================================================================
// Route Handler
// =============================================================================

/**
 * POST /api/meetings/[id]/minutes/export
 *
 * Export meeting minutes to Lark Docs.
 *
 * Path Parameters:
 * - id: string - Meeting ID (used for validation/logging)
 *
 * Request Body:
 * - minutes: Minutes - The minutes data to export (required)
 * - options: object - Export options (optional)
 *   - title: string - Custom document title
 *   - folderId: string - Target folder ID
 *   - shareWithAttendees: boolean - Share with attendees (default: true)
 *   - permission: 'view' | 'edit' - Permission level (default: 'view')
 *   - language: 'ja' | 'en' - Output language (default: 'ja')
 *
 * Response:
 * - 200: Successfully exported minutes
 * - 400: Invalid request body or parameters
 * - 401: Unauthorized (not authenticated)
 * - 500: Export failed or internal error
 *
 * @example
 * ```typescript
 * // Request
 * POST /api/meetings/meeting-123/minutes/export
 * Content-Type: application/json
 * {
 *   "minutes": {
 *     "id": "min_xxx",
 *     "meetingId": "meeting-123",
 *     "title": "Weekly Standup",
 *     "date": "2024-01-15",
 *     "duration": 3600000,
 *     "summary": "...",
 *     "topics": [...],
 *     "decisions": [...],
 *     "actionItems": [...],
 *     "attendees": [...],
 *     "metadata": {...}
 *   },
 *   "options": {
 *     "shareWithAttendees": true,
 *     "permission": "view",
 *     "language": "ja"
 *   }
 * }
 *
 * // Success response
 * {
 *   "success": true,
 *   "data": {
 *     "documentId": "doc_xxx",
 *     "documentUrl": "https://xxx.feishu.cn/docs/xxx",
 *     "title": "Weekly Standup 議事録",
 *     "sharedWith": ["user1@example.com"]
 *   }
 * }
 *
 * // Error response
 * {
 *   "success": false,
 *   "error": {
 *     "code": "EXPORT_FAILED",
 *     "message": "Failed to export minutes to Lark Docs"
 *   }
 * }
 * ```
 */
export async function POST(
  request: Request,
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

    // 2. Get meeting ID from path params (for validation/logging)
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
    const parseResult = await parseRequestBody(request);

    if ('error' in parseResult) {
      return createErrorResponse(
        'INVALID_REQUEST',
        parseResult.error,
        400
      );
    }

    const { data: requestData } = parseResult;

    // 4. Verify meeting ID matches minutes data
    if (requestData.minutes.meetingId !== meetingId) {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Meeting ID in URL does not match minutes data',
        400
      );
    }

    // 5. Build export input
    const exportInput = buildExportInput(requestData);

    // 6. Execute export
    const exportService = createDocsExportService();

    let exportResult;
    try {
      exportResult = await exportService.exportMinutes(
        session.accessToken,
        exportInput
      );
    } catch (error) {
      if (error instanceof DocsExportError) {
        console.error(
          '[POST /api/meetings/[id]/minutes/export] Export error:',
          error.code,
          error.message,
          error.details
        );

        // Map specific error codes
        if (error.code === 'IMPORT_TIMEOUT') {
          return createErrorResponse(
            'EXPORT_FAILED',
            'Document creation timed out. Please try again.',
            500
          );
        }

        if (error.code === 'IMPORT_FAILED') {
          return createErrorResponse(
            'EXPORT_FAILED',
            'Failed to create document in Lark Docs.',
            500
          );
        }

        if (error.code.startsWith('DOCS_API_')) {
          return createErrorResponse(
            'EXPORT_FAILED',
            `Lark Docs API error: ${error.message}`,
            500
          );
        }

        return createErrorResponse(
          'EXPORT_FAILED',
          `Failed to export minutes: ${error.message}`,
          500
        );
      }

      throw error;
    }

    // 7. Return success response
    return createSuccessResponse({
      documentId: exportResult.documentId,
      documentUrl: exportResult.documentUrl,
      title: exportResult.title,
      sharedWith: exportResult.sharedWith,
    });
  } catch (error) {
    console.error(
      '[POST /api/meetings/[id]/minutes/export] Unexpected error:',
      error
    );

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
}
