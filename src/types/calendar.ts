/**
 * Calendar related type definitions
 * @module types/calendar
 */

import { z } from 'zod';

// =============================================================================
// Constants
// =============================================================================

/**
 * Calendar event status values
 */
export const CALENDAR_EVENT_STATUS = {
  CONFIRMED: 'confirmed',
  TENTATIVE: 'tentative',
  CANCELLED: 'cancelled',
} as const;

/**
 * Calendar view modes
 */
export const CALENDAR_VIEW_MODE = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
  LIST: 'list',
} as const;

/**
 * Recurrence frequency types
 */
export const RECURRENCE_FREQUENCY = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Calendar event status schema
 */
export const CalendarEventStatusSchema = z.enum([
  CALENDAR_EVENT_STATUS.CONFIRMED,
  CALENDAR_EVENT_STATUS.TENTATIVE,
  CALENDAR_EVENT_STATUS.CANCELLED,
]);

/**
 * Calendar view mode schema
 */
export const CalendarViewModeSchema = z.enum([
  CALENDAR_VIEW_MODE.MONTH,
  CALENDAR_VIEW_MODE.WEEK,
  CALENDAR_VIEW_MODE.DAY,
  CALENDAR_VIEW_MODE.LIST,
]);

/**
 * Recurrence frequency schema
 */
export const RecurrenceFrequencySchema = z.enum([
  RECURRENCE_FREQUENCY.DAILY,
  RECURRENCE_FREQUENCY.WEEKLY,
  RECURRENCE_FREQUENCY.MONTHLY,
  RECURRENCE_FREQUENCY.YEARLY,
]);

/**
 * Attendee response status schema
 */
export const AttendeeResponseStatusSchema = z.enum([
  'accepted',
  'declined',
  'tentative',
  'needs_action',
]);

/**
 * Event attendee schema
 */
export const AttendeeSchema = z.object({
  /** User ID */
  userId: z.string(),
  /** Display name */
  displayName: z.string(),
  /** Email address */
  email: z.string().email().optional(),
  /** Avatar URL */
  avatarUrl: z.string().url().optional(),
  /** Whether this attendee is optional */
  isOptional: z.boolean().default(false),
  /** Response status */
  responseStatus: AttendeeResponseStatusSchema.default('needs_action'),
});

/**
 * Event organizer schema
 */
export const OrganizerSchema = z.object({
  /** User ID */
  userId: z.string(),
  /** Display name */
  displayName: z.string(),
  /** Email address */
  email: z.string().email().optional(),
  /** Avatar URL */
  avatarUrl: z.string().url().optional(),
});

/**
 * Recurrence rule schema
 */
export const RecurrenceRuleSchema = z.object({
  /** Frequency of recurrence */
  frequency: RecurrenceFrequencySchema,
  /** Interval between occurrences */
  interval: z.number().int().positive().default(1),
  /** Days of week (for weekly recurrence) */
  byDay: z.array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).optional(),
  /** Day of month (for monthly recurrence) */
  byMonthDay: z.number().int().min(1).max(31).optional(),
  /** End date for recurrence */
  until: z.date().optional(),
  /** Maximum number of occurrences */
  count: z.number().int().positive().optional(),
});

/**
 * Calendar event schema
 */
export const CalendarEventSchema = z.object({
  /** Unique event identifier */
  eventId: z.string(),
  /** Event summary/title */
  summary: z.string(),
  /** Event description */
  description: z.string().optional(),
  /** Event start time */
  startTime: z.date(),
  /** Event end time */
  endTime: z.date(),
  /** List of attendees */
  attendees: z.array(AttendeeSchema),
  /** Linked Lark Meeting ID */
  meetingId: z.string().optional(),
  /** Linked minutes ID */
  minutesId: z.string().optional(),
  /** Event organizer */
  organizer: OrganizerSchema,
  /** Recurrence rule */
  recurrence: RecurrenceRuleSchema.optional(),
  /** Event status */
  status: CalendarEventStatusSchema,
  /** Location string */
  location: z.string().optional(),
  /** Whether this is an all-day event */
  isAllDay: z.boolean().default(false),
  /** Calendar ID this event belongs to */
  calendarId: z.string().optional(),
  /** Event created timestamp */
  createdAt: z.date().optional(),
  /** Event last updated timestamp */
  updatedAt: z.date().optional(),
});

