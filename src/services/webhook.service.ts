/**
 * Webhook Event Handler Service
 * @module services/webhook.service
 *
 * Handles webhook events from Lark, including meeting ended events
 * that trigger automatic minutes generation.
 */

import type {
  WebhookPayload,
  WebhookProcessingResult,
  MeetingEndedEvent,
  RetryConfig,
} from '@/types/webhook';
import {
  WEBHOOK_PROCESSING_STATE,
  isMeetingEndedEvent,
  isTranscriptReadyEvent,
  createWebhookProcessingResult,
  createRetryConfig,
} from '@/types/webhook';
import { retry } from '@/lib/retry';
import {
  createMinutesGenerationService,
  type MinutesGenerationService,
  type MinutesGenerationResult,
} from './minutes-generation.service';
import { createTranscriptService, type TranscriptService } from './transcript.service';

// =============================================================================
// Types
// =============================================================================

/**
 * Event handler function type
 */
export type EventHandler<T> = (event: T) => Promise<void>;

/**
 * Meeting ended handler context
 */
export interface MeetingEndedContext {
  /** Meeting ID */
  readonly meetingId: string;
  /** Host user ID */
  readonly hostUserId: string;
  /** Meeting end time (Unix timestamp) */
  readonly endTime: number;
  /** Meeting topic/title (if available) */
  readonly topic?: string | undefined;
  /** Participant count (if available) */
  readonly participantCount?: number | undefined;
}

/**
 * Minutes generation trigger context
 */
export interface MinutesGenerationContext {
  /** Meeting ID */
  readonly meetingId: string;
  /** Access token for API calls */
  readonly accessToken: string;
  /** Whether to wait for transcript to be ready */
  readonly waitForTranscript?: boolean | undefined;
  /** Maximum wait time for transcript in milliseconds */
  readonly transcriptTimeoutMs?: number | undefined;
}

/**
 * Webhook service configuration
 */
export interface WebhookServiceConfig {
  /** Retry configuration for transcript fetching */
  readonly transcriptRetryConfig?: Partial<RetryConfig> | undefined;
  /** Default access token (if using app-level token) */
  readonly defaultAccessToken?: string | undefined;
  /** Delay before fetching transcript after meeting ends (ms) */
  readonly transcriptReadyDelayMs?: number | undefined;
}

/**
 * Callback for when minutes generation is complete
 */
export type OnMinutesGenerated = (
  context: MeetingEndedContext,
  result: MinutesGenerationResult
) => Promise<void>;

/**
 * Callback for when processing fails
 */
export type OnProcessingFailed = (
  context: MeetingEndedContext,
  error: Error
) => Promise<void>;

// =============================================================================
// Constants
// =============================================================================

/**
 * Default delay before attempting to fetch transcript (30 seconds)
 */
const DEFAULT_TRANSCRIPT_READY_DELAY_MS = 30000;

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown when webhook processing fails
 */
export class WebhookProcessingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly eventId: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'WebhookProcessingError';
  }

  /**
   * Create error for transcript not ready
   */
  static transcriptNotReady(eventId: string, meetingId: string): WebhookProcessingError {
    return new WebhookProcessingError(
      `Transcript not ready for meeting ${meetingId}`,
      'TRANSCRIPT_NOT_READY',
      eventId
    );
  }

  /**
   * Create error for missing access token
   */
  static missingAccessToken(eventId: string): WebhookProcessingError {
    return new WebhookProcessingError(
      'Access token is required for processing',
      'MISSING_ACCESS_TOKEN',
      eventId
    );
  }

  /**
   * Create error for generation failure
   */
  static generationFailed(
    eventId: string,
    cause: Error
  ): WebhookProcessingError {
    return new WebhookProcessingError(
      `Minutes generation failed: ${cause.message}`,
      'GENERATION_FAILED',
      eventId,
      cause
    );
  }
}

// =============================================================================
// WebhookService Class
// =============================================================================

/**
 * Service for handling Lark webhook events
 *
 * Processes meeting ended events and triggers automatic minutes generation.
 * Implements retry logic for handling transient failures.
 *
 * @example
 * ```typescript
 * const service = createWebhookService({
 *   transcriptRetryConfig: { maxRetries: 5 },
 *   transcriptReadyDelayMs: 60000,
 * });
 *
 * // Set up callbacks
 * service.onMinutesGenerated(async (context, result) => {
 *   await notifyUser(context.hostUserId, result.minutes);
 * });
 *
 * service.onProcessingFailed(async (context, error) => {
 *   await logError(context.meetingId, error);
 * });
 *
 * // Process webhook event
 * const result = await service.processEvent(webhookPayload, accessToken);
 * ```
 */
/**
 * Internal config with required fields resolved
 */
interface ResolvedWebhookServiceConfig {
  readonly transcriptReadyDelayMs: number;
  readonly transcriptRetryConfig?: Partial<RetryConfig> | undefined;
  readonly defaultAccessToken?: string | undefined;
}

