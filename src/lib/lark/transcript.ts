/**
 * Transcript Service for Lark VC API
 * @module lib/lark/transcript
 */

import type { LarkClient } from './client';
import { LarkClientError } from './client';
import {
  type LarkTranscript,
  type LarkTranscriptData,
  type LarkTranscriptSegment,
  type LarkSpeaker,
  type LarkTranscriptLanguage,
  larkTranscriptResponseSchema,
  LarkVCApiEndpoints,
} from './types';

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown when a transcript is not found
 */
export class TranscriptNotFoundError extends Error {
  constructor(
    public readonly meetingId: string,
    message?: string
  ) {
    super(message ?? `Transcript not found for meeting: ${meetingId}`);
    this.name = 'TranscriptNotFoundError';
  }
}

/**
 * Error thrown when a transcript API operation fails
 */
export class TranscriptApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly operation: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'TranscriptApiError';
  }

  /**
   * Create from LarkClientError
   */
  static fromLarkClientError(
    error: LarkClientError,
    operation: string
  ): TranscriptApiError {
    return new TranscriptApiError(error.message, error.code, operation, error.details);
  }
}

// =============================================================================
// Application Types
// =============================================================================

/**
 * Transformed speaker information for application use
 */
export interface Speaker {
  /** User ID */
  readonly id: string;
  /** Display name */
  readonly name: string;
}

/**
 * Transformed transcript segment for application use
 */
export interface TranscriptSegment {
  /** Unique segment identifier */
  readonly id: string;
  /** Start time in milliseconds */
  readonly startTimeMs: number;
  /** End time in milliseconds */
  readonly endTimeMs: number;
  /** Duration in milliseconds */
  readonly durationMs: number;
  /** Speaker information */
  readonly speaker: Speaker;
  /** Transcribed text content */
  readonly text: string;
  /** Confidence score (0.0 - 1.0), undefined if not available */
  readonly confidence: number | undefined;
}

/**
 * Complete transcript for application use
 */
export interface Transcript {
  /** Meeting ID */
  readonly meetingId: string;
  /** Transcript language code */
  readonly language: LarkTranscriptLanguage | undefined;
  /** Array of transcript segments */
  readonly segments: readonly TranscriptSegment[];
  /** Total duration in milliseconds (based on last segment end time) */
  readonly totalDurationMs: number;
  /** Total number of segments */
  readonly segmentCount: number;
  /** Unique speakers in the transcript */
  readonly speakers: readonly Speaker[];
}

// =============================================================================
// Data Transformation Functions
// =============================================================================

/**
 * Transform Lark speaker to application Speaker format
 * @param larkSpeaker - Speaker data from Lark API
 * @returns Transformed Speaker object
 */
export function transformLarkSpeaker(larkSpeaker: LarkSpeaker): Speaker {
  return {
    id: larkSpeaker.user_id,
    name: larkSpeaker.name,
  };
}

/**
 * Transform Lark transcript segment to application TranscriptSegment format
 * @param larkSegment - Segment data from Lark API
 * @returns Transformed TranscriptSegment object
 */
export function transformLarkTranscriptSegment(
  larkSegment: LarkTranscriptSegment
): TranscriptSegment {
  return {
    id: larkSegment.segment_id,
    startTimeMs: larkSegment.start_time,
    endTimeMs: larkSegment.end_time,
    durationMs: larkSegment.end_time - larkSegment.start_time,
    speaker: transformLarkSpeaker(larkSegment.speaker),
    text: larkSegment.text,
    confidence: larkSegment.confidence,
  };
}

/**
 * Extract unique speakers from transcript segments
 * @param segments - Array of transcript segments
 * @returns Array of unique speakers
 */
export function extractUniqueSpeakers(
  segments: readonly TranscriptSegment[]
): readonly Speaker[] {
  const speakerMap = new Map<string, Speaker>();

  for (const segment of segments) {
    if (!speakerMap.has(segment.speaker.id)) {
      speakerMap.set(segment.speaker.id, segment.speaker);
    }
  }

  return Array.from(speakerMap.values());
}

