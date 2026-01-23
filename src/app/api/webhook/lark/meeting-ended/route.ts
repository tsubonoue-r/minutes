/**
 * Lark Meeting Ended Webhook Endpoint
 * @module app/api/webhook/lark/meeting-ended/route
 *
 * Handles webhook events from Lark when a meeting ends.
 * Triggers automatic minutes generation pipeline.
 */

import { NextResponse } from 'next/server';
import {
  processWebhookRequest,
  getWebhookConfig,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  WEBHOOK_NONCE_HEADER,
} from '@/lib/lark/webhook';
import {
  createWebhookService,
  type WebhookService,
} from '@/services/webhook.service';
import type { WebhookPayload } from '@/types/webhook';
import { createLarkClient, getAppAccessToken } from '@/lib/lark';
import {
  createNotificationService,
  createRecipientFromOpenId,
} from '@/services/notification.service';
import { createLarkBaseServiceFromEnv } from '@/services/lark-base.service';

// =============================================================================
// Types
// =============================================================================

/**
 * Webhook response for successful processing
 */
interface WebhookSuccessResponse {
  readonly success: true;
  readonly eventId: string;
  readonly message?: string | undefined;
}

/**
 * Webhook response for challenge verification
 */
interface WebhookChallengeResponse {
  readonly challenge: string;
}

/**
 * Webhook error response
 */
interface WebhookErrorResponse {
  readonly success: false;
  readonly error: string;
  readonly code?: string | undefined;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Log prefix for this endpoint
 */
const LOG_PREFIX = '[Webhook:MeetingEnded]';

// =============================================================================
// Service Initialization
// =============================================================================

/**
 * Lazy-initialized webhook service
 */
let webhookService: WebhookService | null = null;

/**
 * Get or create webhook service instance
 */
function getWebhookService(): WebhookService {
  if (webhookService === null) {
    webhookService = createWebhookService({
      transcriptRetryConfig: {
        maxRetries: 5,
        initialDelayMs: 5000,
        maxDelayMs: 60000,
      },
      transcriptReadyDelayMs: 30000, // Wait 30s after meeting ends
    });

    // Set up callbacks for logging
    webhookService.onMinutesGenerated(async (context, result) => {
      console.log(
        `${LOG_PREFIX} Minutes generated for meeting ${context.meetingId}`,
        {
          processingTimeMs: result.processingTimeMs,
          topicsCount: result.minutes.topics.length,
          actionItemsCount: result.minutes.actionItems.length,
        }
      );

      const larkClient = createLarkClient();
      let accessToken: string;

      try {
        accessToken = await getAppAccessToken(larkClient);
      } catch (tokenError) {
        console.error(
          `${LOG_PREFIX} [NotifyHost] Failed to obtain access token`,
          {
            meetingId: context.meetingId,
            error: tokenError instanceof Error ? tokenError.message : String(tokenError),
          }
        );
        return;
      }

      // Notify host that minutes have been generated
      try {
        const notificationService = createNotificationService();
        const hostRecipient = createRecipientFromOpenId(context.hostUserId);

        await notificationService.sendMinutesNotification(accessToken, {
          minutes: result.minutes,
          documentUrl: '', // Document URL is not available at this stage
          recipients: [hostRecipient],
          language: 'ja',
        });

        console.log(
          `${LOG_PREFIX} [NotifyHost] Notification sent to host ${context.hostUserId}`,
          { meetingId: context.meetingId }
        );
      } catch (notifyError) {
        console.error(
          `${LOG_PREFIX} [NotifyHost] Failed to send notification`,
          {
            meetingId: context.meetingId,
            hostUserId: context.hostUserId,
            error: notifyError instanceof Error ? notifyError.message : String(notifyError),
          }
        );
        // Do not rethrow - notification failure should not block further processing
      }

      // Store generated minutes in Lark Base
      try {
        const larkBaseService = createLarkBaseServiceFromEnv(larkClient, accessToken);

        const saveResult = await larkBaseService.saveMinutes(
          result.minutes,
          context.meetingId
        );

        console.log(
          `${LOG_PREFIX} [SaveMinutes] Minutes saved to Lark Base`,
          {
            meetingId: context.meetingId,
            recordId: saveResult.recordId,
            version: saveResult.version,
          }
        );
      } catch (saveError) {
        console.error(
          `${LOG_PREFIX} [SaveMinutes] Failed to save minutes to Lark Base`,
          {
            meetingId: context.meetingId,
            error: saveError instanceof Error ? saveError.message : String(saveError),
            stack: saveError instanceof Error ? saveError.stack : undefined,
          }
        );
        // Do not rethrow - save failure should not block other operations
      }
    });

    webhookService.onProcessingFailed(async (context, error) => {
      // Structured error logging for observability and error tracking
      console.error(
        `${LOG_PREFIX} [ProcessingFailed] Meeting processing failed`,
        {
          severity: 'ERROR',
          meetingId: context.meetingId,
          hostUserId: context.hostUserId,
          endTime: context.endTime,
          topic: context.topic,
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack,
          },
          timestamp: new Date().toISOString(),
        }
      );

      // Attempt to send failure notification to host
      try {
        const larkClient = createLarkClient();
        const accessToken = await getAppAccessToken(larkClient);
        const notificationService = createNotificationService();
        const hostRecipient = createRecipientFromOpenId(context.hostUserId);

        // Send a simple text-based failure notice via draft card
        // (using draft card as a "review needed" notification)
        await notificationService.sendDraftMinutesNotification(accessToken, {
          minutes: {
            id: `failed_${context.meetingId}`,
            meetingId: context.meetingId,
            title: context.topic ?? 'Meeting',
            date: new Date(context.endTime * 1000).toISOString().split('T')[0] ?? '',
            duration: 0,
            summary: '',
            topics: [],
            decisions: [],
            actionItems: [],
            attendees: [],
            metadata: {
              generatedAt: new Date().toISOString(),
              model: '',
              processingTimeMs: 0,
              confidence: 0,
            },
          },
          previewUrl: '',
          approveUrl: '',
          recipient: hostRecipient,
          language: 'ja',
        });

        console.log(
          `${LOG_PREFIX} [ProcessingFailed] Failure notification sent to host`,
          { meetingId: context.meetingId, hostUserId: context.hostUserId }
        );
      } catch (notifyError) {
        console.error(
          `${LOG_PREFIX} [ProcessingFailed] Failed to send failure notification`,
          {
            meetingId: context.meetingId,
            error: notifyError instanceof Error ? notifyError.message : String(notifyError),
          }
        );
        // Swallow error - failure notification is best-effort
      }
    });
  }

