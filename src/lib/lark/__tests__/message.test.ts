/**
 * Lark Message API unit tests
 * @module lib/lark/__tests__/message.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MessageClient, MessageApiError } from '../message';
import { LarkClient } from '../client';
import type { LarkConfig } from '@/types/lark';

describe('MessageClient', () => {
  const config: LarkConfig = {
    appId: 'test_app_id',
    appSecret: 'test_secret',
    baseUrl: 'https://open.larksuite.com',
    redirectUri: 'http://localhost:3000/api/auth/callback',
  };

  let larkClient: LarkClient;
  let messageClient: MessageClient;

  beforeEach(() => {
    larkClient = new LarkClient(config);
    messageClient = new MessageClient(larkClient);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendMessage', () => {
    it('should send text message successfully', async () => {
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
            msg_type: 'text',
            sender: {
              id: 'ou_789',
              id_type: 'open_id',
              sender_type: 'user',
            },
            body: {
              content: '{"text":"Hello!"}',
            },
          },
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await messageClient.sendMessage('access_token', {
        receiveId: 'ou_recipient',
        receiveIdType: 'open_id',
        msgType: 'text',
        content: { text: 'Hello!' },
      });

      expect(result.messageId).toBe('msg_123');
      expect(result.chatId).toBe('oc_456');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/open-apis/im/v1/messages?receive_id_type=open_id'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer access_token',
          }),
        })
      );
    });

    it('should send interactive card message', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            message_id: 'msg_card_123',
            chat_id: 'oc_456',
            create_time: '1704067200000',
            update_time: '1704067200000',
            deleted: false,
            updated: false,
            msg_type: 'interactive',
            sender: {
              id: 'ou_789',
              id_type: 'open_id',
              sender_type: 'user',
            },
            body: {
              content: '{}',
            },
          },
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await messageClient.sendMessage('access_token', {
        receiveId: 'oc_chat',
        receiveIdType: 'chat_id',
        msgType: 'interactive',
        content: {
          card: {
            header: {
              title: { tag: 'plain_text', content: 'Test Card' },
              template: 'blue',
            },
            elements: [
              {
                tag: 'div',
                text: { tag: 'lark_md', content: '**Hello World**' },
              },
            ],
          },
        },
      });

      expect(result.messageId).toBe('msg_card_123');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('receive_id_type=chat_id'),
        expect.any(Object)
      );
    });

    it('should throw MessageApiError on failure', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 230001,
          msg: 'Invalid receive_id',
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(
        messageClient.sendMessage('access_token', {
          receiveId: 'invalid',
          receiveIdType: 'open_id',
          msgType: 'text',
          content: { text: 'Hello!' },
        })
      ).rejects.toThrow();
    });

    it('should throw when no data returned', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          // No data field
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(
        messageClient.sendMessage('access_token', {
          receiveId: 'ou_recipient',
          receiveIdType: 'open_id',
          msgType: 'text',
          content: { text: 'Hello!' },
        })
      ).rejects.toThrow(MessageApiError);
    });
  });

  describe('sendTextMessage', () => {
    it('should send text message with helper method', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            message_id: 'msg_text_123',
            chat_id: 'oc_456',
            create_time: '1704067200000',
            update_time: '1704067200000',
            deleted: false,
            updated: false,
            msg_type: 'text',
            sender: {
              id: 'ou_789',
              id_type: 'open_id',
              sender_type: 'user',
            },
            body: {
              content: '{"text":"Test message"}',
            },
          },
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await messageClient.sendTextMessage(
        'access_token',
        'ou_recipient',
        'open_id',
        'Test message'
      );

      expect(result.messageId).toBe('msg_text_123');
    });
  });

  describe('sendCardMessage', () => {
    it('should send card message with helper method', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            message_id: 'msg_card_456',
            chat_id: 'oc_789',
            create_time: '1704067200000',
            update_time: '1704067200000',
            deleted: false,
            updated: false,
            msg_type: 'interactive',
            sender: {
              id: 'ou_sender',
              id_type: 'open_id',
              sender_type: 'user',
            },
            body: {
              content: '{}',
            },
          },
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const card = {
        header: {
          title: { tag: 'plain_text' as const, content: 'Notification' },
          template: 'green' as const,
        },
        elements: [
          {
            tag: 'div' as const,
            text: { tag: 'lark_md' as const, content: 'Card content' },
          },
          {
            tag: 'action' as const,
            actions: [
              {
                tag: 'button' as const,
                text: { tag: 'plain_text' as const, content: 'Click Me' },
                url: 'https://example.com',
                type: 'primary' as const,
              },
            ],
          },
        ],
      };

      const result = await messageClient.sendCardMessage(
        'access_token',
        'oc_chat',
        'chat_id',
        card
      );

      expect(result.messageId).toBe('msg_card_456');
      expect(result.chatId).toBe('oc_789');
    });
  });
});

describe('MessageApiError', () => {
  it('should contain error details', () => {
    const error = new MessageApiError(
      'Failed to send message',
      230001,
      '/open-apis/im/v1/messages',
      { extra: 'info' }
    );

    expect(error.message).toBe('Failed to send message');
    expect(error.code).toBe(230001);
    expect(error.endpoint).toBe('/open-apis/im/v1/messages');
    expect(error.details).toEqual({ extra: 'info' });
    expect(error.name).toBe('MessageApiError');
  });
});
