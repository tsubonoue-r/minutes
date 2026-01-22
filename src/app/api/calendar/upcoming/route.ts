/**
 * Upcoming Calendar Events API endpoint - Get upcoming events
 * @module app/api/calendar/upcoming/route
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import { createCalendarService, CalendarServiceError } from '@/services/calendar.service';
import type { CalendarEventStatus } from '@/types/calendar';

/**
 * Query parameters validation schema
 */
const upcomingEventsQuerySchema = z.object({
  /** Number of events to return */
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return 10;
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || parsed < 1) return 10;
      return Math.min(parsed, 50);
    }),
  /** Start from this date (ISO string) */
  from: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined;
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : date;
    }),
  /** Calendar ID (optional) */
  calendarId: z.string().optional(),
});

type UpcomingEventsQueryParams = z.infer<typeof upcomingEventsQuerySchema>;

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
 * Success response type for upcoming events
 */
interface UpcomingEventsResponse {
  readonly data: ReadonlyArray<{
    readonly eventId: string;
    readonly summary: string;
    readonly description?: string;
    readonly startTime: string;
    readonly endTime: string;
    readonly attendeesCount: number;
    readonly meetingId?: string;
    readonly minutesId?: string;
    readonly organizer: {
      readonly userId: string;
      readonly displayName: string;
    };
    readonly status: CalendarEventStatus;
    readonly location?: string;
    readonly isAllDay: boolean;
    /** Time until event starts in milliseconds */
    readonly startsIn: number;
    /** Human-readable time until event */
    readonly startsInDisplay: string;
  }>;
  readonly count: number;
}

/**
 * Parse query parameters from URL
 */
function parseQueryParams(url: URL): UpcomingEventsQueryParams {
  const rawParams: Record<string, string | undefined> = {};

  const paramNames = ['limit', 'from', 'calendarId'] as const;

  for (const name of paramNames) {
    const value = url.searchParams.get(name);
    if (value !== null) {
      rawParams[name] = value;
    }
  }

  return upcomingEventsQuerySchema.parse(rawParams);
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
 * Format time until event in human-readable format
 */
function formatTimeUntil(milliseconds: number): string {
  if (milliseconds < 0) {
    return 'Started';
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1 ? '1 day' : `${days} days`;
  }

  if (hours > 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }

  if (minutes > 0) {
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  }

  return 'Less than a minute';
}

/**
 * GET /api/calendar/upcoming
 *
 * Get upcoming calendar events.
 *
 * Query Parameters:
 * - limit: number (default: 10, max: 50) - Number of events to return
 * - from: ISO string (optional) - Start from this date (defaults to now)
 * - calendarId: string (optional) - Specific calendar ID
 *
 * Response:
 * - 200: UpcomingEventsResponse
 * - 401: Unauthorized
 * - 500: Internal Server Error
 */
export async function GET(request: Request): Promise<Response> {
  try {
    // Authentication check
    const session = await getSession();

    if (session === null || !session.isAuthenticated) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    if (session.accessToken === undefined) {
      return createErrorResponse('UNAUTHORIZED', 'Access token not found', 401);
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    let params: UpcomingEventsQueryParams;

    try {
      params = parseQueryParams(url);
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? error.errors.map((e) => e.message).join(', ')
          : 'Invalid query parameters';

      return createErrorResponse('INVALID_PARAMS', message, 400, {
        validationError: error instanceof z.ZodError ? error.errors : undefined,
      });
    }

    // Create service and fetch upcoming events
    const client = createLarkClient();
    const calendarService = createCalendarService(client, session.accessToken);

    const events = await calendarService.getUpcomingEvents({
      limit: params.limit,
      ...(params.from !== undefined ? { from: params.from } : {}),
      ...(params.calendarId !== undefined ? { calendarId: params.calendarId } : {}),
    });

    const now = new Date();

    // Transform response to API format
    const response: UpcomingEventsResponse = {
      data: events.map((event) => {
        const startsIn = event.startTime.getTime() - now.getTime();
        const eventData: UpcomingEventsResponse['data'][number] = {
          eventId: event.eventId,
          summary: event.summary,
          startTime: event.startTime.toISOString(),
          endTime: event.endTime.toISOString(),
          attendeesCount: event.attendees.length,
          organizer: {
            userId: event.organizer.userId,
            displayName: event.organizer.displayName,
          },
          status: event.status,
          isAllDay: event.isAllDay,
          startsIn,
          startsInDisplay: formatTimeUntil(startsIn),
        };
        if (event.description !== undefined) {
          (eventData as { description: string }).description = event.description;
        }
        if (event.meetingId !== undefined) {
          (eventData as { meetingId: string }).meetingId = event.meetingId;
        }
        if (event.minutesId !== undefined) {
          (eventData as { minutesId: string }).minutesId = event.minutesId;
        }
        if (event.location !== undefined) {
          (eventData as { location: string }).location = event.location;
        }
        return eventData;
      }),
      count: events.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/calendar/upcoming] Error:', error);

    if (error instanceof CalendarServiceError) {
      return createErrorResponse(
        error.code,
        error.message,
        error.statusCode,
        error.details
      );
    }

    return createErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