/**
 * Calendar filter schema
 */
export const CalendarFilterSchema = z.object({
  /** Start date for filtering */
  startDate: z.date().optional(),
  /** End date for filtering */
  endDate: z.date().optional(),
  /** Filter by calendar IDs */
  calendarIds: z.array(z.string()).optional(),
  /** Filter by organizer user ID */
  organizerId: z.string().optional(),
  /** Filter by attendee user ID */
  attendeeId: z.string().optional(),
  /** Filter by status */
  status: CalendarEventStatusSchema.optional(),
  /** Search query */
  query: z.string().optional(),
  /** Include cancelled events */
  includeCancelled: z.boolean().default(false),
  /** Only show events with linked meetings */
  hasLinkedMeeting: z.boolean().optional(),
  /** Only show events with linked minutes */
  hasLinkedMinutes: z.boolean().optional(),
});

/**
 * Calendar view state schema
 */
export const CalendarViewStateSchema = z.object({
  /** Current view mode */
  viewMode: CalendarViewModeSchema,
  /** Currently selected date */
  selectedDate: z.date(),
  /** Currently selected event ID */
  selectedEventId: z.string().optional(),
});

/**
 * Upcoming events request schema
 */
export const UpcomingEventsRequestSchema = z.object({
  /** Number of events to return */
  limit: z.number().int().positive().max(100).default(10),
  /** Include events starting from this time (defaults to now) */
  from: z.date().optional(),
});

/**
 * Calendar event with minutes schema
 */
export const CalendarEventWithMinutesSchema = CalendarEventSchema.extend({
  /** Minutes data if linked */
  minutes: z.object({
    id: z.string(),
    title: z.string(),
    status: z.enum(['draft', 'pending_approval', 'approved']),
    createdAt: z.date(),
  }).optional(),
});

/**
 * Link meeting to event request schema
 */
export const LinkMeetingToEventRequestSchema = z.object({
  /** Event ID to link */
  eventId: z.string(),
  /** Meeting ID to link */
  meetingId: z.string(),
});

/**
 * Calendar events list response schema
 */
export const CalendarEventsListResponseSchema = z.object({
  /** List of events */
  events: z.array(CalendarEventSchema),
  /** Whether there are more events */
  hasMore: z.boolean(),
  /** Next page token */
  nextPageToken: z.string().optional(),
});

// =============================================================================
// Types
// =============================================================================

/**
 * Calendar event status type
 */
export type CalendarEventStatus = z.infer<typeof CalendarEventStatusSchema>;

/**
 * Calendar view mode type
 */
export type CalendarViewMode = z.infer<typeof CalendarViewModeSchema>;

/**
 * Recurrence frequency type
 */
export type RecurrenceFrequency = z.infer<typeof RecurrenceFrequencySchema>;

/**
 * Attendee response status type
 */
export type AttendeeResponseStatus = z.infer<typeof AttendeeResponseStatusSchema>;

/**
 * Event attendee type
 */
export type Attendee = z.infer<typeof AttendeeSchema>;

/**
 * Event organizer type
 */
export type Organizer = z.infer<typeof OrganizerSchema>;

/**
 * Recurrence rule type
 */
export type RecurrenceRule = z.infer<typeof RecurrenceRuleSchema>;

/**
 * Calendar event type
 */
export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

/**
 * Calendar filter type
 */
export type CalendarFilter = z.infer<typeof CalendarFilterSchema>;

/**
 * Calendar view state type
 */
export type CalendarViewState = z.infer<typeof CalendarViewStateSchema>;

