/**
 * Notifications API Route - Send notifications via Lark
 * @module app/api/notifications/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createNotificationService,
  createRecipientFromOpenId,
  createRecipientFromChatId,
  type NotificationRecipient as ServiceRecipient,
} from '@/services/notification.service';
import {
  validateBatchNotificationRequest,
  NOTIFICATION_TYPE,
  RECIPIENT_TYPE,
  type BatchNotificationRequest,
} from '@/types/notification';

// =============================================================================
// Request/Response Schemas
// =============================================================================

/**
 * Schema for POST request body
 */
const SendNotificationRequestSchema = z.object({
  /** Recipient information */
  recipient: z.object({
    id: z.string().min(1),
    type: z.enum(['user', 'group']),
    name: z.string().optional(),
  }),
  /** Notification type */
  type: z.enum([
    NOTIFICATION_TYPE.MINUTES_COMPLETED,
    NOTIFICATION_TYPE.MINUTES_DRAFT,
    NOTIFICATION_TYPE.ACTION_ITEM_ASSIGNED,
  ]),
  /** Minutes data for the notification */
  minutesData: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    duration: z.number().int().nonnegative(),
    attendeeCount: z.number().int().nonnegative(),
    actionItemCount: z.number().int().nonnegative(),
  }),
  /** Document URL */
  documentUrl: z.string().url(),
  /** Notification language */
  language: z.enum(['ja', 'en']).default('ja'),
});

type SendNotificationRequest = z.infer<typeof SendNotificationRequestSchema>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert notification recipient to service recipient
 */
function toServiceRecipient(
  recipient: { id: string; type: string; name?: string | undefined }
): ServiceRecipient {
  if (recipient.type === 'group') {
    return createRecipientFromChatId(recipient.id, recipient.name);
  }
  return createRecipientFromOpenId(recipient.id, recipient.name);
}

/**
 * Get access token from request headers
 */
function getAccessToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader === null || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * POST /api/notifications
 *
 * Send a notification to a user or group.
 *
 * @example
 * ```
 * POST /api/notifications
 * Authorization: Bearer <access_token>
 * Content-Type: application/json
 *
 * {
 *   "recipient": {
 *     "id": "ou_xxxxx",
 *     "type": "user",
 *     "name": "Tanaka"
 *   },
 *   "type": "minutes_completed",
 *   "minutesData": {
 *     "id": "min_123",
 *     "title": "Weekly Sync",
 *     "date": "2024-01-15",
 *     "duration": 3600000,
 *     "attendeeCount": 5,
 *     "actionItemCount": 3
 *   },
 *   "documentUrl": "https://docs.larksuite.com/...",
 *   "language": "ja"
 * }
 * ```
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Validate access token
  const accessToken = getAccessToken(request);
  if (accessToken === null) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing or invalid Authorization header',
        code: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON body',
        code: 'INVALID_REQUEST',
      },
      { status: 400 }
    );
  }

  // Validate request body
  const parseResult = SendNotificationRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.errors,
      },
      { status: 400 }
    );
  }

  const { recipient, type, minutesData, documentUrl, language } = parseResult.data;

  // Create notification service
  const service = createNotificationService();
  const serviceRecipient = toServiceRecipient(recipient);

  try {
    // Send notification based on type
    if (type === NOTIFICATION_TYPE.MINUTES_COMPLETED) {
      // Build placeholder action items
      const actionItems: Array<{
        id: string;
        content: string;
        priority: 'high' | 'medium' | 'low';
        status: 'pending' | 'in_progress' | 'completed';
      }> = [];

      for (let i = 0; i < minutesData.actionItemCount; i++) {
        actionItems.push({
          id: `action_${i}`,
          content: `Action item ${i + 1}`,
          priority: 'medium',
          status: 'pending',
        });
      }

      // Create a minimal minutes object for the notification
      const minimalMinutes = {
        id: minutesData.id,
        meetingId: `meeting_${minutesData.id}`,
        title: minutesData.title,
        date: minutesData.date,
        duration: minutesData.duration,
        summary: '',
        topics: [] as never[],
        decisions: [] as never[],
        actionItems,
        attendees: Array.from({ length: minutesData.attendeeCount }, (_, i) => ({
          id: `attendee_${i}`,
          name: `Attendee ${i + 1}`,
        })),
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'unknown',
          processingTimeMs: 0,
          confidence: 0,
        },
      };

      const result = await service.sendMinutesNotification(accessToken, {
        minutes: minimalMinutes,
        documentUrl,
        recipients: [serviceRecipient],
        language,
      });

      const firstResult = result.results[0];
      if (firstResult === undefined) {
        return NextResponse.json(
          {
            success: false,
            error: 'No result returned',
            code: 'SEND_FAILED',
          },
          { status: 500 }
        );
      }

      if (firstResult.success) {
        return NextResponse.json({
          success: true,
          messageId: firstResult.messageId,
          recipientId: firstResult.recipientId,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: firstResult.error ?? 'Failed to send notification',
          code: 'SEND_FAILED',
          recipientId: firstResult.recipientId,
        },
        { status: 500 }
      );
    }

    // For other types, return not implemented
    return NextResponse.json(
      {
        success: false,
        error: `Notification type '${type}' is not yet implemented`,
        code: 'NOT_IMPLEMENTED',
      },
      { status: 501 }
    );
  } catch (error) {
    const err = error as Error;
    console.error('Notification error:', err);

    return NextResponse.json(
      {
        success: false,
        error: err.message,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications
 *
 * Get notification status (placeholder for future implementation).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const messageId = searchParams.get('messageId');

  if (messageId === null) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing messageId parameter',
        code: 'INVALID_REQUEST',
      },
      { status: 400 }
    );
  }

  // Placeholder - in a real implementation, this would query notification status
  return NextResponse.json({
    success: true,
    messageId,
    status: 'sent',
    message: 'Notification status lookup is not yet implemented',
  });
}
