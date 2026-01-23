/**
 * Calendar Events API endpoint - List calendar events with pagination and filters
 * @module app/api/calendar/events/route
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import { createCalendarService, CalendarServiceError, type GetEventsOptions } from '@/services/calendar.service';
import type { CalendarEventStatus } from '@/types/calendar';

/**
 * Query parameters validation schema
 */
const calendarEventsQuerySchema = z.object({
  /** Start date (ISO string) */
  startDate: z
    .string()
    .transform((val) => {
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : date;
    }),
  /** End date (ISO string) */
  endDate: z
    .string()
    .transform((val) => {
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : date;
    }),
  /** Calendar ID (optional) */
  calendarId: z.string().optional(),
  /** Page size */
  pageSize: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return 20;
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || parsed < 1) return 20;
      return Math.min(parsed, 100);
    }),
  /** Page token for pagination */
  pageToken: z.string().optional(),
});

type CalendarEventsQueryParams = z.infer<typeof calendarEventsQuerySchema>;

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
 * Success response type for calendar events list
 */
interface CalendarEventsResponse {
  readonly data: ReadonlyArray<{
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
    readonly status: CalendarEventStatus;
    readonly location?: string;
    readonly isAllDay: boolean;
  }>;
  readonly pagination: {
    readonly hasMore: boolean;
    readonly nextPageToken?: string;
  };
}

/**
 * Parse query parameters from URL
 */
function parseQueryParams(url: URL): CalendarEventsQueryParams {
  const rawParams: Record<string, string | undefined> = {};

  const paramNames = ['startDate', 'endDate', 'calendarId', 'pageSize', 'pageToken'] as const;

  for (const name of paramNames) {
    const value = url.searchParams.get(name);
    if (value !== null) {
      rawParams[name] = value;
    }
  }

  return calendarEventsQuerySchema.parse(rawParams);
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
 * GET /api/calendar/events
 *
 * List calendar events with pagination and filtering support.
 *
 * Query Parameters:
 * - startDate: ISO string (required) - Start date for filtering
 * - endDate: ISO string (required) - End date for filtering
 * - calendarId: string (optional) - Specific calendar ID
 * - pageSize: number (default: 20, max: 100) - Items per page
 * - pageToken: string (optional) - Page token for pagination
 *
 * Response:
 * - 200: CalendarEventsResponse
 * - 400: Bad Request (invalid parameters)
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
    let params: CalendarEventsQueryParams;

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

    // Validate required parameters
    if (params.startDate === undefined || params.endDate === undefined) {
      return createErrorResponse(
        'MISSING_PARAMS',
        'startDate and endDate are required',
        400
      );
    }

    // Create service and fetch events
    const client = createLarkClient();
    const calendarService = createCalendarService(client, session.accessToken);

    const getEventsOptions: GetEventsOptions = {
      startDate: params.startDate,
      endDate: params.endDate,
      pageSize: params.pageSize,
    };

    if (params.calendarId !== undefined) {
      (getEventsOptions as { calendarId: string }).calendarId = params.calendarId;
    }
    if (params.pageToken !== undefined) {
      (getEventsOptions as { pageToken: string }).pageToken = params.pageToken;
    }

    const result = await calendarService.getEvents(getEventsOptions);

    // Transform response to API format
    const response: CalendarEventsResponse = {
      data: result.events.map((event) => {
        const eventData: CalendarEventsResponse['data'][number] = {
          eventId: event.eventId,
          summary: event.summary,
          startTime: event.startTime.toISOString(),
          endTime: event.endTime.toISOString(),
          attendees: event.attendees.map((a) => {
            const attendeeData: CalendarEventsResponse['data'][number]['attendees'][number] = {
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
        if (event.location !== undefined) {
          (eventData as { location: string }).location = event.location;
        }
        return eventData;
      }),
      pagination: {
        hasMore: result.hasMore,
      },
    };

    if (result.nextPageToken !== undefined) {
      (response.pagination as { nextPageToken: string }).nextPageToken = result.nextPageToken;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/calendar/events] Error:', error);

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