  return webhookService;
}

// =============================================================================
// Request Handlers
// =============================================================================

/**
 * POST /api/webhook/lark/meeting-ended
 *
 * Handles Lark webhook events:
 * - URL verification challenges (returns challenge token)
 * - Meeting ended events (triggers minutes generation)
 *
 * @param request - Incoming webhook request
 * @returns Response with appropriate status and body
 *
 * @example Request Headers
 * ```
 * X-Lark-Signature: <signature>
 * X-Lark-Request-Timestamp: <timestamp>
 * X-Lark-Request-Nonce: <nonce>
 * Content-Type: application/json
 * ```
 *
 * @example Challenge Request Body
 * ```json
 * {
 *   "challenge": "abc123",
 *   "token": "verification_token",
 *   "type": "url_verification"
 * }
 * ```
 *
 * @example Event Request Body
 * ```json
 * {
 *   "header": {
 *     "event_id": "event_123",
 *     "token": "verification_token",
 *     "create_time": "1704067200",
 *     "event_type": "vc.meeting.meeting_ended_v1"
 *   },
 *   "event": {
 *     "type": "vc.meeting.meeting_ended_v1",
 *     "meeting_id": "meeting_123",
 *     "end_time": 1704067200,
 *     "host_user_id": "user_123"
 *   }
 * }
 * ```
 */
