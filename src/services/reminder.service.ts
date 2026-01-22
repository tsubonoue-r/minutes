/**
 * Reminder Service - Manage reminders and send notifications
 * @module services/reminder.service
 */

import type {
  Reminder,
  ReminderFilters,
  ReminderListResponse,
  ReminderStats,
  CreateReminderInput,
  UpdateReminderInput,
  ReminderStatus,
} from '@/types/reminder';
import {
  REMINDER_STATUS,
  REMINDER_TYPE,
  createReminder as createReminderFromInput,
  calculateReminderStats,
  isReminderDue,
  canRetryReminder,
} from '@/types/reminder';
import {
  NotificationService,
  createNotificationService,
  type NotificationRecipient,
} from './notification.service';
import type { ReceiveIdType } from '@/lib/lark';

// =============================================================================
// Error Classes
// =============================================================================

/**
 * General reminder service error
 */
export class ReminderServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ReminderServiceError';
  }
}

/**
 * Reminder not found error
 */
export class ReminderNotFoundError extends ReminderServiceError {
  constructor(id: string) {
    super(`Reminder with id '${id}' not found`, 'NOT_FOUND', 404, { id });
    this.name = 'ReminderNotFoundError';
  }
}

/**
 * Invalid reminder state error
 */
export class InvalidReminderStateError extends ReminderServiceError {
  constructor(id: string, currentStatus: ReminderStatus, requiredStatus: ReminderStatus) {
    super(
      `Reminder '${id}' is in '${currentStatus}' status, but requires '${requiredStatus}' status`,
      'INVALID_STATE',
      400,
      { id, currentStatus, requiredStatus }
    );
    this.name = 'InvalidReminderStateError';
  }
}

// =============================================================================
// In-Memory Store (Singleton)
// =============================================================================

/**
 * In-memory storage for reminders
 * (Temporary implementation - will be replaced with persistent storage)
 */
class ReminderStore {
  private reminders: Map<string, Reminder> = new Map();
  private static instance: ReminderStore | undefined;

  /**
   * Get singleton instance
   */
  static getInstance(): ReminderStore {
    if (ReminderStore.instance === undefined) {
      ReminderStore.instance = new ReminderStore();
    }
    return ReminderStore.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    ReminderStore.instance = undefined;
  }

  /**
   * Add a reminder to the store
   */
  add(reminder: Reminder): void {
    this.reminders.set(reminder.id, reminder);
  }

  /**
   * Get a reminder by ID
   */
  get(id: string): Reminder | undefined {
    return this.reminders.get(id);
  }

  /**
   * Get all reminders
   */
  getAll(): Reminder[] {
    return Array.from(this.reminders.values());
  }

  /**
   * Update a reminder
   */
  update(id: string, updates: Partial<Reminder>): Reminder | undefined {
    const existing = this.reminders.get(id);
    if (existing === undefined) {
      return undefined;
    }

    const updated: Reminder = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID from being changed
      updatedAt: new Date().toISOString(),
    };

    this.reminders.set(id, updated);
    return updated;
  }

  /**
   * Delete a reminder
   */
  delete(id: string): boolean {
    return this.reminders.delete(id);
  }

  /**
   * Clear all reminders
   */
  clear(): void {
    this.reminders.clear();
  }

  /**
   * Get reminder count
   */
  get size(): number {
    return this.reminders.size;
  }
}

// =============================================================================
// Default Values
// =============================================================================

const DEFAULT_PAGE_SIZE = 20;

// =============================================================================
// ReminderService Class
// =============================================================================

/**
 * Service for managing reminders with CRUD operations and notification integration
 *
 * @example
 * ```typescript
 * const service = createReminderService();
 *
 * // Create an action item reminder
 * const reminder = await service.createReminder({
 *   type: 'action_item_due',
 *   title: 'Action Item Due Soon',
 *   schedule: { timing: '1_day_before', referenceDate: '2024-01-20T00:00:00Z' },
 *   recipient: { id: 'user123', type: 'user' },
 *   actionItemRef: { actionItemId: 'ai_123', content: 'Review document', meetingId: 'meet_456' },
 * });
 *
 * // Send due reminders
 * const results = await service.sendDueReminders(accessToken);
 * ```
 */
export class ReminderService {
  private readonly store: ReminderStore;
  private readonly notificationService: NotificationService;

  constructor(store?: ReminderStore, notificationService?: NotificationService) {
    this.store = store ?? ReminderStore.getInstance();
    this.notificationService = notificationService ?? createNotificationService();
  }

