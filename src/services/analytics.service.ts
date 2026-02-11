/**
 * Analytics service for calculating meeting efficiency and cost metrics
 * @module services/analytics.service
 */

import type { Meeting } from '@/types/meeting';
import type { ActionItem } from '@/types/minutes';
import type {
  MeetingAnalytics,
  AnalyticsPeriod,
  MeetingsByDayOfWeek,
  MeetingsByHour,
  CostEstimate,
} from '@/types/analytics';
import { calculateAnalyticsPeriodDates } from '@/types/analytics';

// ============================================================================
// Error Class
// ============================================================================

/**
 * Analytics service error
 */
export class AnalyticsServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AnalyticsServiceError';
  }
}

// ============================================================================
// Service Class
// ============================================================================

/**
 * Service for computing meeting analytics, efficiency scores, and cost estimates.
 *
 * @example
 * ```typescript
 * const service = new AnalyticsService();
 * const analytics = service.calculateAnalytics(meetings, actionItems, 5000);
 * ```
 */
export class AnalyticsService {
  /**
   * Calculate comprehensive analytics from meeting and action item data
   *
   * @param meetings - Array of meetings to analyze
   * @param actionItems - Array of action items from those meetings
   * @param hourlyRate - Hourly rate for cost calculation (per person)
   * @param currency - Currency code for cost display
   * @returns Computed meeting analytics
   */
  calculateAnalytics(
    meetings: readonly Meeting[],
    actionItems: readonly ActionItem[],
    hourlyRate: number,
    currency: string = 'JPY'
  ): MeetingAnalytics {
    const totalMeetings = meetings.length;

    // Duration calculations
    const totalDurationMs = this.calculateTotalDuration(meetings);
    const averageDurationMs =
      totalMeetings > 0 ? Math.round(totalDurationMs / totalMeetings) : 0;

    // Participant calculations
    const totalParticipants = this.calculateTotalParticipants(meetings);
    const averageParticipants =
      totalMeetings > 0
        ? Math.round((totalParticipants / totalMeetings) * 10) / 10
        : 0;

    // Action item calculations
    const totalActionItems = actionItems.length;
    const completedActionItems = actionItems.filter(
      (item) => item.status === 'completed'
    ).length;

    // Decision count (derived from action items with high priority as a proxy)
    const totalDecisions = this.estimateDecisionCount(actionItems);

    // Cost estimate
    const costEstimate = this.calculateCostEstimate(
      meetings,
      hourlyRate,
      currency
    );

    // Efficiency score
    const efficiencyScore = this.calculateEfficiencyScore(
      meetings,
      actionItems,
      totalDecisions
    );

    // Distribution data
    const meetingsByDayOfWeek = this.calculateMeetingsByDayOfWeek(meetings);
    const meetingsByHour = this.calculateMeetingsByHour(meetings);

    return {
      totalMeetings,
      totalDurationMs,
      averageDurationMs,
      totalParticipants,
      averageParticipants,
      totalDecisions,
      totalActionItems,
      completedActionItems,
      efficiencyScore,
      costEstimate,
      meetingsByDayOfWeek,
      meetingsByHour,
    };
  }

  /**
   * Calculate analytics for a specific period by filtering meetings
   *
   * @param allMeetings - All available meetings
   * @param allActionItems - All available action items
   * @param period - Analytics period
   * @param hourlyRate - Hourly rate for cost calculation
   * @param currency - Currency code
   * @returns Analytics for the specified period
   */
  calculateAnalyticsForPeriod(
    allMeetings: readonly Meeting[],
    allActionItems: readonly ActionItem[],
    period: AnalyticsPeriod,
    hourlyRate: number,
    currency: string = 'JPY'
  ): MeetingAnalytics {
    const { startDate, endDate } = calculateAnalyticsPeriodDates(period);

    const filteredMeetings = allMeetings.filter((meeting) => {
      const meetingDate = new Date(meeting.startTime);
      return meetingDate >= startDate && meetingDate <= endDate;
    });

    return this.calculateAnalytics(
      filteredMeetings,
      allActionItems,
      hourlyRate,
      currency
    );
  }

  // ============================================================================
  // Private Calculation Methods
  // ============================================================================

  /**
   * Calculate total meeting duration in milliseconds
   */
  private calculateTotalDuration(meetings: readonly Meeting[]): number {
    return meetings.reduce((total, meeting) => {
      return total + meeting.durationMinutes * 60 * 1000;
    }, 0);
  }

  /**
   * Calculate total participants across all meetings
   */
  private calculateTotalParticipants(meetings: readonly Meeting[]): number {
    return meetings.reduce((total, meeting) => {
      return total + meeting.participantCount;
    }, 0);
  }

