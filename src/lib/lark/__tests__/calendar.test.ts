/**
 * Calendar Client Tests
 * @module lib/lark/__tests__/calendar.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CalendarClient,
  CalendarEventNotFoundError,
  CalendarApiError,
  transformLarkCalendarEvent,
  transformLarkAttendee,
  transformLarkOrganizer,
  transformLarkRecurrence,
  type LarkCalendarEvent,
  type LarkAttendee,
  type LarkOrganizer,
  type LarkRecurrence,
} from '../calendar';
import { LarkClient, LarkClientError } from '../client';
import type { LarkApiResponse } from '../types';

// Mock LarkClient
const mockAuthenticatedRequest = vi.fn();
const mockClient = {
  authenticatedRequest: mockAuthenticatedRequest,
} as unknown as LarkClient;

describe('CalendarClient', () => {
  let client: CalendarClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new CalendarClient(mockClient);
  });

  describe('transformLarkAttendee', () => {
    it('should transform Lark attendee correctly', () => {
      const larkAttendee: LarkAttendee = {
        type: 'user',
        user_id: 'user123',
        display_name: 'John Doe',
        email: 'john@example.com',
        avatar_url: 'https://example.com/avatar.jpg',
        is_optional: true,
        rsvp_status: 'accept',
      };

      const result = transformLarkAttendee(larkAttendee);

      expect(result).toEqual({
        userId: 'user123',
        displayName: 'John Doe',
        email: 'john@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
        isOptional: true,
        responseStatus: 'accepted',
      });
    });

    it('should handle missing optional fields', () => {
      const larkAttendee: LarkAttendee = {
        type: 'user',
      };

      const result = transformLarkAttendee(larkAttendee);

      expect(result).toEqual({
        userId: '',
        displayName: 'Unknown',
        email: undefined,
        avatarUrl: undefined,
        isOptional: false,
        responseStatus: 'needs_action',
      });
    });

    it('should map RSVP statuses correctly', () => {
      const testCases: Array<{ input: LarkAttendee['rsvp_status']; expected: string }> = [
        { input: 'accept', expected: 'accepted' },
        { input: 'decline', expected: 'declined' },
        { input: 'tentative', expected: 'tentative' },
        { input: 'needs_action', expected: 'needs_action' },
        { input: undefined, expected: 'needs_action' },
      ];

      for (const { input, expected } of testCases) {
        const result = transformLarkAttendee({
          type: 'user',
          user_id: 'test',
          rsvp_status: input,
        });
        expect(result.responseStatus).toBe(expected);
      }
    });
  });

  describe('transformLarkOrganizer', () => {
    it('should transform Lark organizer correctly', () => {
      const larkOrganizer: LarkOrganizer = {
        user_id: 'org123',
        display_name: 'Jane Smith',
        email: 'jane@example.com',
      };

      const result = transformLarkOrganizer(larkOrganizer);

      expect(result).toEqual({
        userId: 'org123',
        displayName: 'Jane Smith',
        email: 'jane@example.com',
      });
    });

    it('should handle missing display name', () => {
      const larkOrganizer: LarkOrganizer = {
        user_id: 'org123',
      };

      const result = transformLarkOrganizer(larkOrganizer);

      expect(result).toEqual({
        userId: 'org123',
        displayName: 'Unknown',
        email: undefined,
      });
    });
  });

  describe('transformLarkRecurrence', () => {
    it('should return undefined for undefined input', () => {
      const result = transformLarkRecurrence(undefined);
      expect(result).toBeUndefined();
    });

    it('should return undefined for missing frequency', () => {
      const result = transformLarkRecurrence({ interval: 1 });
      expect(result).toBeUndefined();
    });

    it('should transform daily recurrence', () => {
      const larkRecurrence: LarkRecurrence = {
        freq: 'DAILY',
        interval: 2,
        count: 10,
      };

      const result = transformLarkRecurrence(larkRecurrence);

      expect(result).toEqual({
        frequency: 'daily',
        interval: 2,
        byDay: undefined,
        byMonthDay: undefined,
        until: undefined,
        count: 10,
      });
    });

    it('should transform weekly recurrence with byday', () => {
      const larkRecurrence: LarkRecurrence = {
        freq: 'WEEKLY',
        interval: 1,
        byday: 'MO,WE,FR',
      };

      const result = transformLarkRecurrence(larkRecurrence);

      expect(result).toEqual({
        frequency: 'weekly',
        interval: 1,
        byDay: ['MO', 'WE', 'FR'],
        byMonthDay: undefined,
        until: undefined,
        count: undefined,
      });
    });

    it('should transform monthly recurrence with bymonthday', () => {
      const larkRecurrence: LarkRecurrence = {
        freq: 'MONTHLY',
        interval: 1,
        bymonthday: 15,
      };

      const result = transformLarkRecurrence(larkRecurrence);

      expect(result).toEqual({
        frequency: 'monthly',
        interval: 1,
        byDay: undefined,
        byMonthDay: 15,
        until: undefined,
        count: undefined,
      });
    });
  });

  describe('transformLarkCalendarEvent', () => {
    it('should transform a complete Lark calendar event', () => {
      const larkEvent: LarkCalendarEvent = {
        event_id: 'evt123',
        summary: 'Team Meeting',
        description: 'Weekly sync',
        start_time: { timestamp: '1704067200' }, // 2024-01-01 00:00:00 UTC
        end_time: { timestamp: '1704070800' }, // 2024-01-01 01:00:00 UTC
        attendees: [
          {
            type: 'user',
            user_id: 'user1',
            display_name: 'User 1',
            rsvp_status: 'accept',
          },
        ],
        organizer: {
          user_id: 'org1',
          display_name: 'Organizer',
        },
        status: 'confirmed',
        location: { name: 'Conference Room A' },
        is_all_day: false,
        vc_chat_id: 'meeting123',
        create_time: '1704067100',
        update_time: '1704067150',
      };

      const result = transformLarkCalendarEvent(larkEvent);

      expect(result.eventId).toBe('evt123');
      expect(result.summary).toBe('Team Meeting');
      expect(result.description).toBe('Weekly sync');
      expect(result.startTime).toEqual(new Date(1704067200 * 1000));
      expect(result.endTime).toEqual(new Date(1704070800 * 1000));
      expect(result.attendees).toHaveLength(1);
      const firstAttendee = result.attendees[0];
      expect(firstAttendee).toBeDefined();
      expect(firstAttendee?.displayName).toBe('User 1');
      expect(result.organizer.displayName).toBe('Organizer');
      expect(result.status).toBe('confirmed');
      expect(result.location).toBe('Conference Room A');
      expect(result.isAllDay).toBe(false);
      expect(result.meetingId).toBe('meeting123');
    });

    it('should handle all-day events with date string', () => {
      const larkEvent: LarkCalendarEvent = {
        event_id: 'evt456',
        start_time: { date: '2024-01-01' },
        end_time: { date: '2024-01-02' },
        is_all_day: true,
      };

      const result = transformLarkCalendarEvent(larkEvent);

      expect(result.isAllDay).toBe(true);
      expect(result.summary).toBe('Untitled Event');
    });

    it('should handle missing optional fields', () => {
      const larkEvent: LarkCalendarEvent = {
        event_id: 'evt789',
        start_time: { timestamp: '1704067200' },
        end_time: { timestamp: '1704070800' },
      };

      const result = transformLarkCalendarEvent(larkEvent);

      expect(result.eventId).toBe('evt789');
      expect(result.summary).toBe('Untitled Event');
      expect(result.description).toBeUndefined();
      expect(result.attendees).toEqual([]);
      expect(result.organizer).toEqual({ userId: '', displayName: 'Unknown' });
      expect(result.status).toBe('confirmed');
      expect(result.location).toBeUndefined();
      expect(result.isAllDay).toBe(false);
    });
  });

  describe('getPrimaryCalendarId', () => {
    it('should return primary calendar ID', async () => {
      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: {
          calendars: [
            { calendar_id: 'cal1', is_primary: false },
            { calendar_id: 'cal2', is_primary: true },
          ],
        },
      });

      const result = await client.getPrimaryCalendarId('token');

      expect(result).toBe('cal2');
    });

    it('should return first calendar if no primary', async () => {
      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: {
          calendars: [
            { calendar_id: 'cal1', is_primary: false },
            { calendar_id: 'cal2', is_primary: false },
          ],
        },
      });

      const result = await client.getPrimaryCalendarId('token');

      expect(result).toBe('cal1');
    });

    it('should throw CalendarApiError if no calendars', async () => {
      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: {
          calendars: [],
        },
      });

      await expect(client.getPrimaryCalendarId('token')).rejects.toThrow(
        CalendarApiError
      );
    });
  });

  describe('getCalendarEvents', () => {
    it('should fetch and transform calendar events', async () => {
      // Mock primary calendar request
      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: {
          calendars: [{ calendar_id: 'primary', is_primary: true }],
        },
      });

      // Mock events request
      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: {
          has_more: false,
          items: [
            {
              event_id: 'evt1',
              summary: 'Event 1',
              start_time: { timestamp: '1704067200' },
              end_time: { timestamp: '1704070800' },
              status: 'confirmed',
            },
          ],
        },
      });

      const result = await client.getCalendarEvents('token', {
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-01-31'),
      });

      expect(result.events).toHaveLength(1);
      const firstEvent = result.events[0];
      expect(firstEvent).toBeDefined();
      expect(firstEvent?.eventId).toBe('evt1');
      expect(result.hasMore).toBe(false);
    });

    it('should return empty array if no data', async () => {
      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: {
          calendars: [{ calendar_id: 'primary', is_primary: true }],
        },
      });

      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
      });

      const result = await client.getCalendarEvents('token');

      expect(result.events).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getCalendarEvent', () => {
    it('should fetch a single event', async () => {
      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: {
          calendars: [{ calendar_id: 'primary', is_primary: true }],
        },
      });

      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: {
          event: {
            event_id: 'evt1',
            summary: 'Single Event',
            start_time: { timestamp: '1704067200' },
            end_time: { timestamp: '1704070800' },
            status: 'confirmed',
          },
        },
      });

      const result = await client.getCalendarEvent('token', 'evt1');

      expect(result.eventId).toBe('evt1');
      expect(result.summary).toBe('Single Event');
    });

    it('should throw CalendarEventNotFoundError if event not found', async () => {
      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: {
          calendars: [{ calendar_id: 'primary', is_primary: true }],
        },
      });

      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
      });

      await expect(client.getCalendarEvent('token', 'nonexistent')).rejects.toThrow(
        CalendarEventNotFoundError
      );
    });

    it('should handle LarkClientError with not found code', async () => {
      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: {
          calendars: [{ calendar_id: 'primary', is_primary: true }],
        },
      });

      mockAuthenticatedRequest.mockRejectedValueOnce(
        new LarkClientError('Not found', 190003, '/calendar/events/evt1')
      );

      await expect(client.getCalendarEvent('token', 'evt1')).rejects.toThrow(
        CalendarEventNotFoundError
      );
    });
  });

  describe('searchCalendarEvents', () => {
    it('should search and filter events', async () => {
      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: {
          calendars: [{ calendar_id: 'primary', is_primary: true }],
        },
      });

      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: {
          has_more: false,
          items: [
            {
              event_id: 'evt1',
              summary: 'Team Meeting',
              start_time: { timestamp: '1704067200' },
              end_time: { timestamp: '1704070800' },
            },
            {
              event_id: 'evt2',
              summary: 'Lunch Break',
              start_time: { timestamp: '1704067200' },
              end_time: { timestamp: '1704070800' },
            },
          ],
        },
      });

      const result = await client.searchCalendarEvents('token', {
        query: 'meeting',
      });

      expect(result).toHaveLength(1);
      const firstResult = result[0];
      expect(firstResult).toBeDefined();
      expect(firstResult?.summary).toBe('Team Meeting');
    });
  });

  describe('getUpcomingEvents', () => {
    it('should get upcoming events sorted by start time', async () => {
      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: {
          calendars: [{ calendar_id: 'primary', is_primary: true }],
        },
      });

      const now = Math.floor(Date.now() / 1000);
      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: {
          has_more: false,
          items: [
            {
              event_id: 'evt2',
              summary: 'Later Event',
              start_time: { timestamp: String(now + 7200) },
              end_time: { timestamp: String(now + 10800) },
            },
            {
              event_id: 'evt1',
              summary: 'Soon Event',
              start_time: { timestamp: String(now + 3600) },
              end_time: { timestamp: String(now + 7200) },
            },
          ],
        },
      });

      const result = await client.getUpcomingEvents('token', 5);

      expect(result).toHaveLength(2);
      const firstResult = result[0];
      const secondResult = result[1];
      expect(firstResult).toBeDefined();
      expect(secondResult).toBeDefined();
      expect(firstResult?.summary).toBe('Soon Event');
      expect(secondResult?.summary).toBe('Later Event');
    });

    it('should respect limit parameter', async () => {
      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: {
          calendars: [{ calendar_id: 'primary', is_primary: true }],
        },
      });

      const now = Math.floor(Date.now() / 1000);
      mockAuthenticatedRequest.mockResolvedValueOnce({
        code: 0,
        msg: 'success',
        data: {
          has_more: false,
          items: [
            {
              event_id: 'evt1',
              start_time: { timestamp: String(now + 3600) },
              end_time: { timestamp: String(now + 7200) },
            },
            {
              event_id: 'evt2',
              start_time: { timestamp: String(now + 7200) },
              end_time: { timestamp: String(now + 10800) },
            },
            {
              event_id: 'evt3',
              start_time: { timestamp: String(now + 10800) },
              end_time: { timestamp: String(now + 14400) },
            },
          ],
        },
      });

      const result = await client.getUpcomingEvents('token', 2);

      expect(result).toHaveLength(2);
    });
  });
});

describe('Error Classes', () => {
  describe('CalendarEventNotFoundError', () => {
    it('should create error with event ID', () => {
      const error = new CalendarEventNotFoundError('evt123');

      expect(error.name).toBe('CalendarEventNotFoundError');
      expect(error.eventId).toBe('evt123');
      expect(error.message).toBe('Calendar event not found: evt123');
    });

    it('should use custom message if provided', () => {
      const error = new CalendarEventNotFoundError('evt123', 'Custom message');

      expect(error.message).toBe('Custom message');
    });
  });

  describe('CalendarApiError', () => {
    it('should create error with all properties', () => {
      const error = new CalendarApiError('API failed', 500, 'getEvents', { foo: 'bar' });

      expect(error.name).toBe('CalendarApiError');
      expect(error.message).toBe('API failed');
      expect(error.code).toBe(500);
      expect(error.operation).toBe('getEvents');
      expect(error.details).toEqual({ foo: 'bar' });
    });

    it('should create from LarkClientError', () => {
      const larkError = new LarkClientError('Lark error', 400, '/endpoint', { detail: 'info' });
      const error = CalendarApiError.fromLarkClientError(larkError, 'testOperation');

      expect(error.message).toBe('Lark error');
      expect(error.code).toBe(400);
      expect(error.operation).toBe('testOperation');
      expect(error.details).toEqual({ detail: 'info' });
    });
  });
});
