/**
 * Group Notification Service - Enhanced notification service with group support
 * @module services/group-notification.service
 */

import type { Minutes, ActionItem, Speaker } from '@/types/minutes';
import {
  MessageClient,
  createMessageClient,
  createMinutesCompletedCard,
  type InteractiveCard,
  type CardElement,
  type CardHeader,
  type SendMessageResult,
  type CardLanguage,
} from '@/lib/lark';
import { createLarkClient } from '@/lib/lark/client';
import {
  type NotificationHistory,
  type GroupNotificationRequest,
  type BatchNotificationResult,
  type NotificationResult,
  type NotificationRecipient,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
  RECIPIENT_TYPE,
  createNotificationHistory,
  createNotificationResult,
  createBatchNotificationResult,
  generateNotificationId,
} from '@/types/notification';

// =============================================================================
// Types
// =============================================================================

/**
 * Group notification options
 */
export interface GroupNotificationOptions {
  /** Minutes data */
  readonly minutes: Minutes;
  /** Document URL */
  readonly documentUrl: string;
  /** Chat ID of the group */
  readonly chatId: string;
  /** Group name (for logging) */
  readonly groupName?: string | undefined;
  /** Include action items summary in notification */
  readonly includeActionItems?: boolean | undefined;
  /** Custom message to prepend */
  readonly customMessage?: string | undefined;
  /** Notification language */
  readonly language?: CardLanguage | undefined;
}

/**
 * Batch group notification options
 */
export interface BatchGroupNotificationOptions {
  /** Minutes data */
  readonly minutes: Minutes;
  /** Document URL */
  readonly documentUrl: string;
  /** Groups to notify */
  readonly groups: ReadonlyArray<{
    readonly chatId: string;
    readonly name?: string | undefined;
  }>;
  /** Include action items summary */
  readonly includeActionItems?: boolean | undefined;
  /** Notification language */
  readonly language?: CardLanguage | undefined;
}

/**
 * Notify participants options
 */
export interface NotifyParticipantsOptions {
  /** Minutes data */
  readonly minutes: Minutes;
  /** Document URL */
  readonly documentUrl: string;
  /** Notification language */
  readonly language?: CardLanguage | undefined;
  /** Function to get group chat ID for a meeting */
  readonly getMeetingGroupChatId?: ((meetingId: string) => Promise<string | null>) | undefined;
}

/**
 * Notification delivery options
 */
export interface NotificationDeliveryOptions {
  /** Maximum concurrent notifications */
  readonly concurrency?: number | undefined;
  /** Delay between notifications in ms */
  readonly delayMs?: number | undefined;
  /** Whether to stop on first error */
  readonly stopOnError?: boolean | undefined;
}

// =============================================================================
// Card Templates for Group Notifications
// =============================================================================

/**
 * Labels for group notification cards
 */
const groupCardLabels = {
  ja: {
    groupAnnouncement: 'グループへの通知',
    minutesReady: '議事録が作成されました',
    meetingTitle: '会議名',
    date: '日付',
    duration: '時間',
    participants: '参加者',
    actionItems: 'アクションアイテム',
    pendingTasks: '未完了タスク',
    viewMinutes: '議事録を確認',
    actionItemsSummary: 'アクションアイテム一覧',
    assignee: '担当者',
    dueDate: '期限',
    priority: '優先度',
    noDueDate: '未設定',
    count: (n: number) => `${n}名`,
    items: (n: number) => `${n}件`,
    priorities: {
      high: '!!! 高',
      medium: '!! 中',
      low: '! 低',
    },
  },
  en: {
    groupAnnouncement: 'Group Notification',
    minutesReady: 'Minutes Created',
    meetingTitle: 'Meeting',
    date: 'Date',
    duration: 'Duration',
    participants: 'Participants',
    actionItems: 'Action Items',
    pendingTasks: 'Pending Tasks',
    viewMinutes: 'View Minutes',
    actionItemsSummary: 'Action Items Summary',
    assignee: 'Assignee',
    dueDate: 'Due Date',
    priority: 'Priority',
    noDueDate: 'Not set',
    count: (n: number) => `${n} people`,
    items: (n: number) => `${n} items`,
    priorities: {
      high: '!!! High',
      medium: '!! Medium',
      low: '! Low',
    },
  },
};

/**
 * Format duration for display
 */
function formatDuration(ms: number, language: CardLanguage): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (language === 'ja') {
    if (hours > 0 && minutes > 0) return `${hours}時間${minutes}分`;
    if (hours > 0) return `${hours}時間`;
    if (minutes > 0) return `${minutes}分`;
    return '0分';
  }

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return '0m';
}

