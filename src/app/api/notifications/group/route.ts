/**
 * Group Notifications API Route - Send notifications to Lark groups
 * @module app/api/notifications/group/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createGroupNotificationService,
  type GroupNotificationOptions,
  type BatchGroupNotificationOptions,
} from '@/services/group-notification.service';
import {
  validateGroupNotificationRequest,
  type GroupNotificationRequest,
} from '@/types/notification';

// =============================================================================
// Request Schemas
// =============================================================================

/**
 * Schema for single group notification request
 */
const SingleGroupNotificationSchema = z.object({
  /** Chat ID of the group */
  chatId: z.string().min(1),
  /** Group name (for logging) */
  groupName: z.string().optional(),
  /** Minutes data */
  minutes: z.object({
    id: z.string().min(1),
    meetingId: z.string().min(1),
    title: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    duration: z.number().int().nonnegative(),
    summary: z.string().default(''),
    topics: z.array(z.unknown()).default([]),
    decisions: z.array(z.unknown()).default([]),
    actionItems: z.array(
      z.object({
        id: z.string().min(1),
        content: z.string().min(1),
        assignee: z
          .object({
            id: z.string().min(1),
            name: z.string().min(1),
            larkUserId: z.string().optional(),
          })
          .optional(),
        dueDate: z.string().optional(),
        priority: z.enum(['high', 'medium', 'low']),
        status: z.enum(['pending', 'in_progress', 'completed']),
        relatedTopicId: z.string().optional(),
      })
    ).default([]),
    attendees: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        larkUserId: z.string().optional(),
      })
    ).default([]),
    metadata: z.object({
      generatedAt: z.string(),
      model: z.string(),
      processingTimeMs: z.number(),
      confidence: z.number(),
    }),
  }),
  /** Document URL */
  documentUrl: z.string().url(),
  /** Include action items in notification */
  includeActionItems: z.boolean().default(true),
  /** Custom message to prepend */
  customMessage: z.string().max(500).optional(),
  /** Notification language */
  language: z.enum(['ja', 'en']).default('ja'),
});

/**
 * Schema for batch group notification request
 */
const BatchGroupNotificationSchema = z.object({
  /** Minutes data */
  minutes: SingleGroupNotificationSchema.shape.minutes,
  /** Document URL */
  documentUrl: z.string().url(),
  /** Groups to notify */
  groups: z.array(
    z.object({
      chatId: z.string().min(1),
      name: z.string().optional(),
    })
  ).min(1),
  /** Include action items in notification */
  includeActionItems: z.boolean().default(true),
  /** Notification language */
  language: z.enum(['ja', 'en']).default('ja'),
});

type SingleGroupNotificationRequest = z.infer<typeof SingleGroupNotificationSchema>;
type BatchGroupNotificationRequest = z.infer<typeof BatchGroupNotificationSchema>;

// =============================================================================
// Helper Functions
// =============================================================================

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
 * POST /api/notifications/group
 *
 * Send a notification to a Lark group chat.
 *
 * Supports both single group and batch notifications.
 *
 * @example Single group notification
 * ```
 * POST /api/notifications/group
 * Authorization: Bearer <access_token>
 * Content-Type: application/json
 *
 * {
 *   "chatId": "oc_xxxxx",
 *   "groupName": "Engineering Team",
 *   "minutes": {
 *     "id": "min_123",
 *     "meetingId": "meeting_456",
 *     "title": "Weekly Sync",
 *     "date": "2024-01-15",
 *     "duration": 3600000,
 *     ...
 *   },
 *   "documentUrl": "https://docs.larksuite.com/...",
 *   "includeActionItems": true,
 *   "language": "ja"
 * }
 * ```
 *
 * @example Batch group notification
 * ```
 * POST /api/notifications/group?batch=true
 * Authorization: Bearer <access_token>
 * Content-Type: application/json
 *
 * {
 *   "minutes": { ... },
 *   "documentUrl": "https://docs.larksuite.com/...",
 *   "groups": [
 *     { "chatId": "oc_group1", "name": "Engineering" },
 *     { "chatId": "oc_group2", "name": "Product" }
 *   ],
 *   "includeActionItems": true,
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

  // Check if batch mode
  const isBatch = request.nextUrl.searchParams.get('batch') === 'true';

  // Create service
  const service = createGroupNotificationService();

  try {
    if (isBatch) {
      // Validate batch request
      const parseResult = BatchGroupNotificationSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid batch request body',
            code: 'VALIDATION_ERROR',
            details: parseResult.error.issues,
          },
          { status: 400 }
        );
      }

      const { minutes, documentUrl, groups, includeActionItems, language } = parseResult.data;

      // Send batch notifications
      const result = await service.sendToMultipleGroups(accessToken, {
        minutes: minutes as any,
        documentUrl,
        groups,
        includeActionItems,
        language,
      });

      return NextResponse.json({
        success: result.failed === 0,
        total: result.total,
        succeeded: result.succeeded,
        failed: result.failed,
        results: result.results,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
      });
    }

    // Single group notification
    const parseResult = SingleGroupNotificationSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { chatId, groupName, minutes, documentUrl, includeActionItems, customMessage, language } =
      parseResult.data;

    // Send single notification
    const result = await service.sendGroupNotification(accessToken, {
      minutes: minutes as any,
      documentUrl,
      chatId,
      groupName,
      includeActionItems,
      customMessage,
      language,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        recipientId: result.recipientId,
        timestamp: result.timestamp,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error ?? 'Failed to send group notification',
        code: 'SEND_FAILED',
        recipientId: result.recipientId,
      },
      { status: 500 }
    );
  } catch (error) {
    const err = error as Error;
    console.error('Group notification error:', err);

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
 * GET /api/notifications/group
 *
 * Get group notification history (requires referenceId parameter).
 *
 * @example
 * ```
 * GET /api/notifications/group?referenceId=min_123
 * Authorization: Bearer <access_token>
 * ```
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const referenceId = searchParams.get('referenceId');

  if (referenceId === null) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing referenceId parameter',
        code: 'INVALID_REQUEST',
      },
      { status: 400 }
    );
  }

  // Create service to access history
  const service = createGroupNotificationService();
  const history = service.getHistoryByReference(referenceId);

  return NextResponse.json({
    success: true,
    referenceId,
    count: history.length,
    history,
  });
}
