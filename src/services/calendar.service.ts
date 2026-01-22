/**
 * Calendar service for Lark Calendar API integration
 * @module services/calendar.service
 */

import { LarkClient, LarkClientError } from '@/lib/lark/client';
import {
  CalendarClient,
  CalendarApiError,
  CalendarEventNotFoundError,
  type GetCalendarEventsOptions,
} from '@/lib/lark/calendar';
import type {
  CalendarEvent,
  CalendarEventWithMinutes,
  CalendarFilter,
  CalendarEventsListResponse,
} from '@/types/calendar';
import {
  sortEventsByStartTime,
  getEventsInRange,
  isEventUpcoming,
} from '@/types/calendar';

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Calendar service error
 */
export class CalendarServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CalendarServiceError';
  }
}

// =============================================================================
// Service Types
// =============================================================================

/**
 * Options for getting events
 */
export interface GetEventsOptions {
  /** Start date for filtering */
  readonly startDate: Date;
  /** End date for filtering */
  readonly endDate: Date;
  /** Calendar ID (optional, uses primary if not specified) */
  readonly calendarId?: string;
  /** Page size */
  readonly pageSize?: number;
  /** Page token for pagination */
  readonly pageToken?: string;
}

/**
 * Options for getting upcoming events
 */
export interface GetUpcomingEventsOptions {
  /** Number of events to return */
  readonly limit?: number;
  /** Start from this date (defaults to now) */
  readonly from?: Date;
  /** Calendar ID (optional) */
  readonly calendarId?: string;
}

/**
 * Options for linking meeting to event
 */
export interface LinkMeetingOptions {
  /** Event ID */
  readonly eventId: string;
  /** Meeting ID to link */
  readonly meetingId: string;
  /** Calendar ID (optional) */
  readonly calendarId?: string;
}

/**
 * Options for linking minutes to event
 */
export interface LinkMinutesOptions {
  /** Event ID */
  readonly eventId: string;
  /** Minutes ID to link */
  readonly minutesId: string;
  /** Calendar ID (optional) */
  readonly calendarId?: string;
}

/**
 * Event with minutes data for display
 */
export interface EventWithMinutesData extends CalendarEvent {
  /** Minutes data if available */
  readonly minutes?: {
    readonly id: string;
    readonly title: string;
    readonly status: 'draft' | 'pending_approval' | 'approved';
    readonly createdAt: Date;
  };
}

// =============================================================================
// In-memory storage for meeting/minutes links
// In production, this should be replaced with database storage
// =============================================================================

/**
 * Link storage interface
 */
interface EventLinks {
  meetingId?: string;
  minutesId?: string;
}

/**
 * In-memory link storage (should be replaced with DB in production)
 */
const eventLinksStore = new Map<string, EventLinks>();

// =============================================================================
// CalendarService Class
// =============================================================================

/**
 * Calendar service for fetching and managing calendar events
 *
 * @example
 * ```typescript
 * const client = createLarkClient();
 * const service = new CalendarService(client, accessToken);
 *
 * // Get events for a date range
 * const events = await service.getEvents({
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-01-31'),
 * });
 *
 * // Get upcoming events
 * const upcoming = await service.getUpcomingEvents({ limit: 5 });
 * ```
 */
export class CalendarService {
  private readonly calendarClient: CalendarClient;

  constructor(
    private readonly client: LarkClient,
    private readonly accessToken: string
  ) {
    this.calendarClient = new CalendarClient(client);
  }

