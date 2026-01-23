/**
 * Lark Message API Client
 * @module lib/lark/message
 */

import { z } from 'zod';
import type { LarkClient } from './client';
import type { LarkApiResponse } from './types';

// =============================================================================
// Zod Schemas for Card Messages
// =============================================================================

/**
 * Card header template colors
 */
export const cardTemplateColorSchema = z.enum([
  'blue',
  'wathet',
  'turquoise',
  'green',
  'yellow',
  'orange',
  'red',
  'carmine',
  'violet',
  'purple',
  'indigo',
  'grey',
]);

export type CardTemplateColor = z.infer<typeof cardTemplateColorSchema>;

/**
 * Text tag types
 */
export const textTagSchema = z.enum(['plain_text', 'lark_md']);

export type TextTag = z.infer<typeof textTagSchema>;

/**
 * Plain text element
 */
export const plainTextSchema = z.object({
  tag: z.literal('plain_text'),
  content: z.string(),
});

export type PlainText = z.infer<typeof plainTextSchema>;

/**
 * Lark Markdown text element
 */
export const larkMdTextSchema = z.object({
  tag: z.literal('lark_md'),
  content: z.string(),
});

export type LarkMdText = z.infer<typeof larkMdTextSchema>;

/**
 * Card text element (union)
 */
export const cardTextSchema = z.union([plainTextSchema, larkMdTextSchema]);

export type CardText = z.infer<typeof cardTextSchema>;

/**
 * Card header
 */
export const cardHeaderSchema = z.object({
  title: cardTextSchema,
  template: cardTemplateColorSchema.optional(),
});

export type CardHeader = z.infer<typeof cardHeaderSchema>;

/**
 * Div element for card content
 */
export const divElementSchema = z.object({
  tag: z.literal('div'),
  text: cardTextSchema,
});

export type DivElement = z.infer<typeof divElementSchema>;

/**
 * Horizontal rule element
 */
export const hrElementSchema = z.object({
  tag: z.literal('hr'),
});

export type HrElement = z.infer<typeof hrElementSchema>;

/**
 * Note element for additional information
 */
export const noteElementSchema = z.object({
  tag: z.literal('note'),
  elements: z.array(cardTextSchema),
});

export type NoteElement = z.infer<typeof noteElementSchema>;

/**
 * Button types
 */
export const buttonTypeSchema = z.enum(['default', 'primary', 'danger']);

export type ButtonType = z.infer<typeof buttonTypeSchema>;

/**
 * Button element
 */
export const buttonElementSchema = z.object({
  tag: z.literal('button'),
  text: plainTextSchema,
  url: z.string().url().optional(),
  type: buttonTypeSchema.optional(),
  value: z.record(z.string(), z.string()).optional(),
});

export type ButtonElement = z.infer<typeof buttonElementSchema>;

/**
 * Action element container
 */
export const actionElementSchema = z.object({
  tag: z.literal('action'),
  actions: z.array(buttonElementSchema),
});

export type ActionElement = z.infer<typeof actionElementSchema>;

/**
 * Markdown element (for block content)
 */
export const mdElementSchema = z.object({
  tag: z.literal('markdown'),
  content: z.string(),
});

export type MdElement = z.infer<typeof mdElementSchema>;

/**
 * Card element (union of all element types)
 */
export const cardElementSchema = z.union([
  divElementSchema,
  hrElementSchema,
  noteElementSchema,
  actionElementSchema,
  mdElementSchema,
]);

export type CardElement = z.infer<typeof cardElementSchema>;

/**
 * Interactive card structure
 */
export const interactiveCardSchema = z.object({
  header: cardHeaderSchema.optional(),
  elements: z.array(cardElementSchema),
});

export type InteractiveCard = z.infer<typeof interactiveCardSchema>;

/**
 * Message type enum
 */
export const messageTypeSchema = z.enum([
  'text',
  'post',
  'image',
  'interactive',
  'share_card',
  'share_user',
]);

export type MessageType = z.infer<typeof messageTypeSchema>;

/**
 * Receive ID type for message targeting
 */
export const receiveIdTypeSchema = z.enum([
  'open_id',
  'user_id',
  'union_id',
  'email',
  'chat_id',
]);

export type ReceiveIdType = z.infer<typeof receiveIdTypeSchema>;

/**
 * Text message content
 */
export const textMessageContentSchema = z.object({
  text: z.string(),
});

export type TextMessageContent = z.infer<typeof textMessageContentSchema>;

/**
 * Interactive message content
 */
export const interactiveMessageContentSchema = z.object({
  card: interactiveCardSchema,
});

export type InteractiveMessageContent = z.infer<typeof interactiveMessageContentSchema>;

/**
 * Send message request
 */
export const sendMessageRequestSchema = z.object({
  receive_id: z.string(),
  msg_type: messageTypeSchema,
  content: z.string(), // JSON string of content
  uuid: z.string().optional(),
});

export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;

/**
 * Message sender information
 */
export const messageSenderSchema = z.object({
  id: z.string(),
  id_type: z.string(),
  sender_type: z.string(),
  tenant_key: z.string().optional(),
});

export type MessageSender = z.infer<typeof messageSenderSchema>;

/**
 * Message body in response
 */
export const messageBodySchema = z.object({
  content: z.string(),
});

export type MessageBody = z.infer<typeof messageBodySchema>;

/**
 * Sent message response data
 */
export const sentMessageDataSchema = z.object({
  message_id: z.string(),
  root_id: z.string().optional(),
  parent_id: z.string().optional(),
  msg_type: messageTypeSchema,
  create_time: z.string(),
  update_time: z.string(),
  deleted: z.boolean(),
  updated: z.boolean(),
  chat_id: z.string(),
  sender: messageSenderSchema,
  body: messageBodySchema,
});

