/**
 * Recordings API endpoint - Get recordings for a specific meeting
 * @module app/api/meetings/[id]/recordings/route
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import {
  createMeetingService,
  MeetingNotFoundError,
  MeetingApiError,
} from '@/lib/lark/meeting';
import type { Recording } from '@/types/meeting';

/**
 * Recording status type
 */
type RecordingStatus = 'ready' | 'processing' | 'failed';

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
 * Recording response item
 */
interface RecordingResponseItem {
  readonly id: string;
  readonly url: string;
  readonly duration: number;
  readonly fileSize?: number;
  readonly format?: string;
  readonly createdAt: string;
  readonly status: RecordingStatus;
}

/**
 * Success response type for recordings list
 */
interface RecordingsResponse {
  readonly data: readonly RecordingResponseItem[];
}

/**
 * Route segment config for dynamic parameters
 */
interface RouteContext {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

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

/**
 * Transform Recording to API response format
 */
function transformRecordingToResponse(recording: Recording): RecordingResponseItem {
  return {
    id: recording.id,
    url: recording.url,
    duration: recording.durationSeconds,
    createdAt: recording.startTime.toISOString(),
    status: 'ready' as RecordingStatus,
  };
}

/**
 * GET /api/meetings/[id]/recordings
 *
 * Get list of recordings for a specific meeting.
 *
 * Path Parameters:
 * - id: Meeting ID
 *
 * Response:
 * - 200: RecordingsResponse
 * - 401: Unauthorized
 * - 404: Meeting Not Found
 * - 500: Internal Server Error
 */
export async function GET(
  _request: Request,
  context: RouteContext
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

    if (session.accessToken === undefined) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'Access token not found',
        401
      );
    }

    // Get meeting ID from path parameters
    const params = await context.params;
    const meetingId = params.id;

    if (meetingId === undefined || meetingId === '') {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Meeting ID is required',
        400
      );
    }

    // Create service and fetch recordings
    const client = createLarkClient();
    const meetingService = createMeetingService(client);

    const recordings = await meetingService.getRecordings(
      session.accessToken,
      meetingId
    );

    // Transform response to API format
    const response: RecordingsResponse = {
      data: recordings.map(transformRecordingToResponse),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/meetings/[id]/recordings] Error:', error);

    if (error instanceof MeetingNotFoundError) {
      return createErrorResponse(
        'NOT_FOUND',
        `Meeting not found: ${error.meetingId}`,
        404
      );
    }

    if (error instanceof MeetingApiError) {
      return createErrorResponse(
        'API_ERROR',
        error.message,
        error.code >= 400 && error.code < 600 ? error.code : 500,
        { operation: error.operation, details: error.details }
      );
    }

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
}
