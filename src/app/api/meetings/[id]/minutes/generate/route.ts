/**
 * Minutes Generation API endpoint - Generate minutes from transcript
 * @module app/api/meetings/[id]/minutes/generate/route
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import {
  createMeetingService,
  MeetingNotFoundError,
  MeetingApiError,
} from '@/lib/lark/meeting';
import {
  createTranscriptService,
  TranscriptNotFoundError,
  TranscriptServiceError,
} from '@/services/transcript.service';
import {
  createMinutesGenerationService,
  MinutesGenerationError,
  type MinutesGenerationResult,
} from '@/services/minutes-generation.service';
import type { Minutes } from '@/types/minutes';

// =============================================================================
// Types
// =============================================================================

/**
 * Request body for minutes generation
 */
interface GenerateMinutesRequestBody {
  /** Output language (default: 'ja') */
  readonly language?: 'ja' | 'en' | undefined;
  /** Force regeneration (future use) */
  readonly regenerate?: boolean | undefined;
}

/**
 * Success response type
 */
interface GenerateMinutesSuccessResponse {
  readonly success: true;
  readonly data: {
    readonly minutes: Minutes;
    readonly processingTimeMs: number;
    readonly usage: {
      readonly inputTokens: number;
      readonly outputTokens: number;
    };
  };
}

/**
 * Error response type
 */
