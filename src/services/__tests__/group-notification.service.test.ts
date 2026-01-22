/**
 * Group Notification Service unit tests
 * @module services/__tests__/group-notification.service.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GroupNotificationService,
  createGroupNotificationService,
  createGroupRecipient,
  speakerToNotificationRecipient,
  getRecipientsFromMinutes,
  createGroupNotificationCard,
} from '../group-notification.service';
import { MessageClient } from '@/lib/lark/message';
import { LarkClient } from '@/lib/lark/client';
import type { Minutes, Speaker } from '@/types/minutes';
import { NOTIFICATION_STATUS, RECIPIENT_TYPE } from '@/types/notification';

// =============================================================================
// Mock Data
// =============================================================================

const createMockMinutes = (): Minutes => ({
  id: 'min_123',
  meetingId: 'meeting_456',
  title: 'Weekly Engineering Sync',
  date: '2024-01-15',
  duration: 3600000,
  summary: 'Discussed Q1 roadmap and sprint planning.',
  topics: [
    {
      id: 'topic_1',
      title: 'Q1 Roadmap Review',
      startTime: 0,
      endTime: 1800000,
      summary: 'Reviewed roadmap milestones',
      keyPoints: ['Feature A launch in February', 'Feature B design phase'],
      speakers: [{ id: 'speaker_1', name: 'Tanaka' }],
    },
  ],
  decisions: [
    {
      id: 'decision_1',
      content: 'Prioritize Feature A for Q1',
      context: 'Based on customer feedback',
      decidedAt: 1500000,
    },
  ],
  actionItems: [
    {
      id: 'action_1',
      content: 'Prepare Feature A spec document',
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
      content: 'Review infrastructure requirements',
      assignee: {
        id: 'speaker_2',
        name: 'Suzuki',
        larkUserId: 'ou_suzuki',
      },
      priority: 'medium',
      status: 'pending',
    },
    {
      id: 'action_3',
      content: 'Update project timeline',
      assignee: {
        id: 'speaker_3',
        name: 'Yamada',
        larkUserId: 'ou_yamada',
      },
      priority: 'low',
      status: 'pending',
      dueDate: '2024-01-25',
    },
  ],
  attendees: [
    { id: 'speaker_1', name: 'Tanaka', larkUserId: 'ou_tanaka' },
    { id: 'speaker_2', name: 'Suzuki', larkUserId: 'ou_suzuki' },
    { id: 'speaker_3', name: 'Yamada', larkUserId: 'ou_yamada' },
    { id: 'speaker_4', name: 'Sato' }, // No larkUserId
  ],
  metadata: {
    generatedAt: '2024-01-15T10:00:00.000Z',
    model: 'claude-sonnet-4-20250514',
    processingTimeMs: 5000,
    confidence: 0.95,
  },
});

// =============================================================================
// GroupNotificationService Tests
// =============================================================================

describe('GroupNotificationService', () => {
  let messageClient: MessageClient;
  let service: GroupNotificationService;

  beforeEach(() => {
    const larkClient = new LarkClient({
      appId: 'test_app',
      appSecret: 'test_secret',
      baseUrl: 'https://open.larksuite.com',
      redirectUri: 'http://localhost:3000/callback',
    });
    messageClient = new MessageClient(larkClient);
    service = new GroupNotificationService(messageClient);

    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendGroupNotification', () => {
    it('should send notification to a group chat', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            message_id: 'msg_group_123',
            chat_id: 'oc_engineering',
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

      const result = await service.sendGroupNotification('access_token', {
        minutes,
        documentUrl: 'https://docs.larksuite.com/doc123',
        chatId: 'oc_engineering',
        groupName: 'Engineering Team',
        includeActionItems: true,
        language: 'ja',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_group_123');
      expect(result.recipientId).toBe('oc_engineering');
    });

    it('should handle send failure gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const minutes = createMockMinutes();

      const result = await service.sendGroupNotification('access_token', {
        minutes,
        documentUrl: 'https://docs.larksuite.com/doc123',
        chatId: 'oc_invalid',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.recipientId).toBe('oc_invalid');
    });

    it('should include custom message in notification', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            message_id: 'msg_custom_123',
            chat_id: 'oc_engineering',
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

      const result = await service.sendGroupNotification('access_token', {
        minutes,
        documentUrl: 'https://docs.larksuite.com/doc123',
        chatId: 'oc_engineering',
        customMessage: 'Important meeting summary - please review!',
        language: 'en',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('sendToMultipleGroups', () => {
    it('should send notifications to multiple groups', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            message_id: 'msg_batch_123',
            chat_id: 'oc_group',
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

      const result = await service.sendToMultipleGroups('access_token', {
        minutes,
        documentUrl: 'https://docs.larksuite.com/doc123',
        groups: [
          { chatId: 'oc_engineering', name: 'Engineering' },
          { chatId: 'oc_product', name: 'Product' },
          { chatId: 'oc_design', name: 'Design' },
        ],
      });

      expect(result.total).toBe(3);
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results.length).toBe(3);
    });

    it('should handle partial failures in batch', async () => {
      let callCount = 0;
      vi.mocked(fetch).mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Group not found');
        }
        return {
          ok: true,
          json: async () => ({
            code: 0,
            msg: 'success',
            data: {
              message_id: `msg_${callCount}`,
              chat_id: `oc_group_${callCount}`,
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
      });

      const minutes = createMockMinutes();

      const result = await service.sendToMultipleGroups('access_token', {
        minutes,
        documentUrl: 'https://docs.larksuite.com/doc123',
        groups: [
          { chatId: 'oc_group1' },
          { chatId: 'oc_invalid' },
          { chatId: 'oc_group3' },
        ],
      });

      expect(result.total).toBe(3);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('should stop on error when configured', async () => {
      let callCount = 0;
      vi.mocked(fetch).mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Critical error');
        }
        return {
          ok: true,
          json: async () => ({
            code: 0,
            msg: 'success',
            data: {
              message_id: `msg_${callCount}`,
              chat_id: `oc_group_${callCount}`,
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
      });

      const minutes = createMockMinutes();

      const result = await service.sendToMultipleGroups(
        'access_token',
        {
          minutes,
          documentUrl: 'https://docs.larksuite.com/doc123',
          groups: [
            { chatId: 'oc_group1' },
            { chatId: 'oc_invalid' },
            { chatId: 'oc_group3' },
          ],
        },
        { stopOnError: true }
      );

      // Should stop after second group fails
      expect(result.total).toBe(2);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('notifyParticipants', () => {
    it('should send to group chat when available', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            message_id: 'msg_group_123',
            chat_id: 'oc_meeting_group',
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

      const result = await service.notifyParticipants('access_token', {
        minutes,
        documentUrl: 'https://docs.larksuite.com/doc123',
        getMeetingGroupChatId: async () => 'oc_meeting_group',
      });

      // Should only send one notification to the group
      expect(result.total).toBe(1);
      expect(result.succeeded).toBe(1);
    });

    it('should fall back to individual notifications when no group', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            message_id: 'msg_individual_123',
            chat_id: 'oc_chat',
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

      const result = await service.notifyParticipants('access_token', {
        minutes,
        documentUrl: 'https://docs.larksuite.com/doc123',
        getMeetingGroupChatId: async () => null,
      });

      // Should send to 3 attendees with larkUserId (4 total, 1 without)
      expect(result.total).toBe(3);
      expect(result.succeeded).toBe(3);
    });
  });

  describe('notification history', () => {
    it('should track notification history', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            message_id: 'msg_history_123',
            chat_id: 'oc_engineering',
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

      await service.sendGroupNotification('access_token', {
        minutes,
        documentUrl: 'https://docs.larksuite.com/doc123',
        chatId: 'oc_engineering',
      });

      const history = service.getHistoryByReference(minutes.id);
      expect(history.length).toBe(1);
      expect(history[0]?.status).toBe(NOTIFICATION_STATUS.SENT);
      expect(history[0]?.messageId).toBe('msg_history_123');
    });

    it('should track failed notifications in history', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Send failed'));

      const minutes = createMockMinutes();

      await service.sendGroupNotification('access_token', {
        minutes,
        documentUrl: 'https://docs.larksuite.com/doc123',
        chatId: 'oc_engineering',
      });

      const history = service.getHistoryByStatus(NOTIFICATION_STATUS.FAILED);
      expect(history.length).toBe(1);
      expect(history[0]?.errorMessage).toBe('Send failed');
      expect(history[0]?.retryCount).toBe(1);
    });

    it('should clear history', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            message_id: 'msg_123',
            chat_id: 'oc_group',
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

      await service.sendGroupNotification('access_token', {
        minutes,
        documentUrl: 'https://docs.larksuite.com/doc123',
        chatId: 'oc_engineering',
      });

      expect(service.getAllHistory().length).toBe(1);

      service.clearHistory();

      expect(service.getAllHistory().length).toBe(0);
    });
  });
});

// =============================================================================
// Card Template Tests
// =============================================================================

describe('createGroupNotificationCard', () => {
  it('should create card with basic info', () => {
    const minutes = createMockMinutes();
    const card = createGroupNotificationCard(
      minutes,
      'https://docs.larksuite.com/doc123',
      'ja',
      undefined,
      false
    );

    expect(card.header?.title.content).toBe('議事録が作成されました');
    expect(card.elements.length).toBeGreaterThan(0);
  });

  it('should include action items when enabled', () => {
    const minutes = createMockMinutes();
    const card = createGroupNotificationCard(
      minutes,
      'https://docs.larksuite.com/doc123',
      'ja',
      undefined,
      true
    );

    // Should have more elements with action items included
    const cardWithoutItems = createGroupNotificationCard(
      minutes,
      'https://docs.larksuite.com/doc123',
      'ja',
      undefined,
      false
    );

    expect(card.elements.length).toBeGreaterThan(cardWithoutItems.elements.length);
  });

  it('should include custom message when provided', () => {
    const minutes = createMockMinutes();
    const card = createGroupNotificationCard(
      minutes,
      'https://docs.larksuite.com/doc123',
      'ja',
      'Custom announcement message!'
    );

    // First element after header should contain custom message
    const hasCustomMessage = card.elements.some((el) => {
      if (el.tag === 'div' && 'text' in el) {
        return el.text.content.includes('Custom announcement');
      }
      return false;
    });
    expect(hasCustomMessage).toBe(true);
  });

  it('should generate English card correctly', () => {
    const minutes = createMockMinutes();
    const card = createGroupNotificationCard(
      minutes,
      'https://docs.larksuite.com/doc123',
      'en'
    );

    expect(card.header?.title.content).toBe('Minutes Created');
  });

  it('should limit action items to 5 with note for more', () => {
    const minutes = createMockMinutes();
    // Add more action items
    for (let i = 4; i <= 10; i++) {
      minutes.actionItems.push({
        id: `action_${i}`,
        content: `Task ${i}`,
        priority: 'low',
        status: 'pending',
      });
    }

    const card = createGroupNotificationCard(
      minutes,
      'https://docs.larksuite.com/doc123',
      'ja',
      undefined,
      true
    );

    // Should have a note element for remaining items
    const hasNote = card.elements.some((el) => el.tag === 'note');
    expect(hasNote).toBe(true);
  });
});

// =============================================================================
// Helper Functions Tests
// =============================================================================

describe('Helper Functions', () => {
  describe('createGroupRecipient', () => {
    it('should create group recipient', () => {
      const recipient = createGroupRecipient('oc_engineering', 'Engineering Team');

      expect(recipient.id).toBe('oc_engineering');
      expect(recipient.type).toBe(RECIPIENT_TYPE.GROUP);
      expect(recipient.name).toBe('Engineering Team');
      expect(recipient.chatId).toBe('oc_engineering');
    });

    it('should work without name', () => {
      const recipient = createGroupRecipient('oc_engineering');

      expect(recipient.id).toBe('oc_engineering');
      expect(recipient.name).toBeUndefined();
    });
  });

  describe('speakerToNotificationRecipient', () => {
    it('should convert speaker with larkUserId', () => {
      const speaker: Speaker = {
        id: 'speaker_1',
        name: 'Tanaka',
        larkUserId: 'ou_tanaka',
      };

      const recipient = speakerToNotificationRecipient(speaker);

      expect(recipient).not.toBeNull();
      expect(recipient?.id).toBe('ou_tanaka');
      expect(recipient?.type).toBe(RECIPIENT_TYPE.USER);
      expect(recipient?.name).toBe('Tanaka');
      expect(recipient?.openId).toBe('ou_tanaka');
    });

    it('should return null for speaker without larkUserId', () => {
      const speaker: Speaker = {
        id: 'speaker_1',
        name: 'Tanaka',
      };

      const recipient = speakerToNotificationRecipient(speaker);

      expect(recipient).toBeNull();
    });

    it('should return null for speaker with empty larkUserId', () => {
      const speaker: Speaker = {
        id: 'speaker_1',
        name: 'Tanaka',
        larkUserId: '',
      };

      const recipient = speakerToNotificationRecipient(speaker);

      expect(recipient).toBeNull();
    });
  });

  describe('getRecipientsFromMinutes', () => {
    it('should extract recipients from minutes attendees', () => {
      const minutes = createMockMinutes();
      const recipients = getRecipientsFromMinutes(minutes);

      // Minutes has 4 attendees, but only 3 have larkUserId
      expect(recipients.length).toBe(3);
      expect(recipients.every((r) => r.type === RECIPIENT_TYPE.USER)).toBe(true);
    });

    it('should return empty array when no attendees have larkUserId', () => {
      const minutes = createMockMinutes();
      minutes.attendees = [
        { id: 's1', name: 'User 1' },
        { id: 's2', name: 'User 2' },
      ];

      const recipients = getRecipientsFromMinutes(minutes);

      expect(recipients.length).toBe(0);
    });
  });
});
