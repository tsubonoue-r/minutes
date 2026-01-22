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
    webhookService.onMinutesGenerated((context, result) => {
      console.log(
        `${LOG_PREFIX} Minutes generated for meeting ${context.meetingId}`,
        {
          processingTimeMs: result.processingTimeMs,
          topicsCount: result.minutes.topics.length,
          actionItemsCount: result.minutes.actionItems.length,
        }
      );

      // TODO: Integrate with notification service to notify host
      // TODO: Store generated minutes in database
      return Promise.resolve();
    });

    webhookService.onProcessingFailed((context, error) => {
      console.error(
        `${LOG_PREFIX} Failed to process meeting ${context.meetingId}:`,
        error.message
      );

      // TODO: Integrate with error tracking (e.g., Sentry)
      // TODO: Send failure notification to admin
      return Promise.resolve();
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
    // Get app access token for API calls
    // In production, this should use proper token management
    const accessToken = await getAppAccessToken();

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
 * Get app access token for API calls
 *
 * This is a placeholder - in production, implement proper token management
 * with caching and refresh logic.
 *
 * @returns App access token
 * @throws Error if token cannot be obtained
 */
function getAppAccessToken(): Promise<string> {
  // TODO: Implement proper app access token retrieval
  // This should:
  // 1. Check cache for valid token
  // 2. If expired, request new token from Lark API
  // 3. Cache the new token
  //
  // For now, return from environment (for testing)
  const token = process.env.LARK_APP_ACCESS_TOKEN;

  if (token === undefined || token === '') {
    return Promise.reject(new Error('LARK_APP_ACCESS_TOKEN not configured'));
  }

  return Promise.resolve(token);
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
