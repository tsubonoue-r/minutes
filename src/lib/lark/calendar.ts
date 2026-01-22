/**
 * Lark Calendar API Client
 * @module lib/lark/calendar
 */

import { z } from 'zod';
import type { LarkClient } from './client';
import { LarkClientError } from './client';
import type { LarkApiResponse } from './types';
import { larkApiResponseSchema } from './types';
import type {
  CalendarEvent,
  CalendarFilter,
  Attendee,
  Organizer,
  RecurrenceRule,
  CalendarEventStatus,
  AttendeeResponseStatus,
  RecurrenceFrequency,
} from '@/types/calendar';

// =============================================================================
// Lark Calendar API Types
// =============================================================================

/**
 * Lark Calendar API endpoints
 */
export const LarkCalendarApiEndpoints = {
  /** List calendars */
  CALENDAR_LIST: '/open-apis/calendar/v4/calendars',
  /** Get calendar by ID */
  CALENDAR_GET: '/open-apis/calendar/v4/calendars/:calendar_id',
  /** List calendar events */
  CALENDAR_EVENTS: '/open-apis/calendar/v4/calendars/:calendar_id/events',
  /** Get single event */
  CALENDAR_EVENT_GET: '/open-apis/calendar/v4/calendars/:calendar_id/events/:event_id',
  /** Search events */
  CALENDAR_EVENTS_SEARCH: '/open-apis/calendar/v4/calendars/search_events',
  /** Get primary calendar */
  PRIMARY_CALENDAR: '/open-apis/calendar/v4/calendars/primary',
} as const;

/**
 * Lark attendee schema
 */
export const larkAttendeeSchema = z.object({
  type: z.enum(['user', 'third_party']),
  user_id: z.string().optional(),
  display_name: z.string().optional(),
  email: z.string().optional(),
  avatar_url: z.string().optional(),
  is_optional: z.boolean().optional(),
  rsvp_status: z.enum(['needs_action', 'accept', 'decline', 'tentative']).optional(),
});

export type LarkAttendee = z.infer<typeof larkAttendeeSchema>;

/**
 * Lark event organizer schema
 */
export const larkOrganizerSchema = z.object({
  user_id: z.string(),
  display_name: z.string().optional(),
  email: z.string().optional(),
});

export type LarkOrganizer = z.infer<typeof larkOrganizerSchema>;

/**
 * Lark recurrence rule schema
 */
export const larkRecurrenceSchema = z.object({
  rrule: z.string().optional(),
  freq: z.string().optional(),
  interval: z.number().optional(),
  until: z.string().optional(),
  count: z.number().optional(),
  byday: z.string().optional(),
  bymonthday: z.number().optional(),
});

export type LarkRecurrence = z.infer<typeof larkRecurrenceSchema>;

/**
 * Lark event time schema
 */
export const larkEventTimeSchema = z.object({
  date: z.string().optional(),
  timestamp: z.string().optional(),
  timezone: z.string().optional(),
});

export type LarkEventTime = z.infer<typeof larkEventTimeSchema>;

/**
 * Lark calendar event schema
 */
