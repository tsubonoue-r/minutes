/**
 * Notification Service - Send notifications via Lark
 * @module services/notification.service
 */

import type { Minutes, ActionItem, Speaker } from '@/types/minutes';
import {
  MessageClient,
  MessageApiError,
  createMessageClient,
  createMinutesCompletedCard,
  createMinutesDraftCard,
  createActionItemAssignedCard,
  type InteractiveCard,
  type ReceiveIdType,
  type SendMessageResult,
  type MinutesCardInfo,
  type ActionItemCardInfo,
  type DraftMinutesCardInfo,
  type CardLanguage,
} from '@/lib/lark';
import { createLarkClient } from '@/lib/lark/client';

// =============================================================================
// Types
// =============================================================================

/**
 * Notification recipient
 */
export interface NotificationRecipient {
  /** Recipient ID (open_id, user_id, or chat_id) */
  readonly id: string;
  /** Type of recipient ID */
  readonly idType: ReceiveIdType;
  /** Recipient name (for logging) */
  readonly name?: string | undefined;
}

/**
 * Minutes notification options
 */
export interface MinutesNotificationOptions {
  /** Minutes data to include in notification */
  readonly minutes: Minutes;
  /** Document URL */
  readonly documentUrl: string;
  /** Recipients to notify */
  readonly recipients: readonly NotificationRecipient[];
  /** Notification language */
  readonly language?: CardLanguage | undefined;
}

/**
 * Draft minutes notification options
 */
export interface DraftMinutesNotificationOptions {
  /** Minutes data */
  readonly minutes: Minutes;
  /** Preview URL for the draft */
  readonly previewUrl: string;
  /** URL to approve the draft */
  readonly approveUrl: string;
  /** Recipient (usually the meeting organizer) */
  readonly recipient: NotificationRecipient;
  /** Notification language */
  readonly language?: CardLanguage | undefined;
}

/**
 * Action item notification options
 */
export interface ActionItemNotificationOptions {
  /** Action item data */
  readonly actionItem: ActionItem;
  /** Meeting information */
  readonly meeting: {
    readonly title: string;
    readonly date: string;
  };
  /** URL to the minutes document (optional) */
  readonly minutesUrl?: string | undefined;
  /** Recipient (the assignee) */
  readonly recipient: NotificationRecipient;
  /** Notification language */
  readonly language?: CardLanguage | undefined;
}

/**
 * Batch action item notification options
 */
export interface BatchActionItemNotificationOptions {
  /** Action items with their recipients */
  readonly items: ReadonlyArray<{
    readonly actionItem: ActionItem;
    readonly recipient: NotificationRecipient;
  }>;
  /** Meeting information */
  readonly meeting: {
    readonly title: string;
    readonly date: string;
  };
  /** URL to the minutes document (optional) */
  readonly minutesUrl?: string | undefined;
  /** Notification language */
  readonly language?: CardLanguage | undefined;
}

/**
 * Result of a notification operation
 */
export interface NotificationResult {
  /** Whether the notification was successful */
  readonly success: boolean;
  /** Message ID if successful */
  readonly messageId?: string | undefined;
  /** Recipient ID */
  readonly recipientId: string;
  /** Error message if failed */
  readonly error?: string | undefined;
}

/**
 * Result of batch notification operation
 */
export interface BatchNotificationResult {
  /** Total number of notifications attempted */
  readonly total: number;
  /** Number of successful notifications */
  readonly succeeded: number;
  /** Number of failed notifications */
  readonly failed: number;
  /** Individual results */
  readonly results: readonly NotificationResult[];
}

// =============================================================================
// Error Class
// =============================================================================

/**
 * Error thrown when notification fails
 */
export class NotificationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recipientId?: string | undefined,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'NotificationError';
  }

  /**
   * Create from MessageApiError
   */
  static fromMessageApiError(
    error: MessageApiError,
    recipientId: string
  ): NotificationError {
    return new NotificationError(
      error.message,
      `MESSAGE_API_${error.code}`,
      recipientId,
      error.details
    );
  }
}

// =============================================================================
// NotificationService Class
// =============================================================================

/**
 * Service for sending notifications via Lark
 *
 * Handles sending various types of notifications:
 * - Minutes completion notifications to participants
 * - Draft minutes review requests to organizers
 * - Action item assignments to assignees
 *
 * @example
 * ```typescript
 * const service = createNotificationService();
 *
 * // Send minutes notification
 * const results = await service.sendMinutesNotification(accessToken, {
 *   minutes,
 *   documentUrl: 'https://docs.larksuite.com/...',
 *   recipients: [
 *     { id: 'ou_xxxxx', idType: 'open_id', name: 'Tanaka' },
 *   ],
 *   language: 'ja',
 * });
 *
 * // Send action item notification
 * const result = await service.sendActionItemNotification(accessToken, {
 *   actionItem,
 *   meeting: { title: 'Weekly Sync', date: '2024-01-15' },
 *   recipient: { id: 'ou_xxxxx', idType: 'open_id' },
 * });
 * ```
 */
