/**
 * Notification Service unit tests
 * @module services/__tests__/notification.service.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NotificationService,
  NotificationError,
  createRecipientFromOpenId,
  createRecipientFromChatId,
  createRecipientFromEmail,
  speakerToRecipient,
  type NotificationRecipient,
} from '../notification.service';
import { MessageClient } from '@/lib/lark/message';
import { LarkClient } from '@/lib/lark/client';
import type { Minutes, ActionItem, Speaker } from '@/types/minutes';

// Mock data
const createMockMinutes = (): Minutes => ({
  id: 'min_123',
  meetingId: 'meeting_456',
  title: 'Weekly Sync',
  date: '2024-01-15',
  duration: 3600000,
  summary: 'Discussed project progress.',
  topics: [],
  decisions: [],
  actionItems: [
    {
      id: 'action_1',
      content: 'Review proposal',
      assignee: {
        id: 'speaker_1',
        name: 'Tanaka',
        larkUserId: 'ou_tanaka',
      },
      priority: 'high',
      status: 'pending',
      dueDate: '2024-01-20',
    },
    {
      id: 'action_2',
      content: 'Update documentation',
      assignee: {
        id: 'speaker_2',
        name: 'Suzuki',
        larkUserId: 'ou_suzuki',
      },
      priority: 'medium',
      status: 'pending',
    },
  ],
  attendees: [
    { id: 'speaker_1', name: 'Tanaka', larkUserId: 'ou_tanaka' },
    { id: 'speaker_2', name: 'Suzuki', larkUserId: 'ou_suzuki' },
    { id: 'speaker_3', name: 'Yamada', larkUserId: 'ou_yamada' },
  ],
  metadata: {
    generatedAt: '2024-01-15T10:00:00.000Z',
    model: 'claude-sonnet-4-20250514',
    processingTimeMs: 5000,
    confidence: 0.95,
  },
});

describe('NotificationService', () => {
  let messageClient: MessageClient;
  let service: NotificationService;

  beforeEach(() => {
    const larkClient = new LarkClient({
      appId: 'test_app',
      appSecret: 'test_secret',
      baseUrl: 'https://open.larksuite.com',
      redirectUri: 'http://localhost:3000/callback',
    });
    messageClient = new MessageClient(larkClient);
    service = new NotificationService(messageClient);

    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendMinutesNotification', () => {
    it('should send notifications to all recipients', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            message_id: 'msg_123',
            chat_id: 'oc_456',
            create_time: '1704067200000',
            update_time: '1704067200000',
            deleted: false,
            updated: false,
            msg_type: 'interactive',
            sender: { id: 'ou_sender', id_type: 'open_id', sender_type: 'user' },
            body: { content: '{}' },
          },
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const minutes = createMockMinutes();
      const recipients: NotificationRecipient[] = [
        createRecipientFromOpenId('ou_tanaka', 'Tanaka'),
        createRecipientFromOpenId('ou_suzuki', 'Suzuki'),
      ];

      const result = await service.sendMinutesNotification('access_token', {
        minutes,
        documentUrl: 'https://docs.larksuite.com/doc123',
        recipients,
        language: 'ja',
      });

      expect(result.total).toBe(2);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results.length).toBe(2);
      expect(result.results.every((r) => r.success)).toBe(true);
    });

    it('should handle partial failures', async () => {
      let callCount = 0;
      vi.mocked(fetch).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: true,
            json: async () => ({
              code: 0,
              msg: 'success',
              data: {
                message_id: 'msg_123',
                chat_id: 'oc_456',
                create_time: '1704067200000',
                update_time: '1704067200000',
                deleted: false,
                updated: false,
                msg_type: 'interactive',
                sender: { id: 'ou_sender', id_type: 'open_id', sender_type: 'user' },
                body: { content: '{}' },
              },
            }),
          } as Response;
        }
        throw new Error('Network error');
      });

      const minutes = createMockMinutes();
      const recipients: NotificationRecipient[] = [
        createRecipientFromOpenId('ou_tanaka', 'Tanaka'),
        createRecipientFromOpenId('ou_invalid'),
      ];

      const result = await service.sendMinutesNotification('access_token', {
        minutes,
        documentUrl: 'https://docs.larksuite.com/doc123',
        recipients,
      });

      expect(result.total).toBe(2);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('sendDraftMinutesNotification', () => {
    it('should send draft review notification', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            message_id: 'msg_draft_123',
            chat_id: 'oc_456',
            create_time: '1704067200000',
            update_time: '1704067200000',
            deleted: false,
            updated: false,
            msg_type: 'interactive',
            sender: { id: 'ou_sender', id_type: 'open_id', sender_type: 'user' },
            body: { content: '{}' },
          },
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const minutes = createMockMinutes();
      const recipient = createRecipientFromOpenId('ou_organizer', 'Organizer');

      const result = await service.sendDraftMinutesNotification('access_token', {
        minutes,
        previewUrl: 'https://app.example.com/preview/123',
        approveUrl: 'https://app.example.com/approve/123',
        recipient,
        language: 'ja',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_draft_123');
      expect(result.recipientId).toBe('ou_organizer');
    });
  });

  describe('sendActionItemNotification', () => {
    it('should send action item notification', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            message_id: 'msg_action_123',
            chat_id: 'oc_456',
            create_time: '1704067200000',
            update_time: '1704067200000',
            deleted: false,
            updated: false,
            msg_type: 'interactive',
            sender: { id: 'ou_sender', id_type: 'open_id', sender_type: 'user' },
            body: { content: '{}' },
          },
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const actionItem: ActionItem = {
        id: 'action_1',
        content: 'Complete report',
        assignee: {
          id: 'speaker_1',
          name: 'Tanaka',
          larkUserId: 'ou_tanaka',
        },
        priority: 'high',
        status: 'pending',
        dueDate: '2024-01-20',
      };
      const recipient = createRecipientFromOpenId('ou_tanaka', 'Tanaka');

      const result = await service.sendActionItemNotification('access_token', {
        actionItem,
        meeting: { title: 'Weekly Sync', date: '2024-01-15' },
        minutesUrl: 'https://docs.larksuite.com/doc123',
        recipient,
        language: 'ja',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_action_123');
    });

    it('should fail for action item without assignee', async () => {
      const actionItem: ActionItem = {
        id: 'action_1',
        content: 'Complete report',
        priority: 'high',
        status: 'pending',
      };
      const recipient = createRecipientFromOpenId('ou_tanaka', 'Tanaka');

      const result = await service.sendActionItemNotification('access_token', {
        actionItem,
        meeting: { title: 'Weekly Sync', date: '2024-01-15' },
        recipient,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Action item has no assignee');
    });
  });

  describe('sendBatchActionItemNotifications', () => {
    it('should send notifications to multiple assignees', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            message_id: 'msg_batch_123',
            chat_id: 'oc_456',
            create_time: '1704067200000',
            update_time: '1704067200000',
            deleted: false,
            updated: false,
            msg_type: 'interactive',
            sender: { id: 'ou_sender', id_type: 'open_id', sender_type: 'user' },
            body: { content: '{}' },
          },
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const items = [
        {
          actionItem: {
            id: 'action_1',
            content: 'Task 1',
            assignee: { id: 's1', name: 'Tanaka' },
            priority: 'high' as const,
            status: 'pending' as const,
          },
          recipient: createRecipientFromOpenId('ou_tanaka'),
        },
        {
          actionItem: {
            id: 'action_2',
            content: 'Task 2',
            assignee: { id: 's2', name: 'Suzuki' },
            priority: 'medium' as const,
            status: 'pending' as const,
          },
          recipient: createRecipientFromOpenId('ou_suzuki'),
        },
      ];

      const result = await service.sendBatchActionItemNotifications('access_token', {
        items,
        meeting: { title: 'Weekly Sync', date: '2024-01-15' },
      });

      expect(result.total).toBe(2);
      expect(result.succeeded).toBe(2);
    });
  });

  describe('sendAllActionItemNotifications', () => {
    it('should extract and send notifications for all action items with assignees', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            message_id: 'msg_all_123',
            chat_id: 'oc_456',
            create_time: '1704067200000',
            update_time: '1704067200000',
            deleted: false,
            updated: false,
            msg_type: 'interactive',
            sender: { id: 'ou_sender', id_type: 'open_id', sender_type: 'user' },
            body: { content: '{}' },
          },
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const minutes = createMockMinutes();

      const result = await service.sendAllActionItemNotifications(
        'access_token',
        minutes,
        'https://docs.larksuite.com/doc123',
        speakerToRecipient,
        'ja'
      );

      // Minutes has 2 action items with assignees
      expect(result.total).toBe(2);
      expect(result.succeeded).toBe(2);
    });

    it('should return empty result when no assignees have larkUserId', async () => {
      const minutes = createMockMinutes();
      minutes.actionItems = [
        {
          id: 'action_1',
          content: 'Task without larkUserId',
          assignee: { id: 's1', name: 'NoLarkUser' }, // No larkUserId
          priority: 'high',
          status: 'pending',
        },
      ];

      const result = await service.sendAllActionItemNotifications(
        'access_token',
        minutes,
        'https://docs.larksuite.com/doc123',
        speakerToRecipient,
        'ja'
      );

      expect(result.total).toBe(0);
      expect(result.succeeded).toBe(0);
    });
  });
});

describe('Helper Functions', () => {
  describe('createRecipientFromOpenId', () => {
    it('should create recipient with open_id type', () => {
      const recipient = createRecipientFromOpenId('ou_123', 'Test User');

      expect(recipient.id).toBe('ou_123');
      expect(recipient.idType).toBe('open_id');
      expect(recipient.name).toBe('Test User');
    });

    it('should work without name', () => {
      const recipient = createRecipientFromOpenId('ou_123');

      expect(recipient.id).toBe('ou_123');
      expect(recipient.name).toBeUndefined();
    });
  });

  describe('createRecipientFromChatId', () => {
    it('should create recipient with chat_id type', () => {
      const recipient = createRecipientFromChatId('oc_456', 'Group Chat');

      expect(recipient.id).toBe('oc_456');
      expect(recipient.idType).toBe('chat_id');
      expect(recipient.name).toBe('Group Chat');
    });
  });

  describe('createRecipientFromEmail', () => {
    it('should create recipient with email type', () => {
      const recipient = createRecipientFromEmail('test@example.com', 'Email User');

      expect(recipient.id).toBe('test@example.com');
      expect(recipient.idType).toBe('email');
      expect(recipient.name).toBe('Email User');
    });
  });

  describe('speakerToRecipient', () => {
    it('should convert speaker with larkUserId to recipient', () => {
      const speaker: Speaker = {
        id: 'speaker_1',
        name: 'Tanaka',
        larkUserId: 'ou_tanaka',
      };

      const recipient = speakerToRecipient(speaker);

      expect(recipient).not.toBeNull();
      expect(recipient?.id).toBe('ou_tanaka');
      expect(recipient?.idType).toBe('open_id');
      expect(recipient?.name).toBe('Tanaka');
    });

    it('should return null for speaker without larkUserId', () => {
      const speaker: Speaker = {
        id: 'speaker_1',
        name: 'Tanaka',
      };

      const recipient = speakerToRecipient(speaker);

      expect(recipient).toBeNull();
    });

    it('should return null for speaker with empty larkUserId', () => {
      const speaker: Speaker = {
        id: 'speaker_1',
        name: 'Tanaka',
        larkUserId: '',
      };

      const recipient = speakerToRecipient(speaker);

      expect(recipient).toBeNull();
    });
  });
});

describe('NotificationError', () => {
  it('should contain error details', () => {
    const error = new NotificationError(
      'Failed to send notification',
      'MESSAGE_API_ERROR',
      'ou_123',
      { extra: 'info' }
    );

    expect(error.message).toBe('Failed to send notification');
    expect(error.code).toBe('MESSAGE_API_ERROR');
    expect(error.recipientId).toBe('ou_123');
    expect(error.details).toEqual({ extra: 'info' });
    expect(error.name).toBe('NotificationError');
  });
});
