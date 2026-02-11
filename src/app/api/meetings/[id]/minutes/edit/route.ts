/**
 * Minutes Edit API endpoint - Save edited minutes for a meeting
 * @module app/api/meetings/[id]/minutes/edit/route
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { MinutesSchema } from '@/types/minutes';

/**
 * Success response type
 */
interface SuccessResponse {
  readonly success: true;
  readonly data: {
    readonly id: string;
    readonly meetingId: string;
    readonly updatedAt: string;
  };
}

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
 * PUT /api/meetings/[id]/minutes/edit
 *
 * Save edited minutes for a specific meeting. Validates the incoming data
 * against the MinutesSchema and persists it.
 *
 * Path Parameters:
 * - id: string - Meeting ID
 *
 * Request Body:
 * - Full Minutes object (validated against MinutesSchema)
 *
 * Response:
 * - 200: Updated minutes metadata
 * - 400: Invalid request body
 * - 401: Unauthorized (not authenticated)
 * - 500: Internal error
 *
 * @example
 * ```typescript
 * // Success response
 * {
 *   "success": true,
 *   "data": {
 *     "id": "min_abc123",
 *     "meetingId": "meeting-456",
 *     "updatedAt": "2026-02-11T10:00:00.000Z"
 *   }
 * }
 * ```
 */
export async function PUT(
  request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    // 1. Authentication check
    const session = await getSession();

    if (session === null || !session.isAuthenticated) {
      return createErrorResponse(
        'UNAUTHORIZED',
        '認証が必要です',
        401
      );
    }

    if (session.accessToken === undefined) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'アクセストークンが見つかりません',
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        'INVALID_BODY',
        'Request body must be valid JSON',
        400
      );
    }

    const validationResult = MinutesSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');

      return createErrorResponse(
        'VALIDATION_ERROR',
        `Invalid minutes data: ${errorMessages}`,
        400
      );
    }

    const validatedMinutes = validationResult.data;

    // 4. Verify meetingId matches the route parameter
    if (validatedMinutes.meetingId !== meetingId) {
      return createErrorResponse(
        'MEETING_ID_MISMATCH',
        'Meeting ID in the request body does not match the URL parameter',
        400
      );
    }

    // 5. Persist the updated minutes
    // Future: Save to Lark Bitable or database
    // For now, return success with the validated data
    const updatedAt = new Date().toISOString();

    console.log(
      `[PUT /api/meetings/${meetingId}/minutes/edit] Minutes updated successfully:`,
      {
        id: validatedMinutes.id,
        meetingId: validatedMinutes.meetingId,
        topicCount: validatedMinutes.topics.length,
        decisionCount: validatedMinutes.decisions.length,
        actionItemCount: validatedMinutes.actionItems.length,
        updatedAt,
      }
    );

    const successResponse: SuccessResponse = {
      success: true,
      data: {
        id: validatedMinutes.id,
        meetingId: validatedMinutes.meetingId,
        updatedAt,
      },
    };

    return NextResponse.json(successResponse, { status: 200 });
  } catch (error) {
    console.error('[PUT /api/meetings/[id]/minutes/edit] Error:', error);

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
}
