/**
 * MinutesGenerationService - AI-powered meeting minutes generation
 * @module services/minutes-generation.service
 *
 * Generates structured meeting minutes from transcript data using Claude AI.
 */

import {
  ClaudeClient,
  ClaudeApiError,
  ClaudeParseError,
  buildMinutesGenerationPrompt,
  getSystemPrompt,
  minutesOutputSchema,
  DEFAULT_MODEL,
  type MinutesOutput,
  type MinutesOutputSpeaker,
} from '@/lib/claude';
import type { Transcript, TranscriptSegment } from '@/types/transcript';
import type {
  Minutes,
  Speaker,
  TopicSegment,
  DecisionItem,
  ActionItem,
} from '@/types/minutes';

// =============================================================================
// Constants
// =============================================================================

/**
 * Default max tokens for minutes generation
 */
const DEFAULT_GENERATION_MAX_TOKENS = 8000;

// =============================================================================
// Types
// =============================================================================

/**
 * Input for minutes generation
 */
export interface MinutesGenerationInput {
  /** Transcript data */
  transcript: Transcript;
  /** Meeting information */
  meeting: {
    /** Meeting ID */
    id: string;
    /** Meeting title */
    title: string;
    /** Meeting date in ISO format (YYYY-MM-DD) */
    date: string;
    /** Meeting attendees */
    attendees: Array<{ id: string; name: string }>;
  };
  /** Generation options */
  options?: {
    /** Output language */
    language?: 'ja' | 'en';
    /** Max tokens for generation */
    maxTokens?: number;
  };
}

/**
 * Result of minutes generation
 */
export interface MinutesGenerationResult {
  /** Generated minutes */
  minutes: Minutes;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Token usage */
  usage: {
    /** Input tokens */
    inputTokens: number;
    /** Output tokens */
    outputTokens: number;
  };
}

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown when minutes generation fails
 */
export class MinutesGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'MinutesGenerationError';
    Object.setPrototypeOf(this, MinutesGenerationError.prototype);
  }
}

// =============================================================================
// MinutesGenerationService Class
// =============================================================================

/**
 * Service for generating meeting minutes from transcripts using Claude AI
 *
 * @example
 * ```typescript
 * const service = createMinutesGenerationService();
 *
 * const result = await service.generateMinutes({
 *   transcript: transcriptData,
 *   meeting: {
 *     id: 'meeting-123',
 *     title: 'Weekly Standup',
 *     date: '2025-01-22',
 *     attendees: [
 *       { id: 'user-1', name: 'Tanaka' },
 *       { id: 'user-2', name: 'Suzuki' },
 *     ],
 *   },
 *   options: { language: 'ja' },
 * });
 *
 * console.log(result.minutes.summary);
 * console.log(`Generated in ${result.processingTimeMs}ms`);
 * ```
 */
export class MinutesGenerationService {
  constructor(private readonly claudeClient: ClaudeClient) {}