  /**
   * Get calendar events for a date range
   *
   * @param options - Query options
   * @returns Paginated list of calendar events
   * @throws CalendarServiceError if the API call fails
   */
  async getEvents(options: GetEventsOptions): Promise<CalendarEventsListResponse> {
    try {
      const result = await this.calendarClient.getCalendarEvents(this.accessToken, {
        calendarId: options.calendarId,
        startTime: options.startDate,
        endTime: options.endDate,
        pagination: {
          pageSize: options.pageSize,
          pageToken: options.pageToken,
        },
      });

      // Enrich events with linked data
      const enrichedEvents = result.events.map((event) => {
        const links = eventLinksStore.get(event.eventId);
        return {
          ...event,
          meetingId: links?.meetingId ?? event.meetingId,
          minutesId: links?.minutesId ?? event.minutesId,
        };
      });

      // Sort events by start time
      const sortedEvents = sortEventsByStartTime(enrichedEvents, 'asc');

      return {
        events: sortedEvents,
        hasMore: result.hasMore,
        nextPageToken: result.nextPageToken,
      };
    } catch (error) {
      if (error instanceof CalendarServiceError) {
        throw error;
      }

      if (error instanceof CalendarApiError) {
        throw new CalendarServiceError(
          error.message,
          'CALENDAR_API_ERROR',
          error.code >= 400 && error.code < 600 ? error.code : 500,
          { operation: error.operation, details: error.details }
        );
      }

      if (error instanceof LarkClientError) {
        throw new CalendarServiceError(
          error.message,
          'LARK_API_ERROR',
          error.code >= 400 && error.code < 600 ? error.code : 500,
          { endpoint: error.endpoint, details: error.details }
        );
      }

      throw new CalendarServiceError(
        'Failed to fetch calendar events',
        'UNKNOWN_ERROR',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get upcoming events from now (or specified date)
   *
   * @param options - Options for fetching upcoming events
   * @returns List of upcoming events
   */
  async getUpcomingEvents(
    options: GetUpcomingEventsOptions = {}
  ): Promise<readonly CalendarEvent[]> {
    try {
      const limit = options.limit ?? 10;
      const from = options.from ?? new Date();

      const events = await this.calendarClient.getUpcomingEvents(
        this.accessToken,
        limit,
        from
      );

      // Enrich with linked data
      return events.map((event) => {
        const links = eventLinksStore.get(event.eventId);
        return {
          ...event,
          meetingId: links?.meetingId ?? event.meetingId,
          minutesId: links?.minutesId ?? event.minutesId,
        };
      });
    } catch (error) {
      if (error instanceof CalendarApiError) {
        throw new CalendarServiceError(
          error.message,
          'CALENDAR_API_ERROR',
          500,
          { operation: error.operation }
        );
      }

      throw new CalendarServiceError(
        'Failed to fetch upcoming events',
        'UNKNOWN_ERROR',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get a single event by ID
   *
   * @param eventId - The event ID to fetch
   * @param calendarId - Optional calendar ID
   * @returns Calendar event
   */
  async getEventById(
    eventId: string,
    calendarId?: string
  ): Promise<CalendarEvent> {
    try {
      const event = await this.calendarClient.getCalendarEvent(
        this.accessToken,
        eventId,
        calendarId
      );

      // Enrich with linked data
      const links = eventLinksStore.get(event.eventId);
      return {
        ...event,
        meetingId: links?.meetingId ?? event.meetingId,
        minutesId: links?.minutesId ?? event.minutesId,
      };
    } catch (error) {
      if (error instanceof CalendarEventNotFoundError) {
        throw new CalendarServiceError(
          error.message,
          'EVENT_NOT_FOUND',
          404,
          { eventId }
        );
      }

      if (error instanceof CalendarApiError) {
        throw new CalendarServiceError(
          error.message,
          'CALENDAR_API_ERROR',
          500,
          { operation: error.operation }
        );
      }

      throw new CalendarServiceError(
        'Failed to fetch calendar event',
        'UNKNOWN_ERROR',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Link a Lark meeting to a calendar event
   *
   * @param options - Link options
   * @returns Updated calendar event
   */
  async linkMeetingToEvent(options: LinkMeetingOptions): Promise<CalendarEvent> {
    try {
      // Verify event exists
      const event = await this.getEventById(options.eventId, options.calendarId);

      // Store link (in production, this would be a database update)
      const existingLinks = eventLinksStore.get(options.eventId) ?? {};
      eventLinksStore.set(options.eventId, {
        ...existingLinks,
        meetingId: options.meetingId,
      });

      return {
        ...event,
        meetingId: options.meetingId,
      };
    } catch (error) {
      if (error instanceof CalendarServiceError) {
        throw error;
      }

      throw new CalendarServiceError(
        'Failed to link meeting to event',
        'LINK_ERROR',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Link minutes to a calendar event
   *
   * @param options - Link options
   * @returns Updated calendar event
   */
  async linkMinutesToEvent(options: LinkMinutesOptions): Promise<CalendarEvent> {
    try {
      // Verify event exists
      const event = await this.getEventById(options.eventId, options.calendarId);

      // Store link (in production, this would be a database update)
      const existingLinks = eventLinksStore.get(options.eventId) ?? {};
      eventLinksStore.set(options.eventId, {
        ...existingLinks,
        minutesId: options.minutesId,
      });

      return {
        ...event,
        minutesId: options.minutesId,
      };
    } catch (error) {
      if (error instanceof CalendarServiceError) {
        throw error;
      }

      throw new CalendarServiceError(
        'Failed to link minutes to event',
        'LINK_ERROR',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get event with minutes data
   *
   * @param eventId - Event ID
   * @param calendarId - Optional calendar ID
   * @param getMinutes - Function to fetch minutes data
   * @returns Event with minutes data
   */
  async getEventWithMinutes(
    eventId: string,
    calendarId?: string,
    getMinutes?: (minutesId: string) => Promise<{
      id: string;
      title: string;
      status: 'draft' | 'pending_approval' | 'approved';
      createdAt: Date;
    } | null>
  ): Promise<EventWithMinutesData> {
    const event = await this.getEventById(eventId, calendarId);

    if (event.minutesId === undefined || getMinutes === undefined) {
      return event;
    }

    const minutes = await getMinutes(event.minutesId);

    if (minutes === null) {
      return event;
    }

    return {
      ...event,
      minutes,
    };
  }

  /**
   * Search calendar events
   *
   * @param query - Search query
   * @param filter - Optional filter
   * @returns Matching events
   */
  async searchEvents(
    query: string,
    filter?: CalendarFilter
  ): Promise<readonly CalendarEvent[]> {
    try {
      const events = await this.calendarClient.searchCalendarEvents(
        this.accessToken,
        {
          query,
          calendarIds: filter?.calendarIds,
          startTime: filter?.startDate,
          endTime: filter?.endDate,
          limit: 50,
        }
      );

      // Apply additional filters
      let filteredEvents = [...events];

      // Filter by status
      if (filter?.status !== undefined) {
        filteredEvents = filteredEvents.filter((e) => e.status === filter.status);
      }

      // Filter cancelled events
      if (filter?.includeCancelled !== true) {
        filteredEvents = filteredEvents.filter((e) => e.status !== 'cancelled');
      }

      // Filter by organizer
      if (filter?.organizerId !== undefined) {
        filteredEvents = filteredEvents.filter(
          (e) => e.organizer.userId === filter.organizerId
        );
      }

      // Filter by attendee
      if (filter?.attendeeId !== undefined) {
        filteredEvents = filteredEvents.filter((e) =>
          e.attendees.some((a) => a.userId === filter.attendeeId)
        );
      }

      // Filter by linked meeting
      if (filter?.hasLinkedMeeting === true) {
        filteredEvents = filteredEvents.filter((e) => {
          const links = eventLinksStore.get(e.eventId);
          return e.meetingId !== undefined || links?.meetingId !== undefined;
        });
      }

      // Filter by linked minutes
      if (filter?.hasLinkedMinutes === true) {
        filteredEvents = filteredEvents.filter((e) => {
          const links = eventLinksStore.get(e.eventId);
          return e.minutesId !== undefined || links?.minutesId !== undefined;
        });
      }

      // Enrich with linked data
      return filteredEvents.map((event) => {
        const links = eventLinksStore.get(event.eventId);
        return {
          ...event,
          meetingId: links?.meetingId ?? event.meetingId,
          minutesId: links?.minutesId ?? event.minutesId,
        };
      });
    } catch (error) {
      if (error instanceof CalendarApiError) {
        throw new CalendarServiceError(
          error.message,
          'CALENDAR_API_ERROR',
          500,
          { operation: error.operation }
        );
      }

      throw new CalendarServiceError(
        'Failed to search calendar events',
        'UNKNOWN_ERROR',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get events for today
   *
   * @returns Today's events
   */
  async getTodayEvents(): Promise<readonly CalendarEvent[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.getEvents({
      startDate: today,
      endDate: tomorrow,
    });

    return result.events;
  }

  /**
   * Get events for this week
   *
   * @returns This week's events
   */
  async getThisWeekEvents(): Promise<readonly CalendarEvent[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get start of week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    // Get end of week (Saturday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const result = await this.getEvents({
      startDate: startOfWeek,
      endDate: endOfWeek,
    });

    return result.events;
  }
}

/**
 * Create a calendar service instance
 *
 * @param client - Lark API client
 * @param accessToken - User access token
 * @returns Calendar service instance
 */
export function createCalendarService(
  client: LarkClient,
  accessToken: string
): CalendarService {
  return new CalendarService(client, accessToken);
}
