/**
 * Dashboard statistics service
 * @module services/dashboard.service
 */

import type {
  DashboardStats,
  DashboardPeriod,
  MeetingStats,
  MinutesStats,
  DashboardActionItemStats,
  ParticipantStats,
  MeetingFrequency,
  RecentActivity,
  MeetingFrequencyPoint,
} from '@/types/dashboard';
import {
  calculatePeriodDates,
  calculateChangePercent,
  getFrequencyInterval,
} from '@/types/dashboard';
import {
  createActionItemService,
  ActionItemServiceError,
} from './action-item.service';

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Dashboard service error
 */
export class DashboardServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'DashboardServiceError';
  }
}

// ============================================================================
// In-Memory Store for Demo Data
// ============================================================================

/**
 * Demo meeting data structure
 */
interface DemoMeeting {
  readonly id: string;
  readonly title: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly status: 'scheduled' | 'in_progress' | 'ended' | 'cancelled';
  readonly minutesStatus: 'pending' | 'generating' | 'completed' | 'failed';
  readonly participantIds: readonly string[];
  readonly hostId: string;
}

/**
 * Demo participant data structure
 */
interface DemoParticipant {
  readonly id: string;
  readonly name: string;
  readonly avatarUrl?: string;
}

/**
 * Generate demo data for dashboard
 */
function generateDemoData(
  startDate: Date,
  endDate: Date
): {
  meetings: readonly DemoMeeting[];
  participants: ReadonlyMap<string, DemoParticipant>;
} {
  const participants = new Map<string, DemoParticipant>([
    ['p1', { id: 'p1', name: 'Tanaka Taro' }],
    ['p2', { id: 'p2', name: 'Yamada Hanako' }],
    ['p3', { id: 'p3', name: 'Suzuki Ichiro' }],
    ['p4', { id: 'p4', name: 'Sato Yuki' }],
    ['p5', { id: 'p5', name: 'Takahashi Ken' }],
  ]);

  const meetings: DemoMeeting[] = [];
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Generate meetings throughout the period
  for (let i = 0; i < Math.min(daysDiff, 30); i++) {
    const meetingDate = new Date(startDate);
    meetingDate.setDate(startDate.getDate() + i);

    // Skip weekends for more realistic data
    if (meetingDate.getDay() === 0 || meetingDate.getDay() === 6) {
      continue;
    }

    // 1-3 meetings per day
    const meetingsPerDay = Math.floor(Math.random() * 3) + 1;

    for (let j = 0; j < meetingsPerDay; j++) {
      const startHour = 9 + Math.floor(Math.random() * 8); // 9-16
      const durations = [30, 60, 90, 120] as const;
      const duration = durations[Math.floor(Math.random() * durations.length)] ?? 60;

      const meetingStart = new Date(meetingDate);
      meetingStart.setHours(startHour, 0, 0, 0);

      const meetingEnd = new Date(meetingStart);
      meetingEnd.setMinutes(meetingEnd.getMinutes() + duration);

      const participantCount = Math.floor(Math.random() * 4) + 2; // 2-5 participants
      const participantIds = Array.from(participants.keys())
        .sort(() => Math.random() - 0.5)
        .slice(0, participantCount);

      const statuses = [
        'ended',
        'ended',
        'ended',
        'scheduled',
        'cancelled',
      ] as const;
      const statusIndex = Math.floor(Math.random() * statuses.length);
      const status: DemoMeeting['status'] =
        meetingStart > new Date()
          ? 'scheduled'
          : (statuses[statusIndex] ?? 'ended');

      const minutesStatuses = [
        'completed',
        'completed',
        'completed',
        'pending',
        'failed',
      ] as const;
      const minutesStatusIndex = Math.floor(Math.random() * minutesStatuses.length);
      const minutesStatus: DemoMeeting['minutesStatus'] =
        status === 'ended'
          ? (minutesStatuses[minutesStatusIndex] ?? 'completed')
          : 'pending';

      const hostId = participantIds[0] ?? 'p1';

      meetings.push({
        id: `meeting-${i}-${j}`,
        title: `Meeting ${i + 1}-${j + 1}`,
        startTime: meetingStart,
        endTime: meetingEnd,
        status,
        minutesStatus,
        participantIds,
        hostId,
      });
    }
  }

  return { meetings, participants };
}

// ============================================================================
// Dashboard Service
// ============================================================================

/**
 * Service for generating dashboard statistics
 */
export class DashboardService {
  private readonly actionItemService = createActionItemService();

