/**
 * Tests for ReminderService
 * @module services/__tests__/reminder.service.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ReminderService,
  ReminderStore,
  ReminderNotFoundError,
  InvalidReminderStateError,
} from '../reminder.service';
import {
  REMINDER_TYPE,
  REMINDER_STATUS,
  REMINDER_TIMING,
  REMINDER_RECURRENCE,
  type CreateReminderInput,
  type Reminder,
} from '@/types/reminder';
import type { NotificationService } from '../notification.service';

// Mock notification service to avoid Lark client initialization
const mockNotificationService: NotificationService = {
  sendMinutesNotification: vi.fn().mockResolvedValue({ total: 1, succeeded: 1, failed: 0, results: [{ success: true, messageId: 'msg_123', recipientId: 'user_123' }] }),
  sendDraftMinutesNotification: vi.fn().mockResolvedValue({ success: true, messageId: 'msg_123', recipientId: 'user_123' }),
  sendActionItemNotification: vi.fn().mockResolvedValue({ success: true, messageId: 'msg_123', recipientId: 'user_123' }),
  sendBatchActionItemNotifications: vi.fn().mockResolvedValue({ total: 1, succeeded: 1, failed: 0, results: [] }),
  sendAllActionItemNotifications: vi.fn().mockResolvedValue({ total: 1, succeeded: 1, failed: 0, results: [] }),
} as unknown as NotificationService;

/**
 * Create a test ReminderService with mocked dependencies
 */
function createTestReminderServiceWithMocks(): {
  service: ReminderService;
  store: ReminderStore;
} {
  const store = new (ReminderStore as unknown as {
    new (): ReminderStore;
  })();
  const service = new ReminderService(store, mockNotificationService);
  return { service, store };
}

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Create a mock CreateReminderInput for action item reminder
 */