export class NotificationService {
  private readonly messageClient: MessageClient;

  constructor(messageClient: MessageClient) {
    this.messageClient = messageClient;
  }

  /**
   * Send minutes completion notification to multiple recipients
   *
   * @param accessToken - User or app access token
   * @param options - Notification options
   * @returns Batch notification result
   */
  async sendMinutesNotification(
    accessToken: string,
    options: MinutesNotificationOptions
  ): Promise<BatchNotificationResult> {
    const { minutes, documentUrl, recipients, language = 'ja' } = options;

    const cardInfo: MinutesCardInfo = {
      id: minutes.id,
      title: minutes.title,
      date: minutes.date,
      duration: minutes.duration,
      attendeeCount: minutes.attendees.length,
      actionItemCount: minutes.actionItems.length,
      documentUrl,
    };

    const card = createMinutesCompletedCard(cardInfo, language);

    return this.sendCardToRecipients(accessToken, card, recipients);
  }

  /**
   * Send draft minutes review request to organizer
   *
   * @param accessToken - User or app access token
   * @param options - Notification options
   * @returns Notification result
   */
  async sendDraftMinutesNotification(
    accessToken: string,
    options: DraftMinutesNotificationOptions
  ): Promise<NotificationResult> {
    const { minutes, previewUrl, approveUrl, recipient, language = 'ja' } =
      options;

    const cardInfo: DraftMinutesCardInfo = {
      id: minutes.id,
      title: minutes.title,
      date: minutes.date,
      previewUrl,
      approveUrl,
    };

    const card = createMinutesDraftCard(cardInfo, language);

    return this.sendCardToRecipient(accessToken, card, recipient);
  }

  /**
   * Send action item notification to assignee
   *
   * @param accessToken - User or app access token
   * @param options - Notification options
   * @returns Notification result
   */
  async sendActionItemNotification(
    accessToken: string,
    options: ActionItemNotificationOptions
  ): Promise<NotificationResult> {
    const { actionItem, meeting, minutesUrl, recipient, language = 'ja' } =
      options;

    if (actionItem.assignee === undefined) {
      return {
        success: false,
        recipientId: recipient.id,
        error: 'Action item has no assignee',
      };
    }

    const cardInfo: ActionItemCardInfo = {
      id: actionItem.id,
      content: actionItem.content,
      assigneeName: actionItem.assignee.name,
      dueDate: actionItem.dueDate,
      priority: actionItem.priority,
      meetingTitle: meeting.title,
      meetingDate: meeting.date,
      minutesUrl,
    };

    const card = createActionItemAssignedCard(cardInfo, language);

    return this.sendCardToRecipient(accessToken, card, recipient);
  }

  /**
   * Send action item notifications to multiple assignees
   *
   * @param accessToken - User or app access token
   * @param options - Batch notification options
   * @returns Batch notification result
   */
  async sendBatchActionItemNotifications(
    accessToken: string,
    options: BatchActionItemNotificationOptions
  ): Promise<BatchNotificationResult> {
    const { items, meeting, minutesUrl, language = 'ja' } = options;

    const results: NotificationResult[] = [];

    for (const { actionItem, recipient } of items) {
      const result = await this.sendActionItemNotification(accessToken, {
        actionItem,
        meeting,
        minutesUrl,
        recipient,
        language,
      });
      results.push(result);
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      total: results.length,
      succeeded,
      failed,
      results,
    };
  }

  /**
   * Send all action item notifications from minutes
   *
   * Extracts action items with assignees and sends notifications to each.
   * Requires a mapping function to convert Speaker to NotificationRecipient.
   *
   * @param accessToken - User or app access token
   * @param minutes - Minutes containing action items
   * @param documentUrl - URL to the minutes document
   * @param speakerToRecipient - Function to convert speaker to recipient
   * @param language - Notification language
   * @returns Batch notification result
   */
  async sendAllActionItemNotifications(
    accessToken: string,
    minutes: Minutes,
    documentUrl: string,
    speakerToRecipient: (speaker: Speaker) => NotificationRecipient | null,
    language: CardLanguage = 'ja'
  ): Promise<BatchNotificationResult> {
    const items: Array<{
      actionItem: ActionItem;
      recipient: NotificationRecipient;
    }> = [];

    for (const actionItem of minutes.actionItems) {
      if (actionItem.assignee !== undefined) {
        const recipient = speakerToRecipient(actionItem.assignee);
        if (recipient !== null) {
          items.push({ actionItem, recipient });
        }
      }
    }

    if (items.length === 0) {
      return {
        total: 0,
        succeeded: 0,
        failed: 0,
        results: [],
      };
    }

    return this.sendBatchActionItemNotifications(accessToken, {
      items,
      meeting: {
        title: minutes.title,
        date: minutes.date,
      },
      minutesUrl: documentUrl,
      language,
    });
  }