  /**
   * Get complete dashboard statistics
   *
   * @param period - Statistics period
   * @param customStartDate - Custom start date for 'custom' period
   * @param customEndDate - Custom end date for 'custom' period
   * @returns Dashboard statistics
   */
  async getStats(
    period: DashboardPeriod = 'month',
    customStartDate?: string,
    customEndDate?: string
  ): Promise<DashboardStats> {
    try {
      const { startDate, endDate } = calculatePeriodDates(
        period,
        customStartDate,
        customEndDate
      );

      // Calculate previous period for comparison
      const periodDuration = endDate.getTime() - startDate.getTime();
      const previousStartDate = new Date(startDate.getTime() - periodDuration);
      const previousEndDate = new Date(startDate.getTime() - 1);

      // Generate demo data for current and previous periods
      const { meetings, participants } = generateDemoData(startDate, endDate);
      const { meetings: previousMeetings } = generateDemoData(
        previousStartDate,
        previousEndDate
      );

      // Get action item stats
      const actionItemStats = await this.getActionItemStats();

      // Calculate all statistics
      const meetingStats = this.calculateMeetingStats(meetings, previousMeetings);
      const minutesStats = this.calculateMinutesStats(meetings, previousMeetings);
      const participantStats = this.calculateParticipantStats(
        meetings,
        participants,
        actionItemStats
      );
      const frequencyData = this.calculateFrequencyData(
        meetings,
        startDate,
        endDate,
        period
      );
      const recentActivity = this.generateRecentActivity(meetings, participants);

      return {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        meetings: meetingStats,
        minutes: minutesStats,
        actionItems: actionItemStats,
        participants: participantStats,
        frequency: frequencyData,
        recentActivity,
      };
    } catch (error) {
      if (error instanceof ActionItemServiceError) {
        throw new DashboardServiceError(
          error.message,
          error.code,
          error.statusCode,
          error.details
        );
      }
      throw new DashboardServiceError(
        'Failed to generate dashboard statistics',
        'STATS_GENERATION_FAILED',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Calculate meeting statistics
   */
  private calculateMeetingStats(
    currentMeetings: readonly DemoMeeting[],
    previousMeetings: readonly DemoMeeting[]
  ): MeetingStats {
    const thisPeriod = currentMeetings.length;
    const previousPeriod = previousMeetings.length;

    const byStatus = {
      scheduled: currentMeetings.filter((m) => m.status === 'scheduled').length,
      inProgress: currentMeetings.filter((m) => m.status === 'in_progress')
        .length,
      ended: currentMeetings.filter((m) => m.status === 'ended').length,
      cancelled: currentMeetings.filter((m) => m.status === 'cancelled').length,
    };

    return {
      total: thisPeriod,
      thisPeriod,
      previousPeriod,
      changePercent: calculateChangePercent(thisPeriod, previousPeriod),
      byStatus,
    };
  }

  /**
   * Calculate minutes generation statistics
   */
  private calculateMinutesStats(
    currentMeetings: readonly DemoMeeting[],
    previousMeetings: readonly DemoMeeting[]
  ): MinutesStats {
    const completedCurrent = currentMeetings.filter(
      (m) => m.minutesStatus === 'completed'
    ).length;
    const completedPrevious = previousMeetings.filter(
      (m) => m.minutesStatus === 'completed'
    ).length;

    const byStatus = {
      pending: currentMeetings.filter((m) => m.minutesStatus === 'pending')
        .length,
      generating: currentMeetings.filter(
        (m) => m.minutesStatus === 'generating'
      ).length,
      completed: completedCurrent,
      failed: currentMeetings.filter((m) => m.minutesStatus === 'failed')
        .length,
    };

    return {
      total: completedCurrent,
      thisPeriod: completedCurrent,
      previousPeriod: completedPrevious,
      changePercent: calculateChangePercent(completedCurrent, completedPrevious),
      byStatus,
    };
  }

  /**
   * Get action item statistics from service
   */
  private async getActionItemStats(): Promise<DashboardActionItemStats> {
    const stats = await this.actionItemService.getStats();

    const total =
      stats.pending + stats.inProgress + stats.completed + stats.overdue;
    const completionRate =
      total > 0 ? Math.round((stats.completed / total) * 100) : 0;

    return {
      total,
      pending: stats.pending,
      inProgress: stats.inProgress,
      completed: stats.completed,
      overdue: stats.overdue,
      completionRate,
      avgCompletionDays: total > 0 ? 3.5 : null, // Demo value
    };
  }

  /**
   * Calculate participant statistics
   */
  private calculateParticipantStats(
    meetings: readonly DemoMeeting[],
    participants: ReadonlyMap<string, DemoParticipant>,
    actionItemStats: DashboardActionItemStats
  ): ParticipantStats {
    // Count meetings per participant
    const participantMeetingCounts = new Map<string, number>();

    for (const meeting of meetings) {
      for (const participantId of meeting.participantIds) {
        const count = participantMeetingCounts.get(participantId) ?? 0;
        participantMeetingCounts.set(participantId, count + 1);
      }
    }

    // Calculate average participants per meeting
    const totalParticipants = meetings.reduce(
      (sum, m) => sum + m.participantIds.length,
      0
    );
    const avgPerMeeting =
      meetings.length > 0
        ? Math.round((totalParticipants / meetings.length) * 10) / 10
        : 0;

    // Get top participants
    const topParticipants = Array.from(participantMeetingCounts.entries())
      .map(([id, meetingCount]) => {
        const participant = participants.get(id);
        return {
          id,
          name: participant?.name ?? 'Unknown',
          avatarUrl: participant?.avatarUrl,
          meetingCount,
          actionItemCount: Math.floor(
            (actionItemStats.total * meetingCount) /
              Math.max(1, participantMeetingCounts.size)
          ),
        };
      })
      .sort((a, b) => b.meetingCount - a.meetingCount)
      .slice(0, 5);

    return {
      totalUnique: participantMeetingCounts.size,
      avgPerMeeting,
      topParticipants,
    };
  }

  /**
   * Calculate meeting frequency data for charts
   */
  private calculateFrequencyData(
    meetings: readonly DemoMeeting[],
    startDate: Date,
    endDate: Date,
    period: DashboardPeriod
  ): MeetingFrequency {
    const interval = getFrequencyInterval(period);
    const data: MeetingFrequencyPoint[] = [];

    const current = new Date(startDate);

    while (current <= endDate) {
      let nextDate: Date;
      let dateLabel: string;

      switch (interval) {
        case 'day':
          nextDate = new Date(current);
          nextDate.setDate(nextDate.getDate() + 1);
          dateLabel = current.toISOString().split('T')[0] ?? '';
          break;
        case 'week':
          nextDate = new Date(current);
          nextDate.setDate(nextDate.getDate() + 7);
          dateLabel = `Week of ${current.toISOString().split('T')[0] ?? ''}`;
          break;
        case 'month':
          nextDate = new Date(current);
          nextDate.setMonth(nextDate.getMonth() + 1);
          dateLabel = current.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
          });
          break;
        default:
          nextDate = new Date(current);
          nextDate.setDate(nextDate.getDate() + 1);
          dateLabel = current.toISOString().split('T')[0] ?? '';
      }

      const periodMeetings = meetings.filter(
        (m) => m.startTime >= current && m.startTime < nextDate
      );

      const totalDurationMinutes = periodMeetings.reduce((sum, m) => {
        const duration =
          (m.endTime.getTime() - m.startTime.getTime()) / (1000 * 60);
        return sum + duration;
      }, 0);

      data.push({
        date: dateLabel,
        count: periodMeetings.length,
        totalDurationMinutes: Math.round(totalDurationMinutes),
      });

      current.setTime(nextDate.getTime());
    }

    return { data, interval };
  }

  /**
   * Generate recent activity list
   */
  private generateRecentActivity(
    meetings: readonly DemoMeeting[],
    participants: ReadonlyMap<string, DemoParticipant>
  ): RecentActivity[] {
    const activities: RecentActivity[] = [];

    // Get most recent meetings
    const recentMeetings = [...meetings]
      .filter((m) => m.status === 'ended')
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime())
      .slice(0, 10);

    for (const meeting of recentMeetings) {
      const host = participants.get(meeting.hostId);

      // Meeting ended activity
      activities.push({
        id: `activity-meeting-${meeting.id}`,
        type: 'meeting',
        title: meeting.title,
        description: `Meeting ended with ${meeting.participantIds.length} participants`,
        timestamp: meeting.endTime.toISOString(),
        meetingId: meeting.id,
        user: host
          ? { id: host.id, name: host.name, avatarUrl: host.avatarUrl }
          : undefined,
      });

      // Minutes generated activity
      if (meeting.minutesStatus === 'completed') {
        activities.push({
          id: `activity-minutes-${meeting.id}`,
          type: 'minutes',
          title: `Minutes: ${meeting.title}`,
          description: 'Meeting minutes generated successfully',
          timestamp: new Date(
            meeting.endTime.getTime() + 5 * 60 * 1000
          ).toISOString(),
          meetingId: meeting.id,
        });
      }
    }

    return activities
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 10);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a DashboardService instance
 *
 * @returns DashboardService instance
 */
export function createDashboardService(): DashboardService {
  return new DashboardService();
}
