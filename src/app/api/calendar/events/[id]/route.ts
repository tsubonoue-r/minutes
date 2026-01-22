/**
 * Calendar Event API endpoint - Get single calendar event by ID
 * @module app/api/calendar/events/[id]/route
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import { createCalendarService, CalendarServiceError } from '@/services/calendar.service';
import type { CalendarEventStatus } from '@/types/calendar';

/**
 * Route params type
 */
interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Query parameters validation schema
 */
const querySchema = z.object({
  calendarId: z.string().optional(),
});

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
 * Success response type for single calendar event
 */
interface CalendarEventResponse {
  readonly data: {
    readonly eventId: string;
    readonly summary: string;
    readonly description?: string;
    readonly startTime: string;
    readonly endTime: string;
    readonly attendees: ReadonlyArray<{
      readonly userId: string;
      readonly displayName: string;
      readonly email?: string;
      readonly avatarUrl?: string;
      readonly isOptional: boolean;
      readonly responseStatus: string;
    }>;
    readonly meetingId?: string;
    readonly minutesId?: string;
    readonly organizer: {
      readonly userId: string;
      readonly displayName: string;
      readonly email?: string;
    };
    readonly recurrence?: {
      readonly frequency: string;
      readonly interval: number;
      readonly byDay?: readonly string[];
      readonly byMonthDay?: number;
      readonly until?: string;
      readonly count?: number;
    };
    readonly status: CalendarEventStatus;
    readonly location?: string;
    readonly isAllDay: boolean;
    readonly calendarId?: string;
    readonly createdAt?: string;
    readonly updatedAt?: string;
  };
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
 * GET /api/calendar/events/[id]
 *
 * Get a single calendar event by ID.
 *
 * Path Parameters:
 * - id: string - The event ID
 *
 * Query Parameters:
 * - calendarId: string (optional) - Specific calendar ID
 *
 * Response:
 * - 200: CalendarEventResponse
 * - 401: Unauthorized
 * - 404: Event not found
 * - 500: Internal Server Error
 */
export async function GET(
  request: Request,
  context: RouteParams
): Promise<Response> {
  try {
    // Authentication check
    const session = await getSession();

    if (session === null || !session.isAuthenticated) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    if (session.accessToken === undefined) {
      return createErrorResponse('UNAUTHORIZED', 'Access token not found', 401);
    }

    // Get event ID from params
    const params = await context.params;
    const eventId = params.id;

    if (eventId === undefined || eventId === '') {
      return createErrorResponse('INVALID_PARAMS', 'Event ID is required', 400);
    }

    // Parse query parameters
    const url = new URL(request.url);
    const calendarId = url.searchParams.get('calendarId') ?? undefined;

    // Create service and fetch event
    const client = createLarkClient();
    const calendarService = createCalendarService(client, session.accessToken);

    const event = await calendarService.getEventById(eventId, calendarId);

    // Transform response to API format
    const eventData: CalendarEventResponse['data'] = {
      eventId: event.eventId,
      summary: event.summary,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      attendees: event.attendees.map((a) => {
        const attendeeData: CalendarEventResponse['data']['attendees'][number] = {
          userId: a.userId,
          displayName: a.displayName,
          isOptional: a.isOptional,
          responseStatus: a.responseStatus,
        };
        if (a.email !== undefined) {
          (attendeeData as { email: string }).email = a.email;
        }
        if (a.avatarUrl !== undefined) {
          (attendeeData as { avatarUrl: string }).avatarUrl = a.avatarUrl;
        }
        return attendeeData;
      }),
      organizer: {
        userId: event.organizer.userId,
        displayName: event.organizer.displayName,
      },
      status: event.status,
      isAllDay: event.isAllDay,
    };

    // Add optional fields
    if (event.description !== undefined) {
      (eventData as { description: string }).description = event.description;
    }
    if (event.meetingId !== undefined) {
      (eventData as { meetingId: string }).meetingId = event.meetingId;
    }
    if (event.minutesId !== undefined) {
      (eventData as { minutesId: string }).minutesId = event.minutesId;
    }
    if (event.organizer.email !== undefined) {
      (eventData.organizer as { email: string }).email = event.organizer.email;
    }
    if (event.recurrence !== undefined) {
      const recurrenceData: NonNullable<CalendarEventResponse['data']['recurrence']> = {
        frequency: event.recurrence.frequency,
        interval: event.recurrence.interval,
      };
      if (event.recurrence.byDay !== undefined) {
        (recurrenceData as { byDay: readonly string[] }).byDay = event.recurrence.byDay;
      }
      if (event.recurrence.byMonthDay !== undefined) {
        (recurrenceData as { byMonthDay: number }).byMonthDay = event.recurrence.byMonthDay;
      }
      if (event.recurrence.until !== undefined) {
        (recurrenceData as { until: string }).until = event.recurrence.until.toISOString();
      }
      if (event.recurrence.count !== undefined) {
        (recurrenceData as { count: number }).count = event.recurrence.count;
      }
      (eventData as { recurrence: typeof recurrenceData }).recurrence = recurrenceData;
    }
    if (event.location !== undefined) {
      (eventData as { location: string }).location = event.location;
    }
    if (event.calendarId !== undefined) {
      (eventData as { calendarId: string }).calendarId = event.calendarId;
    }
    if (event.createdAt !== undefined) {
      (eventData as { createdAt: string }).createdAt = event.createdAt.toISOString();
    }
    if (event.updatedAt !== undefined) {
      (eventData as { updatedAt: string }).updatedAt = event.updatedAt.toISOString();
    }

    const response: CalendarEventResponse = {
      data: eventData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/calendar/events/[id]] Error:', error);

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