  /**
   * Send a card message to a single recipient (public API)
   *
   * Exposes the card sending capability for use by other services
   * that build their own custom card templates.
   *
   * @param accessToken - Access token
   * @param card - Interactive card to send
   * @param recipient - Recipient information
   * @returns Notification result
   *
   * @example
   * ```typescript
   * const service = createNotificationService();
   * const card = createApprovalRequestCard(cardInfo, 'ja');
   * const result = await service.sendCardMessage(accessToken, card, recipient);
   * ```
   */
  async sendCardMessage(
    accessToken: string,
    card: InteractiveCard,
    recipient: NotificationRecipient
  ): Promise<NotificationResult> {
    return this.sendCardToRecipient(accessToken, card, recipient);
  }

  /**
   * Send a card message to a single recipient
   *
   * @param accessToken - Access token
   * @param card - Interactive card to send
   * @param recipient - Recipient information
   * @returns Notification result
   */
  private async sendCardToRecipient(
    accessToken: string,
    card: InteractiveCard,
    recipient: NotificationRecipient
  ): Promise<NotificationResult> {
    try {
      const result = await this.messageClient.sendCardMessage(
        accessToken,
        recipient.id,
        recipient.idType,
        card
      );

      return {
        success: true,
        messageId: result.messageId,
        recipientId: recipient.id,
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        recipientId: recipient.id,
        error: err.message,
      };
    }
  }

  /**
   * Send a card message to multiple recipients
   *
   * @param accessToken - Access token
   * @param card - Interactive card to send
   * @param recipients - Array of recipients
   * @returns Batch notification result
   */
  private async sendCardToRecipients(
    accessToken: string,
    card: InteractiveCard,
    recipients: readonly NotificationRecipient[]
  ): Promise<BatchNotificationResult> {
    const results: NotificationResult[] = [];

    for (const recipient of recipients) {
      const result = await this.sendCardToRecipient(
        accessToken,
        card,
        recipient
      );
      results.push(result);
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      total: results.length,
      succeeded,
      failed,
      results,
    };
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a NotificationService instance using environment configuration
 *
 * @returns New NotificationService instance
 *
 * @example
 * ```typescript
 * const service = createNotificationService();
 * const result = await service.sendMinutesNotification(accessToken, options);
 * ```
 */
export function createNotificationService(): NotificationService {
  const larkClient = createLarkClient();
  const messageClient = createMessageClient(larkClient);
  return new NotificationService(messageClient);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a recipient from a Lark user ID (open_id)
 *
 * @param openId - User's open_id
 * @param name - Optional user name
 * @returns NotificationRecipient
 */
export function createRecipientFromOpenId(
  openId: string,
  name?: string
): NotificationRecipient {
  return {
    id: openId,
    idType: 'open_id',
    name,
  };
}

/**
 * Create a recipient from a chat ID
 *
 * @param chatId - Chat ID
 * @param name - Optional chat name
 * @returns NotificationRecipient
 */
export function createRecipientFromChatId(
  chatId: string,
  name?: string
): NotificationRecipient {
  return {
    id: chatId,
    idType: 'chat_id',
    name,
  };
}

/**
 * Create a recipient from an email address
 *
 * @param email - User's email address
 * @param name - Optional user name
 * @returns NotificationRecipient
 */
export function createRecipientFromEmail(
  email: string,
  name?: string
): NotificationRecipient {
  return {
    id: email,
    idType: 'email',
    name,
  };
}

/**
 * Convert Speaker to NotificationRecipient if larkUserId is available
 *
 * @param speaker - Speaker with optional larkUserId
 * @returns NotificationRecipient or null if no larkUserId
 */
export function speakerToRecipient(
  speaker: Speaker
): NotificationRecipient | null {
  if (speaker.larkUserId === undefined || speaker.larkUserId === '') {
    return null;
  }

  return {
    id: speaker.larkUserId,
    idType: 'open_id',
    name: speaker.name,
  };
}