export class WebhookService {
  private readonly minutesGenerationService: MinutesGenerationService;
  private readonly transcriptService: TranscriptService;
  private readonly config: ResolvedWebhookServiceConfig;
  private readonly retryConfig: RetryConfig;

  private onMinutesGeneratedCallback?: OnMinutesGenerated;
  private onProcessingFailedCallback?: OnProcessingFailed;

  // Set to track processed event IDs (for deduplication)
  private readonly processedEvents: Set<string> = new Set();

  constructor(
    minutesGenerationService: MinutesGenerationService,
    transcriptService: TranscriptService,
    config: WebhookServiceConfig = {}
  ) {
    this.minutesGenerationService = minutesGenerationService;
    this.transcriptService = transcriptService;
    this.config = {
      ...config,
      transcriptReadyDelayMs:
        config.transcriptReadyDelayMs ?? DEFAULT_TRANSCRIPT_READY_DELAY_MS,
    };
    this.retryConfig = createRetryConfig(config.transcriptRetryConfig);
  }

  /**
   * Register callback for successful minutes generation
   *
   * @param callback - Function to call when minutes are generated
   */
  onMinutesGenerated(callback: OnMinutesGenerated): void {
    this.onMinutesGeneratedCallback = callback;
  }

  /**
   * Register callback for processing failures
   *
   * @param callback - Function to call when processing fails
   */
  onProcessingFailed(callback: OnProcessingFailed): void {
    this.onProcessingFailedCallback = callback;
  }

