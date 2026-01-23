/**
 * Participants API endpoint - Get meeting participants
 * @module app/api/meetings/[id]/participants/route
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import {
  MeetingService,
  MeetingNotFoundError,
  MeetingApiError,
} from '@/lib/lark/meeting';
import type { Participant } from '@/types/meeting';

/**
 * Query parameters validation schema
 */
const participantsQuerySchema = z.object({
  /** Page number (1-based) */
  page: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return 1;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }),
  /** Items per page */
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return 50;
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || parsed < 1) return 50;
      return Math.min(parsed, 100); // Max 100
    }),
});

type ParticipantsQueryParams = z.infer<typeof participantsQuerySchema>;

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
 * Participant data in API response format
 */
interface ParticipantResponseData {
  readonly id: string;
  readonly name: string;
  readonly avatarUrl?: string;
  readonly email?: string;
  readonly isHost: boolean;
  readonly joinTime?: string;
  readonly leaveTime?: string;
  readonly duration?: number;
}

/**
 * Success response type for participants list
 */
interface ParticipantsResponse {
  readonly data: readonly ParticipantResponseData[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly hasMore: boolean;
  };
}

/**
 * Route context with dynamic parameters
 */
interface RouteContext {
  readonly params: Promise<{ readonly id: string }>;
}

/**
 * Parse query parameters from URL
 */
function parseQueryParams(url: URL): ParticipantsQueryParams {
  const rawParams: Record<string, string | undefined> = {};

  const paramNames = ['page', 'limit'] as const;

  for (const name of paramNames) {
    const value = url.searchParams.get(name);
    if (value !== null) {
      rawParams[name] = value;
    }
  }

  return participantsQuerySchema.parse(rawParams);
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
 * Calculate participant duration in minutes
 */
function calculateDuration(joinTime: Date, leaveTime?: Date): number {
  const endTime = leaveTime ?? new Date();
  const durationMs = endTime.getTime() - joinTime.getTime();
  return Math.max(0, Math.round(durationMs / (1000 * 60)));
}

/**
 * Transform participant to API response format
 */
function transformParticipant(participant: Participant): ParticipantResponseData {
  return {
    id: participant.id,
    name: participant.name,
    isHost: participant.isHost,
    joinTime: participant.joinTime.toISOString(),
    duration: calculateDuration(participant.joinTime, participant.leaveTime),
    ...(participant.avatarUrl !== undefined && { avatarUrl: participant.avatarUrl }),
    ...(participant.email !== undefined && { email: participant.email }),
    ...(participant.leaveTime !== undefined && {
      leaveTime: participant.leaveTime.toISOString(),
    }),
  };
}

/**
 * GET /api/meetings/[id]/participants
 *
 * Get list of participants for a specific meeting.
 *
 * Path Parameters:
 * - id: string - Meeting ID
 *
 * Query Parameters:
 * - page: number (default: 1) - Page number
 * - limit: number (default: 50, max: 100) - Items per page
 *
 * Response:
 * - 200: ParticipantsResponse
 * - 400: Bad Request (invalid parameters)
 * - 401: Unauthorized
 * - 404: Not Found (meeting not found)
 * - 500: Internal Server Error
 */
export async function GET(
  request: Request,
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
    const { id: meetingId } = await context.params;

    if (meetingId === undefined || meetingId.trim() === '') {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Meeting ID is required',
        400
      );
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    let params: ParticipantsQueryParams;

    try {
      params = parseQueryParams(url);
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? error.issues.map((e) => e.message).join(', ')
          : 'Invalid query parameters';

      return createErrorResponse('INVALID_PARAMS', message, 400, {
        validationError: error instanceof z.ZodError ? error.issues : undefined,
      });
    }

    // Create service and fetch participants
    const client = createLarkClient();
    const meetingService = new MeetingService(client);

    const participants = await meetingService.getParticipants(
      session.accessToken,
      meetingId,
      { pageSize: params.limit }
    );

    // Apply client-side pagination since the Lark API uses token-based pagination
    const total = participants.length;
    const startIndex = (params.page - 1) * params.limit;
    const endIndex = startIndex + params.limit;
    const paginatedParticipants = participants.slice(startIndex, endIndex);
    const hasMore = endIndex < total;

    // Transform response to API format
    const response: ParticipantsResponse = {
      data: paginatedParticipants.map(transformParticipant),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        hasMore,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/meetings/[id]/participants] Error:', error);

    if (error instanceof MeetingNotFoundError) {
      return createErrorResponse(
        'NOT_FOUND',
        'Meeting not found',
        404,
        { meetingId: error.meetingId }
      );
    }

    if (error instanceof MeetingApiError) {
      return createErrorResponse(
        error.code.toString(),
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