  /**
   * Create a new reminder
   *
   * @param input - Create reminder input
   * @param createdBy - User ID who created the reminder
   * @returns Created reminder
   */
  async createReminder(
    input: CreateReminderInput,
    createdBy?: string
  ): Promise<Reminder> {
    // Note: async for future persistent storage integration
    const reminder = createReminderFromInput(input, createdBy);
    await Promise.resolve(this.store.add(reminder));
    return reminder;
  }

  /**
   * Get a reminder by ID
   *
   * @param id - Reminder ID
   * @returns Reminder or null if not found
   */
  async getReminder(id: string): Promise<Reminder | null> {
    // Note: async for future persistent storage integration
    const reminder = await Promise.resolve(this.store.get(id));
    return reminder ?? null;
  }

  /**
   * Get paginated list of reminders with filtering
   *
   * @param filters - Filter criteria
   * @param pagination - Pagination options
   * @returns Paginated list response
   */
  async getReminders(
    filters?: ReminderFilters,
    pagination?: { page: number; pageSize: number }
  ): Promise<ReminderListResponse> {
    // Note: async for future persistent storage integration
    const allReminders = await Promise.resolve(this.store.getAll());
    const appliedFilters = filters ?? {};
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? DEFAULT_PAGE_SIZE;

    // Apply filters
    let filteredReminders = allReminders;

    if (appliedFilters.status !== undefined) {
      filteredReminders = filteredReminders.filter(
        (r) => r.status === appliedFilters.status
      );
    }

    if (appliedFilters.type !== undefined) {
      filteredReminders = filteredReminders.filter(
        (r) => r.type === appliedFilters.type
      );
    }

    if (appliedFilters.recipientId !== undefined) {
      filteredReminders = filteredReminders.filter(
        (r) => r.recipient.id === appliedFilters.recipientId
      );
    }

    if (appliedFilters.actionItemId !== undefined) {
      filteredReminders = filteredReminders.filter(
        (r) => r.actionItemRef?.actionItemId === appliedFilters.actionItemId
      );
    }

    if (appliedFilters.minutesId !== undefined) {
      filteredReminders = filteredReminders.filter(
        (r) => r.minutesRef?.minutesId === appliedFilters.minutesId
      );
    }

    if (appliedFilters.meetingId !== undefined) {
      filteredReminders = filteredReminders.filter(
        (r) =>
          r.actionItemRef?.meetingId === appliedFilters.meetingId ||
          r.minutesRef?.meetingId === appliedFilters.meetingId
      );
    }

    if (appliedFilters.fromDate !== undefined) {
      const fromDate = new Date(appliedFilters.fromDate);
      filteredReminders = filteredReminders.filter((r) => {
        if (r.schedule.scheduledAt === undefined) return false;
        return new Date(r.schedule.scheduledAt) >= fromDate;
      });
    }

    if (appliedFilters.toDate !== undefined) {
      const toDate = new Date(appliedFilters.toDate);
      filteredReminders = filteredReminders.filter((r) => {
        if (r.schedule.scheduledAt === undefined) return false;
        return new Date(r.schedule.scheduledAt) <= toDate;
      });
    }

    if (appliedFilters.isDue === true) {
      filteredReminders = filteredReminders.filter((r) => isReminderDue(r));
    }

    // Sort by scheduled time (earliest first)
    filteredReminders.sort((a, b) => {
      const aTime = a.schedule.scheduledAt ?? a.createdAt;
      const bTime = b.schedule.scheduledAt ?? b.createdAt;
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });

    // Calculate pagination
    const totalCount = filteredReminders.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const validPage = Math.min(Math.max(1, page), totalPages);
    const startIndex = (validPage - 1) * pageSize;
    const paginatedItems = filteredReminders.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      totalCount,
      page: validPage,
      pageSize,
      hasMore: validPage < totalPages,
    };
  }

  /**
   * Get all due reminders (ready to be sent)
   *
   * @returns Array of due reminders
   */
  async getDueReminders(): Promise<Reminder[]> {
    // Note: async for future persistent storage integration
    const allReminders = await Promise.resolve(this.store.getAll());
    return allReminders.filter((r) => isReminderDue(r));
  }

  /**
   * Update a reminder
   *
   * @param id - Reminder ID
   * @param updates - Fields to update
   * @returns Updated reminder
   * @throws ReminderNotFoundError if reminder not found
   */
  async updateReminder(
    id: string,
    updates: UpdateReminderInput
  ): Promise<Reminder> {
    // Note: async for future persistent storage integration
    const existing = await Promise.resolve(this.store.get(id));
    if (existing === undefined) {
      throw new ReminderNotFoundError(id);
    }

    // Only allow updates to active reminders
    if (existing.status !== REMINDER_STATUS.ACTIVE) {
      throw new InvalidReminderStateError(
        id,
        existing.status,
        REMINDER_STATUS.ACTIVE
      );
    }

    const updateData: Partial<Reminder> = {};

    if (updates.title !== undefined) {
      updateData.title = updates.title;
    }
    if (updates.message !== undefined) {
      updateData.message = updates.message;
    }
    if (updates.schedule !== undefined) {
      updateData.schedule = updates.schedule;
    }
    if (updates.language !== undefined) {
      updateData.language = updates.language;
    }

    const updated = this.store.update(id, updateData);
    if (updated === undefined) {
      throw new ReminderNotFoundError(id);
    }

    return updated;
  }

  /**
   * Cancel a reminder
   *
   * @param id - Reminder ID
   * @returns Cancelled reminder
   * @throws ReminderNotFoundError if reminder not found
   * @throws InvalidReminderStateError if reminder is not active
   */
  async cancelReminder(id: string): Promise<Reminder> {
    // Note: async for future persistent storage integration
    const existing = await Promise.resolve(this.store.get(id));
    if (existing === undefined) {
      throw new ReminderNotFoundError(id);
    }

    // Only allow cancellation of active reminders
    if (existing.status !== REMINDER_STATUS.ACTIVE) {
      throw new InvalidReminderStateError(
        id,
        existing.status,
        REMINDER_STATUS.ACTIVE
      );
    }

    const updated = this.store.update(id, {
      status: REMINDER_STATUS.CANCELLED,
    });

    if (updated === undefined) {
      throw new ReminderNotFoundError(id);
    }

    return updated;
  }

  /**
   * Delete a reminder permanently
   *
   * @param id - Reminder ID
   * @throws ReminderNotFoundError if reminder not found
   */
  async deleteReminder(id: string): Promise<void> {
    // Note: async for future persistent storage integration
    const deleted = await Promise.resolve(this.store.delete(id));
    if (!deleted) {
      throw new ReminderNotFoundError(id);
    }
  }

  /**
   * Get reminder statistics
   *
   * @returns Reminder stats
   */
  async getStats(): Promise<ReminderStats> {
    // Note: async for future persistent storage integration
    const allReminders = await Promise.resolve(this.store.getAll());
    return calculateReminderStats(allReminders);
  }

  /**
   * Send a single reminder via Lark notification
   *
   * @param accessToken - Lark access token
   * @param reminderId - Reminder ID to send
   * @returns Updated reminder after sending
   * @throws ReminderNotFoundError if reminder not found
   * @throws InvalidReminderStateError if reminder is not active
   */
  async sendReminder(accessToken: string, reminderId: string): Promise<Reminder> {
    const reminder = await Promise.resolve(this.store.get(reminderId));
    if (reminder === undefined) {
      throw new ReminderNotFoundError(reminderId);
    }

    // Only send active reminders
    if (reminder.status !== REMINDER_STATUS.ACTIVE) {
      throw new InvalidReminderStateError(
        reminderId,
        reminder.status,
        REMINDER_STATUS.ACTIVE
      );
    }

    // Convert reminder recipient to notification recipient
    const notificationRecipient = this.toNotificationRecipient(reminder);

    try {
      // Send notification based on reminder type
      let messageId: string | undefined;

      if (reminder.type === REMINDER_TYPE.ACTION_ITEM_DUE && reminder.actionItemRef !== undefined) {
        // Send action item reminder notification
        const result = await this.notificationService.sendActionItemNotification(
          accessToken,
          {
            actionItem: {
              id: reminder.actionItemRef.actionItemId,
              content: reminder.actionItemRef.content,
              dueDate: reminder.actionItemRef.dueDate,
              priority: 'medium', // Default priority for reminders
              status: 'pending',
              assignee: {
                id: reminder.recipient.id,
                name: reminder.recipient.name ?? 'Unknown',
              },
            },
            meeting: {
              title: reminder.actionItemRef.meetingTitle ?? 'Meeting',
              date: reminder.actionItemRef.dueDate ?? new Date().toISOString().split('T')[0] ?? '1970-01-01',
            },
            recipient: notificationRecipient,
            language: reminder.language,
          }
        );
        messageId = result.messageId;
      } else if (reminder.type === REMINDER_TYPE.MINUTES_REVIEW && reminder.minutesRef !== undefined) {
        // Send minutes review reminder notification
        const result = await this.notificationService.sendMinutesNotification(
          accessToken,
          {
            minutes: {
              id: reminder.minutesRef.minutesId,
              meetingId: reminder.minutesRef.meetingId,
              title: reminder.minutesRef.meetingTitle,
              date: reminder.minutesRef.meetingDate,
              duration: 0,
              summary: reminder.message ?? '',
              topics: [],
              decisions: [],
              actionItems: [],
              attendees: [],
              metadata: {
                generatedAt: new Date().toISOString(),
                model: 'reminder',
                processingTimeMs: 0,
                confidence: 1,
              },
            },
            documentUrl: reminder.minutesRef.documentUrl ?? '',
            recipients: [notificationRecipient],
            language: reminder.language,
          }
        );
        messageId = result.results[0]?.messageId;
      }

      // Update reminder status to sent
      const updated = this.store.update(reminderId, {
        status: REMINDER_STATUS.SENT,
        messageId,
        sentAt: new Date().toISOString(),
      });

      return updated!;
    } catch (error) {
      // Update reminder with failure info
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.store.update(reminderId, {
        status: REMINDER_STATUS.FAILED,
        errorMessage,
        retryCount: reminder.retryCount + 1,
      });

      throw new ReminderServiceError(
        `Failed to send reminder: ${errorMessage}`,
        'SEND_FAILED',
        500,
        { reminderId, error: errorMessage }
      );
    }
  }

  /**
   * Send all due reminders
   *
   * @param accessToken - Lark access token
   * @returns Results of sending each reminder
   */
  async sendDueReminders(
    accessToken: string
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    results: Array<{ id: string; success: boolean; error?: string }>;
  }> {
    const dueReminders = await this.getDueReminders();
    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const reminder of dueReminders) {
      try {
        await this.sendReminder(accessToken, reminder.id);
        results.push({ id: reminder.id, success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ id: reminder.id, success: false, error: errorMessage });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      total: dueReminders.length,
      sent,
      failed,
      results,
    };
  }

  /**
   * Retry failed reminders
   *
   * @param accessToken - Lark access token
   * @returns Results of retrying each reminder
   */
  async retryFailedReminders(
    accessToken: string
  ): Promise<{
    total: number;
    retried: number;
    failed: number;
    results: Array<{ id: string; success: boolean; error?: string }>;
  }> {
    const allReminders = await Promise.resolve(this.store.getAll());
    const retryableReminders = allReminders.filter((r) => canRetryReminder(r));
    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const reminder of retryableReminders) {
      // Reset status to active before retrying
      this.store.update(reminder.id, { status: REMINDER_STATUS.ACTIVE });

      try {
        await this.sendReminder(accessToken, reminder.id);
        results.push({ id: reminder.id, success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ id: reminder.id, success: false, error: errorMessage });
      }
    }

    const retried = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      total: retryableReminders.length,
      retried,
      failed,
      results,
    };
  }

  /**
   * Get reminders for a specific action item
   *
   * @param actionItemId - Action item ID
   * @returns Array of reminders for the action item
   */
  async getRemindersForActionItem(actionItemId: string): Promise<Reminder[]> {
    const allReminders = await Promise.resolve(this.store.getAll());
    return allReminders.filter(
      (r) => r.actionItemRef?.actionItemId === actionItemId
    );
  }

  /**
   * Get reminders for a specific minutes document
   *
   * @param minutesId - Minutes ID
   * @returns Array of reminders for the minutes
   */
  async getRemindersForMinutes(minutesId: string): Promise<Reminder[]> {
    const allReminders = await Promise.resolve(this.store.getAll());
    return allReminders.filter(
      (r) => r.minutesRef?.minutesId === minutesId
    );
  }

  /**
   * Clear all reminders (for testing)
   */
  async clearAll(): Promise<void> {
    // Note: async for future persistent storage integration
    await Promise.resolve(this.store.clear());
  }

  /**
   * Convert reminder recipient to notification recipient
   */
  private toNotificationRecipient(reminder: Reminder): NotificationRecipient {
    let idType: ReceiveIdType = 'open_id';
    let id = reminder.recipient.id;

    if (reminder.recipient.openId !== undefined) {
      idType = 'open_id';
      id = reminder.recipient.openId;
    } else if (reminder.recipient.email !== undefined) {
      idType = 'email';
      id = reminder.recipient.email;
    } else if (reminder.recipient.type === 'group') {
      idType = 'chat_id';
    }

    return {
      id,
      idType,
      name: reminder.recipient.name,
    };
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a ReminderService instance using singleton store
 *
 * @returns ReminderService instance
 */
export function createReminderService(): ReminderService {
  return new ReminderService();
}

/**
 * Create a ReminderService instance with a fresh store (for testing)
 *
 * @returns ReminderService instance with isolated store
 */
export function createTestReminderService(): {
  service: ReminderService;
  store: ReminderStore;
} {
  const store = new (ReminderStore as unknown as {
    new (): ReminderStore;
  })();
  const service = new ReminderService(store);
  return { service, store };
}

// Export store class for testing
export { ReminderStore };
