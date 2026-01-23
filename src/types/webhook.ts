/**
 * Webhook type definitions and Zod schemas
 * @module types/webhook
 */

import { z, type ZodSafeParseResult } from 'zod';

// =============================================================================
// Constants
// =============================================================================

/**
 * Supported webhook event types
 */
export const WEBHOOK_EVENT_TYPES = {
  /** Meeting ended event */
  MEETING_ENDED: 'vc.meeting.meeting_ended_v1',
  /** Transcript ready event */
  TRANSCRIPT_READY: 'vc.meeting.transcript_ready_v1',
  /** Recording ready event */
  RECORDING_READY: 'vc.meeting.recording_ready_v1',
} as const;

/**
 * Webhook processing states
 */
export const WEBHOOK_PROCESSING_STATE = {
  /** Event received and queued */
  RECEIVED: 'received',
  /** Processing in progress */
  PROCESSING: 'processing',
  /** Processing completed successfully */
  COMPLETED: 'completed',
  /** Processing failed */
  FAILED: 'failed',
  /** Processing skipped (e.g., duplicate event) */
  SKIPPED: 'skipped',
} as const;

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Webhook event type schema
 */
export const WebhookEventTypeSchema = z.enum([
  WEBHOOK_EVENT_TYPES.MEETING_ENDED,
  WEBHOOK_EVENT_TYPES.TRANSCRIPT_READY,
  WEBHOOK_EVENT_TYPES.RECORDING_READY,
]);

/**
 * Webhook processing state schema
 */
export const WebhookProcessingStateSchema = z.enum([
  WEBHOOK_PROCESSING_STATE.RECEIVED,
  WEBHOOK_PROCESSING_STATE.PROCESSING,
  WEBHOOK_PROCESSING_STATE.COMPLETED,
  WEBHOOK_PROCESSING_STATE.FAILED,
  WEBHOOK_PROCESSING_STATE.SKIPPED,
]);

/**
 * Webhook header schema
 */
export const WebhookHeaderSchema = z.object({
  /** Unique event ID */
  event_id: z.string().min(1),
  /** Verification token */
  token: z.string().min(1),
  /** Event creation timestamp (ISO string or Unix timestamp) */
  create_time: z.string().min(1),
  /** Event type */
  event_type: z.string().min(1),
  /** Tenant key (optional) */
  tenant_key: z.string().optional(),
  /** App ID (optional) */
  app_id: z.string().optional(),
});

/**
 * Meeting ended event schema
 */
export const MeetingEndedEventSchema = z.object({
  /** Event type identifier */
  type: z.literal(WEBHOOK_EVENT_TYPES.MEETING_ENDED),
  /** Meeting ID */
  meeting_id: z.string().min(1),
  /** Meeting end time (Unix timestamp in seconds) */
  end_time: z.number().int().positive(),
  /** Host user ID */
  host_user_id: z.string().min(1),
  /** Meeting topic/title (optional) */
  topic: z.string().optional(),
  /** Meeting duration in seconds (optional) */
  duration: z.number().int().nonnegative().optional(),
  /** Participant count (optional) */
  participant_count: z.number().int().nonnegative().optional(),
});

/**
 * Transcript ready event schema
 */
export const TranscriptReadyEventSchema = z.object({
  /** Event type identifier */
  type: z.literal(WEBHOOK_EVENT_TYPES.TRANSCRIPT_READY),
  /** Meeting ID */
  meeting_id: z.string().min(1),
  /** Transcript ID */
  transcript_id: z.string().min(1),
  /** Ready timestamp */
  ready_time: z.number().int().positive(),
});

/**
 * Recording ready event schema
 */
export const RecordingReadyEventSchema = z.object({
  /** Event type identifier */
  type: z.literal(WEBHOOK_EVENT_TYPES.RECORDING_READY),
  /** Meeting ID */
  meeting_id: z.string().min(1),
  /** Recording ID */
  recording_id: z.string().min(1),
  /** Ready timestamp */
  ready_time: z.number().int().positive(),
});

/**
 * Union of all webhook event schemas
 */
export const WebhookEventSchema = z.discriminatedUnion('type', [
  MeetingEndedEventSchema,
  TranscriptReadyEventSchema,
  RecordingReadyEventSchema,
]);

/**
 * Complete webhook payload schema for meeting ended event
 */
