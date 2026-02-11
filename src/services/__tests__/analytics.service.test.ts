/**
 * Analytics Service Tests
 * @module services/__tests__/analytics.service.test
 */

import { describe, it, expect } from 'vitest';
import {
  AnalyticsService,
  createAnalyticsService,
} from '../analytics.service';
import type { Meeting } from '@/types/meeting';
import type { ActionItem } from '@/types/minutes';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock meeting for testing
 */
function createMockMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'meeting-1',
    title: 'Test Meeting',
    meetingNo: 'M001',
    startTime: new Date('2025-01-15T10:00:00Z'),
    endTime: new Date('2025-01-15T11:00:00Z'),
    durationMinutes: 60,
    status: 'ended',
    type: 'regular',
    host: {
      id: 'user-1',
      name: 'Host User',
    },
    participantCount: 5,
    hasRecording: false,
    minutesStatus: 'not_created',
    createdAt: new Date('2025-01-15T09:00:00Z'),
    updatedAt: new Date('2025-01-15T11:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock action item for testing
 */
function createMockActionItem(overrides: Partial<ActionItem> = {}): ActionItem {
  return {
    id: 'action-1',
    content: 'Test action item',
    priority: 'medium',
    status: 'pending',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('AnalyticsService', () => {
  describe('calculateAnalytics', () => {
    it('should return zeroed analytics for empty input', () => {
      const service = new AnalyticsService();
      const result = service.calculateAnalytics([], [], 5000);

      expect(result.totalMeetings).toBe(0);
      expect(result.totalDurationMs).toBe(0);
      expect(result.averageDurationMs).toBe(0);
      expect(result.totalParticipants).toBe(0);
      expect(result.averageParticipants).toBe(0);
      expect(result.totalDecisions).toBe(0);
      expect(result.totalActionItems).toBe(0);
      expect(result.completedActionItems).toBe(0);
      expect(result.efficiencyScore).toBe(0);
      expect(result.costEstimate.totalCost).toBe(0);
      expect(result.costEstimate.totalHours).toBe(0);
    });

    it('should calculate correct total meetings', () => {
      const service = new AnalyticsService();
      const meetings = [
        createMockMeeting({ id: '1' }),
        createMockMeeting({ id: '2' }),
        createMockMeeting({ id: '3' }),
      ];
      const result = service.calculateAnalytics(meetings, [], 5000);

      expect(result.totalMeetings).toBe(3);
    });

    it('should calculate correct duration', () => {
      const service = new AnalyticsService();
      const meetings = [
        createMockMeeting({ durationMinutes: 30 }),
        createMockMeeting({ durationMinutes: 60 }),
        createMockMeeting({ durationMinutes: 90 }),
      ];
      const result = service.calculateAnalytics(meetings, [], 5000);

      // Total: 180 minutes = 10800000 ms
      expect(result.totalDurationMs).toBe(180 * 60 * 1000);
      // Average: 60 minutes = 3600000 ms
      expect(result.averageDurationMs).toBe(60 * 60 * 1000);
    });

    it('should calculate correct participant counts', () => {
      const service = new AnalyticsService();
      const meetings = [
        createMockMeeting({ participantCount: 3 }),
        createMockMeeting({ participantCount: 5 }),
        createMockMeeting({ participantCount: 7 }),
      ];
      const result = service.calculateAnalytics(meetings, [], 5000);

      expect(result.totalParticipants).toBe(15);
      expect(result.averageParticipants).toBe(5);
    });

    it('should count action items correctly', () => {
      const service = new AnalyticsService();
      const meetings = [createMockMeeting()];
      const actionItems = [
        createMockActionItem({ status: 'pending' }),
        createMockActionItem({ status: 'in_progress' }),
        createMockActionItem({ status: 'completed' }),
        createMockActionItem({ status: 'completed' }),
      ];
      const result = service.calculateAnalytics(meetings, actionItems, 5000);

      expect(result.totalActionItems).toBe(4);
      expect(result.completedActionItems).toBe(2);
    });

    it('should count high-priority items as decisions', () => {
      const service = new AnalyticsService();
      const meetings = [createMockMeeting()];
      const actionItems = [
        createMockActionItem({ priority: 'high' }),
        createMockActionItem({ priority: 'high' }),
        createMockActionItem({ priority: 'medium' }),
        createMockActionItem({ priority: 'low' }),
      ];
      const result = service.calculateAnalytics(meetings, actionItems, 5000);

      expect(result.totalDecisions).toBe(2);
    });

    it('should calculate cost estimate correctly', () => {
      const service = new AnalyticsService();
      const meetings = [
        createMockMeeting({ durationMinutes: 60, participantCount: 5 }),
        createMockMeeting({ durationMinutes: 30, participantCount: 3 }),
      ];
      const hourlyRate = 5000;
      const result = service.calculateAnalytics(meetings, [], hourlyRate, 'JPY');

      // Meeting 1: 1h * 5 people = 5 person-hours
      // Meeting 2: 0.5h * 3 people = 1.5 person-hours
      // Total: 6.5 person-hours
      expect(result.costEstimate.totalHours).toBe(6.5);
      expect(result.costEstimate.totalCost).toBe(6.5 * 5000);
      expect(result.costEstimate.currency).toBe('JPY');
      expect(result.costEstimate.hourlyRate).toBe(5000);
    });

    it('should generate meetings by day of week', () => {
      const service = new AnalyticsService();
      // Wednesday 2025-01-15
      const meetings = [
        createMockMeeting({ startTime: new Date('2025-01-15T10:00:00Z') }),
        createMockMeeting({ startTime: new Date('2025-01-15T14:00:00Z') }),
        // Thursday 2025-01-16
        createMockMeeting({ startTime: new Date('2025-01-16T10:00:00Z') }),
      ];
      const result = service.calculateAnalytics(meetings, [], 5000);

      expect(result.meetingsByDayOfWeek).toHaveLength(7);

      // All 7 days should be present
      const days = result.meetingsByDayOfWeek.map((d) => d.day);
      expect(days).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });

    it('should generate meetings by hour', () => {
      const service = new AnalyticsService();
      const meetings = [
        createMockMeeting({ startTime: new Date('2025-01-15T10:00:00Z') }),
        createMockMeeting({ startTime: new Date('2025-01-15T10:30:00Z') }),
        createMockMeeting({ startTime: new Date('2025-01-15T14:00:00Z') }),
      ];
      const result = service.calculateAnalytics(meetings, [], 5000);

      expect(result.meetingsByHour).toHaveLength(24);

      // All 24 hours should be present
      const hours = result.meetingsByHour.map((h) => h.hour);
      expect(hours).toEqual(Array.from({ length: 24 }, (_, i) => i));
    });

    it('should calculate efficiency score between 0 and 100', () => {
      const service = new AnalyticsService();
      const meetings = [
        createMockMeeting({ durationMinutes: 30 }),
        createMockMeeting({ durationMinutes: 45 }),
      ];
      const actionItems = [
        createMockActionItem({ priority: 'high', status: 'completed' }),
        createMockActionItem({ priority: 'high', status: 'completed' }),
        createMockActionItem({ priority: 'medium', status: 'completed' }),
      ];
      const result = service.calculateAnalytics(meetings, actionItems, 5000);

      expect(result.efficiencyScore).toBeGreaterThanOrEqual(0);
      expect(result.efficiencyScore).toBeLessThanOrEqual(100);
    });

    it('should give higher efficiency score for shorter meetings with more decisions', () => {
      const service = new AnalyticsService();

      // Efficient: short meetings, high completion rate
      const efficientMeetings = [
        createMockMeeting({ durationMinutes: 25 }),
        createMockMeeting({ durationMinutes: 30 }),
      ];
      const efficientActions = [
        createMockActionItem({ priority: 'high', status: 'completed' }),
        createMockActionItem({ priority: 'high', status: 'completed' }),
        createMockActionItem({ priority: 'medium', status: 'completed' }),
      ];
      const efficientResult = service.calculateAnalytics(
        efficientMeetings,
        efficientActions,
        5000
      );

      // Inefficient: long meetings, low completion rate
      const inefficientMeetings = [
        createMockMeeting({ durationMinutes: 120 }),
        createMockMeeting({ durationMinutes: 90 }),
      ];
      const inefficientActions = [
        createMockActionItem({ priority: 'low', status: 'pending' }),
        createMockActionItem({ priority: 'low', status: 'pending' }),
        createMockActionItem({ priority: 'low', status: 'pending' }),
      ];
      const inefficientResult = service.calculateAnalytics(
        inefficientMeetings,
        inefficientActions,
        5000
      );

      expect(efficientResult.efficiencyScore).toBeGreaterThan(
        inefficientResult.efficiencyScore
      );
    });
  });

  describe('calculateAnalyticsForPeriod', () => {
    it('should filter meetings by period', () => {
      const service = new AnalyticsService();
      const now = new Date();
      const lastWeek = new Date(now);
      lastWeek.setDate(now.getDate() - 3);
      const twoMonthsAgo = new Date(now);
      twoMonthsAgo.setMonth(now.getMonth() - 2);

      const meetings = [
        createMockMeeting({
          id: 'recent',
          startTime: lastWeek,
          durationMinutes: 60,
        }),
        createMockMeeting({
          id: 'old',
          startTime: twoMonthsAgo,
          durationMinutes: 60,
        }),
      ];

      const weekResult = service.calculateAnalyticsForPeriod(
        meetings,
        [],
        'week',
        5000
      );
      expect(weekResult.totalMeetings).toBe(1);

      const monthResult = service.calculateAnalyticsForPeriod(
        meetings,
        [],
        'month',
        5000
      );
      expect(monthResult.totalMeetings).toBe(1);

      const quarterResult = service.calculateAnalyticsForPeriod(
        meetings,
        [],
        'quarter',
        5000
      );
      expect(quarterResult.totalMeetings).toBe(2);
    });
  });
});

describe('createAnalyticsService', () => {
  it('should create an AnalyticsService instance', () => {
    const service = createAnalyticsService();
    expect(service).toBeInstanceOf(AnalyticsService);
  });
});