  /**
   * Generate meeting minutes from transcript
   *
   * @param input - Generation input containing transcript and meeting info
   * @returns Generated minutes with processing metrics
   * @throws {MinutesGenerationError} When generation fails
   */
  async generateMinutes(
    input: MinutesGenerationInput
  ): Promise<MinutesGenerationResult> {
    const startTime = Date.now();

    // Validate input
    this.validateInput(input);

    const { transcript, meeting, options } = input;
    const language = options?.language ?? 'ja';
    const maxTokens = options?.maxTokens ?? DEFAULT_GENERATION_MAX_TOKENS;

    try {
      // Format transcript for prompt
      const transcriptText = this.formatTranscriptForPrompt(transcript);

      // Build prompt
      const userPrompt = buildMinutesGenerationPrompt({
        transcript: transcriptText,
        meetingTitle: meeting.title,
        meetingDate: meeting.date,
        attendees: meeting.attendees.map((a) => a.name),
        language,
      });

      // Get system prompt
      const systemPrompt = getSystemPrompt(language);

      // Call Claude API with structured output
      const output = await this.claudeClient.generateStructuredOutput(
        [{ role: 'user', content: userPrompt }],
        minutesOutputSchema,
        {
          system: systemPrompt,
          maxTokens,
          retryCount: 2,
        }
      );

      const processingTimeMs = Date.now() - startTime;

      // Transform to Minutes type
      const minutes = this.transformToMinutes(output, meeting.id, processingTimeMs);

      return {
        minutes,
        processingTimeMs,
        usage: {
          // Note: ClaudeClient doesn't expose token usage in current implementation
          // These are estimates based on typical usage
          inputTokens: this.estimateTokens(userPrompt + systemPrompt),
          outputTokens: this.estimateTokens(JSON.stringify(output)),
        },
      };
    } catch (error) {
      if (error instanceof ClaudeApiError) {
        throw new MinutesGenerationError(
          `Claude API error: ${error.message}`,
          'CLAUDE_API_ERROR',
          error
        );
      }

      if (error instanceof ClaudeParseError) {
        throw new MinutesGenerationError(
          `Failed to parse Claude response: ${error.message}`,
          'PARSE_ERROR',
          error
        );
      }

      if (error instanceof MinutesGenerationError) {
        throw error;
      }

      throw new MinutesGenerationError(
        `Unexpected error during minutes generation: ${error instanceof Error ? error.message : String(error)}`,
        'UNKNOWN_ERROR',
        error
      );
    }
  }

  /**
   * Format transcript data as text for prompt
   *
   * Converts Transcript object to a text format suitable for the AI prompt:
   * [HH:MM:SS] SpeakerName: Text content
   *
   * @param transcript - Transcript data to format
   * @returns Formatted transcript text
   */
  private formatTranscriptForPrompt(transcript: Transcript): string {
    if (transcript.segments.length === 0) {
      return '';
    }

    return transcript.segments
      .map((segment) => this.formatSegment(segment))
      .join('\n');
  }

  /**
   * Format a single transcript segment
   *
   * @param segment - Segment to format
   * @returns Formatted segment string "[HH:MM:SS] Speaker: Text"
   */
  private formatSegment(segment: TranscriptSegment): string {
    const timestamp = this.formatTimestamp(segment.startTime);
    return `[${timestamp}] ${segment.speaker.name}: ${segment.text}`;
  }

  /**
   * Format milliseconds to HH:MM:SS timestamp
   *
   * @param ms - Time in milliseconds
   * @returns Formatted timestamp string
   */
  private formatTimestamp(ms: number): string {
    if (ms < 0) {
      return '00:00:00';
    }

    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number): string => n.toString().padStart(2, '0');

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  /**
   * Transform Claude output to Minutes type
   *
   * Adds server-generated IDs and metadata to the AI output.
   *
   * @param output - Claude AI output
   * @param meetingId - Meeting ID for reference
   * @param processingTimeMs - Processing time for metadata
   * @returns Complete Minutes object
   */
  private transformToMinutes(
    output: MinutesOutput,
    meetingId: string,
    processingTimeMs: number
  ): Minutes {
    const timestamp = Date.now();
    const now = new Date();

    // Generate minutes ID
    const minutesId = `min_${meetingId}_${timestamp}`;

    // Transform attendees
    const attendees = this.transformAttendees(output.attendees ?? []);

    // Transform topics
    const topics = output.topics.map((topic, index) =>
      this.transformTopic(topic, index)
    );

    // Transform decisions
    const decisions = output.decisions.map((decision, index) =>
      this.transformDecision(decision, index)
    );

    // Transform action items
    const actionItems = output.actionItems.map((item, index) =>
      this.transformActionItem(item, index)
    );

    // Calculate total duration from topics
    const duration = this.calculateDuration(topics);

    // Extract date from now if not available
    const dateStr = now.toISOString().split('T')[0] ?? '1970-01-01';

    return {
      id: minutesId,
      meetingId,
      title: '', // Will be set by caller
      date: dateStr,
      duration,
      summary: output.summary,
      topics,
      decisions,
      actionItems,
      attendees,
      metadata: {
        generatedAt: now.toISOString(),
        model: DEFAULT_MODEL,
        processingTimeMs,
        confidence: this.calculateConfidence(output),
      },
    };
  }