export const WebhookPayloadSchema = z.object({
  /** Event data */
  event: WebhookEventSchema,
  /** Event header/metadata */
  header: WebhookHeaderSchema,
  /** Schema version (optional) */
  schema: z.string().optional(),
});

/**
 * URL verification challenge schema (Lark webhook subscription verification)
 */
export const WebhookChallengeSchema = z.object({
  /** Challenge token to echo back */
  challenge: z.string().min(1),
  /** Verification token */
  token: z.string().min(1),
  /** Request type */
  type: z.literal('url_verification'),
});

/**
 * Webhook signature verification result schema
 */
export const SignatureVerificationResultSchema = z.object({
  /** Whether signature is valid */
  isValid: z.boolean(),
  /** Error message if invalid */
  error: z.string().optional(),
  /** Timestamp from header */
  timestamp: z.string().optional(),
});

/**
 * Webhook processing result schema
 */
export const WebhookProcessingResultSchema = z.object({
  /** Processing state */
  state: WebhookProcessingStateSchema,
  /** Event ID that was processed */
  eventId: z.string(),
  /** Meeting ID if applicable */
  meetingId: z.string().optional(),
  /** Processing duration in milliseconds */
  durationMs: z.number().nonnegative(),
  /** Error message if failed */
  error: z.string().optional(),
  /** Retry count if retried */
  retryCount: z.number().int().nonnegative().optional(),
  /** Timestamp when processing completed */
  completedAt: z.string(),
});

/**
 * Retry configuration schema
 */
export const RetryConfigSchema = z.object({
  /** Maximum number of retry attempts */
  maxRetries: z.number().int().min(0).max(10).default(3),
  /** Initial delay in milliseconds */
  initialDelayMs: z.number().int().positive().default(1000),
  /** Maximum delay in milliseconds */
  maxDelayMs: z.number().int().positive().default(30000),
  /** Backoff multiplier */
  backoffMultiplier: z.number().positive().default(2),
  /** Whether to add jitter to delays */
  jitter: z.boolean().default(true),
});

// =============================================================================
// Types
// =============================================================================

/**
 * Webhook event type
 */
export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;

/**
 * Webhook processing state
 */
export type WebhookProcessingState = z.infer<typeof WebhookProcessingStateSchema>;

/**
 * Webhook header
 */
export type WebhookHeader = z.infer<typeof WebhookHeaderSchema>;

/**
 * Meeting ended event
 */
export type MeetingEndedEvent = z.infer<typeof MeetingEndedEventSchema>;

/**
 * Transcript ready event
 */
export type TranscriptReadyEvent = z.infer<typeof TranscriptReadyEventSchema>;

/**
 * Recording ready event
 */
export type RecordingReadyEvent = z.infer<typeof RecordingReadyEventSchema>;

/**
 * Webhook event (union type)
 */
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

/**
 * Webhook payload
 */
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

/**
 * Webhook challenge (URL verification)
 */
export type WebhookChallenge = z.infer<typeof WebhookChallengeSchema>;

/**
 * Signature verification result
 */
export type SignatureVerificationResult = z.infer<
  typeof SignatureVerificationResultSchema
>;

/**
 * Webhook processing result
 */
export type WebhookProcessingResult = z.infer<
  typeof WebhookProcessingResultSchema
>;

/**
 * Retry configuration
 */
export type RetryConfig = z.infer<typeof RetryConfigSchema>;

// =============================================================================
// Readonly Types
// =============================================================================

/**
 * Readonly webhook header
 */
export type ReadonlyWebhookHeader = Readonly<WebhookHeader>;

/**
 * Readonly meeting ended event
 */
export type ReadonlyMeetingEndedEvent = Readonly<MeetingEndedEvent>;

/**
 * Readonly webhook payload
 */
export type ReadonlyWebhookPayload = Readonly<{
  event: Readonly<WebhookEvent>;
  header: ReadonlyWebhookHeader;
  schema?: string | undefined;
}>;

/**
 * Readonly processing result
 */
export type ReadonlyWebhookProcessingResult = Readonly<WebhookProcessingResult>;

/**
 * Readonly retry config
 */
export type ReadonlyRetryConfig = Readonly<RetryConfig>;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if event is a meeting ended event
 *
 * @param event - Webhook event to check
 * @returns True if event is a meeting ended event
 */
export function isMeetingEndedEvent(
  event: WebhookEvent
): event is MeetingEndedEvent {
  return event.type === WEBHOOK_EVENT_TYPES.MEETING_ENDED;
}

