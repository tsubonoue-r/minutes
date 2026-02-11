/**
 * Analytics Types Tests
 * @module types/__tests__/analytics.test
 */

import { describe, it, expect } from 'vitest';
import {
  // Schemas
  MeetingAnalyticsSchema,
  AnalyticsPeriodSchema,
  CostEstimateSchema,
  MeetingsByDayOfWeekSchema,
  MeetingsByHourSchema,
  AnalyticsQuerySchema,
  // Utility functions
  calculateAnalyticsPeriodDates,
  formatDurationMs,
  formatCurrency,
  getDayLabel,
  formatHour,
  // Validation functions
  validateMeetingAnalytics,
  validateAnalyticsQuery,
} from '../analytics';

// ============================================================================
// Schema Tests
// ============================================================================

describe('Analytics Type Schemas', () => {
  describe('AnalyticsPeriodSchema', () => {
    it('should accept valid periods', () => {
      expect(AnalyticsPeriodSchema.safeParse('week').success).toBe(true);
      expect(AnalyticsPeriodSchema.safeParse('month').success).toBe(true);
      expect(AnalyticsPeriodSchema.safeParse('quarter').success).toBe(true);
    });

    it('should reject invalid periods', () => {
      expect(AnalyticsPeriodSchema.safeParse('day').success).toBe(false);
      expect(AnalyticsPeriodSchema.safeParse('year').success).toBe(false);
      expect(AnalyticsPeriodSchema.safeParse('').success).toBe(false);
    });
  });

  describe('CostEstimateSchema', () => {
    it('should validate a valid cost estimate', () => {
      const estimate = {
        totalHours: 10.5,
        totalCost: 52500,
        currency: 'JPY',
        hourlyRate: 5000,
      };

      const result = CostEstimateSchema.safeParse(estimate);
      expect(result.success).toBe(true);
    });

    it('should reject negative values', () => {
      const estimate = {
        totalHours: -1,
        totalCost: 52500,
        currency: 'JPY',
        hourlyRate: 5000,
      };

      const result = CostEstimateSchema.safeParse(estimate);
      expect(result.success).toBe(false);
    });

    it('should reject empty currency', () => {
      const estimate = {
        totalHours: 10,
        totalCost: 50000,
        currency: '',
        hourlyRate: 5000,
      };

      const result = CostEstimateSchema.safeParse(estimate);
      expect(result.success).toBe(false);
    });
  });

  describe('MeetingsByDayOfWeekSchema', () => {
    it('should validate a valid entry', () => {
      const entry = {
        day: 1,
        count: 5,
        totalDurationMs: 3600000,
      };

      const result = MeetingsByDayOfWeekSchema.safeParse(entry);
      expect(result.success).toBe(true);
    });

    it('should reject day out of range', () => {
      expect(
        MeetingsByDayOfWeekSchema.safeParse({ day: -1, count: 0, totalDurationMs: 0 }).success
      ).toBe(false);
      expect(
        MeetingsByDayOfWeekSchema.safeParse({ day: 7, count: 0, totalDurationMs: 0 }).success
      ).toBe(false);
    });

    it('should accept boundary values', () => {
      expect(
        MeetingsByDayOfWeekSchema.safeParse({ day: 0, count: 0, totalDurationMs: 0 }).success
      ).toBe(true);
      expect(
        MeetingsByDayOfWeekSchema.safeParse({ day: 6, count: 0, totalDurationMs: 0 }).success
      ).toBe(true);
    });
  });

  describe('MeetingsByHourSchema', () => {
    it('should validate a valid entry', () => {
      const entry = { hour: 14, count: 3 };
      const result = MeetingsByHourSchema.safeParse(entry);
      expect(result.success).toBe(true);
    });

    it('should reject hour out of range', () => {
      expect(MeetingsByHourSchema.safeParse({ hour: -1, count: 0 }).success).toBe(false);
      expect(MeetingsByHourSchema.safeParse({ hour: 24, count: 0 }).success).toBe(false);
    });

    it('should accept boundary values', () => {
      expect(MeetingsByHourSchema.safeParse({ hour: 0, count: 0 }).success).toBe(true);
      expect(MeetingsByHourSchema.safeParse({ hour: 23, count: 0 }).success).toBe(true);
    });
  });

  describe('MeetingAnalyticsSchema', () => {
    const validAnalytics = {
      totalMeetings: 10,
      totalDurationMs: 36000000,
      averageDurationMs: 3600000,
      totalParticipants: 50,
      averageParticipants: 5,
      totalDecisions: 15,
      totalActionItems: 20,
      completedActionItems: 12,
      efficiencyScore: 75,
      costEstimate: {
        totalHours: 50,
        totalCost: 250000,
        currency: 'JPY',
        hourlyRate: 5000,
      },
      meetingsByDayOfWeek: [
        { day: 0, count: 0, totalDurationMs: 0 },
        { day: 1, count: 3, totalDurationMs: 10800000 },
        { day: 2, count: 2, totalDurationMs: 7200000 },
        { day: 3, count: 2, totalDurationMs: 7200000 },
        { day: 4, count: 2, totalDurationMs: 7200000 },
        { day: 5, count: 1, totalDurationMs: 3600000 },
        { day: 6, count: 0, totalDurationMs: 0 },
      ],
      meetingsByHour: [
        { hour: 9, count: 3 },
        { hour: 10, count: 4 },
        { hour: 14, count: 3 },
      ],
    };

    it('should validate a complete analytics object', () => {
      const result = MeetingAnalyticsSchema.safeParse(validAnalytics);
      expect(result.success).toBe(true);
    });

    it('should reject efficiency score above 100', () => {
      const invalid = { ...validAnalytics, efficiencyScore: 101 };
      const result = MeetingAnalyticsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject efficiency score below 0', () => {
      const invalid = { ...validAnalytics, efficiencyScore: -1 };
      const result = MeetingAnalyticsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept zero values', () => {
      const zeroAnalytics = {
        totalMeetings: 0,
        totalDurationMs: 0,
        averageDurationMs: 0,
        totalParticipants: 0,
        averageParticipants: 0,
        totalDecisions: 0,
        totalActionItems: 0,
        completedActionItems: 0,
        efficiencyScore: 0,
        costEstimate: {
          totalHours: 0,
          totalCost: 0,
          currency: 'JPY',
          hourlyRate: 0,
        },
        meetingsByDayOfWeek: [],
        meetingsByHour: [],
      };

      const result = MeetingAnalyticsSchema.safeParse(zeroAnalytics);
      expect(result.success).toBe(true);
    });
  });

  describe('AnalyticsQuerySchema', () => {
    it('should use defaults when no parameters provided', () => {
      const result = AnalyticsQuerySchema.parse({});
      expect(result.period).toBe('month');
      expect(result.hourlyRate).toBe(5000);
      expect(result.currency).toBe('JPY');
    });

    it('should accept valid parameters', () => {
      const result = AnalyticsQuerySchema.parse({
        period: 'week',
        hourlyRate: '8000',
        currency: 'USD',
      });
      expect(result.period).toBe('week');
      expect(result.hourlyRate).toBe(8000);
      expect(result.currency).toBe('USD');
    });

    it('should coerce string hourlyRate to number', () => {
      const result = AnalyticsQuerySchema.parse({ hourlyRate: '3000' });
      expect(result.hourlyRate).toBe(3000);
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Analytics Utility Functions', () => {
  describe('calculateAnalyticsPeriodDates', () => {
    it('should return dates for week period', () => {
      const { startDate, endDate } = calculateAnalyticsPeriodDates('week');
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(6);
      expect(diffDays).toBeLessThanOrEqual(8);
    });

    it('should return dates for month period', () => {
      const { startDate, endDate } = calculateAnalyticsPeriodDates('month');
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(27);
      expect(diffDays).toBeLessThanOrEqual(32);
    });

    it('should return dates for quarter period', () => {
      const { startDate, endDate } = calculateAnalyticsPeriodDates('quarter');
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(88);
      expect(diffDays).toBeLessThanOrEqual(93);
    });

    it('should have start date before end date', () => {
      const periods = ['week', 'month', 'quarter'] as const;
      for (const period of periods) {
        const { startDate, endDate } = calculateAnalyticsPeriodDates(period);
        expect(startDate.getTime()).toBeLessThan(endDate.getTime());
      }
    });
  });

  describe('formatDurationMs', () => {
    it('should format minutes only', () => {
      expect(formatDurationMs(30 * 60 * 1000)).toBe('30m');
    });

    it('should format hours only', () => {
      expect(formatDurationMs(2 * 60 * 60 * 1000)).toBe('2h');
    });

    it('should format hours and minutes', () => {
      expect(formatDurationMs(90 * 60 * 1000)).toBe('1h 30m');
    });

    it('should handle zero', () => {
      expect(formatDurationMs(0)).toBe('0m');
    });
  });

  describe('formatCurrency', () => {
    it('should format JPY values', () => {
      const result = formatCurrency(5000, 'JPY');
      expect(result).toContain('5,000');
    });

    it('should format large values', () => {
      const result = formatCurrency(250000, 'JPY');
      expect(result).toContain('250,000');
    });

    it('should format zero', () => {
      const result = formatCurrency(0, 'JPY');
      expect(result).toContain('0');
    });
  });

  describe('getDayLabel', () => {
    it('should return correct Japanese day labels', () => {
      expect(getDayLabel(0)).toBe('日');
      expect(getDayLabel(1)).toBe('月');
      expect(getDayLabel(2)).toBe('火');
      expect(getDayLabel(3)).toBe('水');
      expect(getDayLabel(4)).toBe('木');
      expect(getDayLabel(5)).toBe('金');
      expect(getDayLabel(6)).toBe('土');
    });

    it('should return empty string for invalid day', () => {
      expect(getDayLabel(7)).toBe('');
      expect(getDayLabel(-1)).toBe('');
    });
  });

  describe('formatHour', () => {
    it('should format single digit hours with leading zero', () => {
      expect(formatHour(0)).toBe('00:00');
      expect(formatHour(9)).toBe('09:00');
    });

    it('should format double digit hours', () => {
      expect(formatHour(14)).toBe('14:00');
      expect(formatHour(23)).toBe('23:00');
    });
  });
});

// ============================================================================
// Validation Function Tests
// ============================================================================

describe('Analytics Validation Functions', () => {
  describe('validateMeetingAnalytics', () => {
    it('should validate and return valid analytics', () => {
      const analytics = {
        totalMeetings: 5,
        totalDurationMs: 18000000,
        averageDurationMs: 3600000,
        totalParticipants: 25,
        averageParticipants: 5,
        totalDecisions: 8,
        totalActionItems: 12,
        completedActionItems: 6,
        efficiencyScore: 65,
        costEstimate: {
          totalHours: 25,
          totalCost: 125000,
          currency: 'JPY',
          hourlyRate: 5000,
        },
        meetingsByDayOfWeek: [],
        meetingsByHour: [],
      };

      const result = validateMeetingAnalytics(analytics);
      expect(result.totalMeetings).toBe(5);
      expect(result.efficiencyScore).toBe(65);
    });

    it('should throw on invalid data', () => {
      expect(() => validateMeetingAnalytics({ invalid: true })).toThrow();
    });
  });

  describe('validateAnalyticsQuery', () => {
    it('should validate and use defaults', () => {
      const result = validateAnalyticsQuery({});
      expect(result.period).toBe('month');
      expect(result.hourlyRate).toBe(5000);
    });

    it('should validate custom parameters', () => {
      const result = validateAnalyticsQuery({
        period: 'quarter',
        hourlyRate: '8000',
        currency: 'USD',
      });
      expect(result.period).toBe('quarter');
      expect(result.hourlyRate).toBe(8000);
      expect(result.currency).toBe('USD');
    });
  });
});