  /**
   * Transform AI output speakers to Speaker type
   *
   * @param speakers - AI output speakers
   * @returns Speaker array with generated IDs
   */
  private transformAttendees(speakers: MinutesOutputSpeaker[]): Speaker[] {
    return speakers.map((speaker, index) => {
      const base: Speaker = {
        id: `speaker_${index}`,
        name: speaker.name,
      };

      if (speaker.larkUserId !== undefined) {
        return { ...base, larkUserId: speaker.larkUserId };
      }

      return base;
    });
  }

  /**
   * Transform AI output topic to TopicSegment type
   *
   * @param topic - AI output topic
   * @param index - Topic index for ID generation
   * @returns TopicSegment with generated ID
   */
  private transformTopic(
    topic: MinutesOutput['topics'][number],
    index: number
  ): TopicSegment {
    const speakers = (topic.speakers ?? []).map((speaker, speakerIndex) => {
      const base: Speaker = {
        id: `speaker_${speakerIndex}`,
        name: speaker.name,
      };

      if (speaker.larkUserId !== undefined) {
        return { ...base, larkUserId: speaker.larkUserId };
      }

      return base;
    });

    return {
      id: `topic_${index}`,
      title: topic.title,
      startTime: topic.startTime,
      endTime: topic.endTime,
      summary: topic.summary,
      keyPoints: topic.keyPoints,
      speakers,
    };
  }

  /**
   * Transform AI output decision to DecisionItem type
   *
   * @param decision - AI output decision
   * @param index - Decision index for ID generation
   * @returns DecisionItem with generated ID
   */
  private transformDecision(
    decision: MinutesOutput['decisions'][number],
    index: number
  ): DecisionItem {
    return {
      id: `dec_${index}`,
      content: decision.content,
      context: decision.context,
      decidedAt: decision.decidedAt,
    };
  }

  /**
   * Transform AI output action item to ActionItem type
   *
   * @param item - AI output action item
   * @param index - Action item index for ID generation
   * @returns ActionItem with generated ID
   */
  private transformActionItem(
    item: MinutesOutput['actionItems'][number],
    index: number
  ): ActionItem {
    const base: ActionItem = {
      id: `act_${index}`,
      content: item.content,
      priority: item.priority,
      status: 'pending',
    };

    // Build result with optional fields
    let result = base;

    if (item.assignee !== undefined) {
      const assignee: Speaker = {
        id: `assignee_${index}`,
        name: item.assignee.name,
      };

      if (item.assignee.larkUserId !== undefined) {
        result = {
          ...result,
          assignee: { ...assignee, larkUserId: item.assignee.larkUserId },
        };
      } else {
        result = { ...result, assignee };
      }
    }

    if (item.dueDate !== undefined) {
      result = { ...result, dueDate: item.dueDate };
    }

    return result;
  }

  /**
   * Calculate total duration from topics
   *
   * @param topics - Array of topic segments
   * @returns Total duration in milliseconds
   */
  private calculateDuration(topics: TopicSegment[]): number {
    if (topics.length === 0) {
      return 0;
    }

    const maxEndTime = Math.max(...topics.map((t) => t.endTime));
    const minStartTime = Math.min(...topics.map((t) => t.startTime));

    return maxEndTime - minStartTime;
  }

