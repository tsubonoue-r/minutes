/**
 * TranscriptService - Application layer transcript service
 * @module services/transcript.service
 *
 * Provides high-level transcript operations with data transformation
 * from Lark API format to application internal format.
 */

import {
  TranscriptClient,
  createTranscriptClient,
  TranscriptNotFoundError,
  TranscriptApiError,
  type Transcript as LarkTranscript,
  type TranscriptSegment as LarkTranscriptSegment,
  type Speaker as LarkSpeaker,
} from '@/lib/lark';
import { createLarkClient, type LarkClient } from '@/lib/lark';
import type {
  Transcript,
  TranscriptSegment,
  Speaker,
} from '@/types/transcript';

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown when a transcript service operation fails
 */
export class TranscriptServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'TranscriptServiceError';
  }
}

// =============================================================================
// Data Transformation Functions
// =============================================================================

/**
 * Transform Lark speaker to application Speaker format
 * @param larkSpeaker - Speaker from Lark TranscriptClient
 * @returns Application Speaker format
 */
export function transformToAppSpeaker(larkSpeaker: LarkSpeaker): Speaker {
  return {
    id: larkSpeaker.id,
    name: larkSpeaker.name,
    // avatarUrl is not provided by Lark API, so we omit it
  };
}

/**
 * Transform Lark transcript segment to application TranscriptSegment format
 *
 * Key transformations:
 * - startTimeMs -> startTime
 * - endTimeMs -> endTime
 * - confidence: undefined becomes 0
 *
 * @param larkSegment - Segment from Lark TranscriptClient
 * @returns Application TranscriptSegment format
 */
export function transformToAppSegment(
  larkSegment: LarkTranscriptSegment
): TranscriptSegment {
  return {
    id: larkSegment.id,
    startTime: larkSegment.startTimeMs,
    endTime: larkSegment.endTimeMs,
    speaker: transformToAppSpeaker(larkSegment.speaker),
    text: larkSegment.text,
    confidence: larkSegment.confidence ?? 0,
  };
}

/**
 * Transform Lark transcript to application Transcript format
 *
 * Key transformations:
 * - language: undefined becomes empty string
 * - totalDurationMs -> totalDuration
 * - segments: each segment is transformed
 * - createdAt: generated as current ISO timestamp
 *
 * @param larkTranscript - Transcript from Lark TranscriptClient
 * @returns Application Transcript format
 */
export function transformToAppTranscript(
  larkTranscript: LarkTranscript
): Transcript {
  return {
    meetingId: larkTranscript.meetingId,
    language: larkTranscript.language ?? '',
    segments: larkTranscript.segments.map(transformToAppSegment),
    totalDuration: larkTranscript.totalDurationMs,
    createdAt: new Date().toISOString(),
  };
}

// =============================================================================
// TranscriptService Class
// =============================================================================

/**
 * Application layer service for transcript operations
 *
 * Wraps the Lark TranscriptClient and provides:
 * - Data transformation from Lark format to application format
 * - Unified error handling
 * - High-level business logic
 *
 * @example
 * ```typescript
 * const service = createTranscriptService();
 *
 * // Check if transcript exists
 * const hasTranscript = await service.hasTranscript(accessToken, meetingId);
 *
 * // Get transcript
 * if (hasTranscript) {
 *   const transcript = await service.getTranscript(accessToken, meetingId);
 *   console.log(`Found ${transcript.segments.length} segments`);
 * }
 * ```
 */
export class TranscriptService {
  private readonly client: TranscriptClient;

  constructor(client: TranscriptClient) {
    this.client = client;
  }

  /**
   * Get transcript for a meeting
   *
   * Fetches the transcript from Lark API and transforms it to application format.
   *
   * @param accessToken - User access token
   * @param meetingId - Meeting ID to fetch transcript for
   * @returns Transcript in application format
   * @throws {TranscriptServiceError} When the API call fails
   * @throws {TranscriptNotFoundError} When the transcript is not found
   */
  async getTranscript(accessToken: string, meetingId: string): Promise<Transcript> {
    try {
      const larkTranscript = await this.client.getTranscript(accessToken, meetingId);
      return transformToAppTranscript(larkTranscript);
    } catch (error) {
      if (error instanceof TranscriptNotFoundError) {
        throw error;
      }

      if (error instanceof TranscriptApiError) {
        throw new TranscriptServiceError(
          error.message,
          'TRANSCRIPT_API_ERROR',
          error.code >= 400 && error.code < 600 ? error.code : 500,
          { operation: error.operation, details: error.details }
        );
      }

      throw new TranscriptServiceError(
        'Failed to fetch transcript',
        'UNKNOWN_ERROR',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Check if a meeting has a transcript available
   *
   * @param accessToken - User access token
   * @param meetingId - Meeting ID to check
   * @returns True if transcript is available, false otherwise
   * @throws {TranscriptServiceError} When the API call fails (except for not found)
   */
  async hasTranscript(accessToken: string, meetingId: string): Promise<boolean> {
    try {
      return await this.client.hasTranscript(accessToken, meetingId);
    } catch (error) {
      if (error instanceof TranscriptNotFoundError) {
        return false;
      }

      if (error instanceof TranscriptApiError) {
        throw new TranscriptServiceError(
          error.message,
          'TRANSCRIPT_API_ERROR',
          error.code >= 400 && error.code < 600 ? error.code : 500,
          { operation: error.operation, details: error.details }
        );
      }

      throw new TranscriptServiceError(
        'Failed to check transcript availability',
        'UNKNOWN_ERROR',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a TranscriptService instance with default LarkClient
 *
 * Uses environment variables for Lark API configuration.
 *
 * @returns TranscriptService instance
 */
export function createTranscriptService(): TranscriptService {
  const larkClient = createLarkClient();
  const transcriptClient = createTranscriptClient(larkClient);
  return new TranscriptService(transcriptClient);
}

/**
 * Create a TranscriptService instance with custom LarkClient
 *
 * @param larkClient - Custom LarkClient instance
 * @returns TranscriptService instance
 */
export function createTranscriptServiceWithClient(
  larkClient: LarkClient
): TranscriptService {
  const transcriptClient = createTranscriptClient(larkClient);
  return new TranscriptService(transcriptClient);
}

// Re-export error classes for convenience
export { TranscriptNotFoundError } from '@/lib/lark';
