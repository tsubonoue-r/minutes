/**
 * Notification type definitions with Zod schemas
 * @module types/notification
 */

import { z, type ZodSafeParseResult } from 'zod';

// =============================================================================
// Enums and Constants
// =============================================================================

/**
 * Notification status values
 */
export const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
  DELIVERED: 'delivered',
} as const;

/**
 * Notification type values
 */
export const NOTIFICATION_TYPE = {
  MINUTES_COMPLETED: 'minutes_completed',
  MINUTES_DRAFT: 'minutes_draft',
  ACTION_ITEM_ASSIGNED: 'action_item_assigned',
  GROUP_ANNOUNCEMENT: 'group_announcement',
} as const;

/**
 * Recipient type values
 */
export const RECIPIENT_TYPE = {
  USER: 'user',
  GROUP: 'group',
  CHANNEL: 'channel',
} as const;

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Schema for notification status
 */
export const NotificationStatusSchema = z.enum([
  NOTIFICATION_STATUS.PENDING,
  NOTIFICATION_STATUS.SENT,
  NOTIFICATION_STATUS.FAILED,
  NOTIFICATION_STATUS.DELIVERED,
]);

/**
 * Schema for notification type
 */
export const NotificationTypeSchema = z.enum([
  NOTIFICATION_TYPE.MINUTES_COMPLETED,
  NOTIFICATION_TYPE.MINUTES_DRAFT,
  NOTIFICATION_TYPE.ACTION_ITEM_ASSIGNED,
  NOTIFICATION_TYPE.GROUP_ANNOUNCEMENT,
]);

/**
 * Schema for recipient type
 */
export const RecipientTypeSchema = z.enum([
  RECIPIENT_TYPE.USER,
  RECIPIENT_TYPE.GROUP,
  RECIPIENT_TYPE.CHANNEL,
]);

/**
 * Schema for notification recipient
 */
export const NotificationRecipientSchema = z.object({
  /** Unique recipient identifier (open_id, chat_id, email, etc.) */
  id: z.string().min(1),
  /** Type of recipient */
  type: RecipientTypeSchema,
  /** Display name for the recipient */
  name: z.string().optional(),
  /** Email address (for email type recipients) */
  email: z.string().email().optional(),
  /** Lark open_id */
  openId: z.string().optional(),
  /** Lark chat_id (for groups) */
  chatId: z.string().optional(),
});

/**
 * Schema for notification history record
 */
export const NotificationHistorySchema = z.object({
  /** Unique notification ID */
  id: z.string().min(1),
  /** Type of notification */
  type: NotificationTypeSchema,
  /** Current status */
  status: NotificationStatusSchema,
  /** Recipient information */
  recipient: NotificationRecipientSchema,
  /** Reference ID (minutes_id, action_item_id, etc.) */
  referenceId: z.string().min(1),
  /** Reference type (minutes, action_item) */
  referenceType: z.enum(['minutes', 'action_item', 'meeting']),
  /** Lark message ID if sent */
  messageId: z.string().optional(),
  /** Error message if failed */
  errorMessage: z.string().optional(),
  /** Retry count */
  retryCount: z.number().int().nonnegative().default(0),
  /** Maximum retry attempts */
  maxRetries: z.number().int().nonnegative().default(3),
  /** Scheduled send time (ISO 8601) */
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  /** Actual sent time (ISO 8601) */
  sentAt: z.string().datetime({ offset: true }).optional(),
  /** Created timestamp (ISO 8601) */
  createdAt: z.string().datetime({ offset: true }),
  /** Updated timestamp (ISO 8601) */
  updatedAt: z.string().datetime({ offset: true }),
});

/**
 * Schema for group notification request
 */
export const GroupNotificationRequestSchema = z.object({
  /** Chat ID of the group */
  chatId: z.string().min(1),
  /** Group name (for display/logging) */
  groupName: z.string().optional(),
  /** Minutes ID to notify about */
  minutesId: z.string().min(1),
  /** Document URL */
  documentUrl: z.string().url(),
  /** Whether to include action items summary */
  includeActionItems: z.boolean().default(true),
  /** Notification language */
  language: z.enum(['ja', 'en']).default('ja'),
  /** Optional custom message to prepend */
  customMessage: z.string().max(500).optional(),
});

/**
 * Schema for batch notification request
 */
export const BatchNotificationRequestSchema = z.object({
  /** Minutes ID to notify about */
  minutesId: z.string().min(1),
  /** Document URL */
  documentUrl: z.string().url(),
  /** Recipients to notify */
  recipients: z.array(NotificationRecipientSchema).min(1),
  /** Notification type */
  type: NotificationTypeSchema,
  /** Notification language */
  language: z.enum(['ja', 'en']).default('ja'),
  /** Whether to send notifications in parallel */
  parallel: z.boolean().default(false),
});

