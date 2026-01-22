/**
 * Meeting Detail API endpoint - Get meeting by ID
 * @module app/api/meetings/[id]/route
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import {
  createMeetingService,
  MeetingNotFoundError,
  MeetingApiError,
} from '@/lib/lark/meeting';
import type { MeetingStatus, MeetingType, MinutesStatus } from '@/types/meeting';

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
 * Success response type for meeting detail
 */
interface MeetingDetailResponse {
  readonly data: {
    readonly id: string;
    readonly title: string;
    readonly meetingNo: string;
    readonly startTime: string;
    readonly endTime: string;
    readonly durationMinutes: number;
    readonly status: MeetingStatus;
    readonly type: MeetingType;
    readonly host: {
      readonly id: string;
      readonly name: string;
      readonly avatarUrl?: string;
    };
    readonly participantCount: number;
    readonly hasRecording: boolean;
    readonly recordingUrl?: string;
    readonly minutesStatus: MinutesStatus;
    readonly createdAt: string;
    readonly updatedAt: string;
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
 * GET /api/meetings/[id]
 *
 * Get meeting details by ID.
 *
 * Path Parameters:
 * - id: string - Meeting ID
 *
 * Response:
 * - 200: Meeting detail
 * - 401: Unauthorized
 * - 404: Meeting not found
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

    // Get meeting ID from path params
    const params = await context.params;
    const meetingId = params.id;

    if (meetingId === undefined || meetingId.trim() === '') {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Meeting ID is required',
        400
      );
    }

    // Create service and fetch meeting
    const client = createLarkClient();
    const meetingService = createMeetingService(client);

    const meeting = await meetingService.getMeetingById(
      session.accessToken,
      meetingId
    );

    // Transform response to API format (serialize dates)
    const response: MeetingDetailResponse = {
      data: {
        id: meeting.id,
        title: meeting.title,
        meetingNo: meeting.meetingNo,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
        durationMinutes: meeting.durationMinutes,
        status: meeting.status,
        type: meeting.type,
        host: {
          id: meeting.host.id,
          name: meeting.host.name,
          ...(meeting.host.avatarUrl !== undefined && {
            avatarUrl: meeting.host.avatarUrl,
          }),
        },
        participantCount: meeting.participantCount,
        hasRecording: meeting.hasRecording,
        ...(meeting.recordingUrl !== undefined && {
          recordingUrl: meeting.recordingUrl,
        }),
        minutesStatus: meeting.minutesStatus,
        createdAt: meeting.createdAt.toISOString(),
        updatedAt: meeting.updatedAt.toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/meetings/[id]] Error:', error);

    if (error instanceof MeetingNotFoundError) {
      return createErrorResponse(
        'NOT_FOUND',
        `Meeting not found: ${error.meetingId}`,
        404
      );
    }

    if (error instanceof MeetingApiError) {
      const statusCode = error.code >= 400 && error.code < 600 ? error.code : 500;
      return createErrorResponse(
        'LARK_API_ERROR',
        error.message,
        statusCode,
        error.details
      );
    }

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
}