  /**
   * Calculate confidence score based on output completeness
   *
   * @param output - AI output to evaluate
   * @returns Confidence score between 0 and 1
   */
  private calculateConfidence(output: MinutesOutput): number {
    let score = 0;
    let factors = 0;

    // Summary present and substantial
    if (output.summary.length > 50) {
      score += 1;
    } else if (output.summary.length > 0) {
      score += 0.5;
    }
    factors++;

    // Topics present
    if (output.topics.length > 0) {
      score += 1;
      // Topics have key points
      const topicsWithKeyPoints = output.topics.filter(
        (t) => t.keyPoints.length > 0
      );
      if (topicsWithKeyPoints.length === output.topics.length) {
        score += 0.5;
      }
    }
    factors += 1.5;

    // Decisions and actions (optional, so partial credit)
    if (output.decisions.length > 0 || output.actionItems.length > 0) {
      score += 0.5;
    }
    factors += 0.5;

    return Math.min(1, score / factors);
  }

  /**
   * Estimate token count from text
   *
   * Simple estimation: ~4 characters per token for mixed content
   *
   * @param text - Text to estimate
   * @returns Estimated token count
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Validate generation input
   *
   * @param input - Input to validate
   * @throws {MinutesGenerationError} When input is invalid
   */
  private validateInput(input: MinutesGenerationInput): void {
    const { transcript, meeting } = input;

    if (transcript === undefined || transcript === null) {
      throw new MinutesGenerationError(
        'Transcript is required',
        'INVALID_INPUT'
      );
    }

    if (transcript.segments.length === 0) {
      throw new MinutesGenerationError(
        'Transcript must have at least one segment',
        'INVALID_INPUT'
      );
    }

    if (meeting === undefined || meeting === null) {
      throw new MinutesGenerationError(
        'Meeting information is required',
        'INVALID_INPUT'
      );
    }

    if (meeting.id === '' || meeting.id.trim() === '') {
      throw new MinutesGenerationError(
        'Meeting ID is required',
        'INVALID_INPUT'
      );
    }

    if (meeting.title === '' || meeting.title.trim() === '') {
      throw new MinutesGenerationError(
        'Meeting title is required',
        'INVALID_INPUT'
      );
    }

    if (meeting.date === '' || !/^\d{4}-\d{2}-\d{2}$/.test(meeting.date)) {
      throw new MinutesGenerationError(
        'Meeting date is required and must be in YYYY-MM-DD format',
        'INVALID_INPUT'
      );
    }

    if (!Array.isArray(meeting.attendees)) {
      throw new MinutesGenerationError(
        'Meeting attendees must be an array',
        'INVALID_INPUT'
      );
    }
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a MinutesGenerationService instance with default configuration
 *
 * Uses ANTHROPIC_API_KEY environment variable for authentication.
 *
 * @returns MinutesGenerationService instance
 * @throws {MinutesGenerationError} When API key is not configured
 *
 * @example
 * ```typescript
 * const service = createMinutesGenerationService();
 * const result = await service.generateMinutes(input);
 * ```
 */
export function createMinutesGenerationService(): MinutesGenerationService {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey === undefined || apiKey === '' || apiKey.trim() === '') {
    throw new MinutesGenerationError(
      'ANTHROPIC_API_KEY environment variable is required',
      'MISSING_API_KEY'
    );
  }

  const claudeClient = new ClaudeClient(apiKey);
  return new MinutesGenerationService(claudeClient);
}

/**
 * Create a MinutesGenerationService instance with custom ClaudeClient
 *
 * Useful for testing or custom configurations.
 *
 * @param claudeClient - Custom ClaudeClient instance
 * @returns MinutesGenerationService instance
 *
 * @example
 * ```typescript
 * const customClient = new ClaudeClient(apiKey, { maxTokens: 16000 });
 * const service = createMinutesGenerationServiceWithClient(customClient);
 * ```
 */
export function createMinutesGenerationServiceWithClient(
  claudeClient: ClaudeClient
): MinutesGenerationService {
  return new MinutesGenerationService(claudeClient);
}