  /**
   * Process a webhook event
   *
   * Handles the event based on its type and triggers appropriate actions.
   *
   * @param payload - Webhook payload to process
   * @param accessToken - Access token for API calls (optional if configured)
   * @returns Processing result
   */
  async processEvent(
    payload: WebhookPayload,
    accessToken?: string
  ): Promise<WebhookProcessingResult> {
    const startTime = Date.now();
    const eventId = payload.header.event_id;
    const token = accessToken ?? this.config.defaultAccessToken;

    // Check for duplicate event
    if (this.processedEvents.has(eventId)) {
      return createWebhookProcessingResult({
        state: WEBHOOK_PROCESSING_STATE.SKIPPED,
        eventId,
        durationMs: Date.now() - startTime,
      });
    }

    // Mark event as being processed
    this.processedEvents.add(eventId);

    // Limit processed events cache size
    if (this.processedEvents.size > 1000) {
      const firstEvent = this.processedEvents.values().next().value;
      if (typeof firstEvent === 'string') {
        this.processedEvents.delete(firstEvent);
      }
    }

    try {
      const event = payload.event;

      if (isMeetingEndedEvent(event)) {
        return await this.handleMeetingEnded(event, eventId, token, startTime);
      }

      if (isTranscriptReadyEvent(event)) {
        // For transcript ready events, we might trigger minutes generation
        // if we're in a workflow where we wait for transcript before generating
        return createWebhookProcessingResult({
          state: WEBHOOK_PROCESSING_STATE.COMPLETED,
          eventId,
          meetingId: event.meeting_id,
          durationMs: Date.now() - startTime,
        });
      }

      // Unsupported event type - mark as completed but no action taken
      return createWebhookProcessingResult({
        state: WEBHOOK_PROCESSING_STATE.COMPLETED,
        eventId,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return createWebhookProcessingResult({
        state: WEBHOOK_PROCESSING_STATE.FAILED,
        eventId,
        durationMs: Date.now() - startTime,
        error: errorMessage,
      });
    }
  }

  /**
   * Handle meeting ended event
   *
   * Waits for transcript to be ready, then triggers minutes generation.
   *
   * @param event - Meeting ended event
   * @param eventId - Event ID for tracking
   * @param accessToken - Access token for API calls
   * @param startTime - Processing start time
   * @returns Processing result
   */
  private async handleMeetingEnded(
    event: MeetingEndedEvent,
    eventId: string,
    accessToken: string | undefined,
    startTime: number
  ): Promise<WebhookProcessingResult> {
    const context: MeetingEndedContext = {
      meetingId: event.meeting_id,
      hostUserId: event.host_user_id,
      endTime: event.end_time,
      topic: event.topic,
      participantCount: event.participant_count,
    };

    if (accessToken === undefined) {
      const error = WebhookProcessingError.missingAccessToken(eventId);

      if (this.onProcessingFailedCallback !== undefined) {
        await this.onProcessingFailedCallback(context, error);
      }

      return createWebhookProcessingResult({
        state: WEBHOOK_PROCESSING_STATE.FAILED,
        eventId,
        meetingId: event.meeting_id,
        durationMs: Date.now() - startTime,
        error: error.message,
      });
    }

    try {
      // Wait for transcript to be ready (with delay and retries)
      const transcript = await this.waitForTranscript(
        event.meeting_id,
        accessToken,
        eventId
      );

      // Generate minutes
      const result = await this.minutesGenerationService.generateMinutes({
        transcript,
        meeting: {
          id: event.meeting_id,
          title: event.topic ?? `Meeting ${event.meeting_id}`,
          date: new Date(event.end_time * 1000).toISOString().split('T')[0] ?? '1970-01-01',
          attendees: [], // Will be populated from transcript or API
        },
      });

      // Call success callback
      if (this.onMinutesGeneratedCallback !== undefined) {
        await this.onMinutesGeneratedCallback(context, result);
      }

      return createWebhookProcessingResult({
        state: WEBHOOK_PROCESSING_STATE.COMPLETED,
        eventId,
        meetingId: event.meeting_id,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      const wrappedError =
        error instanceof Error ? error : new Error(String(error));

      // Call failure callback
      if (this.onProcessingFailedCallback !== undefined) {
        await this.onProcessingFailedCallback(context, wrappedError);
      }

      return createWebhookProcessingResult({
        state: WEBHOOK_PROCESSING_STATE.FAILED,
        eventId,
        meetingId: event.meeting_id,
        durationMs: Date.now() - startTime,
        error: wrappedError.message,
      });
    }
  }

  /**
   * Wait for transcript to be ready and fetch it
   *
   * Uses exponential backoff retry to poll for transcript availability.
   *
   * @param meetingId - Meeting ID
   * @param accessToken - Access token
   * @param eventId - Event ID for error tracking
   * @returns Transcript data
   * @throws WebhookProcessingError if transcript is not available
   */
  private async waitForTranscript(
    meetingId: string,
    accessToken: string,
    eventId: string
  ): Promise<import('@/types/transcript').Transcript> {
    // Initial delay before checking
    const delayMs = this.config.transcriptReadyDelayMs;
    await this.sleep(delayMs);

    const result = await retry({
      fn: async () => {
        const transcript = await this.transcriptService.getTranscript(
          accessToken,
          meetingId
        );

        // Check if transcript has content
        if (transcript.segments.length === 0) {
          throw new Error('Transcript is empty');
        }

        return transcript;
      },
      config: this.retryConfig,
      operationName: `fetchTranscript:${meetingId}`,
      onRetry: (attempt, err, delay) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.log(
          `[WebhookService] Retry ${attempt} for transcript ${meetingId} after ${delay}ms: ${errorMessage}`
        );
      },
    });

    if (!result.success || result.data === undefined) {
      throw WebhookProcessingError.transcriptNotReady(eventId, meetingId);
    }

    return result.data;
  }

  /**
   * Trigger minutes generation directly (without waiting for webhook)
   *
   * Useful for manual triggering or testing.
   *
   * @param context - Generation context
   * @returns Minutes generation result
   */
  async triggerMinutesGeneration(
    context: MinutesGenerationContext
  ): Promise<MinutesGenerationResult> {
    const { meetingId, accessToken, waitForTranscript = true } = context;

    let transcript: import('@/types/transcript').Transcript;

    if (waitForTranscript) {
      transcript = await this.waitForTranscript(
        meetingId,
        accessToken,
        `manual:${meetingId}`
      );
    } else {
      transcript = await this.transcriptService.getTranscript(
        accessToken,
        meetingId
      );
    }

    return this.minutesGenerationService.generateMinutes({
      transcript,
      meeting: {
        id: meetingId,
        title: `Meeting ${meetingId}`,
        date: new Date().toISOString().split('T')[0] ?? '1970-01-01',
        attendees: [],
      },
    });
  }

  /**
   * Clear processed events cache
   *
   * Useful for testing or when events need to be reprocessed.
   */
  clearProcessedEventsCache(): void {
    this.processedEvents.clear();
  }

  /**
   * Check if an event has been processed
   *
   * @param eventId - Event ID to check
   * @returns True if event has been processed
   */
  hasProcessedEvent(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a WebhookService instance with default configuration
 *
 * @param config - Optional service configuration
 * @returns WebhookService instance
 *
 * @example
 * ```typescript
 * const service = createWebhookService();
 *
 * service.onMinutesGenerated(async (context, result) => {
 *   console.log(`Generated minutes for ${context.meetingId}`);
 * });
 *
 * const result = await service.processEvent(payload, accessToken);
 * ```
 */
export function createWebhookService(
  config: WebhookServiceConfig = {}
): WebhookService {
  const minutesGenerationService = createMinutesGenerationService();
  const transcriptService = createTranscriptService();

  return new WebhookService(
    minutesGenerationService,
    transcriptService,
    config
  );
}

/**
 * Create a WebhookService instance with custom dependencies
 *
 * Useful for testing with mock services.
 *
 * @param minutesGenerationService - Minutes generation service
 * @param transcriptService - Transcript service
 * @param config - Optional service configuration
 * @returns WebhookService instance
 */
export function createWebhookServiceWithDependencies(
  minutesGenerationService: MinutesGenerationService,
  transcriptService: TranscriptService,
  config: WebhookServiceConfig = {}
): WebhookService {
  return new WebhookService(
    minutesGenerationService,
    transcriptService,
    config
  );
}