function createMockActionItemReminderInput(
  overrides?: Partial<CreateReminderInput>
): CreateReminderInput {
  return {
    type: REMINDER_TYPE.ACTION_ITEM_DUE,
    title: 'Action Item Due Reminder',
    message: 'Your action item is due soon',
    schedule: {
      timing: REMINDER_TIMING.ONE_DAY_BEFORE,
      referenceDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      recurrence: REMINDER_RECURRENCE.NONE,
      timezone: 'Asia/Tokyo',
    },
    recipient: {
      id: 'user_123',
      name: 'Test User',
      type: 'user',
      email: 'test@example.com',
    },
    actionItemRef: {
      actionItemId: 'ai_123',
      content: 'Complete the documentation',
      meetingId: 'meet_456',
      meetingTitle: 'Weekly Sync',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    language: 'ja',
    ...overrides,
  };
}

/**
 * Create a mock CreateReminderInput for minutes review reminder
 */
function createMockMinutesReminderInput(
  overrides?: Partial<CreateReminderInput>
): CreateReminderInput {
  return {
    type: REMINDER_TYPE.MINUTES_REVIEW,
    title: 'Minutes Review Reminder',
    message: 'Please review the meeting minutes',
    schedule: {
      timing: REMINDER_TIMING.ONE_DAY_BEFORE,
      referenceDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      recurrence: REMINDER_RECURRENCE.NONE,
      timezone: 'Asia/Tokyo',
    },
    recipient: {
      id: 'user_456',
      name: 'Another User',
      type: 'user',
    },
    minutesRef: {
      minutesId: 'min_123',
      meetingId: 'meet_789',
      meetingTitle: 'Project Kickoff',
      meetingDate: new Date().toISOString().split('T')[0] ?? '1970-01-01',
    },
    language: 'en',
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('ReminderService', () => {
  let service: ReminderService;

  beforeEach(() => {
    const { service: testService } = createTestReminderServiceWithMocks();
    service = testService;
  });

  describe('createReminder', () => {
    it('should create an action item reminder', async () => {
      const input = createMockActionItemReminderInput();
      const reminder = await service.createReminder(input, 'creator_123');

      expect(reminder).toBeDefined();
      expect(reminder.id).toMatch(/^rem_/);
      expect(reminder.type).toBe(REMINDER_TYPE.ACTION_ITEM_DUE);
      expect(reminder.status).toBe(REMINDER_STATUS.ACTIVE);
      expect(reminder.title).toBe(input.title);
      expect(reminder.message).toBe(input.message);
      expect(reminder.recipient.id).toBe(input.recipient.id);
      expect(reminder.actionItemRef).toBeDefined();
      expect(reminder.actionItemRef?.actionItemId).toBe('ai_123');
      expect(reminder.createdBy).toBe('creator_123');
      expect(reminder.createdAt).toBeDefined();
      expect(reminder.updatedAt).toBeDefined();
    });

    it('should create a minutes review reminder', async () => {
      const input = createMockMinutesReminderInput();
      const reminder = await service.createReminder(input);

      expect(reminder).toBeDefined();
      expect(reminder.type).toBe(REMINDER_TYPE.MINUTES_REVIEW);
      expect(reminder.minutesRef).toBeDefined();
      expect(reminder.minutesRef?.minutesId).toBe('min_123');
      expect(reminder.language).toBe('en');
    });

    it('should calculate scheduled time from reference date', async () => {
      const referenceDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const input = createMockActionItemReminderInput({
        schedule: {
          timing: REMINDER_TIMING.ONE_DAY_BEFORE,
          referenceDate: referenceDate.toISOString(),
          recurrence: REMINDER_RECURRENCE.NONE,
          timezone: 'Asia/Tokyo',
        },
      });

      const reminder = await service.createReminder(input);

      expect(reminder.schedule.scheduledAt).toBeDefined();
      const scheduledAt = reminder.schedule.scheduledAt;
      if (scheduledAt === undefined) {
        throw new Error('scheduledAt should be defined');
      }
      const scheduledDate = new Date(scheduledAt);
      const expectedDate = new Date(referenceDate.getTime() - 24 * 60 * 60 * 1000);

      // Allow 1 second tolerance for test execution time
      expect(Math.abs(scheduledDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
    });
  });

  describe('getReminder', () => {
    it('should get a reminder by ID', async () => {
      const input = createMockActionItemReminderInput();
      const created = await service.createReminder(input);

      const found = await service.getReminder(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe(input.title);
    });

    it('should return null for non-existent reminder', async () => {
      const found = await service.getReminder('non_existent_id');

      expect(found).toBeNull();
    });
  });

  describe('getReminders', () => {
    beforeEach(async () => {
      // Create multiple reminders
      await service.createReminder(createMockActionItemReminderInput());
      await service.createReminder(createMockMinutesReminderInput());
      await service.createReminder(
        createMockActionItemReminderInput({
          title: 'Second Action Item Reminder',
          recipient: { id: 'user_789', type: 'user' },
        })
      );
    });

    it('should return all reminders with pagination', async () => {
      const result = await service.getReminders();

      expect(result.items).toHaveLength(3);
      expect(result.totalCount).toBe(3);
      expect(result.page).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by status', async () => {
      const result = await service.getReminders({ status: REMINDER_STATUS.ACTIVE });

      expect(result.items).toHaveLength(3);
      expect(result.items.every((r) => r.status === REMINDER_STATUS.ACTIVE)).toBe(true);
    });

    it('should filter by type', async () => {
      const result = await service.getReminders({ type: REMINDER_TYPE.ACTION_ITEM_DUE });

      expect(result.items).toHaveLength(2);
      expect(result.items.every((r) => r.type === REMINDER_TYPE.ACTION_ITEM_DUE)).toBe(true);
    });

    it('should filter by recipient ID', async () => {
      const result = await service.getReminders({ recipientId: 'user_123' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.recipient.id).toBe('user_123');
    });

    it('should paginate results', async () => {
      const result = await service.getReminders({}, { page: 1, pageSize: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('updateReminder', () => {
    it('should update reminder title and message', async () => {
      const created = await service.createReminder(createMockActionItemReminderInput());

      // Small delay to ensure updatedAt timestamp differs
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await service.updateReminder(created.id, {
        title: 'Updated Title',
        message: 'Updated message',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.message).toBe('Updated message');
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(created.updatedAt).getTime()
      );
    });

    it('should update reminder schedule', async () => {
      const created = await service.createReminder(createMockActionItemReminderInput());
      const newScheduledAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

      const updated = await service.updateReminder(created.id, {
        schedule: {
          timing: REMINDER_TIMING.SPECIFIC_TIME,
          scheduledAt: newScheduledAt,
          recurrence: REMINDER_RECURRENCE.NONE,
          timezone: 'Asia/Tokyo',
        },
      });

      expect(updated.schedule.timing).toBe(REMINDER_TIMING.SPECIFIC_TIME);
      expect(updated.schedule.scheduledAt).toBe(newScheduledAt);
    });

    it('should throw error for non-existent reminder', async () => {
      await expect(
        service.updateReminder('non_existent', { title: 'New Title' })
      ).rejects.toThrow(ReminderNotFoundError);
    });

    it('should throw error when updating non-active reminder', async () => {
      const created = await service.createReminder(createMockActionItemReminderInput());
      await service.cancelReminder(created.id);

      await expect(
        service.updateReminder(created.id, { title: 'New Title' })
      ).rejects.toThrow(InvalidReminderStateError);
    });
  });

  describe('cancelReminder', () => {
    it('should cancel an active reminder', async () => {
      const created = await service.createReminder(createMockActionItemReminderInput());

      const cancelled = await service.cancelReminder(created.id);

      expect(cancelled.status).toBe(REMINDER_STATUS.CANCELLED);
    });

    it('should throw error for non-existent reminder', async () => {
      await expect(service.cancelReminder('non_existent')).rejects.toThrow(
        ReminderNotFoundError
      );
    });

    it('should throw error when cancelling non-active reminder', async () => {
      const created = await service.createReminder(createMockActionItemReminderInput());
      await service.cancelReminder(created.id);

      await expect(service.cancelReminder(created.id)).rejects.toThrow(
        InvalidReminderStateError
      );
    });
  });

  describe('deleteReminder', () => {
    it('should delete a reminder', async () => {
      const created = await service.createReminder(createMockActionItemReminderInput());

      await service.deleteReminder(created.id);

      const found = await service.getReminder(created.id);
      expect(found).toBeNull();
    });

    it('should throw error for non-existent reminder', async () => {
      await expect(service.deleteReminder('non_existent')).rejects.toThrow(
        ReminderNotFoundError
      );
    });
  });

  describe('getDueReminders', () => {
    it('should return only due reminders', async () => {
      // Create a reminder that is due (scheduled in the past)
      const pastInput = createMockActionItemReminderInput({
        schedule: {
          timing: REMINDER_TIMING.SPECIFIC_TIME,
          scheduledAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
          recurrence: REMINDER_RECURRENCE.NONE,
          timezone: 'Asia/Tokyo',
        },
      });
      await service.createReminder(pastInput);

      // Create a reminder that is not due yet
      const futureInput = createMockActionItemReminderInput({
        schedule: {
          timing: REMINDER_TIMING.SPECIFIC_TIME,
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
          recurrence: REMINDER_RECURRENCE.NONE,
          timezone: 'Asia/Tokyo',
        },
      });
      await service.createReminder(futureInput);

      const dueReminders = await service.getDueReminders();

      expect(dueReminders).toHaveLength(1);
      const scheduledAt = dueReminders[0]?.schedule.scheduledAt;
      expect(scheduledAt).toBeDefined();
      if (scheduledAt !== undefined) {
        expect(new Date(scheduledAt).getTime()).toBeLessThan(Date.now());
      }
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      // Create reminders with different statuses and types
      await service.createReminder(createMockActionItemReminderInput());
      await service.createReminder(createMockMinutesReminderInput());

      const toCancel = await service.createReminder(
        createMockActionItemReminderInput({ title: 'To Cancel' })
      );
      await service.cancelReminder(toCancel.id);
    });

    it('should return correct statistics', async () => {
      const stats = await service.getStats();

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.cancelled).toBe(1);
      expect(stats.sent).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.byType[REMINDER_TYPE.ACTION_ITEM_DUE]).toBe(2);
      expect(stats.byType[REMINDER_TYPE.MINUTES_REVIEW]).toBe(1);
    });
  });

  describe('getRemindersForActionItem', () => {
    it('should return reminders for a specific action item', async () => {
      await service.createReminder(
        createMockActionItemReminderInput({
          actionItemRef: {
            actionItemId: 'ai_specific',
            content: 'Specific task',
            meetingId: 'meet_123',
          },
        })
      );
      await service.createReminder(
        createMockActionItemReminderInput({
          actionItemRef: {
            actionItemId: 'ai_other',
            content: 'Other task',
            meetingId: 'meet_456',
          },
        })
      );

      const reminders = await service.getRemindersForActionItem('ai_specific');

      expect(reminders).toHaveLength(1);
      expect(reminders[0]?.actionItemRef?.actionItemId).toBe('ai_specific');
    });
  });

  describe('getRemindersForMinutes', () => {
    it('should return reminders for specific minutes', async () => {
      await service.createReminder(
        createMockMinutesReminderInput({
          minutesRef: {
            minutesId: 'min_specific',
            meetingId: 'meet_123',
            meetingTitle: 'Specific Meeting',
            meetingDate: '2024-01-15',
          },
        })
      );
      await service.createReminder(
        createMockMinutesReminderInput({
          minutesRef: {
            minutesId: 'min_other',
            meetingId: 'meet_456',
            meetingTitle: 'Other Meeting',
            meetingDate: '2024-01-16',
          },
        })
      );

      const reminders = await service.getRemindersForMinutes('min_specific');

      expect(reminders).toHaveLength(1);
      expect(reminders[0]?.minutesRef?.minutesId).toBe('min_specific');
    });
  });

  describe('clearAll', () => {
    it('should remove all reminders', async () => {
      await service.createReminder(createMockActionItemReminderInput());
      await service.createReminder(createMockMinutesReminderInput());

      await service.clearAll();

      const result = await service.getReminders();
      expect(result.items).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });
  });
});