/**
 * Upcoming events request type
 */
export type UpcomingEventsRequest = z.infer<typeof UpcomingEventsRequestSchema>;

/**
 * Calendar event with minutes type
 */
export type CalendarEventWithMinutes = z.infer<typeof CalendarEventWithMinutesSchema>;

/**
 * Link meeting to event request type
 */
export type LinkMeetingToEventRequest = z.infer<typeof LinkMeetingToEventRequestSchema>;

/**
 * Calendar events list response type
 */
export type CalendarEventsListResponse = z.infer<typeof CalendarEventsListResponseSchema>;

// =============================================================================
// Readonly Types
// =============================================================================

/**
 * Readonly attendee type
 */
export type ReadonlyAttendee = Readonly<Attendee>;

/**
 * Readonly organizer type
 */
export type ReadonlyOrganizer = Readonly<Organizer>;

/**
 * Readonly recurrence rule type
 */
export type ReadonlyRecurrenceRule = Readonly<RecurrenceRule>;

/**
 * Readonly calendar event type
 */
export type ReadonlyCalendarEvent = Readonly<CalendarEvent> & {
  readonly attendees: ReadonlyArray<ReadonlyAttendee>;
};

/**
 * Readonly calendar filter type
 */
export type ReadonlyCalendarFilter = Readonly<CalendarFilter>;

/**
 * Readonly calendar view state type
 */
export type ReadonlyCalendarViewState = Readonly<CalendarViewState>;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique event ID
 * @returns Generated event ID
 */
export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculate event duration in minutes
 * @param event - Calendar event
 * @returns Duration in minutes
 */
export function calculateEventDuration(event: CalendarEvent): number {
  const durationMs = event.endTime.getTime() - event.startTime.getTime();
  return Math.max(0, Math.round(durationMs / (1000 * 60)));
}

/**
 * Check if an event is happening now
 * @param event - Calendar event
 * @returns Whether the event is currently in progress
 */
export function isEventInProgress(event: CalendarEvent): boolean {
  const now = new Date();
  return event.startTime <= now && event.endTime > now;
}

/**
 * Check if an event is upcoming (in the future)
 * @param event - Calendar event
 * @returns Whether the event is in the future
 */
export function isEventUpcoming(event: CalendarEvent): boolean {
  return event.startTime > new Date();
}

/**
 * Check if an event is past
 * @param event - Calendar event
 * @returns Whether the event has ended
 */
export function isEventPast(event: CalendarEvent): boolean {
  return event.endTime < new Date();
}

/**
 * Check if event occurs on a specific date
 * @param event - Calendar event
 * @param date - Date to check
 * @returns Whether the event occurs on the given date
 */
export function eventOccursOnDate(event: CalendarEvent, date: Date): boolean {
  const eventDate = new Date(event.startTime);
  return (
    eventDate.getFullYear() === date.getFullYear() &&
    eventDate.getMonth() === date.getMonth() &&
    eventDate.getDate() === date.getDate()
  );
}

/**
 * Get events for a specific date range
 * @param events - Array of events
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Filtered events
 */
export function getEventsInRange(
  events: readonly CalendarEvent[],
  startDate: Date,
  endDate: Date
): CalendarEvent[] {
  return events.filter(
    (event) => event.startTime >= startDate && event.startTime <= endDate
  );
}

/**
 * Sort events by start time
 * @param events - Array of events
 * @param direction - Sort direction
 * @returns Sorted events
 */
export function sortEventsByStartTime(
  events: readonly CalendarEvent[],
  direction: 'asc' | 'desc' = 'asc'
): CalendarEvent[] {
  const sorted = [...events].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );
  return direction === 'desc' ? sorted.reverse() : sorted;
}

/**
 * Group events by date
 * @param events - Array of events
 * @returns Map of date strings to events
 */
