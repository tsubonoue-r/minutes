/**
 * Calendar Types Tests
 * @module types/__tests__/calendar.test
 */

import { describe, it, expect } from 'vitest';
import {
  // Schemas
  CalendarEventSchema,
  AttendeeSchema,
  OrganizerSchema,
  RecurrenceRuleSchema,
  CalendarFilterSchema,
  CalendarViewStateSchema,
  // Utility functions
  generateEventId,
  calculateEventDuration,
  isEventInProgress,
  isEventUpcoming,
  isEventPast,
  eventOccursOnDate,
  getEventsInRange,
  sortEventsByStartTime,
  groupEventsByDate,
  getEventStatusConfig,
  getViewModeConfig,
  // Factory functions
  createEmptyCalendarFilter,
  createDefaultCalendarViewState,
  createAttendee,
  createOrganizer,
  // Validation functions
  validateCalendarEvent,
  validateCalendarFilter,
  // Types
  type CalendarEvent,
  type Attendee,
} from '../calendar';

describe('Calendar Type Schemas', () => {
  describe('AttendeeSchema', () => {
    it('should validate a valid attendee', () => {
      const attendee = {
        userId: 'user123',
        displayName: 'John Doe',
        email: 'john@example.com',
        isOptional: false,
        responseStatus: 'accepted',
      };

      const result = AttendeeSchema.safeParse(attendee);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const attendee = {
        userId: 'user123',
        displayName: 'John Doe',
        email: 'invalid-email',
        isOptional: false,
        responseStatus: 'accepted',
      };

      const result = AttendeeSchema.safeParse(attendee);
      expect(result.success).toBe(false);
    });

    it('should use default values', () => {
      const attendee = {
        userId: 'user123',
        displayName: 'John Doe',
      };

      const result = AttendeeSchema.parse(attendee);
      expect(result.isOptional).toBe(false);
      expect(result.responseStatus).toBe('needs_action');
    });
  });

  describe('OrganizerSchema', () => {
    it('should validate a valid organizer', () => {
      const organizer = {
        userId: 'org123',
        displayName: 'Jane Smith',
        email: 'jane@example.com',
      };

      const result = OrganizerSchema.safeParse(organizer);
      expect(result.success).toBe(true);
    });

    it('should allow optional email', () => {
      const organizer = {
        userId: 'org123',
        displayName: 'Jane Smith',
      };

      const result = OrganizerSchema.safeParse(organizer);
      expect(result.success).toBe(true);
    });
  });

  describe('RecurrenceRuleSchema', () => {
    it('should validate daily recurrence', () => {
      const rule = {
        frequency: 'daily',
        interval: 1,
      };

      const result = RecurrenceRuleSchema.safeParse(rule);
      expect(result.success).toBe(true);
    });

    it('should validate weekly recurrence with byday', () => {
      const rule = {
        frequency: 'weekly',
        interval: 2,
        byDay: ['MO', 'WE', 'FR'],
      };

      const result = RecurrenceRuleSchema.safeParse(rule);
      expect(result.success).toBe(true);
    });

    it('should validate monthly recurrence with bymonthday', () => {
      const rule = {
        frequency: 'monthly',
        interval: 1,
        byMonthDay: 15,
      };

      const result = RecurrenceRuleSchema.safeParse(rule);
      expect(result.success).toBe(true);
    });

    it('should reject invalid frequency', () => {
      const rule = {
        frequency: 'invalid',
        interval: 1,
      };

      const result = RecurrenceRuleSchema.safeParse(rule);
      expect(result.success).toBe(false);
    });

    it('should reject invalid bymonthday', () => {
      const rule = {
        frequency: 'monthly',
        interval: 1,
        byMonthDay: 32,
      };

      const result = RecurrenceRuleSchema.safeParse(rule);
      expect(result.success).toBe(false);
    });
  });

  describe('CalendarEventSchema', () => {
    it('should validate a complete calendar event', () => {
      const event = {
        eventId: 'evt123',
        summary: 'Team Meeting',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        attendees: [
          {
            userId: 'user1',
            displayName: 'User 1',
            isOptional: false,
            responseStatus: 'accepted',
          },
        ],
        organizer: {
          userId: 'org1',
          displayName: 'Organizer',
        },
        status: 'confirmed',
      };

      const result = CalendarEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const event = {
        eventId: 'evt123',
        summary: 'Team Meeting',
        startTime: new Date(),
        endTime: new Date(),
        attendees: [],
        organizer: { userId: 'org1', displayName: 'Org' },
        status: 'invalid_status',
      };

      const result = CalendarEventSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('CalendarFilterSchema', () => {
    it('should validate a filter with all options', () => {
      const filter = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        calendarIds: ['cal1', 'cal2'],
        status: 'confirmed',
        includeCancelled: true,
        hasLinkedMeeting: true,
      };

      const result = CalendarFilterSchema.safeParse(filter);
      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const filter = {};

      const result = CalendarFilterSchema.parse(filter);
      expect(result.includeCancelled).toBe(false);
    });
  });

  describe('CalendarViewStateSchema', () => {
    it('should validate view state', () => {
      const state = {
        viewMode: 'month',
        selectedDate: new Date(),
      };

      const result = CalendarViewStateSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    it('should allow selectedEventId', () => {
      const state = {
        viewMode: 'day',
        selectedDate: new Date(),
        selectedEventId: 'evt123',
      };

      const result = CalendarViewStateSchema.safeParse(state);
      expect(result.success).toBe(true);
    });
  });
});

describe('Calendar Utility Functions', () => {
  describe('generateEventId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateEventId();
      const id2 = generateEventId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^evt_\d+_[a-z0-9]+$/);
    });
  });

  describe('calculateEventDuration', () => {
    it('should calculate duration in minutes', () => {
      const event = {
        eventId: 'evt1',
        summary: 'Test',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:30:00Z'),
        attendees: [],
        organizer: { userId: 'org1', displayName: 'Org' },
        status: 'confirmed' as const,
        isAllDay: false,
      };

      const duration = calculateEventDuration(event);
      expect(duration).toBe(90);
    });

    it('should return 0 for invalid duration', () => {
      const event = {
        eventId: 'evt1',
        summary: 'Test',
        startTime: new Date('2024-01-15T11:00:00Z'),
        endTime: new Date('2024-01-15T10:00:00Z'),
        attendees: [],
        organizer: { userId: 'org1', displayName: 'Org' },
        status: 'confirmed' as const,
        isAllDay: false,
      };

      const duration = calculateEventDuration(event);
      expect(duration).toBe(0);
    });
  });

  describe('isEventInProgress', () => {
    it('should return true for in-progress event', () => {
      const now = new Date();
      const event = {
        eventId: 'evt1',
        summary: 'Test',
        startTime: new Date(now.getTime() - 30 * 60 * 1000),
        endTime: new Date(now.getTime() + 30 * 60 * 1000),
        attendees: [],
        organizer: { userId: 'org1', displayName: 'Org' },
        status: 'confirmed' as const,
        isAllDay: false,
      };

      expect(isEventInProgress(event)).toBe(true);
    });

    it('should return false for future event', () => {
      const now = new Date();
      const event = {
        eventId: 'evt1',
        summary: 'Test',
        startTime: new Date(now.getTime() + 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 120 * 60 * 1000),
        attendees: [],
        organizer: { userId: 'org1', displayName: 'Org' },
        status: 'confirmed' as const,
        isAllDay: false,
      };

      expect(isEventInProgress(event)).toBe(false);
    });
  });

  describe('isEventUpcoming', () => {
    it('should return true for future event', () => {
      const event = {
        eventId: 'evt1',
        summary: 'Test',
        startTime: new Date(Date.now() + 60 * 60 * 1000),
        endTime: new Date(Date.now() + 120 * 60 * 1000),
        attendees: [],
        organizer: { userId: 'org1', displayName: 'Org' },
        status: 'confirmed' as const,
        isAllDay: false,
      };

      expect(isEventUpcoming(event)).toBe(true);
    });

    it('should return false for past event', () => {
      const event = {
        eventId: 'evt1',
        summary: 'Test',
        startTime: new Date(Date.now() - 120 * 60 * 1000),
        endTime: new Date(Date.now() - 60 * 60 * 1000),
        attendees: [],
        organizer: { userId: 'org1', displayName: 'Org' },
        status: 'confirmed' as const,
        isAllDay: false,
      };

      expect(isEventUpcoming(event)).toBe(false);
    });
  });

  describe('isEventPast', () => {
    it('should return true for past event', () => {
      const event = {
        eventId: 'evt1',
        summary: 'Test',
        startTime: new Date(Date.now() - 120 * 60 * 1000),
        endTime: new Date(Date.now() - 60 * 60 * 1000),
        attendees: [],
        organizer: { userId: 'org1', displayName: 'Org' },
        status: 'confirmed' as const,
        isAllDay: false,
      };

      expect(isEventPast(event)).toBe(true);
    });

    it('should return false for ongoing event', () => {
      const now = new Date();
      const event = {
        eventId: 'evt1',
        summary: 'Test',
        startTime: new Date(now.getTime() - 30 * 60 * 1000),
        endTime: new Date(now.getTime() + 30 * 60 * 1000),
        attendees: [],
        organizer: { userId: 'org1', displayName: 'Org' },
        status: 'confirmed' as const,
        isAllDay: false,
      };

      expect(isEventPast(event)).toBe(false);
    });
  });

  describe('eventOccursOnDate', () => {
    it('should return true if event is on the given date', () => {
      const event = {
        eventId: 'evt1',
        summary: 'Test',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        attendees: [],
        organizer: { userId: 'org1', displayName: 'Org' },
        status: 'confirmed' as const,
        isAllDay: false,
      };

      const date = new Date('2024-01-15T00:00:00Z');
      expect(eventOccursOnDate(event, date)).toBe(true);
    });

    it('should return false if event is on different date', () => {
      const event = {
        eventId: 'evt1',
        summary: 'Test',
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-15T11:00:00Z'),
        attendees: [],
        organizer: { userId: 'org1', displayName: 'Org' },
        status: 'confirmed' as const,
        isAllDay: false,
      };

      const date = new Date('2024-01-16T00:00:00Z');
      expect(eventOccursOnDate(event, date)).toBe(false);
    });
  });

  describe('getEventsInRange', () => {
    it('should filter events within date range', () => {
      const events: CalendarEvent[] = [
        {
          eventId: 'evt1',
          summary: 'Event 1',
          startTime: new Date('2024-01-10'),
          endTime: new Date('2024-01-10'),
          attendees: [],
          organizer: { userId: 'org1', displayName: 'Org' },
          status: 'confirmed',
          isAllDay: false,
        },
        {
          eventId: 'evt2',
          summary: 'Event 2',
          startTime: new Date('2024-01-15'),
          endTime: new Date('2024-01-15'),
          attendees: [],
          organizer: { userId: 'org1', displayName: 'Org' },
          status: 'confirmed',
          isAllDay: false,
        },
        {
          eventId: 'evt3',
          summary: 'Event 3',
          startTime: new Date('2024-01-25'),
          endTime: new Date('2024-01-25'),
          attendees: [],
          organizer: { userId: 'org1', displayName: 'Org' },
          status: 'confirmed',
          isAllDay: false,
        },
      ];

      const result = getEventsInRange(
        events,
        new Date('2024-01-12'),
        new Date('2024-01-20')
      );

      expect(result).toHaveLength(1);
      const firstResult = result[0];
      expect(firstResult).toBeDefined();
      expect(firstResult?.eventId).toBe('evt2');
    });
  });

  describe('sortEventsByStartTime', () => {
    it('should sort events in ascending order', () => {
      const events: CalendarEvent[] = [
        {
          eventId: 'evt2',
          summary: 'Later',
          startTime: new Date('2024-01-15T14:00:00Z'),
          endTime: new Date('2024-01-15T15:00:00Z'),
          attendees: [],
          organizer: { userId: 'org1', displayName: 'Org' },
          status: 'confirmed',
          isAllDay: false,
        },
        {
          eventId: 'evt1',
          summary: 'Earlier',
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T11:00:00Z'),
          attendees: [],
          organizer: { userId: 'org1', displayName: 'Org' },
          status: 'confirmed',
          isAllDay: false,
        },
      ];

      const result = sortEventsByStartTime(events, 'asc');

      const first = result[0];
      const second = result[1];
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      expect(first?.eventId).toBe('evt1');
      expect(second?.eventId).toBe('evt2');
    });

    it('should sort events in descending order', () => {
      const events: CalendarEvent[] = [
        {
          eventId: 'evt1',
          summary: 'Earlier',
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T11:00:00Z'),
          attendees: [],
          organizer: { userId: 'org1', displayName: 'Org' },
          status: 'confirmed',
          isAllDay: false,
        },
        {
          eventId: 'evt2',
          summary: 'Later',
          startTime: new Date('2024-01-15T14:00:00Z'),
          endTime: new Date('2024-01-15T15:00:00Z'),
          attendees: [],
          organizer: { userId: 'org1', displayName: 'Org' },
          status: 'confirmed',
          isAllDay: false,
        },
      ];

      const result = sortEventsByStartTime(events, 'desc');

      const first = result[0];
      const second = result[1];
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      expect(first?.eventId).toBe('evt2');
      expect(second?.eventId).toBe('evt1');
    });
  });

  describe('groupEventsByDate', () => {
    it('should group events by date', () => {
      const events: CalendarEvent[] = [
        {
          eventId: 'evt1',
          summary: 'Event 1',
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T11:00:00Z'),
          attendees: [],
          organizer: { userId: 'org1', displayName: 'Org' },
          status: 'confirmed',
          isAllDay: false,
        },
        {
          eventId: 'evt2',
          summary: 'Event 2',
          startTime: new Date('2024-01-15T14:00:00Z'),
          endTime: new Date('2024-01-15T15:00:00Z'),
          attendees: [],
          organizer: { userId: 'org1', displayName: 'Org' },
          status: 'confirmed',
          isAllDay: false,
        },
        {
          eventId: 'evt3',
          summary: 'Event 3',
          startTime: new Date('2024-01-16T10:00:00Z'),
          endTime: new Date('2024-01-16T11:00:00Z'),
          attendees: [],
          organizer: { userId: 'org1', displayName: 'Org' },
          status: 'confirmed',
          isAllDay: false,
        },
      ];

      const grouped = groupEventsByDate(events);

      expect(grouped.size).toBe(2);
      expect(grouped.get('2024-01-15')).toHaveLength(2);
      expect(grouped.get('2024-01-16')).toHaveLength(1);
    });
  });

  describe('getEventStatusConfig', () => {
    it('should return correct config for confirmed status', () => {
      const config = getEventStatusConfig('confirmed');
      expect(config.labelEn).toBe('Confirmed');
      expect(config.variant).toBe('success');
    });

    it('should return correct config for tentative status', () => {
      const config = getEventStatusConfig('tentative');
      expect(config.labelEn).toBe('Tentative');
      expect(config.variant).toBe('warning');
    });

    it('should return correct config for cancelled status', () => {
      const config = getEventStatusConfig('cancelled');
      expect(config.labelEn).toBe('Cancelled');
      expect(config.variant).toBe('error');
    });
  });

  describe('getViewModeConfig', () => {
    it('should return correct labels for all view modes', () => {
      expect(getViewModeConfig('month').labelEn).toBe('Month');
      expect(getViewModeConfig('week').labelEn).toBe('Week');
      expect(getViewModeConfig('day').labelEn).toBe('Day');
      expect(getViewModeConfig('list').labelEn).toBe('List');
    });
  });
});

describe('Factory Functions', () => {
  describe('createEmptyCalendarFilter', () => {
    it('should create an empty filter with defaults', () => {
      const filter = createEmptyCalendarFilter();

      expect(filter).toEqual({
        includeCancelled: false,
      });
    });
  });

  describe('createDefaultCalendarViewState', () => {
    it('should create default view state', () => {
      const state = createDefaultCalendarViewState();

      expect(state.viewMode).toBe('month');
      expect(state.selectedDate).toBeInstanceOf(Date);
      expect(state.selectedEventId).toBeUndefined();
    });
  });

  describe('createAttendee', () => {
    it('should create an attendee with required fields', () => {
      const attendee = createAttendee({
        userId: 'user123',
        displayName: 'John Doe',
      });

      expect(attendee).toEqual({
        userId: 'user123',
        displayName: 'John Doe',
        email: undefined,
        avatarUrl: undefined,
        isOptional: false,
        responseStatus: 'needs_action',
      });
    });

    it('should create an attendee with all fields', () => {
      const attendee = createAttendee({
        userId: 'user123',
        displayName: 'John Doe',
        email: 'john@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
        isOptional: true,
        responseStatus: 'accepted',
      });

      expect(attendee.email).toBe('john@example.com');
      expect(attendee.isOptional).toBe(true);
      expect(attendee.responseStatus).toBe('accepted');
    });
  });

  describe('createOrganizer', () => {
    it('should create an organizer with required fields', () => {
      const organizer = createOrganizer({
        userId: 'org123',
        displayName: 'Jane Smith',
      });

      expect(organizer).toEqual({
        userId: 'org123',
        displayName: 'Jane Smith',
        email: undefined,
        avatarUrl: undefined,
      });
    });
  });
});

describe('Validation Functions', () => {
  describe('validateCalendarEvent', () => {
    it('should validate a valid event', () => {
      const event = {
        eventId: 'evt123',
        summary: 'Test Event',
        startTime: new Date(),
        endTime: new Date(),
        attendees: [],
        organizer: { userId: 'org1', displayName: 'Org' },
        status: 'confirmed',
        isAllDay: false,
      };

      expect(() => validateCalendarEvent(event)).not.toThrow();
    });

    it('should throw for invalid event', () => {
      const event = {
        summary: 'Test Event',
        // Missing required fields
      };

      expect(() => validateCalendarEvent(event)).toThrow();
    });
  });

  describe('validateCalendarFilter', () => {
    it('should validate a valid filter', () => {
      const filter = {
        startDate: new Date(),
        endDate: new Date(),
        includeCancelled: true,
      };

      expect(() => validateCalendarFilter(filter)).not.toThrow();
    });

    it('should validate empty filter', () => {
      const filter = {};

      expect(() => validateCalendarFilter(filter)).not.toThrow();
    });
  });
});