export type SentMessageData = z.infer<typeof sentMessageDataSchema>;

/**
 * Send message response
 */
export const sendMessageResponseSchema = z.object({
  code: z.number(),
  msg: z.string(),
  data: sentMessageDataSchema.optional(),
});

export type SendMessageResponse = z.infer<typeof sendMessageResponseSchema>;

// =============================================================================
// Lark Message API Endpoints
// =============================================================================

/**
 * Lark Message API endpoints
 */
export const LarkMessageApiEndpoints = {
  /** Send message to user or chat */
  SEND_MESSAGE: '/open-apis/im/v1/messages',
  /** Reply to message */
  REPLY_MESSAGE: '/open-apis/im/v1/messages/:message_id/reply',
  /** Update message */
  UPDATE_MESSAGE: '/open-apis/im/v1/messages/:message_id',
} as const;

export type LarkMessageApiEndpoint =
  (typeof LarkMessageApiEndpoints)[keyof typeof LarkMessageApiEndpoints];

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown when message sending fails
 */
export class MessageApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly endpoint: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'MessageApiError';
  }
}

// =============================================================================
// MessageClient Class
// =============================================================================

/**
 * Options for sending a message
 */
export interface SendMessageOptions {
  /** Receiver ID */
  readonly receiveId: string;
  /** Type of receiver ID */
  readonly receiveIdType: ReceiveIdType;
  /** Message type */
  readonly msgType: MessageType;
  /** Message content (will be JSON stringified) */
  readonly content: TextMessageContent | InteractiveMessageContent;
  /** Optional UUID for idempotency */
  readonly uuid?: string | undefined;
}

/**
 * Result of sending a message
 */
export interface SendMessageResult {
  /** Sent message ID */
  readonly messageId: string;
  /** Chat ID where message was sent */
  readonly chatId: string;
  /** Message creation time */
  readonly createTime: string;
}

/**
 * Lark Message API Client
 *
 * Provides methods to send messages via Lark Open API.
 *
 * @example
 * ```typescript
 * const client = new MessageClient(larkClient);
 *
 * // Send text message
 * const result = await client.sendMessage(accessToken, {
 *   receiveId: 'ou_xxxxx',
 *   receiveIdType: 'open_id',
 *   msgType: 'text',
 *   content: { text: 'Hello!' },
 * });
 *
 * // Send interactive card
 * const cardResult = await client.sendMessage(accessToken, {
 *   receiveId: 'oc_xxxxx',
 *   receiveIdType: 'chat_id',
 *   msgType: 'interactive',
 *   content: {
 *     card: {
 *       header: { title: { tag: 'plain_text', content: 'Title' } },
 *       elements: [{ tag: 'div', text: { tag: 'lark_md', content: '**Hello**' } }],
 *     },
 *   },
 * });
 * ```
 */
export class MessageClient {
  private readonly client: LarkClient;

  constructor(client: LarkClient) {
    this.client = client;
  }

  /**
   * Send a message to a user or chat
   *
   * @param accessToken - User or app access token
   * @param options - Message options
   * @returns Send message result
   * @throws {MessageApiError} When message sending fails
   */
  async sendMessage(
    accessToken: string,
    options: SendMessageOptions
  ): Promise<SendMessageResult> {
    const { receiveId, receiveIdType, msgType, content, uuid } = options;

    const endpoint = `${LarkMessageApiEndpoints.SEND_MESSAGE}?receive_id_type=${receiveIdType}`;

    const requestBody: SendMessageRequest = {
      receive_id: receiveId,
      msg_type: msgType,
      content: JSON.stringify(content),
    };

    if (uuid !== undefined) {
      requestBody.uuid = uuid;
    }

    try {
      const response = await this.client.authenticatedRequest<SentMessageData>(
        endpoint,
        accessToken,
        {
          method: 'POST',
          body: requestBody,
        }
      );

      if (response.data === undefined) {
        throw new MessageApiError(
          'No data returned from send message API',
          -1,
          endpoint
        );
      }

      return {
        messageId: response.data.message_id,
        chatId: response.data.chat_id,
        createTime: response.data.create_time,
      };
    } catch (error) {
      if (error instanceof MessageApiError) {
        throw error;
      }

      const err = error as { message?: string; code?: number };
      throw new MessageApiError(
        err.message ?? 'Failed to send message',
        err.code ?? -1,
        endpoint,
        error
      );
    }
  }

  /**
   * Send a text message
   *
   * @param accessToken - User or app access token
   * @param receiveId - Receiver ID
   * @param receiveIdType - Type of receiver ID
   * @param text - Text content
   * @returns Send message result
   */
  async sendTextMessage(
    accessToken: string,
    receiveId: string,
    receiveIdType: ReceiveIdType,
    text: string
  ): Promise<SendMessageResult> {
    return this.sendMessage(accessToken, {
      receiveId,
      receiveIdType,
      msgType: 'text',
      content: { text },
    });
  }

  /**
   * Send an interactive card message
   *
   * @param accessToken - User or app access token
   * @param receiveId - Receiver ID
   * @param receiveIdType - Type of receiver ID
   * @param card - Interactive card content
   * @returns Send message result
   */
  async sendCardMessage(
    accessToken: string,
    receiveId: string,
    receiveIdType: ReceiveIdType,
    card: InteractiveCard
  ): Promise<SendMessageResult> {
    return this.sendMessage(accessToken, {
      receiveId,
      receiveIdType,
      msgType: 'interactive',
      content: { card },
    });
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a MessageClient instance
 *
 * @param larkClient - LarkClient instance
 * @returns New MessageClient instance
 */
export function createMessageClient(larkClient: LarkClient): MessageClient {
  return new MessageClient(larkClient);
}