export const larkCalendarEventSchema = z.object({
  event_id: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  start_time: larkEventTimeSchema,
  end_time: larkEventTimeSchema,
  attendee_ability: z.enum(['can_invite_others', 'can_see_others', 'none']).optional(),
  attendees: z.array(larkAttendeeSchema).optional(),
  organizer: larkOrganizerSchema.optional(),
  rrule: z.string().optional(),
  recurrence: larkRecurrenceSchema.optional(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
  location: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
  is_all_day: z.boolean().optional(),
  color: z.number().optional(),
  visibility: z.enum(['default', 'public', 'private']).optional(),
  create_time: z.string().optional(),
  update_time: z.string().optional(),
  // Lark-specific meeting link
  vc_chat_id: z.string().optional(),
  meeting_url: z.string().optional(),
});

export type LarkCalendarEvent = z.infer<typeof larkCalendarEventSchema>;

/**
 * Lark calendar events list data schema
 */
export const larkCalendarEventsListDataSchema = z.object({
  has_more: z.boolean(),
  page_token: z.string().optional(),
  items: z.array(larkCalendarEventSchema),
});

export type LarkCalendarEventsListData = z.infer<typeof larkCalendarEventsListDataSchema>;

/**
 * Lark calendar events list response schema
 */
export const larkCalendarEventsListResponseSchema = larkApiResponseSchema(
  larkCalendarEventsListDataSchema
);

export type LarkCalendarEventsListResponse = z.infer<typeof larkCalendarEventsListResponseSchema>;

/**
 * Lark single event data schema
 */
export const larkSingleEventDataSchema = z.object({
  event: larkCalendarEventSchema,
});

export type LarkSingleEventData = z.infer<typeof larkSingleEventDataSchema>;

/**
 * Lark single event response schema
 */
export const larkSingleEventResponseSchema = larkApiResponseSchema(larkSingleEventDataSchema);

export type LarkSingleEventResponse = z.infer<typeof larkSingleEventResponseSchema>;

/**
 * Lark primary calendar data schema
 */
export const larkPrimaryCalendarDataSchema = z.object({
  calendars: z.array(z.object({
    calendar_id: z.string(),
    summary: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    is_primary: z.boolean().optional(),
  })),
});

export type LarkPrimaryCalendarData = z.infer<typeof larkPrimaryCalendarDataSchema>;

/**
 * Lark primary calendar response schema
 */
export const larkPrimaryCalendarResponseSchema = larkApiResponseSchema(larkPrimaryCalendarDataSchema);

export type LarkPrimaryCalendarResponse = z.infer<typeof larkPrimaryCalendarResponseSchema>;

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown when a calendar event is not found
 */
export class CalendarEventNotFoundError extends Error {
  constructor(
    public readonly eventId: string,
    message?: string
  ) {
    super(message ?? `Calendar event not found: ${eventId}`);
    this.name = 'CalendarEventNotFoundError';
  }
}

/**
 * Error thrown when a calendar API operation fails
 */
export class CalendarApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly operation: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CalendarApiError';
  }

  /**
   * Create from LarkClientError
   */
  static fromLarkClientError(
    error: LarkClientError,
    operation: string
  ): CalendarApiError {
    return new CalendarApiError(error.message, error.code, operation, error.details);
  }
}

// =============================================================================
// Data Transformation Functions
// =============================================================================

/**
 * Parse Lark timestamp to Date
 * @param eventTime - Lark event time object
 * @returns JavaScript Date
 */
function parseLarkEventTime(eventTime: LarkEventTime): Date {
  if (eventTime.timestamp !== undefined) {
    // Timestamp is in seconds
    return new Date(parseInt(eventTime.timestamp, 10) * 1000);
  }
  if (eventTime.date !== undefined) {
    // Date string format: YYYY-MM-DD
    return new Date(eventTime.date);
  }
  return new Date();
}

/**
 * Map Lark RSVP status to our attendee response status
 */
function mapLarkRsvpStatus(rsvpStatus?: string): AttendeeResponseStatus {
  const statusMap: Record<string, AttendeeResponseStatus> = {
    accept: 'accepted',
    decline: 'declined',
    tentative: 'tentative',
    needs_action: 'needs_action',
  };
  return statusMap[rsvpStatus ?? 'needs_action'] ?? 'needs_action';
}

/**
 * Map Lark event status to our calendar event status
 */
function mapLarkEventStatus(status?: string): CalendarEventStatus {
  const statusMap: Record<string, CalendarEventStatus> = {
    confirmed: 'confirmed',
    tentative: 'tentative',
    cancelled: 'cancelled',
  };
  return statusMap[status ?? 'confirmed'] ?? 'confirmed';
}

/**
 * Parse Lark recurrence frequency
 */
function parseLarkRecurrenceFrequency(freq?: string): RecurrenceFrequency | undefined {
  if (freq === undefined) return undefined;
  const freqMap: Record<string, RecurrenceFrequency> = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
  };
  return freqMap[freq.toUpperCase()];
}

/**
 * Parse Lark recurrence byday string
 */