  /**
   * Estimate number of decisions from action items
   * Uses high-priority action items as a proxy for decisions
   */
  private estimateDecisionCount(actionItems: readonly ActionItem[]): number {
    return actionItems.filter(
      (item) => item.priority === 'high'
    ).length;
  }

  /**
   * Calculate cost estimate based on meeting time and participants
   *
   * Cost = sum of (meeting duration in hours * participant count * hourly rate)
   */
  private calculateCostEstimate(
    meetings: readonly Meeting[],
    hourlyRate: number,
    currency: string
  ): CostEstimate {
    let totalPersonHours = 0;

    for (const meeting of meetings) {
      const durationHours = meeting.durationMinutes / 60;
      totalPersonHours += durationHours * meeting.participantCount;
    }

    const totalHours = Math.round(totalPersonHours * 10) / 10;
    const totalCost = Math.round(totalPersonHours * hourlyRate);

    return {
      totalHours,
      totalCost,
      currency,
      hourlyRate,
    };
  }

  /**
   * Calculate efficiency score (0-100)
   *
   * Score is based on:
   * - Decisions per hour (30% weight)
   * - Action item completion rate (40% weight)
   * - Meeting duration efficiency - shorter is better (30% weight)
   */
  private calculateEfficiencyScore(
    meetings: readonly Meeting[],
    actionItems: readonly ActionItem[],
    totalDecisions: number
  ): number {
    if (meetings.length === 0) {
      return 0;
    }

    // Decisions per hour score (max 100 if >= 2 decisions/hour)
    const totalHours = meetings.reduce(
      (sum, m) => sum + m.durationMinutes / 60,
      0
    );
    const decisionsPerHour = totalHours > 0 ? totalDecisions / totalHours : 0;
    const decisionScore = Math.min(100, (decisionsPerHour / 2) * 100);

    // Action item completion rate score
    const totalActionItems = actionItems.length;
    const completedItems = actionItems.filter(
      (item) => item.status === 'completed'
    ).length;
    const completionScore =
      totalActionItems > 0
        ? (completedItems / totalActionItems) * 100
        : 50; // Default to 50 if no action items

    // Duration efficiency score (optimal: 30 min, penalty for >60 min)
    const avgDurationMin =
      meetings.reduce((sum, m) => sum + m.durationMinutes, 0) /
      meetings.length;
    let durationScore: number;
    if (avgDurationMin <= 30) {
      durationScore = 100;
    } else if (avgDurationMin <= 60) {
      durationScore = 100 - ((avgDurationMin - 30) / 30) * 50;
    } else {
      durationScore = Math.max(0, 50 - ((avgDurationMin - 60) / 60) * 50);
    }

    // Weighted average
    const score =
      decisionScore * 0.3 + completionScore * 0.4 + durationScore * 0.3;

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Calculate meeting distribution by day of week
   */
  private calculateMeetingsByDayOfWeek(
    meetings: readonly Meeting[]
  ): MeetingsByDayOfWeek[] {
    const dayMap = new Map<number, { count: number; totalDurationMs: number }>();

    // Initialize all days
    for (let day = 0; day <= 6; day++) {
      dayMap.set(day, { count: 0, totalDurationMs: 0 });
    }

    for (const meeting of meetings) {
      const dayOfWeek = new Date(meeting.startTime).getDay();
      const existing = dayMap.get(dayOfWeek);
      if (existing !== undefined) {
        existing.count++;
        existing.totalDurationMs += meeting.durationMinutes * 60 * 1000;
      }
    }

    return Array.from(dayMap.entries()).map(([day, data]) => ({
      day,
      count: data.count,
      totalDurationMs: data.totalDurationMs,
    }));
  }

  /**
   * Calculate meeting distribution by hour of day
   */
  private calculateMeetingsByHour(
    meetings: readonly Meeting[]
  ): MeetingsByHour[] {
    const hourMap = new Map<number, number>();

    // Initialize all hours
    for (let hour = 0; hour <= 23; hour++) {
      hourMap.set(hour, 0);
    }

    for (const meeting of meetings) {
      const hour = new Date(meeting.startTime).getHours();
      const current = hourMap.get(hour) ?? 0;
      hourMap.set(hour, current + 1);
    }

    return Array.from(hourMap.entries()).map(([hour, count]) => ({
      hour,
      count,
    }));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new AnalyticsService instance
 *
 * @returns New AnalyticsService instance
 */
export function createAnalyticsService(): AnalyticsService {
  return new AnalyticsService();
}
