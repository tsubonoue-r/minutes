/**
 * Reminder type definitions with Zod schemas
 * @module types/reminder
 */

import { z, type ZodSafeParseResult } from 'zod';

// =============================================================================
// Enums and Constants
// =============================================================================

/**
 * Reminder type values
 */
export const REMINDER_TYPE = {
  /** Reminder for action item deadline */
  ACTION_ITEM_DUE: 'action_item_due',
  /** Reminder to review minutes */
  MINUTES_REVIEW: 'minutes_review',
  /** Custom scheduled reminder */
  CUSTOM: 'custom',
} as const;

/**
 * Reminder status values
 */
export const REMINDER_STATUS = {
  /** Reminder is active and scheduled */
  ACTIVE: 'active',
  /** Reminder has been sent */
  SENT: 'sent',
  /** Reminder was cancelled */
  CANCELLED: 'cancelled',
  /** Reminder failed to send */
  FAILED: 'failed',
} as const;

/**
 * Reminder timing type - when to send relative to due date
 */
export const REMINDER_TIMING = {
  /** Send immediately */
  IMMEDIATE: 'immediate',
  /** Send 1 hour before */
  ONE_HOUR_BEFORE: '1_hour_before',
  /** Send 1 day before */
  ONE_DAY_BEFORE: '1_day_before',
  /** Send 3 days before */
  THREE_DAYS_BEFORE: '3_days_before',
  /** Send 1 week before */
  ONE_WEEK_BEFORE: '1_week_before',
  /** Send at specific time */
  SPECIFIC_TIME: 'specific_time',
} as const;

/**
 * Recurrence pattern for recurring reminders
 */
export const REMINDER_RECURRENCE = {
  /** No recurrence - one time only */
  NONE: 'none',
  /** Repeat daily */
  DAILY: 'daily',
  /** Repeat weekly */
  WEEKLY: 'weekly',
  /** Repeat monthly */
  MONTHLY: 'monthly',
} as const;

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Schema for reminder type
 */
export const ReminderTypeSchema = z.enum([
  REMINDER_TYPE.ACTION_ITEM_DUE,
  REMINDER_TYPE.MINUTES_REVIEW,
  REMINDER_TYPE.CUSTOM,
]);

/**
 * Schema for reminder status
 */
export const ReminderStatusSchema = z.enum([
  REMINDER_STATUS.ACTIVE,
  REMINDER_STATUS.SENT,
  REMINDER_STATUS.CANCELLED,
  REMINDER_STATUS.FAILED,
]);

/**
 * Schema for reminder timing
 */
export const ReminderTimingSchema = z.enum([
  REMINDER_TIMING.IMMEDIATE,
  REMINDER_TIMING.ONE_HOUR_BEFORE,
  REMINDER_TIMING.ONE_DAY_BEFORE,
  REMINDER_TIMING.THREE_DAYS_BEFORE,
  REMINDER_TIMING.ONE_WEEK_BEFORE,
  REMINDER_TIMING.SPECIFIC_TIME,
]);

/**
 * Schema for reminder recurrence
 */
export const ReminderRecurrenceSchema = z.enum([
  REMINDER_RECURRENCE.NONE,
  REMINDER_RECURRENCE.DAILY,
  REMINDER_RECURRENCE.WEEKLY,
  REMINDER_RECURRENCE.MONTHLY,
]);

/**
 * Schema for reminder schedule configuration
 */
export const ReminderScheduleSchema = z.object({
  /** When to send the reminder relative to reference date */
  timing: ReminderTimingSchema,
  /** Specific scheduled time (ISO 8601) - required when timing is 'specific_time' */
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  /** Reference date/time for relative timing (ISO 8601) */
  referenceDate: z.string().datetime({ offset: true }).optional(),
  /** Recurrence pattern */
  recurrence: ReminderRecurrenceSchema.default(REMINDER_RECURRENCE.NONE),
  /** End date for recurring reminders (ISO 8601) */
  recurrenceEndDate: z.string().datetime({ offset: true }).optional(),
  /** Timezone for scheduling (IANA timezone) */
  timezone: z.string().default('Asia/Tokyo'),
}).refine(
  (data) => {
    // scheduledAt is required when timing is 'specific_time'
    if (data.timing === REMINDER_TIMING.SPECIFIC_TIME) {
      return data.scheduledAt !== undefined;
    }
    return true;
  },
  {
    message: 'scheduledAt is required when timing is specific_time',
    path: ['scheduledAt'],
  }
);

