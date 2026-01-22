/**
 * Minutes Notification API endpoint - Send minutes-related notifications
 * @module app/api/notifications/minutes/route
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import {
  createNotificationService,
  type NotificationRecipient,
} from '@/services/notification.service';
import { MinutesSchema } from '@/types/minutes';

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
 * Minutes completion notification request
 */
const minutesCompletedRequestSchema = z.object({
  type: z.literal('completed'),
  minutes: MinutesSchema,
  documentUrl: z.string().url(),
  recipients: z.array(recipientSchema).min(1),
  language: z.enum(['ja', 'en']).optional(),
});

/**
 * Draft review notification request
 */
const draftReviewRequestSchema = z.object({
  type: z.literal('draft'),
  minutes: MinutesSchema,
  previewUrl: z.string().url(),
  approveUrl: z.string().url(),
  recipient: recipientSchema,
  language: z.enum(['ja', 'en']).optional(),
});

/**
 * Combined request schema
 */
const minutesNotificationRequestSchema = z.discriminatedUnion('type', [
  minutesCompletedRequestSchema,
  draftReviewRequestSchema,
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
 * POST /api/notifications/minutes
 *
 * Send minutes-related notifications.
 * Supports two types:
 * - 'completed': Notify participants that minutes are ready
 * - 'draft': Request organizer to review draft minutes
 *
 * Request Body for 'completed':
 * - type: 'completed'
 * - minutes: Minutes object
 * - documentUrl: URL to the final document
 * - recipients: Array of { id, idType, name? }
 * - language?: 'ja' | 'en'
 *
 * Request Body for 'draft':
 * - type: 'draft'
 * - minutes: Minutes object
 * - previewUrl: URL to preview the draft
 * - approveUrl: URL to approve the draft
 * - recipient: { id, idType, name? }
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

    const parseResult = minutesNotificationRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        400
      );
    }

    const requestData = parseResult.data;

    // 3. Create service and send notifications
    const service = createNotificationService();

    if (requestData.type === 'completed') {
      const recipients = requestData.recipients.map(toNotificationRecipient);

      const result = await service.sendMinutesNotification(
        session.accessToken,
        {
          minutes: requestData.minutes,
          documentUrl: requestData.documentUrl,
          recipients,
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
    } else {
      // Draft review notification
      const recipient = toNotificationRecipient(requestData.recipient);

      const result = await service.sendDraftMinutesNotification(
        session.accessToken,
        {
          minutes: requestData.minutes,
          previewUrl: requestData.previewUrl,
          approveUrl: requestData.approveUrl,
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
    }
  } catch (error) {
    console.error('[POST /api/notifications/minutes] Error:', error);

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
}