interface GenerateMinutesErrorResponse {
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
 * @param result - Minutes generation result
 * @returns NextResponse with success payload
 */
function createSuccessResponse(
  result: MinutesGenerationResult
): NextResponse<GenerateMinutesSuccessResponse> {
  const response: GenerateMinutesSuccessResponse = {
    success: true,
    data: {
      minutes: result.minutes,
      processingTimeMs: result.processingTimeMs,
      usage: result.usage,
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
): NextResponse<GenerateMinutesErrorResponse> {
  const response: GenerateMinutesErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Parse and validate request body
 *
 * @param request - Request object
 * @returns Parsed request body or null if invalid
 */
async function parseRequestBody(
  request: Request
): Promise<GenerateMinutesRequestBody | null> {
  try {
    const contentType = request.headers.get('content-type');

    // Allow empty body (use defaults)
    if (contentType === null || !contentType.includes('application/json')) {
      return {};
    }

    const text = await request.text();

    // Allow empty body
    if (text.trim() === '') {
      return {};
    }

    const body = JSON.parse(text) as unknown;

    if (typeof body !== 'object' || body === null) {
      return null;
    }

    const typedBody = body as Record<string, unknown>;

    // Validate and extract language
    let language: 'ja' | 'en' | undefined;
    if (typedBody['language'] !== undefined) {
      if (typedBody['language'] !== 'ja' && typedBody['language'] !== 'en') {
        return null;
      }
      language = typedBody['language'];
    }

    // Validate and extract regenerate
    let regenerate: boolean | undefined;
    if (typedBody['regenerate'] !== undefined) {
      if (typeof typedBody['regenerate'] !== 'boolean') {
        return null;
      }
      regenerate = typedBody['regenerate'];
    }

    return {
      language,
      regenerate,
    };
  } catch {
    return null;
  }
}

/**
 * Format meeting date to YYYY-MM-DD
 *
 * @param date - Date object
 * @returns Formatted date string
 */
function formatMeetingDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// =============================================================================
// Route Handler
// =============================================================================

/**
 * POST /api/meetings/[id]/minutes/generate
 *
 * Generate meeting minutes from transcript using AI.
 *
 * Path Parameters:
 * - id: string - Meeting ID
 *
 * Request Body (optional):
 * - language: 'ja' | 'en' - Output language (default: 'ja')
 * - regenerate: boolean - Force regeneration (future use)
 *
 * Response:
 * - 200: Successfully generated minutes
 * - 400: Invalid request body
 * - 401: Unauthorized (not authenticated)
 * - 404: Meeting not found or transcript not found
 * - 500: Generation failed or internal error
 *
 * @example
 * ```typescript
 * // Request
 * POST /api/meetings/meeting-123/minutes/generate
 * Content-Type: application/json
 * { "language": "ja" }
 *
 * // Success response
 * {
 *   "success": true,
 *   "data": {
 *     "minutes": {
 *       "id": "min_meeting-123_1234567890",
 *       "meetingId": "meeting-123",
 *       "title": "Weekly Standup",
 *       "summary": "...",
 *       "topics": [...],
 *       "decisions": [...],
 *       "actionItems": [...],
 *       "attendees": [...],
 *       "metadata": {...}
 *     },
 *     "processingTimeMs": 5000,
 *     "usage": {
 *       "inputTokens": 1000,
 *       "outputTokens": 500
 *     }
 *   }
 * }
 *
 * // Error response
 * {
 *   "success": false,
 *   "error": {
 *     "code": "TRANSCRIPT_NOT_FOUND",
 *     "message": "Transcript not found for this meeting"
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

    // 3. Parse request body
    const body = await parseRequestBody(request);

    if (body === null) {
      return createErrorResponse(
        'INVALID_REQUEST',
        'Invalid request body. Expected { language?: "ja" | "en", regenerate?: boolean }',
        400
      );
    }

    const language = body.language ?? 'ja';

    // 4. Get meeting information
    const larkClient = createLarkClient();
    const meetingService = createMeetingService(larkClient);

    let meeting;
    try {
      meeting = await meetingService.getMeetingById(
        session.accessToken,
        meetingId
      );
    } catch (error) {
      if (error instanceof MeetingNotFoundError) {
        return createErrorResponse(
          'MEETING_NOT_FOUND',
          `Meeting not found: ${meetingId}`,
          404
        );
      }

      if (error instanceof MeetingApiError) {
        console.error('[POST /api/meetings/[id]/minutes/generate] Meeting API error:', error);
        return createErrorResponse(
          'MEETING_NOT_FOUND',
          `Failed to fetch meeting: ${error.message}`,
          404
        );
      }

      throw error;
    }

    // 5. Get transcript
    const transcriptService = createTranscriptService();

    let transcript;
    try {
      transcript = await transcriptService.getTranscript(
        session.accessToken,
        meetingId
      );
    } catch (error) {
      if (error instanceof TranscriptNotFoundError) {
        return createErrorResponse(
          'TRANSCRIPT_NOT_FOUND',
          'Transcript not found for this meeting',
          404
        );
      }

      if (error instanceof TranscriptServiceError) {
        console.error('[POST /api/meetings/[id]/minutes/generate] Transcript service error:', error);
        return createErrorResponse(
          'TRANSCRIPT_NOT_FOUND',
          `Failed to fetch transcript: ${error.message}`,
          404
        );
      }

      throw error;
    }

    // 6. Generate minutes
    const minutesService = createMinutesGenerationService();

    let result: MinutesGenerationResult;
    try {
      result = await minutesService.generateMinutes({
        transcript,
        meeting: {
          id: meeting.id,
          title: meeting.title,
          date: formatMeetingDate(meeting.startTime),
          attendees: [], // Will be populated from transcript speakers
        },
        options: {
          language,
        },
      });
    } catch (error) {
      if (error instanceof MinutesGenerationError) {
        console.error('[POST /api/meetings/[id]/minutes/generate] Generation error:', error);

        // Handle specific generation errors
        if (error.code === 'MISSING_API_KEY') {
          return createErrorResponse(
            'GENERATION_FAILED',
            'AI service is not configured',
            500
          );
        }

        if (error.code === 'INVALID_INPUT') {
          return createErrorResponse(
            'GENERATION_FAILED',
            `Invalid input for generation: ${error.message}`,
            400
          );
        }

        return createErrorResponse(
          'GENERATION_FAILED',
          `Failed to generate minutes: ${error.message}`,
          500
        );
      }

      throw error;
    }

    // 7. Update minutes with meeting title
    const minutesWithTitle: Minutes = {
      ...result.minutes,
      title: meeting.title,
    };

    // 8. Return success response
    return createSuccessResponse({
      ...result,
      minutes: minutesWithTitle,
    });
  } catch (error) {
    console.error('[POST /api/meetings/[id]/minutes/generate] Unexpected error:', error);

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
}