/**
 * Schema for reminder recipient
 */
export const ReminderRecipientSchema = z.object({
  /** Unique recipient identifier (open_id, user_id, email) */
  id: z.string().min(1),
  /** Recipient display name */
  name: z.string().optional(),
  /** Recipient type */
  type: z.enum(['user', 'group', 'channel']).default('user'),
  /** Lark open_id */
  openId: z.string().optional(),
  /** Email address */
  email: z.string().email().optional(),
});

/**
 * Schema for action item reminder reference
 */
export const ActionItemReminderRefSchema = z.object({
  /** Action item ID */
  actionItemId: z.string().min(1),
  /** Action item content (cached for display) */
  content: z.string().min(1),
  /** Meeting ID where action item was created */
  meetingId: z.string().min(1),
  /** Meeting title (cached for display) */
  meetingTitle: z.string().optional(),
  /** Due date (ISO date format YYYY-MM-DD) */
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * Schema for minutes reminder reference
 */
export const MinutesReminderRefSchema = z.object({
  /** Minutes ID */
  minutesId: z.string().min(1),
  /** Meeting ID */
  meetingId: z.string().min(1),
  /** Meeting title */
  meetingTitle: z.string().min(1),
  /** Meeting date (ISO date format) */
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Document URL */
  documentUrl: z.string().url().optional(),
});

/**
 * Schema for complete reminder object
 */
export const ReminderSchema = z.object({
  /** Unique reminder identifier */
  id: z.string().min(1),
  /** Type of reminder */
  type: ReminderTypeSchema,
  /** Current status */
  status: ReminderStatusSchema,
  /** Reminder title/subject */
  title: z.string().min(1),
  /** Reminder message body */
  message: z.string().optional(),
  /** Schedule configuration */
  schedule: ReminderScheduleSchema,
  /** Recipient information */
  recipient: ReminderRecipientSchema,
  /** Action item reference (for action_item_due type) */
  actionItemRef: ActionItemReminderRefSchema.optional(),
  /** Minutes reference (for minutes_review type) */
  minutesRef: MinutesReminderRefSchema.optional(),
  /** Custom data for custom reminders */
  customData: z.record(z.string(), z.unknown()).optional(),
  /** Notification language */
  language: z.enum(['ja', 'en']).default('ja'),
  /** Lark message ID if sent */
  messageId: z.string().optional(),
  /** Error message if failed */
  errorMessage: z.string().optional(),
  /** Retry count */
  retryCount: z.number().int().nonnegative().default(0),
  /** Maximum retry attempts */
  maxRetries: z.number().int().nonnegative().default(3),
  /** Actual sent time (ISO 8601) */
  sentAt: z.string().datetime({ offset: true }).optional(),
  /** Created timestamp (ISO 8601) */
  createdAt: z.string().datetime({ offset: true }),
  /** Updated timestamp (ISO 8601) */
  updatedAt: z.string().datetime({ offset: true }),
  /** Created by user ID */
  createdBy: z.string().optional(),
}).refine(
  (data) => {
    // actionItemRef is required for action_item_due type
    if (data.type === REMINDER_TYPE.ACTION_ITEM_DUE) {
      return data.actionItemRef !== undefined;
    }
    return true;
  },
  {
    message: 'actionItemRef is required for action_item_due type',
    path: ['actionItemRef'],
  }
).refine(
  (data) => {
    // minutesRef is required for minutes_review type
    if (data.type === REMINDER_TYPE.MINUTES_REVIEW) {
      return data.minutesRef !== undefined;
    }
    return true;
  },
  {
    message: 'minutesRef is required for minutes_review type',
    path: ['minutesRef'],
  }
);

/**
 * Schema for creating a new reminder
 */
export const CreateReminderSchema = z.object({
  /** Type of reminder */
  type: ReminderTypeSchema,
  /** Reminder title/subject */
  title: z.string().min(1),
  /** Reminder message body */
  message: z.string().optional(),
  /** Schedule configuration */
  schedule: ReminderScheduleSchema,
  /** Recipient information */
  recipient: ReminderRecipientSchema,
  /** Action item reference (for action_item_due type) */
  actionItemRef: ActionItemReminderRefSchema.optional(),
  /** Minutes reference (for minutes_review type) */
  minutesRef: MinutesReminderRefSchema.optional(),
  /** Custom data for custom reminders */
  customData: z.record(z.string(), z.unknown()).optional(),
  /** Notification language */
  language: z.enum(['ja', 'en']).default('ja'),
});

/**
 * Schema for updating a reminder
 */
export const UpdateReminderSchema = z.object({
  /** Reminder title/subject */
  title: z.string().min(1).optional(),
  /** Reminder message body */
  message: z.string().optional(),
  /** Schedule configuration */
  schedule: ReminderScheduleSchema.optional(),
  /** Notification language */
  language: z.enum(['ja', 'en']).optional(),
});

/**
 * Schema for reminder filters
 */
export const ReminderFiltersSchema = z.object({
  /** Filter by status */
  status: ReminderStatusSchema.optional(),
  /** Filter by type */
  type: ReminderTypeSchema.optional(),
  /** Filter by recipient ID */
  recipientId: z.string().optional(),
  /** Filter by action item ID */
  actionItemId: z.string().optional(),
  /** Filter by minutes ID */
  minutesId: z.string().optional(),
  /** Filter by meeting ID */
  meetingId: z.string().optional(),
  /** Filter by scheduled date range start (ISO 8601) */
  fromDate: z.string().datetime({ offset: true }).optional(),
  /** Filter by scheduled date range end (ISO 8601) */
  toDate: z.string().datetime({ offset: true }).optional(),
  /** Filter for due reminders only */
  isDue: z.boolean().optional(),
});

/**
 * Schema for reminder list response
 */
export const ReminderListResponseSchema = z.object({
  /** List of reminders */
  items: z.array(ReminderSchema),
  /** Total count matching filters */
  totalCount: z.number().int().nonnegative(),
  /** Current page */
  page: z.number().int().positive(),
  /** Items per page */
  pageSize: z.number().int().positive(),
  /** Has more pages */
  hasMore: z.boolean(),
});

/**
 * Schema for reminder stats
 */
export const ReminderStatsSchema = z.object({
  /** Total reminders */
  total: z.number().int().nonnegative(),
  /** Active reminders */
  active: z.number().int().nonnegative(),
  /** Sent reminders */
  sent: z.number().int().nonnegative(),
  /** Cancelled reminders */
  cancelled: z.number().int().nonnegative(),
  /** Failed reminders */
  failed: z.number().int().nonnegative(),
  /** Reminders due soon (within 24 hours) */
  dueSoon: z.number().int().nonnegative(),
  /** Breakdown by type */
  byType: z.record(ReminderTypeSchema, z.number().int().nonnegative()),
});

// =============================================================================
// Types (inferred from Zod schemas)
// =============================================================================

/**
 * Reminder type
 */
export type ReminderType = z.infer<typeof ReminderTypeSchema>;

/**
 * Reminder status
 */
export type ReminderStatus = z.infer<typeof ReminderStatusSchema>;

/**
 * Reminder timing
 */
export type ReminderTiming = z.infer<typeof ReminderTimingSchema>;

/**
 * Reminder recurrence
 */
export type ReminderRecurrence = z.infer<typeof ReminderRecurrenceSchema>;

/**
 * Reminder schedule configuration
 */
export type ReminderSchedule = z.infer<typeof ReminderScheduleSchema>;

/**
 * Reminder recipient
 */
export type ReminderRecipient = z.infer<typeof ReminderRecipientSchema>;

/**
 * Action item reminder reference
 */
export type ActionItemReminderRef = z.infer<typeof ActionItemReminderRefSchema>;

/**
 * Minutes reminder reference
 */
export type MinutesReminderRef = z.infer<typeof MinutesReminderRefSchema>;

/**
 * Complete reminder object
 */
export type Reminder = z.infer<typeof ReminderSchema>;

/**
 * Create reminder input
 */
export type CreateReminderInput = z.infer<typeof CreateReminderSchema>;

/**
 * Update reminder input
 */
export type UpdateReminderInput = z.infer<typeof UpdateReminderSchema>;

/**
 * Reminder filters
 */
export type ReminderFilters = z.infer<typeof ReminderFiltersSchema>;

/**
 * Reminder list response
 */
export type ReminderListResponse = z.infer<typeof ReminderListResponseSchema>;

/**
 * Reminder stats
 */
export type ReminderStats = z.infer<typeof ReminderStatsSchema>;

// =============================================================================
// Read-only Types
// =============================================================================

/**
 * Read-only reminder schedule
 */
export interface ReadonlyReminderSchedule {
  readonly timing: ReminderTiming;
  readonly scheduledAt?: string | undefined;
  readonly referenceDate?: string | undefined;
  readonly recurrence: ReminderRecurrence;
  readonly recurrenceEndDate?: string | undefined;
  readonly timezone: string;
}

/**
 * Read-only reminder recipient
 */
export interface ReadonlyReminderRecipient {
  readonly id: string;
  readonly name?: string | undefined;
  readonly type: 'user' | 'group' | 'channel';
  readonly openId?: string | undefined;
  readonly email?: string | undefined;
}

/**
 * Read-only reminder
 */
export interface ReadonlyReminder {
  readonly id: string;
  readonly type: ReminderType;
  readonly status: ReminderStatus;
  readonly title: string;
  readonly message?: string | undefined;
  readonly schedule: ReadonlyReminderSchedule;
  readonly recipient: ReadonlyReminderRecipient;
  readonly actionItemRef?: ActionItemReminderRef | undefined;
  readonly minutesRef?: MinutesReminderRef | undefined;
  readonly customData?: Record<string, unknown> | undefined;
  readonly language: 'ja' | 'en';
  readonly messageId?: string | undefined;
  readonly errorMessage?: string | undefined;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly sentAt?: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy?: string | undefined;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique reminder ID
 *
 * @param prefix - Prefix for the ID (default: 'rem')
 * @returns Unique reminder ID
 */
export function generateReminderId(prefix: string = 'rem'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Calculate scheduled time based on timing and reference date
 *
 * @param timing - Reminder timing type
 * @param referenceDate - Reference date (e.g., due date)
 * @param specificTime - Specific time for SPECIFIC_TIME timing
 * @returns Calculated scheduled time as ISO string
 */
export function calculateScheduledTime(
  timing: ReminderTiming,
  referenceDate: Date,
  specificTime?: string
): string {
  switch (timing) {
    case REMINDER_TIMING.IMMEDIATE:
      return new Date().toISOString();

    case REMINDER_TIMING.ONE_HOUR_BEFORE:
      return new Date(referenceDate.getTime() - 60 * 60 * 1000).toISOString();

    case REMINDER_TIMING.ONE_DAY_BEFORE:
      return new Date(referenceDate.getTime() - 24 * 60 * 60 * 1000).toISOString();

    case REMINDER_TIMING.THREE_DAYS_BEFORE:
      return new Date(referenceDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

    case REMINDER_TIMING.ONE_WEEK_BEFORE:
      return new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    case REMINDER_TIMING.SPECIFIC_TIME:
      if (specificTime !== undefined) {
        return specificTime;
      }
      throw new Error('specificTime is required for SPECIFIC_TIME timing');

    default:
      return referenceDate.toISOString();
  }
}

/**
 * Check if a reminder is due (should be sent now)
 *
 * @param reminder - Reminder to check
 * @returns true if the reminder is due
 */
export function isReminderDue(reminder: Reminder): boolean {
  if (reminder.status !== REMINDER_STATUS.ACTIVE) {
    return false;
  }

  const now = new Date();
  const scheduledTime = reminder.schedule.scheduledAt;

  if (scheduledTime === undefined) {
    return false;
  }

  return new Date(scheduledTime) <= now;
}

/**
 * Check if a reminder is due within a specified time window
 *
 * @param reminder - Reminder to check
 * @param windowMs - Time window in milliseconds (default: 24 hours)
 * @returns true if the reminder is due within the window
 */
export function isReminderDueSoon(
  reminder: Reminder,
  windowMs: number = 24 * 60 * 60 * 1000
): boolean {
  if (reminder.status !== REMINDER_STATUS.ACTIVE) {
    return false;
  }

  const scheduledTime = reminder.schedule.scheduledAt;
  if (scheduledTime === undefined) {
    return false;
  }

  const now = new Date();
  const scheduled = new Date(scheduledTime);
  const windowEnd = new Date(now.getTime() + windowMs);

  return scheduled >= now && scheduled <= windowEnd;
}

/**
 * Check if a reminder can be retried
 *
 * @param reminder - Reminder to check
 * @returns true if the reminder can be retried
 */
export function canRetryReminder(reminder: Reminder): boolean {
  return (
    reminder.status === REMINDER_STATUS.FAILED &&
    reminder.retryCount < reminder.maxRetries
  );
}

/**
 * Create a new reminder object from input
 *
 * @param input - Create reminder input
 * @param createdBy - User ID who created the reminder
 * @returns New reminder object
 */
export function createReminder(
  input: CreateReminderInput,
  createdBy?: string
): Reminder {
  const now = new Date().toISOString();

  // Calculate scheduled time if not provided
  let scheduledAt = input.schedule.scheduledAt;
  if (scheduledAt === undefined && input.schedule.referenceDate !== undefined) {
    scheduledAt = calculateScheduledTime(
      input.schedule.timing,
      new Date(input.schedule.referenceDate),
      input.schedule.scheduledAt
    );
  } else if (scheduledAt === undefined && input.schedule.timing === REMINDER_TIMING.IMMEDIATE) {
    scheduledAt = now;
  }

  const reminder: Reminder = {
    id: generateReminderId(),
    type: input.type,
    status: REMINDER_STATUS.ACTIVE,
    title: input.title,
    message: input.message,
    schedule: {
      ...input.schedule,
      scheduledAt,
    },
    recipient: input.recipient,
    actionItemRef: input.actionItemRef,
    minutesRef: input.minutesRef,
    customData: input.customData,
    language: input.language,
    retryCount: 0,
    maxRetries: 3,
    createdAt: now,
    updatedAt: now,
    createdBy,
  };

  return reminder;
}

/**
 * Calculate reminder stats from a list of reminders
 *
 * @param reminders - List of reminders
 * @returns Reminder stats
 */
export function calculateReminderStats(
  reminders: readonly Reminder[]
): ReminderStats {
  const byType: Record<ReminderType, number> = {
    [REMINDER_TYPE.ACTION_ITEM_DUE]: 0,
    [REMINDER_TYPE.MINUTES_REVIEW]: 0,
    [REMINDER_TYPE.CUSTOM]: 0,
  };

  let active = 0;
  let sent = 0;
  let cancelled = 0;
  let failed = 0;
  let dueSoon = 0;

  for (const reminder of reminders) {
    byType[reminder.type]++;

    switch (reminder.status) {
      case REMINDER_STATUS.ACTIVE:
        active++;
        if (isReminderDueSoon(reminder)) {
          dueSoon++;
        }
        break;
      case REMINDER_STATUS.SENT:
        sent++;
        break;
      case REMINDER_STATUS.CANCELLED:
        cancelled++;
        break;
      case REMINDER_STATUS.FAILED:
        failed++;
        break;
    }
  }

  return {
    total: reminders.length,
    active,
    sent,
    cancelled,
    failed,
    dueSoon,
    byType,
  };
}

/**
 * Get human-readable timing label
 *
 * @param timing - Reminder timing
 * @param language - Display language
 * @returns Human-readable label
 */
export function getTimingLabel(timing: ReminderTiming, language: 'ja' | 'en'): string {
  const labels: Record<ReminderTiming, { ja: string; en: string }> = {
    [REMINDER_TIMING.IMMEDIATE]: { ja: '即時', en: 'Immediately' },
    [REMINDER_TIMING.ONE_HOUR_BEFORE]: { ja: '1時間前', en: '1 hour before' },
    [REMINDER_TIMING.ONE_DAY_BEFORE]: { ja: '1日前', en: '1 day before' },
    [REMINDER_TIMING.THREE_DAYS_BEFORE]: { ja: '3日前', en: '3 days before' },
    [REMINDER_TIMING.ONE_WEEK_BEFORE]: { ja: '1週間前', en: '1 week before' },
    [REMINDER_TIMING.SPECIFIC_TIME]: { ja: '指定時刻', en: 'Specific time' },
  };

  return labels[timing][language];
}

/**
 * Get human-readable recurrence label
 *
 * @param recurrence - Reminder recurrence
 * @param language - Display language
 * @returns Human-readable label
 */
export function getRecurrenceLabel(recurrence: ReminderRecurrence, language: 'ja' | 'en'): string {
  const labels: Record<ReminderRecurrence, { ja: string; en: string }> = {
    [REMINDER_RECURRENCE.NONE]: { ja: '繰り返しなし', en: 'No repeat' },
    [REMINDER_RECURRENCE.DAILY]: { ja: '毎日', en: 'Daily' },
    [REMINDER_RECURRENCE.WEEKLY]: { ja: '毎週', en: 'Weekly' },
    [REMINDER_RECURRENCE.MONTHLY]: { ja: '毎月', en: 'Monthly' },
  };

  return labels[recurrence][language];
}

/**
 * Get human-readable status label
 *
 * @param status - Reminder status
 * @param language - Display language
 * @returns Human-readable label
 */
export function getStatusLabel(status: ReminderStatus, language: 'ja' | 'en'): string {
  const labels: Record<ReminderStatus, { ja: string; en: string }> = {
    [REMINDER_STATUS.ACTIVE]: { ja: '有効', en: 'Active' },
    [REMINDER_STATUS.SENT]: { ja: '送信済み', en: 'Sent' },
    [REMINDER_STATUS.CANCELLED]: { ja: 'キャンセル', en: 'Cancelled' },
    [REMINDER_STATUS.FAILED]: { ja: '失敗', en: 'Failed' },
  };

  return labels[status][language];
}

/**
 * Get human-readable type label
 *
 * @param type - Reminder type
 * @param language - Display language
 * @returns Human-readable label
 */
export function getTypeLabel(type: ReminderType, language: 'ja' | 'en'): string {
  const labels: Record<ReminderType, { ja: string; en: string }> = {
    [REMINDER_TYPE.ACTION_ITEM_DUE]: { ja: 'アクションアイテム期限', en: 'Action Item Due' },
    [REMINDER_TYPE.MINUTES_REVIEW]: { ja: '議事録確認', en: 'Minutes Review' },
    [REMINDER_TYPE.CUSTOM]: { ja: 'カスタム', en: 'Custom' },
  };

  return labels[type][language];
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate a reminder object
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateReminder(
  data: unknown
): ZodSafeParseResult<Reminder> {
  return ReminderSchema.safeParse(data);
}

/**
 * Validate create reminder input
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateCreateReminderInput(
  data: unknown
): ZodSafeParseResult<CreateReminderInput> {
  return CreateReminderSchema.safeParse(data);
}

/**
 * Validate update reminder input
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateUpdateReminderInput(
  data: unknown
): ZodSafeParseResult<UpdateReminderInput> {
  return UpdateReminderSchema.safeParse(data);
}

/**
 * Validate reminder filters
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateReminderFilters(
  data: unknown
): ZodSafeParseResult<ReminderFilters> {
  return ReminderFiltersSchema.safeParse(data);
}

/**
 * Validate reminder schedule
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateReminderSchedule(
  data: unknown
): ZodSafeParseResult<ReminderSchedule> {
  return ReminderScheduleSchema.safeParse(data);
}