function parseLarkByDay(byday?: string): Array<'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'> | undefined {
  if (byday === undefined) return undefined;
  const validDays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
  const days = byday.split(',').map((d) => d.trim().toUpperCase());
  return days.filter((d): d is typeof validDays[number] =>
    validDays.includes(d as typeof validDays[number])
  );
}

/**
 * Transform Lark attendee to application Attendee format
 */
export function transformLarkAttendee(larkAttendee: LarkAttendee): Attendee {
  return {
    userId: larkAttendee.user_id ?? '',
    displayName: larkAttendee.display_name ?? 'Unknown',
    email: larkAttendee.email,
    avatarUrl: larkAttendee.avatar_url,
    isOptional: larkAttendee.is_optional ?? false,
    responseStatus: mapLarkRsvpStatus(larkAttendee.rsvp_status),
  };
}

/**
 * Transform Lark organizer to application Organizer format
 */
export function transformLarkOrganizer(larkOrganizer: LarkOrganizer): Organizer {
  return {
    userId: larkOrganizer.user_id,
    displayName: larkOrganizer.display_name ?? 'Unknown',
    email: larkOrganizer.email,
  };
}

/**
 * Transform Lark recurrence to application RecurrenceRule format
 */
export function transformLarkRecurrence(
  larkRecurrence?: LarkRecurrence
): RecurrenceRule | undefined {
  if (larkRecurrence === undefined) return undefined;

  const frequency = parseLarkRecurrenceFrequency(larkRecurrence.freq);
  if (frequency === undefined) return undefined;

  return {
    frequency,
    interval: larkRecurrence.interval ?? 1,
    byDay: parseLarkByDay(larkRecurrence.byday),
    byMonthDay: larkRecurrence.bymonthday,
    until: larkRecurrence.until !== undefined
      ? new Date(larkRecurrence.until)
      : undefined,
    count: larkRecurrence.count,
  };
}

/**
 * Transform Lark calendar event to application CalendarEvent format
 * @param larkEvent - Event data from Lark API
 * @returns Transformed CalendarEvent object for application use
 */
export function transformLarkCalendarEvent(larkEvent: LarkCalendarEvent): CalendarEvent {
  const startTime = parseLarkEventTime(larkEvent.start_time);
  const endTime = parseLarkEventTime(larkEvent.end_time);

  return {
    eventId: larkEvent.event_id,
    summary: larkEvent.summary ?? 'Untitled Event',
    description: larkEvent.description,
    startTime,
    endTime,
    attendees: (larkEvent.attendees ?? []).map(transformLarkAttendee),
    meetingId: larkEvent.vc_chat_id,
    organizer: larkEvent.organizer !== undefined
      ? transformLarkOrganizer(larkEvent.organizer)
      : { userId: '', displayName: 'Unknown' },
    recurrence: transformLarkRecurrence(larkEvent.recurrence),
    status: mapLarkEventStatus(larkEvent.status),
    location: larkEvent.location?.name ?? larkEvent.location?.address,
    isAllDay: larkEvent.is_all_day ?? false,
    createdAt: larkEvent.create_time !== undefined
      ? new Date(parseInt(larkEvent.create_time, 10) * 1000)
      : undefined,
    updatedAt: larkEvent.update_time !== undefined
      ? new Date(parseInt(larkEvent.update_time, 10) * 1000)
      : undefined,
  };
}

// =============================================================================
// CalendarClient Class
// =============================================================================

/**
 * Pagination options for calendar API requests
 */
export interface CalendarPaginationOptions {
  /** Page size (number of items per page) */
  readonly pageSize?: number | undefined;
  /** Page token for pagination */
  readonly pageToken?: string | undefined;
}

/**
 * Options for getting calendar events
 */
export interface GetCalendarEventsOptions {
  /** Calendar ID (defaults to primary) */
  readonly calendarId?: string | undefined;
  /** Start time for filtering (Unix timestamp) */
  readonly startTime?: Date | undefined;
  /** End time for filtering (Unix timestamp) */
  readonly endTime?: Date | undefined;
  /** Pagination options */
  readonly pagination?: CalendarPaginationOptions | undefined;
}

/**
 * Options for searching calendar events
 */
