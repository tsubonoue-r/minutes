/**
 * Dashboard statistics type definitions
 * @module types/dashboard
 */

import { z } from 'zod';

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Period type for dashboard statistics
 */
export const DashboardPeriodSchema = z.enum([
  'today',
  'week',
  'month',
  'quarter',
  'year',
  'custom',
]);

/**
 * Meeting statistics schema
 */
export const MeetingStatsSchema = z.object({
  /** Total number of meetings */
  total: z.number().int().nonnegative(),
  /** Meetings this period */
  thisPeriod: z.number().int().nonnegative(),
  /** Meetings compared to previous period */
  previousPeriod: z.number().int().nonnegative(),
  /** Change percentage from previous period */
  changePercent: z.number(),
  /** Meetings by status */
  byStatus: z.object({
    scheduled: z.number().int().nonnegative(),
    inProgress: z.number().int().nonnegative(),
    ended: z.number().int().nonnegative(),
    cancelled: z.number().int().nonnegative(),
  }),
});

/**
 * Minutes generation statistics schema
 */
export const MinutesStatsSchema = z.object({
  /** Total minutes generated */
  total: z.number().int().nonnegative(),
  /** Minutes generated this period */
  thisPeriod: z.number().int().nonnegative(),
  /** Minutes compared to previous period */
  previousPeriod: z.number().int().nonnegative(),
  /** Change percentage from previous period */
  changePercent: z.number(),
  /** Minutes by generation status */
  byStatus: z.object({
    pending: z.number().int().nonnegative(),
    generating: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  }),
});

/**
 * Action item statistics schema for dashboard
 */
export const DashboardActionItemStatsSchema = z.object({
  /** Total action items */
  total: z.number().int().nonnegative(),
  /** Pending action items */
  pending: z.number().int().nonnegative(),
  /** In progress action items */
  inProgress: z.number().int().nonnegative(),
  /** Completed action items */
  completed: z.number().int().nonnegative(),
  /** Overdue action items */
  overdue: z.number().int().nonnegative(),
  /** Completion rate percentage */
  completionRate: z.number().min(0).max(100),
  /** Average completion time in days */
  avgCompletionDays: z.number().nonnegative().nullable(),
});

/**
 * Participant statistics schema
 */
export const ParticipantStatsSchema = z.object({
  /** Total unique participants */
  totalUnique: z.number().int().nonnegative(),
  /** Average participants per meeting */
  avgPerMeeting: z.number().nonnegative(),
  /** Top participants by meeting count */
  topParticipants: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      avatarUrl: z.string().optional(),
      meetingCount: z.number().int().nonnegative(),
      actionItemCount: z.number().int().nonnegative(),
    })
  ),
});

/**
 * Meeting frequency data point schema
 */
export const MeetingFrequencyPointSchema = z.object({
  /** Date label */
  date: z.string(),
  /** Number of meetings */
  count: z.number().int().nonnegative(),
  /** Total duration in minutes */
  totalDurationMinutes: z.number().int().nonnegative(),
});

/**
 * Meeting frequency data schema
 */
export const MeetingFrequencySchema = z.object({
  /** Data points */
  data: z.array(MeetingFrequencyPointSchema),
  /** Aggregation interval */
  interval: z.enum(['day', 'week', 'month']),
});

/**
 * Recent activity item schema
 */
export const RecentActivitySchema = z.object({
  /** Activity ID */
  id: z.string(),
  /** Activity type */
  type: z.enum(['meeting', 'minutes', 'action_item']),
  /** Activity title */
  title: z.string(),
  /** Activity description */
  description: z.string(),
  /** When the activity occurred */
  timestamp: z.string(),
  /** Related meeting ID */
  meetingId: z.string().optional(),
  /** Related user */
  user: z
    .object({
      id: z.string(),
      name: z.string(),
      avatarUrl: z.string().optional(),
    })
    .optional(),
});

/**
 * Dashboard statistics response schema
 */
export const DashboardStatsSchema = z.object({
  /** Statistics period */
  period: DashboardPeriodSchema,
  /** Period start date */
  startDate: z.string(),
  /** Period end date */
  endDate: z.string(),
  /** Meeting statistics */
  meetings: MeetingStatsSchema,
  /** Minutes generation statistics */
  minutes: MinutesStatsSchema,
  /** Action item statistics */
  actionItems: DashboardActionItemStatsSchema,
  /** Participant statistics */
  participants: ParticipantStatsSchema,
  /** Meeting frequency data */
  frequency: MeetingFrequencySchema,
  /** Recent activities */
  recentActivity: z.array(RecentActivitySchema),
});

