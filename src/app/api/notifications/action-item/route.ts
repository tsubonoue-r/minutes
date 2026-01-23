/**
 * Action Item Notification API endpoint - Send action item notifications
 * @module app/api/notifications/action-item/route
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import {
  createNotificationService,
  type NotificationRecipient,
} from '@/services/notification.service';
import { ActionItemSchema } from '@/types/minutes';

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
 * Meeting info schema
 */
const meetingInfoSchema = z.object({
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * Single action item notification request
 */
const singleActionItemRequestSchema = z.object({
  type: z.literal('single'),
  actionItem: ActionItemSchema,
  meeting: meetingInfoSchema,
  minutesUrl: z.string().url().optional(),
  recipient: recipientSchema,
  language: z.enum(['ja', 'en']).optional(),
});

/**
 * Batch action item notification request
 */
const batchActionItemRequestSchema = z.object({
  type: z.literal('batch'),
  items: z
    .array(
      z.object({
        actionItem: ActionItemSchema,
        recipient: recipientSchema,
      })
    )
    .min(1),
  meeting: meetingInfoSchema,
  minutesUrl: z.string().url().optional(),
  language: z.enum(['ja', 'en']).optional(),
});

/**
 * Combined request schema
 */
const actionItemNotificationRequestSchema = z.discriminatedUnion('type', [
  singleActionItemRequestSchema,
  batchActionItemRequestSchema,
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
  return {
    id: recipient.id,
    idType: recipient.idType,
    name: recipient.name,
  };
}

// =============================================================================
// POST Handler
// =============================================================================

/**
 * POST /api/notifications/action-item
 *
 * Send action item assignment notifications.
 * Supports two types:
 * - 'single': Notify a single assignee
 * - 'batch': Notify multiple assignees
 *
 * Request Body for 'single':
 * - type: 'single'
 * - actionItem: ActionItem object
 * - meeting: { title, date }
 * - minutesUrl?: URL to the minutes document
 * - recipient: { id, idType, name? }
 * - language?: 'ja' | 'en'
 *
 * Request Body for 'batch':
 * - type: 'batch'
 * - items: Array of { actionItem, recipient }
 * - meeting: { title, date }
 * - minutesUrl?: URL to the minutes document
 * - language?: 'ja' | 'en'
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

    const parseResult = actionItemNotificationRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        parseResult.error.issues
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', '),
        400
      );
    }

    const requestData = parseResult.data;

    // 3. Create service and send notifications
    const service = createNotificationService();

    if (requestData.type === 'single') {
      const recipient = toNotificationRecipient(requestData.recipient);

      const result = await service.sendActionItemNotification(
        session.accessToken,
        {
          actionItem: requestData.actionItem,
          meeting: requestData.meeting,
          minutesUrl: requestData.minutesUrl,
          recipient,
          language: requestData.language,
        }
      );

      const resultItem: {
        recipientId: string;
        success: boolean;
        messageId?: string;
        error?: string;
      } = {
        recipientId: result.recipientId,
        success: result.success,
      };
      if (result.messageId !== undefined) {
        resultItem.messageId = result.messageId;
      }
      if (result.error !== undefined) {
        resultItem.error = result.error;
      }

      const response: SuccessResponse = {
        success: true,
        data: {
          total: 1,
          succeeded: result.success ? 1 : 0,
          failed: result.success ? 0 : 1,
          results: [resultItem],
        },
      };

      return NextResponse.json(response);
    } else {
      // Batch notification
      const items = requestData.items.map((item) => ({
        actionItem: item.actionItem,
        recipient: toNotificationRecipient(item.recipient),
      }));

      const result = await service.sendBatchActionItemNotifications(
        session.accessToken,
        {
          items,
          meeting: requestData.meeting,
          minutesUrl: requestData.minutesUrl,
          language: requestData.language,
        }
      );

      const response: SuccessResponse = {
        success: true,
        data: {
          total: result.total,
          succeeded: result.succeeded,
          failed: result.failed,
          results: result.results.map((r) => {
            const item: {
              recipientId: string;
              success: boolean;
              messageId?: string;
              error?: string;
            } = {
              recipientId: r.recipientId,
              success: r.success,
            };
            if (r.messageId !== undefined) {
              item.messageId = r.messageId;
            }
            if (r.error !== undefined) {
              item.error = r.error;
            }
            return item;
          }),
        },
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('[POST /api/notifications/action-item] Error:', error);

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
}