export function groupEventsByDate(
  events: readonly CalendarEvent[]
): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const isoString = event.startTime.toISOString();
    const dateParts = isoString.split('T');
    const dateKey = dateParts[0] ?? isoString.substring(0, 10);
    const existing = grouped.get(dateKey) ?? [];
    grouped.set(dateKey, [...existing, event]);
  }

  return grouped;
}

/**
 * Get status display configuration
 * @param status - Event status
 * @returns Display configuration
 */
export function getEventStatusConfig(status: CalendarEventStatus): {
  label: string;
  labelEn: string;
  variant: 'default' | 'success' | 'warning' | 'error';
} {
  const config: Record<
    CalendarEventStatus,
    { label: string; labelEn: string; variant: 'default' | 'success' | 'warning' | 'error' }
  > = {
    confirmed: { label: '確定', labelEn: 'Confirmed', variant: 'success' },
    tentative: { label: '仮', labelEn: 'Tentative', variant: 'warning' },
    cancelled: { label: 'キャンセル', labelEn: 'Cancelled', variant: 'error' },
  };
  return config[status];
}

/**
 * Get view mode display configuration
 * @param viewMode - View mode
 * @returns Display configuration
 */
export function getViewModeConfig(viewMode: CalendarViewMode): {
  label: string;
  labelEn: string;
} {
  const config: Record<CalendarViewMode, { label: string; labelEn: string }> = {
    month: { label: '月', labelEn: 'Month' },
    week: { label: '週', labelEn: 'Week' },
    day: { label: '日', labelEn: 'Day' },
    list: { label: 'リスト', labelEn: 'List' },
  };
  return config[viewMode];
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate a calendar event
 * @param data - Data to validate
 * @returns Validated calendar event
 */
export function validateCalendarEvent(data: unknown): CalendarEvent {
  return CalendarEventSchema.parse(data);
}

/**
 * Validate calendar filter
 * @param data - Data to validate
 * @returns Validated calendar filter
 */
export function validateCalendarFilter(data: unknown): CalendarFilter {
  return CalendarFilterSchema.parse(data);
}

/**
 * Validate calendar view state
 * @param data - Data to validate
 * @returns Validated view state
 */
export function validateCalendarViewState(data: unknown): CalendarViewState {
  return CalendarViewStateSchema.parse(data);
}

/**
 * Validate upcoming events request
 * @param data - Data to validate
 * @returns Validated request
 */
export function validateUpcomingEventsRequest(data: unknown): UpcomingEventsRequest {
  return UpcomingEventsRequestSchema.parse(data);
}

/**
 * Validate link meeting to event request
 * @param data - Data to validate
 * @returns Validated request
 */
export function validateLinkMeetingToEventRequest(data: unknown): LinkMeetingToEventRequest {
  return LinkMeetingToEventRequestSchema.parse(data);
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an empty calendar filter
 * @returns Empty calendar filter
 */
export function createEmptyCalendarFilter(): CalendarFilter {
  return {
    includeCancelled: false,
  };
}

/**
 * Create default calendar view state
 * @returns Default view state
 */
export function createDefaultCalendarViewState(): CalendarViewState {
  return {
    viewMode: 'month',
    selectedDate: new Date(),
  };
}

/**
 * Create an attendee object
 * @param params - Attendee parameters
 * @returns Attendee object
 */
export function createAttendee(params: {
  userId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  isOptional?: boolean;
  responseStatus?: AttendeeResponseStatus;
}): Attendee {
  return {
    userId: params.userId,
    displayName: params.displayName,
    email: params.email,
    avatarUrl: params.avatarUrl,
    isOptional: params.isOptional ?? false,
    responseStatus: params.responseStatus ?? 'needs_action',
  };
}

/**
 * Create an organizer object
 * @param params - Organizer parameters
 * @returns Organizer object
 */
export function createOrganizer(params: {
  userId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
}): Organizer {
  return {
    userId: params.userId,
    displayName: params.displayName,
    email: params.email,
    avatarUrl: params.avatarUrl,
  };
}