/**
 * Dashboard stats request query schema
 */
export const DashboardStatsQuerySchema = z.object({
  /** Period type */
  period: DashboardPeriodSchema.optional().default('month'),
  /** Custom start date (ISO string) */
  startDate: z.string().optional(),
  /** Custom end date (ISO string) */
  endDate: z.string().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type DashboardPeriod = z.infer<typeof DashboardPeriodSchema>;
export type MeetingStats = z.infer<typeof MeetingStatsSchema>;
export type MinutesStats = z.infer<typeof MinutesStatsSchema>;
export type DashboardActionItemStats = z.infer<
  typeof DashboardActionItemStatsSchema
>;
export type ParticipantStats = z.infer<typeof ParticipantStatsSchema>;
export type MeetingFrequencyPoint = z.infer<typeof MeetingFrequencyPointSchema>;
export type MeetingFrequency = z.infer<typeof MeetingFrequencySchema>;
export type RecentActivity = z.infer<typeof RecentActivitySchema>;
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
export type DashboardStatsQuery = z.infer<typeof DashboardStatsQuerySchema>;

// ============================================================================
// Readonly Types
// ============================================================================

export type ReadonlyMeetingStats = Readonly<MeetingStats>;
export type ReadonlyMinutesStats = Readonly<MinutesStats>;
export type ReadonlyDashboardActionItemStats =
  Readonly<DashboardActionItemStats>;
export type ReadonlyParticipantStats = Readonly<
  Omit<ParticipantStats, 'topParticipants'> & {
    readonly topParticipants: ReadonlyArray<
      Readonly<ParticipantStats['topParticipants'][number]>
    >;
  }
>;
export type ReadonlyMeetingFrequency = Readonly<
  Omit<MeetingFrequency, 'data'> & {
    readonly data: ReadonlyArray<Readonly<MeetingFrequencyPoint>>;
  }
>;
export type ReadonlyRecentActivity = Readonly<RecentActivity>;
export type ReadonlyDashboardStats = Readonly<
  Omit<DashboardStats, 'recentActivity' | 'frequency' | 'participants'> & {
    readonly recentActivity: ReadonlyArray<ReadonlyRecentActivity>;
    readonly frequency: ReadonlyMeetingFrequency;
    readonly participants: ReadonlyParticipantStats;
  }
>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate period dates based on period type
 *
 * @param period - Period type
 * @param customStart - Custom start date for 'custom' period
 * @param customEnd - Custom end date for 'custom' period
 * @returns Start and end dates for the period
 */
export function calculatePeriodDates(
  period: DashboardPeriod,
  customStart?: string,
  customEnd?: string
): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  let startDate: Date;

  switch (period) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'month':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'quarter':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'year':
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'custom':
      if (customStart !== undefined && customEnd !== undefined) {
        startDate = new Date(customStart);
        return { startDate, endDate: new Date(customEnd) };
      }
      // Default to month if custom dates not provided
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;

    default:
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
  }

  return { startDate, endDate };
}

/**
 * Calculate change percentage between two values
 *
 * @param current - Current value
 * @param previous - Previous value
 * @returns Change percentage
 */
export function calculateChangePercent(
  current: number,
  previous: number
): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Get frequency interval based on period
 *
 * @param period - Dashboard period
 * @returns Appropriate interval for frequency data
 */
export function getFrequencyInterval(
  period: DashboardPeriod
): 'day' | 'week' | 'month' {
  switch (period) {
    case 'today':
    case 'week':
      return 'day';
    case 'month':
    case 'quarter':
      return 'week';
    case 'year':
    case 'custom':
      return 'month';
    default:
      return 'week';
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate dashboard stats query
 *
 * @param query - Query to validate
 * @returns Validated query or throws ZodError
 */
export function validateDashboardStatsQuery(
  query: unknown
): DashboardStatsQuery {
  return DashboardStatsQuerySchema.parse(query);
}

/**
 * Validate dashboard stats response
 *
 * @param stats - Stats to validate
 * @returns Validated stats or throws ZodError
 */
export function validateDashboardStats(stats: unknown): DashboardStats {
  return DashboardStatsSchema.parse(stats);
}
