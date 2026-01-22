/**
 * Transcript API endpoint - Get transcript for a meeting
 * @module app/api/meetings/[id]/transcript/route
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import {
  createTranscriptService,
  TranscriptNotFoundError,
  TranscriptServiceError,
} from '@/services/transcript.service';
import type { Transcript } from '@/types/transcript';

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
 * Success response type for transcript
 */
interface TranscriptResponse {
  readonly data: Transcript;
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
 * @param details - Optional error details
 * @returns NextResponse with error payload
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

/**
 * GET /api/meetings/[id]/transcript
 *
 * Get transcript data for a specific meeting.
 *
 * Path Parameters:
 * - id: string - Meeting ID
 *
 * Response:
 * - 200: Transcript data
 * - 401: Unauthorized (not authenticated)
 * - 404: Transcript not found
 * - 500: Internal Server Error
 *
 * @example
 * ```typescript
 * // Success response
 * {
 *   "data": {
 *     "meetingId": "meeting-123",
 *     "language": "ja",
 *     "segments": [
 *       {
 *         "id": "seg-1",
 *         "startTime": 0,
 *         "endTime": 15200,
 *         "speaker": { "id": "user-1", "name": "Tanaka Taro" },
 *         "text": "Let's start the weekly meeting.",
 *         "confidence": 0.95
 *       }
 *     ],
 *     "totalDuration": 3600000,
 *     "createdAt": "2026-01-22T10:00:00.000Z"
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

    // 3. Create service and fetch transcript
    const transcriptService = createTranscriptService();

    const transcript = await transcriptService.getTranscript(
      session.accessToken,
      meetingId
    );

    // 4. Return success response
    const response: TranscriptResponse = {
      data: transcript,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/meetings/[id]/transcript] Error:', error);

    // 5. Error handling

    // Handle transcript not found
    if (error instanceof TranscriptNotFoundError) {
      return createErrorResponse(
        'NOT_FOUND',
        `Transcript not found for meeting: ${error.meetingId}`,
        404
      );
    }

    // Handle transcript service errors
    if (error instanceof TranscriptServiceError) {
      const statusCode =
        error.statusCode >= 400 && error.statusCode < 600
          ? error.statusCode
          : 500;

      return createErrorResponse(
        error.code,
        error.message,
        statusCode,
        error.details
      );
    }

    // Handle unknown errors
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
}