/**
 * Calculate total duration from segments
 * @param segments - Array of transcript segments
 * @returns Total duration in milliseconds
 */
export function calculateTotalDuration(
  segments: readonly TranscriptSegment[]
): number {
  if (segments.length === 0) {
    return 0;
  }

  let maxEndTime = 0;
  for (const segment of segments) {
    if (segment.endTimeMs > maxEndTime) {
      maxEndTime = segment.endTimeMs;
    }
  }

  return maxEndTime;
}

/**
 * Transform Lark transcript to application Transcript format
 * @param larkTranscript - Transcript data from Lark API
 * @returns Transformed Transcript object
 */
export function transformLarkTranscript(larkTranscript: LarkTranscript): Transcript {
  const segments = larkTranscript.segments.map(transformLarkTranscriptSegment);
  const speakers = extractUniqueSpeakers(segments);
  const totalDurationMs = calculateTotalDuration(segments);

  return {
    meetingId: larkTranscript.meeting_id,
    language: larkTranscript.language,
    segments,
    totalDurationMs,
    segmentCount: segments.length,
    speakers,
  };
}

// =============================================================================
// TranscriptClient Class
// =============================================================================

/**
 * Client for interacting with Lark VC Transcript API
 *
 * Provides methods to fetch meeting transcripts from Lark API.
 * Handles data transformation from Lark API format to application format.
 *
 * @example
 * ```typescript
 * const client = createLarkClient();
 * const transcriptClient = new TranscriptClient(client);
 *
 * // Get transcript for a meeting
 * const transcript = await transcriptClient.getTranscript(accessToken, 'meeting_id');
 * console.log(`Found ${transcript.segmentCount} segments`);
 *
 * // Access segments
 * for (const segment of transcript.segments) {
 *   console.log(`${segment.speaker.name}: ${segment.text}`);
 * }
 * ```
 */
export class TranscriptClient {
  private readonly client: LarkClient;

  constructor(client: LarkClient) {
    this.client = client;
  }

  /**
   * Get transcript for a meeting
   * @param accessToken - User access token
   * @param meetingId - The meeting ID to fetch transcript for
   * @returns Transcript data for the meeting
   * @throws {TranscriptNotFoundError} When the transcript is not found
   * @throws {TranscriptApiError} When the API request fails
   */
  async getTranscript(accessToken: string, meetingId: string): Promise<Transcript> {
    try {
      const endpoint = LarkVCApiEndpoints.TRANSCRIPT_GET.replace(
        ':meeting_id',
        meetingId
      );

      const response = await this.client.authenticatedRequest<LarkTranscriptData>(
        endpoint,
        accessToken
      );

      // Validate response with Zod
      const validated = larkTranscriptResponseSchema.parse(response);

      if (validated.data === undefined) {
        throw new TranscriptNotFoundError(meetingId);
      }

      return transformLarkTranscript(validated.data);
    } catch (error) {
      if (error instanceof TranscriptNotFoundError) {
        throw error;
      }
      if (error instanceof LarkClientError) {
        // Check for not found error codes
        // 99991663: Meeting not found
        // 99991664: Resource not found
        // 99991672: Transcript not available
        if (
          error.code === 99991663 ||
          error.code === 99991664 ||
          error.code === 99991672
        ) {
          throw new TranscriptNotFoundError(meetingId, error.message);
        }
        throw TranscriptApiError.fromLarkClientError(error, 'getTranscript');
      }
      throw error;
    }
  }

  /**
   * Check if a meeting has a transcript available
   * @param accessToken - User access token
   * @param meetingId - The meeting ID to check
   * @returns True if transcript is available, false otherwise
   */
  async hasTranscript(accessToken: string, meetingId: string): Promise<boolean> {
    try {
      await this.getTranscript(accessToken, meetingId);
      return true;
    } catch (error) {
      if (error instanceof TranscriptNotFoundError) {
        return false;
      }
      throw error;
    }
  }
}

/**
 * Create a TranscriptClient instance with the provided LarkClient
 * @param client - LarkClient instance
 * @returns New TranscriptClient instance
 */
export function createTranscriptClient(client: LarkClient): TranscriptClient {
  return new TranscriptClient(client);
}