export interface SearchCalendarEventsOptions {
  /** Search query */
  readonly query: string;
  /** Calendar IDs to search in */
  readonly calendarIds?: readonly string[] | undefined;
  /** Start time for filtering */
  readonly startTime?: Date | undefined;
  /** End time for filtering */
  readonly endTime?: Date | undefined;
  /** Maximum results */
  readonly limit?: number | undefined;
}

/**
 * Calendar events list result
 */
export interface CalendarEventsListResult {
  /** List of events */
  readonly events: readonly CalendarEvent[];
  /** Whether there are more results */
  readonly hasMore: boolean;
  /** Next page token */
  readonly nextPageToken?: string | undefined;
}

/**
 * Client for interacting with Lark Calendar API
 *
 * Provides methods to fetch calendar events, search events, and manage calendar data.
 *
 * @example
 * ```typescript
 * const client = createLarkClient();
 * const calendarClient = new CalendarClient(client);
 *
 * // Get events for the next week
 * const events = await calendarClient.getCalendarEvents(accessToken, {
 *   startTime: new Date(),
 *   endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
 * });
 * ```
 */
export class CalendarClient {
  private readonly client: LarkClient;

  constructor(client: LarkClient) {
    this.client = client;
  }

  /**
   * Get the primary calendar ID for the user
   * @param accessToken - User access token
   * @returns Primary calendar ID
   */
  async getPrimaryCalendarId(accessToken: string): Promise<string> {
    try {
      const response = await this.client.authenticatedRequest<LarkPrimaryCalendarData>(
        LarkCalendarApiEndpoints.PRIMARY_CALENDAR,
        accessToken
      );

      const validated = larkPrimaryCalendarResponseSchema.parse(response);

      if (validated.data === undefined || validated.data.calendars.length === 0) {
        throw new CalendarApiError(
          'No calendars found for user',
          404,
          'getPrimaryCalendarId'
        );
      }

      const primaryCalendar = validated.data.calendars.find((c) => c.is_primary);
      const firstCalendar = validated.data.calendars[0];
      if (firstCalendar === undefined) {
        throw new CalendarApiError(
          'No calendars found for user',
          404,
          'getPrimaryCalendarId'
        );
      }
      return primaryCalendar?.calendar_id ?? firstCalendar.calendar_id;
    } catch (error) {
      if (error instanceof CalendarApiError) {
        throw error;
      }
      if (error instanceof LarkClientError) {
        throw CalendarApiError.fromLarkClientError(error, 'getPrimaryCalendarId');
      }
      throw error;
    }
  }

  /**
   * Get list of calendar events
   * @param accessToken - User access token
   * @param options - Options for fetching events
   * @returns List of calendar events
   */
  async getCalendarEvents(
    accessToken: string,
    options: GetCalendarEventsOptions = {}
  ): Promise<CalendarEventsListResult> {
    try {
      // Get calendar ID (use primary if not specified)
      const calendarId = options.calendarId ?? await this.getPrimaryCalendarId(accessToken);

      const endpoint = LarkCalendarApiEndpoints.CALENDAR_EVENTS.replace(
        ':calendar_id',
        calendarId
      );

      const params: Record<string, string> = {};

      // Add time filters
      if (options.startTime !== undefined) {
        params['start_time'] = Math.floor(options.startTime.getTime() / 1000).toString();
      }
      if (options.endTime !== undefined) {
        params['end_time'] = Math.floor(options.endTime.getTime() / 1000).toString();
      }

      // Add pagination
      if (options.pagination?.pageSize !== undefined) {
        params['page_size'] = options.pagination.pageSize.toString();
      }
      if (options.pagination?.pageToken !== undefined) {
        params['page_token'] = options.pagination.pageToken;
      }

      const response = await this.client.authenticatedRequest<LarkCalendarEventsListData>(
        endpoint,
        accessToken,
        { params }
      );

      const validated = larkCalendarEventsListResponseSchema.parse(response);

      if (validated.data === undefined) {
        return {
          events: [],
          hasMore: false,
        };
      }

      const events = validated.data.items.map(transformLarkCalendarEvent);

      return {
        events,
        hasMore: validated.data.has_more,
        nextPageToken: validated.data.page_token,
      };
    } catch (error) {
      if (error instanceof CalendarApiError) {
        throw error;
      }
      if (error instanceof LarkClientError) {
        throw CalendarApiError.fromLarkClientError(error, 'getCalendarEvents');
      }
      throw error;
    }
  }

