/**
 * Meeting analytics type definitions for efficiency analysis and cost visualization
 * @module types/analytics
 */

import { z } from 'zod';

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Analytics period type
 */
export const AnalyticsPeriodSchema = z.enum([
  'week',
  'month',
  'quarter',
]);

/**
 * Cost estimate breakdown schema
 */
export const CostEstimateSchema = z.object({
  /** Total hours spent in meetings */
  totalHours: z.number().nonnegative(),
  /** Total cost based on hourly rate */
  totalCost: z.number().nonnegative(),
  /** Currency code */
  currency: z.string().min(1),
  /** Hourly rate used for calculation */
  hourlyRate: z.number().nonnegative(),
});

/**
 * Meeting frequency by day of week schema
 */
export const MeetingsByDayOfWeekSchema = z.object({
  /** Day of week (0 = Sunday, 6 = Saturday) */
  day: z.number().int().min(0).max(6),
  /** Number of meetings on this day */
  count: z.number().int().nonnegative(),
  /** Total duration of meetings on this day in milliseconds */
  totalDurationMs: z.number().nonnegative(),
});

/**
 * Meeting frequency by hour of day schema
 */
export const MeetingsByHourSchema = z.object({
  /** Hour of day (0-23) */
  hour: z.number().int().min(0).max(23),
  /** Number of meetings starting at this hour */
  count: z.number().int().nonnegative(),
});

/**
 * Comprehensive meeting analytics schema
 */
export const MeetingAnalyticsSchema = z.object({
  /** Total number of meetings in the period */
  totalMeetings: z.number().int().nonnegative(),
  /** Total meeting duration in milliseconds */
  totalDurationMs: z.number().nonnegative(),
  /** Average meeting duration in milliseconds */
  averageDurationMs: z.number().nonnegative(),
  /** Total number of participants across all meetings */
  totalParticipants: z.number().int().nonnegative(),
  /** Average number of participants per meeting */
  averageParticipants: z.number().nonnegative(),
  /** Total number of decisions made */
  totalDecisions: z.number().int().nonnegative(),
  /** Total number of action items created */
  totalActionItems: z.number().int().nonnegative(),
  /** Number of completed action items */
  completedActionItems: z.number().int().nonnegative(),
  /** Efficiency score from 0 to 100 */
  efficiencyScore: z.number().min(0).max(100),
  /** Cost breakdown */
  costEstimate: CostEstimateSchema,
  /** Meeting distribution by day of week */
  meetingsByDayOfWeek: z.array(MeetingsByDayOfWeekSchema),
  /** Meeting distribution by hour of day */
  meetingsByHour: z.array(MeetingsByHourSchema),
});

/**
 * Analytics API query schema
 */
export const AnalyticsQuerySchema = z.object({
  /** Period to analyze */
  period: AnalyticsPeriodSchema.optional().default('month'),
  /** Hourly rate for cost calculation (in currency units) */
  hourlyRate: z.coerce.number().nonnegative().optional().default(5000),
  /** Currency code */
  currency: z.string().optional().default('JPY'),
});

// ============================================================================
// Type Exports
// ============================================================================

/** Analytics period type */
export type AnalyticsPeriod = z.infer<typeof AnalyticsPeriodSchema>;

/** Cost estimate for meetings */
export type CostEstimate = z.infer<typeof CostEstimateSchema>;

/** Meeting frequency by day of week */
export type MeetingsByDayOfWeek = z.infer<typeof MeetingsByDayOfWeekSchema>;

/** Meeting frequency by hour */
export type MeetingsByHour = z.infer<typeof MeetingsByHourSchema>;

/** Comprehensive meeting analytics */
export type MeetingAnalytics = z.infer<typeof MeetingAnalyticsSchema>;

/** Analytics query parameters */
export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;

// ============================================================================
// Readonly Types
// ============================================================================

/** Read-only cost estimate */
export interface ReadonlyCostEstimate {
  readonly totalHours: number;
  readonly totalCost: number;
  readonly currency: string;
  readonly hourlyRate: number;
}

/** Read-only meetings by day of week */
export interface ReadonlyMeetingsByDayOfWeek {
  readonly day: number;
  readonly count: number;
  readonly totalDurationMs: number;
}

/** Read-only meetings by hour */
export interface ReadonlyMeetingsByHour {
  readonly hour: number;
  readonly count: number;
}

/** Read-only meeting analytics */
export interface ReadonlyMeetingAnalytics {
  readonly totalMeetings: number;
  readonly totalDurationMs: number;
  readonly averageDurationMs: number;
  readonly totalParticipants: number;
  readonly averageParticipants: number;
  readonly totalDecisions: number;
  readonly totalActionItems: number;
  readonly completedActionItems: number;
  readonly efficiencyScore: number;
  readonly costEstimate: ReadonlyCostEstimate;
  readonly meetingsByDayOfWeek: readonly ReadonlyMeetingsByDayOfWeek[];
  readonly meetingsByHour: readonly ReadonlyMeetingsByHour[];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate the date range for an analytics period
 *
 * @param period - The analytics period to calculate dates for
 * @returns Start and end dates for the period
 */
export function calculateAnalyticsPeriodDates(
  period: AnalyticsPeriod
): { readonly startDate: Date; readonly endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  let startDate: Date;

  switch (period) {
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

    default:
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
}

/**
 * Format milliseconds as a human-readable duration string
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "1h 30m")
 */
export function formatDurationMs(ms: number): string {
  const totalMinutes = Math.round(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

/**
 * Format a currency value for display
 *
 * @param amount - The amount to format
 * @param currency - The currency code
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get the Japanese label for a day of the week
 *
 * @param day - Day of week (0 = Sunday, 6 = Saturday)
 * @returns Japanese day label
 */
export function getDayLabel(day: number): string {
  const labels = ['日', '月', '火', '水', '木', '金', '土'] as const;
  return labels[day] ?? '';
}

/**
 * Format an hour as a display string
 *
 * @param hour - Hour (0-23)
 * @returns Formatted hour string (e.g., "09:00")
 */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate meeting analytics data
 *
 * @param data - Data to validate
 * @returns Validated MeetingAnalytics
 */
export function validateMeetingAnalytics(data: unknown): MeetingAnalytics {
  return MeetingAnalyticsSchema.parse(data);
}

/**
 * Validate analytics query parameters
 *
 * @param data - Data to validate
 * @returns Validated AnalyticsQuery
 */
export function validateAnalyticsQuery(data: unknown): AnalyticsQuery {
  return AnalyticsQuerySchema.parse(data);
}