/**
 * Schema for notification result
 */
export const NotificationResultSchema = z.object({
  /** Whether the notification was successful */
  success: z.boolean(),
  /** Recipient ID */
  recipientId: z.string(),
  /** Message ID if successful */
  messageId: z.string().optional(),
  /** Error message if failed */
  error: z.string().optional(),
  /** Timestamp of the operation */
  timestamp: z.string().datetime({ offset: true }),
});

/**
 * Schema for batch notification result
 */
export const BatchNotificationResultSchema = z.object({
  /** Total number of notifications attempted */
  total: z.number().int().nonnegative(),
  /** Number of successful notifications */
  succeeded: z.number().int().nonnegative(),
  /** Number of failed notifications */
  failed: z.number().int().nonnegative(),
  /** Individual results */
  results: z.array(NotificationResultSchema),
  /** Operation start time */
  startedAt: z.string().datetime({ offset: true }),
  /** Operation end time */
  completedAt: z.string().datetime({ offset: true }),
});

/**
 * Schema for notification stats
 */
export const NotificationStatsSchema = z.object({
  /** Total notifications sent */
  totalSent: z.number().int().nonnegative(),
  /** Total notifications failed */
  totalFailed: z.number().int().nonnegative(),
  /** Total notifications pending */
  totalPending: z.number().int().nonnegative(),
  /** Success rate percentage */
  successRate: z.number().min(0).max(100),
  /** Breakdown by type */
  byType: z.record(NotificationTypeSchema, z.number().int().nonnegative()),
  /** Breakdown by status */
  byStatus: z.record(NotificationStatusSchema, z.number().int().nonnegative()),
  /** Stats period start */
  periodStart: z.string().datetime({ offset: true }),
  /** Stats period end */
  periodEnd: z.string().datetime({ offset: true }),
});

/**
 * Schema for notification filters
 */
export const NotificationFiltersSchema = z.object({
  /** Filter by status */
  status: NotificationStatusSchema.optional(),
  /** Filter by type */
  type: NotificationTypeSchema.optional(),
  /** Filter by recipient type */
  recipientType: RecipientTypeSchema.optional(),
  /** Filter by reference ID */
  referenceId: z.string().optional(),
  /** Filter by date range start */
  fromDate: z.string().datetime({ offset: true }).optional(),
  /** Filter by date range end */
  toDate: z.string().datetime({ offset: true }).optional(),
});

/**
 * Schema for notification list response
 */
export const NotificationListResponseSchema = z.object({
  /** List of notification history records */
  items: z.array(NotificationHistorySchema),
  /** Total count matching filters */
  totalCount: z.number().int().nonnegative(),
  /** Current page */
  page: z.number().int().positive(),
  /** Items per page */
  pageSize: z.number().int().positive(),
  /** Has more pages */
  hasMore: z.boolean(),
});

// =============================================================================
// Types (inferred from Zod schemas)
// =============================================================================

/**
 * Notification status type
 */
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;

/**
 * Notification type
 */
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

/**
 * Recipient type
 */
export type RecipientType = z.infer<typeof RecipientTypeSchema>;

/**
 * Notification recipient
 */
export type NotificationRecipient = z.infer<typeof NotificationRecipientSchema>;

/**
 * Notification history record
 */
export type NotificationHistory = z.infer<typeof NotificationHistorySchema>;

/**
 * Group notification request
 */
export type GroupNotificationRequest = z.infer<typeof GroupNotificationRequestSchema>;

/**
 * Batch notification request
 */
export type BatchNotificationRequest = z.infer<typeof BatchNotificationRequestSchema>;

/**
 * Notification result
 */
export type NotificationResult = z.infer<typeof NotificationResultSchema>;

/**
 * Batch notification result
 */
export type BatchNotificationResult = z.infer<typeof BatchNotificationResultSchema>;

/**
 * Notification stats
 */
export type NotificationStats = z.infer<typeof NotificationStatsSchema>;

/**
 * Notification filters
 */
export type NotificationFilters = z.infer<typeof NotificationFiltersSchema>;

/**
 * Notification list response
 */
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;

// =============================================================================
// Readonly Types
// =============================================================================

/**
 * Read-only notification recipient
 */
export interface ReadonlyNotificationRecipient {
  readonly id: string;
  readonly type: RecipientType;
  readonly name?: string | undefined;
  readonly email?: string | undefined;
  readonly openId?: string | undefined;
  readonly chatId?: string | undefined;
}

/**
 * Read-only notification history
 */