/**
 * Format date for display
 */
function formatDate(dateStr: string, language: CardLanguage): string {
  const date = new Date(dateStr);
  if (language === 'ja') {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Create an enhanced group notification card with action items summary
 *
 * @param minutes - Minutes data
 * @param documentUrl - URL to the minutes document
 * @param language - Card language
 * @param customMessage - Optional custom message
 * @param includeActionItems - Whether to include action items summary
 * @returns Interactive card for group notification
 */
export function createGroupNotificationCard(
  minutes: Minutes,
  documentUrl: string,
  language: CardLanguage = 'ja',
  customMessage?: string | undefined,
  includeActionItems: boolean = true
): InteractiveCard {
  const l = groupCardLabels[language];
  const pendingItems = minutes.actionItems.filter((item) => item.status === 'pending');

  const header: CardHeader = {
    title: {
      tag: 'plain_text',
      content: l.minutesReady,
    },
    template: 'blue',
  };

  const elements: CardElement[] = [];

  // Add custom message if provided
  if (customMessage !== undefined && customMessage.trim() !== '') {
    elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: customMessage,
      },
    });
    elements.push({ tag: 'hr' });
  }

  // Meeting info
  elements.push({
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: `**${l.meetingTitle}**: ${minutes.title}`,
    },
  });

  elements.push({
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: `**${l.date}**: ${formatDate(minutes.date, language)}`,
    },
  });

  elements.push({
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: `**${l.duration}**: ${formatDuration(minutes.duration, language)}`,
    },
  });

  elements.push({
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: `**${l.participants}**: ${l.count(minutes.attendees.length)}`,
    },
  });

  // Action items count
  elements.push({
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: `**${l.pendingTasks}**: ${l.items(pendingItems.length)}`,
    },
  });

  // Add action items summary if enabled and there are pending items
  if (includeActionItems && pendingItems.length > 0) {
    elements.push({ tag: 'hr' });
    elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**${l.actionItemsSummary}**`,
      },
    });

    // List action items (limit to 5 to avoid card being too long)
    const displayItems = pendingItems.slice(0, 5);
    for (const item of displayItems) {
      const assigneeName = item.assignee?.name ?? '-';
      const dueDate = item.dueDate !== undefined ? formatDate(item.dueDate, language) : l.noDueDate;
      const priority = l.priorities[item.priority];

      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `- ${item.content}\n  ${l.assignee}: ${assigneeName} | ${l.dueDate}: ${dueDate} | ${priority}`,
        },
      });
    }

    if (pendingItems.length > 5) {
      const remaining = pendingItems.length - 5;
      elements.push({
        tag: 'note',
        elements: [
          {
            tag: 'plain_text',
            content: language === 'ja' ? `他${remaining}件のタスク` : `+${remaining} more tasks`,
          },
        ],
      });
    }
  }

  // View button
  elements.push({ tag: 'hr' });
  elements.push({
    tag: 'action',
    actions: [
      {
        tag: 'button',
        text: {
          tag: 'plain_text',
          content: l.viewMinutes,
        },
        url: documentUrl,
        type: 'primary',
      },
    ],
  });

  return {
    header,
    elements,
  };
}

// =============================================================================
// GroupNotificationService Class
// =============================================================================

/**
 * Service for sending group notifications via Lark
 *
 * Extends the basic notification service with:
 * - Group chat notifications
 * - Batch notifications to multiple groups
 * - Enhanced notification cards with action items summary
 * - Notification history tracking
 *
 * @example
 * ```typescript
 * const service = createGroupNotificationService();
 *
 * // Send notification to a specific group
 * const result = await service.sendGroupNotification(accessToken, {
 *   minutes,
 *   documentUrl: 'https://docs.larksuite.com/...',
 *   chatId: 'oc_xxxxx',
 *   groupName: 'Engineering Team',
 *   includeActionItems: true,
 *   language: 'ja',
 * });
 *
 * // Send to multiple groups
 * const batchResult = await service.sendToMultipleGroups(accessToken, {
 *   minutes,
 *   documentUrl: 'https://docs.larksuite.com/...',
 *   groups: [
 *     { chatId: 'oc_group1', name: 'Engineering' },
 *     { chatId: 'oc_group2', name: 'Product' },
 *   ],
 * });
 * ```
 */
export class GroupNotificationService {
  private readonly messageClient: MessageClient;
  private readonly notificationHistory: Map<string, NotificationHistory>;

  constructor(messageClient: MessageClient) {
    this.messageClient = messageClient;
    this.notificationHistory = new Map();
  }

  /**
   * Send minutes notification to a group chat
   *
   * @param accessToken - User or app access token
   * @param options - Group notification options
   * @returns Notification result
   */
  async sendGroupNotification(
    accessToken: string,
    options: GroupNotificationOptions
  ): Promise<NotificationResult> {
    const {
      minutes,
      documentUrl,
      chatId,
      groupName,
      includeActionItems = true,
      customMessage,
      language = 'ja',
    } = options;

    const notificationId = generateNotificationId('grp');
    const startTime = new Date().toISOString();

    // Create notification history record
    const history = createNotificationHistory({
      type: NOTIFICATION_TYPE.MINUTES_COMPLETED,
      recipient: {
        id: chatId,
        type: RECIPIENT_TYPE.GROUP,
        name: groupName,
        chatId,
      },
      referenceId: minutes.id,
      referenceType: 'minutes',
    });
    this.notificationHistory.set(history.id, history);

    try {
      // Create enhanced group notification card
      const card = createGroupNotificationCard(
        minutes,
        documentUrl,
        language,
        customMessage,
        includeActionItems
      );

      // Send card message to group
      const sendResult = await this.messageClient.sendCardMessage(
        accessToken,
        chatId,
        'chat_id',
        card
      );

      // Update history with success
      this.updateHistoryStatus(history.id, NOTIFICATION_STATUS.SENT, sendResult.messageId);

      return createNotificationResult(chatId, true, sendResult.messageId);
    } catch (error) {
      const err = error as Error;

      // Update history with failure
      this.updateHistoryStatus(history.id, NOTIFICATION_STATUS.FAILED, undefined, err.message);

      return createNotificationResult(chatId, false, undefined, err.message);
    }
  }

  /**
   * Send notifications to multiple group chats
   *
   * @param accessToken - User or app access token
   * @param options - Batch group notification options
   * @param deliveryOptions - Optional delivery configuration
   * @returns Batch notification result
   */
  async sendToMultipleGroups(
    accessToken: string,
    options: BatchGroupNotificationOptions,
    deliveryOptions?: NotificationDeliveryOptions | undefined
  ): Promise<BatchNotificationResult> {
    const { minutes, documentUrl, groups, includeActionItems = true, language = 'ja' } = options;
    const { concurrency = 5, delayMs = 100, stopOnError = false } = deliveryOptions ?? {};

    const startedAt = new Date().toISOString();
    const results: NotificationResult[] = [];

    // Process groups with rate limiting
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];

      // Check if we should run in parallel batches
      if (concurrency > 1 && i > 0 && i % concurrency === 0) {
        // Add delay between batches
        await this.delay(delayMs * concurrency);
      }

      const result = await this.sendGroupNotification(accessToken, {
        minutes,
        documentUrl,
        chatId: group?.chatId ?? '',
        groupName: group?.name,
        includeActionItems,
        language,
      });

      results.push(result);

      // Stop on error if configured
      if (!result.success && stopOnError) {
        break;
      }

      // Add small delay between individual requests
      if (i < groups.length - 1) {
        await this.delay(delayMs);
      }
    }

    return createBatchNotificationResult(results, startedAt);
  }

  /**
   * Send notification to meeting participants via group chat
   *
   * If the meeting has an associated group chat, sends notification there.
   * Otherwise, falls back to individual notifications.
   *
   * @param accessToken - User or app access token
   * @param options - Notification options
   * @returns Batch notification result
   */
  async notifyParticipants(
    accessToken: string,
    options: NotifyParticipantsOptions
  ): Promise<BatchNotificationResult> {
    const { minutes, documentUrl, language = 'ja', getMeetingGroupChatId } = options;
    const startedAt = new Date().toISOString();
    const results: NotificationResult[] = [];

    // Try to get meeting group chat ID
    if (getMeetingGroupChatId !== undefined) {
      const groupChatId = await getMeetingGroupChatId(minutes.meetingId);

      if (groupChatId !== null) {
        // Send single notification to group
        const result = await this.sendGroupNotification(accessToken, {
          minutes,
          documentUrl,
          chatId: groupChatId,
          includeActionItems: true,
          language,
        });

        return createBatchNotificationResult([result], startedAt);
      }
    }

    // Fall back to individual notifications
    for (const attendee of minutes.attendees) {
      if (attendee.larkUserId !== undefined && attendee.larkUserId !== '') {
        try {
          const card = createMinutesCompletedCard(
            {
              id: minutes.id,
              title: minutes.title,
              date: minutes.date,
              duration: minutes.duration,
              attendeeCount: minutes.attendees.length,
              actionItemCount: minutes.actionItems.length,
              documentUrl,
            },
            language
          );

          const sendResult = await this.messageClient.sendCardMessage(
            accessToken,
            attendee.larkUserId,
            'open_id',
            card
          );

          results.push(createNotificationResult(attendee.larkUserId, true, sendResult.messageId));
        } catch (error) {
          const err = error as Error;
          results.push(createNotificationResult(attendee.larkUserId, false, undefined, err.message));
        }

        // Small delay between notifications
        await this.delay(50);
      }
    }

    return createBatchNotificationResult(results, startedAt);
  }

  /**
   * Get notification history for a reference
   *
   * @param referenceId - Reference ID (minutes ID, action item ID, etc.)
   * @returns Array of notification history records
   */
  getHistoryByReference(referenceId: string): ReadonlyArray<NotificationHistory> {
    return Array.from(this.notificationHistory.values()).filter(
      (h) => h.referenceId === referenceId
    );
  }

  /**
   * Get notification history by status
   *
   * @param status - Status to filter by
   * @returns Array of notification history records
   */
  getHistoryByStatus(status: typeof NOTIFICATION_STATUS[keyof typeof NOTIFICATION_STATUS]): ReadonlyArray<NotificationHistory> {
    return Array.from(this.notificationHistory.values()).filter((h) => h.status === status);
  }

  /**
   * Get all notification history
   *
   * @returns Array of all notification history records
   */
  getAllHistory(): ReadonlyArray<NotificationHistory> {
    return Array.from(this.notificationHistory.values());
  }

  /**
   * Clear notification history
   */
  clearHistory(): void {
    this.notificationHistory.clear();
  }

  /**
   * Update notification history status
   *
   * @param id - Notification ID
   * @param status - New status
   * @param messageId - Optional message ID
   * @param errorMessage - Optional error message
   */
  private updateHistoryStatus(
    id: string,
    status: typeof NOTIFICATION_STATUS[keyof typeof NOTIFICATION_STATUS],
    messageId?: string | undefined,
    errorMessage?: string | undefined
  ): void {
    const history = this.notificationHistory.get(id);
    if (history !== undefined) {
      const updated: NotificationHistory = {
        ...history,
        status,
        messageId,
        errorMessage,
        sentAt: status === NOTIFICATION_STATUS.SENT ? new Date().toISOString() : history.sentAt,
        retryCount:
          status === NOTIFICATION_STATUS.FAILED ? history.retryCount + 1 : history.retryCount,
        updatedAt: new Date().toISOString(),
      };
      this.notificationHistory.set(id, updated);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a GroupNotificationService instance using environment configuration
 *
 * @returns New GroupNotificationService instance
 *
 * @example
 * ```typescript
 * const service = createGroupNotificationService();
 * const result = await service.sendGroupNotification(accessToken, options);
 * ```
 */
export function createGroupNotificationService(): GroupNotificationService {
  const larkClient = createLarkClient();
  const messageClient = createMessageClient(larkClient);
  return new GroupNotificationService(messageClient);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create notification recipient for a group
 *
 * @param chatId - Group chat ID
 * @param name - Group name
 * @returns Notification recipient
 */
export function createGroupRecipient(chatId: string, name?: string): NotificationRecipient {
  return {
    id: chatId,
    type: RECIPIENT_TYPE.GROUP,
    name,
    chatId,
  };
}

/**
 * Create notification recipient from Speaker
 *
 * @param speaker - Speaker with optional larkUserId
 * @returns Notification recipient or null if no larkUserId
 */
export function speakerToNotificationRecipient(speaker: Speaker): NotificationRecipient | null {
  if (speaker.larkUserId === undefined || speaker.larkUserId === '') {
    return null;
  }

  return {
    id: speaker.larkUserId,
    type: RECIPIENT_TYPE.USER,
    name: speaker.name,
    openId: speaker.larkUserId,
  };
}

/**
 * Get all notification recipients from minutes attendees
 *
 * @param minutes - Minutes data
 * @returns Array of notification recipients (only those with larkUserId)
 */
export function getRecipientsFromMinutes(minutes: Minutes): readonly NotificationRecipient[] {
  return minutes.attendees
    .map((attendee) => speakerToNotificationRecipient(attendee))
    .filter((recipient): recipient is NotificationRecipient => recipient !== null);
}