/**
 * Check if event is a transcript ready event
 *
 * @param event - Webhook event to check
 * @returns True if event is a transcript ready event
 */
export function isTranscriptReadyEvent(
  event: WebhookEvent
): event is TranscriptReadyEvent {
  return event.type === WEBHOOK_EVENT_TYPES.TRANSCRIPT_READY;
}

/**
 * Check if event is a recording ready event
 *
 * @param event - Webhook event to check
 * @returns True if event is a recording ready event
 */
export function isRecordingReadyEvent(
  event: WebhookEvent
): event is RecordingReadyEvent {
  return event.type === WEBHOOK_EVENT_TYPES.RECORDING_READY;
}

/**
 * Check if payload is a webhook challenge
 *
 * @param payload - Payload to check
 * @returns True if payload is a webhook challenge
 */
export function isWebhookChallenge(
  payload: unknown
): payload is WebhookChallenge {
  const result = WebhookChallengeSchema.safeParse(payload);
  return result.success;
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate webhook payload
 *
 * @param data - Data to validate
 * @returns Validated webhook payload
 * @throws ZodError if validation fails
 */
export function validateWebhookPayload(data: unknown): WebhookPayload {
  return WebhookPayloadSchema.parse(data);
}

/**
 * Safely parse webhook payload
 *
 * @param data - Data to parse
 * @returns Parse result with success flag
 */
export function safeParseWebhookPayload(
  data: unknown
): ZodSafeParseResult<WebhookPayload> {
  return WebhookPayloadSchema.safeParse(data);
}

/**
 * Validate webhook challenge
 *
 * @param data - Data to validate
 * @returns Validated webhook challenge
 * @throws ZodError if validation fails
 */
export function validateWebhookChallenge(data: unknown): WebhookChallenge {
  return WebhookChallengeSchema.parse(data);
}

/**
 * Validate retry configuration
 *
 * @param data - Data to validate
 * @returns Validated retry configuration
 * @throws ZodError if validation fails
 */
export function validateRetryConfig(data: unknown): RetryConfig {
  return RetryConfigSchema.parse(data);
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create default retry configuration
 *
 * @param overrides - Optional overrides for default values
 * @returns Retry configuration
 */
export function createRetryConfig(
  overrides?: Partial<RetryConfig>
): RetryConfig {
  return RetryConfigSchema.parse({
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true,
    ...overrides,
  });
}

/**
 * Create a webhook processing result
 *
 * @param params - Processing result parameters
 * @returns Webhook processing result
 */
export function createWebhookProcessingResult(params: {
  state: WebhookProcessingState;
  eventId: string;
  meetingId?: string | undefined;
  durationMs: number;
  error?: string | undefined;
  retryCount?: number | undefined;
}): WebhookProcessingResult {
  return {
    state: params.state,
    eventId: params.eventId,
    meetingId: params.meetingId,
    durationMs: params.durationMs,
    error: params.error,
    retryCount: params.retryCount,
    completedAt: new Date().toISOString(),
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get event type label for display
 *
 * @param eventType - Event type
 * @returns Human-readable label
 */
export function getEventTypeLabel(eventType: WebhookEventType): string {
  const labels: Record<WebhookEventType, string> = {
    [WEBHOOK_EVENT_TYPES.MEETING_ENDED]: 'Meeting Ended',
    [WEBHOOK_EVENT_TYPES.TRANSCRIPT_READY]: 'Transcript Ready',
    [WEBHOOK_EVENT_TYPES.RECORDING_READY]: 'Recording Ready',
  };
  return labels[eventType];
}

/**
 * Get processing state label for display
 *
 * @param state - Processing state
 * @returns Human-readable label
 */
export function getProcessingStateLabel(state: WebhookProcessingState): string {
  const labels: Record<WebhookProcessingState, string> = {
    [WEBHOOK_PROCESSING_STATE.RECEIVED]: 'Received',
    [WEBHOOK_PROCESSING_STATE.PROCESSING]: 'Processing',
    [WEBHOOK_PROCESSING_STATE.COMPLETED]: 'Completed',
    [WEBHOOK_PROCESSING_STATE.FAILED]: 'Failed',
    [WEBHOOK_PROCESSING_STATE.SKIPPED]: 'Skipped',
  };
  return labels[state];
}

/**
 * Convert Unix timestamp to ISO string
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns ISO date string
 */
export function unixTimestampToISOString(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}