export interface ReadonlyNotificationHistory {
  readonly id: string;
  readonly type: NotificationType;
  readonly status: NotificationStatus;
  readonly recipient: ReadonlyNotificationRecipient;
  readonly referenceId: string;
  readonly referenceType: 'minutes' | 'action_item' | 'meeting';
  readonly messageId?: string | undefined;
  readonly errorMessage?: string | undefined;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly scheduledAt?: string | undefined;
  readonly sentAt?: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique notification ID
 *
 * @param prefix - Prefix for the ID (default: 'notif')
 * @returns Unique notification ID
 */
export function generateNotificationId(prefix: string = 'notif'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Create a new notification history record
 *
 * @param params - Parameters for creating the notification
 * @returns New notification history record
 */
export function createNotificationHistory(params: {
  type: NotificationType;
  recipient: NotificationRecipient;
  referenceId: string;
  referenceType: 'minutes' | 'action_item' | 'meeting';
  scheduledAt?: string | undefined;
}): NotificationHistory {
  const now = new Date().toISOString();
  return {
    id: generateNotificationId(),
    type: params.type,
    status: NOTIFICATION_STATUS.PENDING,
    recipient: params.recipient,
    referenceId: params.referenceId,
    referenceType: params.referenceType,
    retryCount: 0,
    maxRetries: 3,
    scheduledAt: params.scheduledAt,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a notification result
 *
 * @param recipientId - Recipient ID
 * @param success - Whether notification was successful
 * @param messageId - Optional message ID
 * @param error - Optional error message
 * @returns Notification result
 */
export function createNotificationResult(
  recipientId: string,
  success: boolean,
  messageId?: string,
  error?: string
): NotificationResult {
  return {
    success,
    recipientId,
    messageId,
    error,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a batch notification result
 *
 * @param results - Array of notification results
 * @param startedAt - Operation start time
 * @returns Batch notification result
 */
export function createBatchNotificationResult(
  results: readonly NotificationResult[],
  startedAt: string
): BatchNotificationResult {
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    total: results.length,
    succeeded,
    failed,
    results: [...results],
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Check if notification can be retried
 *
 * @param notification - Notification history record
 * @returns Whether the notification can be retried
 */
export function canRetryNotification(notification: NotificationHistory): boolean {
  return (
    notification.status === NOTIFICATION_STATUS.FAILED &&
    notification.retryCount < notification.maxRetries
  );
}

/**
 * Calculate notification stats from a list of notifications
 *
 * @param notifications - List of notification records
 * @param periodStart - Stats period start
 * @param periodEnd - Stats period end
 * @returns Notification stats
 */
export function calculateNotificationStats(
  notifications: readonly NotificationHistory[],
  periodStart: string,
  periodEnd: string
): NotificationStats {
  const byType: Record<NotificationType, number> = {
    [NOTIFICATION_TYPE.MINUTES_COMPLETED]: 0,
    [NOTIFICATION_TYPE.MINUTES_DRAFT]: 0,
    [NOTIFICATION_TYPE.ACTION_ITEM_ASSIGNED]: 0,
    [NOTIFICATION_TYPE.GROUP_ANNOUNCEMENT]: 0,
  };

  const byStatus: Record<NotificationStatus, number> = {
    [NOTIFICATION_STATUS.PENDING]: 0,
    [NOTIFICATION_STATUS.SENT]: 0,
    [NOTIFICATION_STATUS.FAILED]: 0,
    [NOTIFICATION_STATUS.DELIVERED]: 0,
  };

  for (const notification of notifications) {
    byType[notification.type]++;
    byStatus[notification.status]++;
  }

  const totalSent = byStatus[NOTIFICATION_STATUS.SENT] + byStatus[NOTIFICATION_STATUS.DELIVERED];
  const totalFailed = byStatus[NOTIFICATION_STATUS.FAILED];
  const totalPending = byStatus[NOTIFICATION_STATUS.PENDING];
  const totalAttempted = totalSent + totalFailed;
  const successRate = totalAttempted > 0 ? (totalSent / totalAttempted) * 100 : 0;

  return {
    totalSent,
    totalFailed,
    totalPending,
    successRate: Math.round(successRate * 100) / 100,
    byType,
    byStatus,
    periodStart,
    periodEnd,
  };
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate notification history
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateNotificationHistory(
  data: unknown
): ZodSafeParseResult<NotificationHistory> {
  return NotificationHistorySchema.safeParse(data);
}

/**
 * Validate group notification request
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateGroupNotificationRequest(
  data: unknown
): ZodSafeParseResult<GroupNotificationRequest> {
  return GroupNotificationRequestSchema.safeParse(data);
}

/**
 * Validate batch notification request
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateBatchNotificationRequest(
  data: unknown
): ZodSafeParseResult<BatchNotificationRequest> {
  return BatchNotificationRequestSchema.safeParse(data);
}

/**
 * Validate notification filters
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateNotificationFilters(
  data: unknown
): ZodSafeParseResult<NotificationFilters> {
  return NotificationFiltersSchema.safeParse(data);
}