  /**
   * Get a single calendar event by ID
   * @param accessToken - User access token
   * @param eventId - The event ID to fetch
   * @param calendarId - Optional calendar ID
   * @returns Calendar event details
   */
  async getCalendarEvent(
    accessToken: string,
    eventId: string,
    calendarId?: string
  ): Promise<CalendarEvent> {
    try {
      // Get calendar ID (use primary if not specified)
      const resolvedCalendarId = calendarId ?? await this.getPrimaryCalendarId(accessToken);

      const endpoint = LarkCalendarApiEndpoints.CALENDAR_EVENT_GET
        .replace(':calendar_id', resolvedCalendarId)
        .replace(':event_id', eventId);

      const response = await this.client.authenticatedRequest<LarkSingleEventData>(
        endpoint,
        accessToken
      );

      if (response.data === undefined) {
        throw new CalendarEventNotFoundError(eventId);
      }

      const validated = larkSingleEventResponseSchema.parse(response);

      if (validated.data === undefined) {
        throw new CalendarEventNotFoundError(eventId);
      }

      return transformLarkCalendarEvent(validated.data.event);
    } catch (error) {
      if (error instanceof CalendarEventNotFoundError) {
        throw error;
      }
      if (error instanceof LarkClientError) {
        // Check for not found error codes
        if (error.code === 190003 || error.code === 190004) {
          throw new CalendarEventNotFoundError(eventId, error.message);
        }
        throw CalendarApiError.fromLarkClientError(error, 'getCalendarEvent');
      }
      throw error;
    }
  }

  /**
   * Search calendar events
   * @param accessToken - User access token
   * @param options - Search options
   * @returns List of matching calendar events
   */
  async searchCalendarEvents(
    accessToken: string,
    options: SearchCalendarEventsOptions
  ): Promise<readonly CalendarEvent[]> {
    try {
      // For now, fetch events and filter client-side
      // Lark's search API may have different behavior
      const calendarId = options.calendarIds?.[0] ?? await this.getPrimaryCalendarId(accessToken);

      const eventsResult = await this.getCalendarEvents(accessToken, {
        calendarId,
        startTime: options.startTime,
        endTime: options.endTime,
        pagination: { pageSize: options.limit ?? 50 },
      });

      // Filter by query
      const query = options.query.toLowerCase();
      return eventsResult.events.filter(
        (event) =>
          event.summary.toLowerCase().includes(query) ||
          (event.description?.toLowerCase().includes(query) ?? false) ||
          (event.location?.toLowerCase().includes(query) ?? false)
      );
    } catch (error) {
      if (error instanceof CalendarApiError) {
        throw error;
      }
      if (error instanceof LarkClientError) {
        throw CalendarApiError.fromLarkClientError(error, 'searchCalendarEvents');
      }
      throw error;
    }
  }

  /**
   * Get upcoming events from now
   * @param accessToken - User access token
   * @param limit - Maximum number of events to return
   * @param fromDate - Start from this date (defaults to now)
   * @returns List of upcoming events
   */
  async getUpcomingEvents(
    accessToken: string,
    limit: number = 10,
    fromDate?: Date
  ): Promise<readonly CalendarEvent[]> {
    const startTime = fromDate ?? new Date();
    // Get events for the next 30 days by default
    const endTime = new Date(startTime.getTime() + 30 * 24 * 60 * 60 * 1000);

    const result = await this.getCalendarEvents(accessToken, {
      startTime,
      endTime,
      pagination: { pageSize: Math.min(limit, 100) },
    });

    // Sort by start time and limit
    return [...result.events]
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .slice(0, limit);
  }
}

/**
 * Create a CalendarClient instance with the provided LarkClient
 * @param client - LarkClient instance
 * @returns New CalendarClient instance
 */
export function createCalendarClient(client: LarkClient): CalendarClient {
  return new CalendarClient(client);
}
