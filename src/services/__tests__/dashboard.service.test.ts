/**
 * Dashboard service tests
 * @module services/__tests__/dashboard.service.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DashboardService,
  DashboardServiceError,
  createDashboardService,
} from '../dashboard.service';
import type { DashboardPeriod } from '@/types/dashboard';

// Mock the action-item service
vi.mock('../action-item.service', () => ({
  createActionItemService: vi.fn(() => ({
    getStats: vi.fn().mockResolvedValue({
      total: 10,
      pending: 3,
      inProgress: 4,
      completed: 2,
      overdue: 1,
    }),
  })),
  ActionItemServiceError: class extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly statusCode: number = 500,
      public readonly details?: unknown
    ) {
      super(message);
      this.name = 'ActionItemServiceError';
    }
  },
}));

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    service = new DashboardService();
  });

  describe('createDashboardService', () => {
    it('should create a DashboardService instance', () => {
      const instance = createDashboardService();
      expect(instance).toBeInstanceOf(DashboardService);
    });
  });

  describe('getStats', () => {
    it('should return dashboard stats for default period (month)', async () => {
      const stats = await service.getStats();

      expect(stats).toBeDefined();
      expect(stats.period).toBe('month');
      expect(stats.startDate).toBeDefined();
      expect(stats.endDate).toBeDefined();
      expect(stats.meetings).toBeDefined();
      expect(stats.minutes).toBeDefined();
      expect(stats.actionItems).toBeDefined();
      expect(stats.participants).toBeDefined();
      expect(stats.frequency).toBeDefined();
      expect(stats.recentActivity).toBeDefined();
    });

    it('should return stats for today period', async () => {
      const stats = await service.getStats('today');

      expect(stats.period).toBe('today');
      expect(stats.frequency.interval).toBe('day');
    });

    it('should return stats for week period', async () => {
      const stats = await service.getStats('week');

      expect(stats.period).toBe('week');
      expect(stats.frequency.interval).toBe('day');
    });

    it('should return stats for quarter period', async () => {
      const stats = await service.getStats('quarter');

      expect(stats.period).toBe('quarter');
      expect(stats.frequency.interval).toBe('week');
    });

    it('should return stats for year period', async () => {
      const stats = await service.getStats('year');

      expect(stats.period).toBe('year');
      expect(stats.frequency.interval).toBe('month');
    });

    it('should return stats for custom period', async () => {
      const startDate = '2025-01-01';
      const endDate = '2025-01-31';
      const stats = await service.getStats('custom', startDate, endDate);

      expect(stats.period).toBe('custom');
      expect(new Date(stats.startDate).toISOString()).toContain('2025-01-01');
      expect(new Date(stats.endDate).toISOString()).toContain('2025-01-31');
    });

    it('should include meeting statistics', async () => {
      const stats = await service.getStats();

      expect(stats.meetings).toHaveProperty('total');
      expect(stats.meetings).toHaveProperty('thisPeriod');
      expect(stats.meetings).toHaveProperty('previousPeriod');
      expect(stats.meetings).toHaveProperty('changePercent');
      expect(stats.meetings).toHaveProperty('byStatus');
      expect(stats.meetings.byStatus).toHaveProperty('scheduled');
      expect(stats.meetings.byStatus).toHaveProperty('inProgress');
      expect(stats.meetings.byStatus).toHaveProperty('ended');
      expect(stats.meetings.byStatus).toHaveProperty('cancelled');
    });

    it('should include minutes statistics', async () => {
      const stats = await service.getStats();

      expect(stats.minutes).toHaveProperty('total');
      expect(stats.minutes).toHaveProperty('thisPeriod');
      expect(stats.minutes).toHaveProperty('previousPeriod');
      expect(stats.minutes).toHaveProperty('changePercent');
      expect(stats.minutes).toHaveProperty('byStatus');
    });

    it('should include action item statistics', async () => {
      const stats = await service.getStats();

      expect(stats.actionItems).toHaveProperty('total');
      expect(stats.actionItems).toHaveProperty('pending');
      expect(stats.actionItems).toHaveProperty('inProgress');
      expect(stats.actionItems).toHaveProperty('completed');
      expect(stats.actionItems).toHaveProperty('overdue');
      expect(stats.actionItems).toHaveProperty('completionRate');
      expect(typeof stats.actionItems.completionRate).toBe('number');
      expect(stats.actionItems.completionRate).toBeGreaterThanOrEqual(0);
      expect(stats.actionItems.completionRate).toBeLessThanOrEqual(100);
    });

    it('should include participant statistics', async () => {
      const stats = await service.getStats();

      expect(stats.participants).toHaveProperty('totalUnique');
      expect(stats.participants).toHaveProperty('avgPerMeeting');
      expect(stats.participants).toHaveProperty('topParticipants');
      expect(Array.isArray(stats.participants.topParticipants)).toBe(true);
    });

    it('should include frequency data', async () => {
      const stats = await service.getStats();

      expect(stats.frequency).toHaveProperty('data');
      expect(stats.frequency).toHaveProperty('interval');
      expect(Array.isArray(stats.frequency.data)).toBe(true);
      expect(['day', 'week', 'month']).toContain(stats.frequency.interval);
    });

    it('should include recent activity', async () => {
      const stats = await service.getStats();

      expect(Array.isArray(stats.recentActivity)).toBe(true);
      if (stats.recentActivity.length > 0) {
        const activity = stats.recentActivity[0];
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('type');
        expect(activity).toHaveProperty('title');
        expect(activity).toHaveProperty('description');
        expect(activity).toHaveProperty('timestamp');
      }
    });

    it('should return frequency data points with required properties', async () => {
      const stats = await service.getStats();

      for (const point of stats.frequency.data) {
        expect(point).toHaveProperty('date');
        expect(point).toHaveProperty('count');
        expect(point).toHaveProperty('totalDurationMinutes');
        expect(typeof point.date).toBe('string');
        expect(typeof point.count).toBe('number');
        expect(typeof point.totalDurationMinutes).toBe('number');
      }
    });

    it('should return top participants with required properties', async () => {
      const stats = await service.getStats();

      for (const participant of stats.participants.topParticipants) {
        expect(participant).toHaveProperty('id');
        expect(participant).toHaveProperty('name');
        expect(participant).toHaveProperty('meetingCount');
        expect(participant).toHaveProperty('actionItemCount');
        expect(typeof participant.meetingCount).toBe('number');
        expect(typeof participant.actionItemCount).toBe('number');
      }
    });
  });

  describe('DashboardServiceError', () => {
    it('should create error with all properties', () => {
      const error = new DashboardServiceError(
        'Test error',
        'TEST_CODE',
        400,
        { extra: 'data' }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ extra: 'data' });
      expect(error.name).toBe('DashboardServiceError');
    });

    it('should default statusCode to 500', () => {
      const error = new DashboardServiceError('Test error', 'TEST_CODE');

      expect(error.statusCode).toBe(500);
    });
  });

  describe('period calculations', () => {
    const periods: DashboardPeriod[] = [
      'today',
      'week',
      'month',
      'quarter',
      'year',
    ];

    periods.forEach((period) => {
      it(`should calculate correct date range for ${period}`, async () => {
        const stats = await service.getStats(period);

        const startDate = new Date(stats.startDate);
        const endDate = new Date(stats.endDate);

        expect(startDate).toBeInstanceOf(Date);
        expect(endDate).toBeInstanceOf(Date);
        expect(startDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });
  });

  describe('change percentage calculation', () => {
    it('should calculate change percent in meeting stats', async () => {
      const stats = await service.getStats();

      expect(typeof stats.meetings.changePercent).toBe('number');
      expect(typeof stats.minutes.changePercent).toBe('number');
    });
  });
});