export async function POST(request: Request): Promise<Response> {
  const startTime = Date.now();

  try {
    // Get webhook configuration
    let config;
    try {
      config = getWebhookConfig();
    } catch (error) {
      console.error(`${LOG_PREFIX} Configuration error:`, error);
      return NextResponse.json(
        {
          success: false,
          error: 'Webhook not configured',
          code: 'CONFIG_ERROR',
        } satisfies WebhookErrorResponse,
        { status: 500 }
      );
    }

    // Read request body
    const body = await request.text();

    // Extract headers
    const headers = {
      signature: request.headers.get(WEBHOOK_SIGNATURE_HEADER),
      timestamp: request.headers.get(WEBHOOK_TIMESTAMP_HEADER),
      nonce: request.headers.get(WEBHOOK_NONCE_HEADER),
    };

    // Process the webhook request (verification + parsing)
    const processResult = processWebhookRequest({
      headers,
      body,
      encryptKey: config.encryptKey,
      verificationToken: config.verificationToken,
    });

    // Handle different result types
    switch (processResult.type) {
      case 'challenge': {
        // URL verification - return challenge immediately
        console.log(`${LOG_PREFIX} URL verification challenge received`);
        return NextResponse.json(
          processResult.response satisfies WebhookChallengeResponse,
          { status: 200 }
        );
      }

      case 'error': {
        // Request validation failed
        console.error(`${LOG_PREFIX} Validation error:`, processResult.message);
        return NextResponse.json(
          {
            success: false,
            error: processResult.message,
          } satisfies WebhookErrorResponse,
          { status: processResult.status }
        );
      }

      case 'event': {
        // Valid event - process asynchronously
        const payload = processResult.payload;

        console.log(`${LOG_PREFIX} Event received:`, {
          eventId: payload.header.event_id,
          eventType: payload.event.type,
        });

        // Process the event (fire and forget, respond immediately)
        // Note: In production, this should be moved to a queue/background job
        void processEventAsync(payload);

        return NextResponse.json(
          {
            success: true,
            eventId: payload.header.event_id,
            message: 'Event received and queued for processing',
          } satisfies WebhookSuccessResponse,
          { status: 200 }
        );
      }

      default: {
        // TypeScript exhaustiveness check - ensure all cases are handled
        const exhaustiveCheck: never = processResult;
        console.error(`${LOG_PREFIX} Unhandled result type:`, exhaustiveCheck);
        return NextResponse.json(
          {
            success: false,
            error: 'Unknown result type',
          } satisfies WebhookErrorResponse,
          { status: 500 }
        );
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    console.error(`${LOG_PREFIX} Unexpected error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: 'INTERNAL_ERROR',
      } satisfies WebhookErrorResponse,
      { status: 500 }
    );
  } finally {
    const duration = Date.now() - startTime;
    console.log(`${LOG_PREFIX} Request processed in ${duration}ms`);
  }
}

/**
 * Process webhook event asynchronously
 *
 * This runs in the background after the HTTP response is sent.
 * In production, this should be replaced with a proper job queue.
 *
 * @param payload - Validated webhook payload
 */
async function processEventAsync(payload: WebhookPayload): Promise<void> {
  const service = getWebhookService();

  try {
    // Get app access token for API calls using dynamic token management
    const accessToken = await getAppAccessTokenForWebhook();

    const result = await service.processEvent(payload, accessToken);

    console.log(`${LOG_PREFIX} Event processing completed:`, {
      eventId: result.eventId,
      state: result.state,
      durationMs: result.durationMs,
      error: result.error,
    });
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Event processing failed:`,
      error instanceof Error ? error.message : error
    );
  }
}

/**
 * Get a valid app access token for API calls.
 *
 * Uses the Lark OAuth module's getAppAccessToken which handles:
 * 1. Checking the in-memory cache for a valid (non-expired) token
 * 2. If expired, requesting a new token from Lark API using app credentials
 * 3. Caching the new token with expiration tracking
 *
 * @returns App access token string
 * @throws Error if token cannot be obtained (missing credentials or API failure)
 */
async function getAppAccessTokenForWebhook(): Promise<string> {
  const larkClient = createLarkClient();
  return getAppAccessToken(larkClient);
}

// =============================================================================
// Other HTTP Methods
// =============================================================================

/**
 * GET /api/webhook/lark/meeting-ended
 *
 * Health check endpoint for webhook configuration verification.
 */
export function GET(): Response {
  try {
    // Verify configuration is valid
    getWebhookConfig();

    return NextResponse.json({
      status: 'healthy',
      endpoint: '/api/webhook/lark/meeting-ended',
      supportedEvents: ['vc.meeting.meeting_ended_v1'],
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Webhook not configured',
      },
      { status: 503 }
    );
  }
}
