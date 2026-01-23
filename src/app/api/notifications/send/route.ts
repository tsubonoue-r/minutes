/**
 * Send Notification API endpoint - Send generic notifications
 * @module app/api/notifications/send/route
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import {
  createRecipientFromOpenId,
  createRecipientFromChatId,
  createRecipientFromEmail,
  type NotificationRecipient,
} from '@/services/notification.service';

// =============================================================================
// Types
// =============================================================================

/**
 * Error response type
 */
interface ErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Success response type
 */
interface SuccessResponse {
  readonly success: true;
  readonly data: {
    readonly total: number;
    readonly succeeded: number;
    readonly failed: number;
    readonly results: ReadonlyArray<{
      readonly recipientId: string;
      readonly success: boolean;
      readonly messageId?: string;
      readonly error?: string;
    }>;
  };
}

// =============================================================================
// Request Schema
// =============================================================================

/**
 * Recipient schema
 */
const recipientSchema = z.object({
  id: z.string().min(1),
  idType: z.enum(['open_id', 'user_id', 'union_id', 'email', 'chat_id']),
  name: z.string().optional(),
});

/**
 * Text message request schema
 */
const textMessageRequestSchema = z.object({
  type: z.literal('text'),
  recipients: z.array(recipientSchema).min(1),
  content: z.string().min(1),
});

/**
 * Card message request schema
 */
const cardMessageRequestSchema = z.object({
  type: z.literal('card'),
  recipients: z.array(recipientSchema).min(1),
  card: z.object({
    header: z
      .object({
        title: z.string(),
        template: z
          .enum([
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
          ])
          .optional(),
      })
      .optional(),
    elements: z.array(z.record(z.string(), z.unknown())),
  }),
});

/**
 * Combined request schema
 */
const sendNotificationRequestSchema = z.discriminatedUnion('type', [
  textMessageRequestSchema,
  cardMessageRequestSchema,
]);

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create error response
 */
function createErrorResponse(
  code: string,
  message: string,
  statusCode: number
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Convert request recipient to NotificationRecipient
 */
function toNotificationRecipient(
  recipient: z.infer<typeof recipientSchema>
): NotificationRecipient {
  switch (recipient.idType) {
    case 'open_id':
    case 'user_id':
    case 'union_id':
      return createRecipientFromOpenId(recipient.id, recipient.name);
    case 'chat_id':
      return createRecipientFromChatId(recipient.id, recipient.name);
    case 'email':
      return createRecipientFromEmail(recipient.id, recipient.name);
    default:
      return createRecipientFromOpenId(recipient.id, recipient.name);
  }
}

// =============================================================================
// POST Handler
// =============================================================================

/**
 * POST /api/notifications/send
 *
 * Send notifications to specified recipients.
 * Supports both text and card (interactive) messages.
 *
 * Request Body:
 * - type: 'text' | 'card'
 * - recipients: Array of { id, idType, name? }
 * - content: string (for text type)
 * - card: { header?, elements } (for card type)
 *
 * Response:
 * - 200: Notifications sent (may include partial failures)
 * - 400: Invalid request body
 * - 401: Unauthorized
 * - 500: Internal error
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // 1. Authentication check
    const session = await getSession();

    if (session === null || !session.isAuthenticated) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'Authentication required',
        401
      );
    }

    if (session.accessToken === undefined) {
      return createErrorResponse('UNAUTHORIZED', 'Access token not found', 401);
    }

    // 2. Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        'INVALID_JSON',
        'Request body must be valid JSON',
        400
      );
    }

    const parseResult = sendNotificationRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        parseResult.error.issues.map((e) => e.message).join(', '),
        400
      );
    }

    const requestData = parseResult.data;

    // 3. Send notifications
    // Note: createNotificationService() is available for future use with MinutesNotification
    const recipients = requestData.recipients.map(toNotificationRecipient);

    const results: Array<{
      recipientId: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }> = [];

    for (const recipient of recipients) {
      try {
        if (requestData.type === 'text') {
          // For text messages, we would need to use the message client directly
          // For now, we'll return an error for text messages
          results.push({
            recipientId: recipient.id,
            success: false,
            error: 'Text messages not yet supported in this endpoint',
          });
        } else {
          // For card messages, use the message client
          const { MessageClient } = await import('@/lib/lark/message');
          const { createLarkClient } = await import('@/lib/lark/client');

          const larkClient = createLarkClient();
          const messageClient = new MessageClient(larkClient);

          const cardContent = {
            header: requestData.card.header
              ? {
                  title: {
                    tag: 'plain_text' as const,
                    content: requestData.card.header.title,
                  },
                  template: requestData.card.header.template,
                }
              : undefined,
            elements: requestData.card.elements as Array<{
              tag: string;
              [key: string]: unknown;
            }>,
          };

          const result = await messageClient.sendCardMessage(
            session.accessToken,
            recipient.id,
            recipient.idType,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cardContent as any
          );

          results.push({
            recipientId: recipient.id,
            success: true,
            messageId: result.messageId,
          });
        }
      } catch (error) {
        const err = error as Error;
        results.push({
          recipientId: recipient.id,
          success: false,
          error: err.message,
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    const response: SuccessResponse = {
      success: true,
      data: {
        total: results.length,
        succeeded,
        failed,
        results,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[POST /api/notifications/send] Error:', error);

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
}
