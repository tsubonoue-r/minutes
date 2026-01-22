/**
 * MinutesGenerationService tests
 * @module services/__tests__/minutes-generation.service.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MinutesGenerationService,
  MinutesGenerationError,
  createMinutesGenerationServiceWithClient,
  type MinutesGenerationInput,
} from '../minutes-generation.service';
import { ClaudeClient, ClaudeApiError, ClaudeParseError } from '@/lib/claude';
import type { Transcript, TranscriptSegment, Speaker } from '@/types/transcript';
import type { MinutesOutput } from '@/lib/claude';

// =============================================================================
// Test Data
// =============================================================================

/**
 * Create a mock speaker
 */
function createMockSpeaker(id: string, name: string): Speaker {
  return { id, name };
}

/**
 * Create a mock transcript segment
 */
function createMockSegment(
  id: string,
  startTime: number,
  endTime: number,
  speaker: Speaker,
  text: string
): TranscriptSegment {
  return {
    id,
    startTime,
    endTime,
    speaker,
    text,
    confidence: 0.95,
  };
}

/**
 * Create a mock transcript
 */
function createMockTranscript(): Transcript {
  const tanaka = createMockSpeaker('user-1', '田中');
  const suzuki = createMockSpeaker('user-2', '鈴木');

  return {
    meetingId: 'meeting-123',
    language: 'ja',
    segments: [
      createMockSegment('seg-1', 0, 15000, tanaka, 'おはようございます。本日の議題は新機能の開発についてです。'),
      createMockSegment('seg-2', 15000, 30000, suzuki, 'はい、了解しました。まずスケジュールを確認しましょう。'),
      createMockSegment('seg-3', 30000, 60000, tanaka, '来週金曜日をリリース日として決定しましょう。'),
      createMockSegment('seg-4', 60000, 90000, suzuki, '承知しました。私がドキュメント作成を担当します。'),
    ],
    totalDuration: 90000,
    createdAt: '2025-01-22T10:00:00.000Z',
  };
}

/**
 * Create a mock MinutesGenerationInput
 */
function createMockInput(): MinutesGenerationInput {
  return {
    transcript: createMockTranscript(),
    meeting: {
      id: 'meeting-123',
      title: '週次定例会議',
      date: '2025-01-22',
      attendees: [
        { id: 'user-1', name: '田中' },
        { id: 'user-2', name: '鈴木' },
      ],
    },
    options: {
      language: 'ja',
    },
  };
}

/**
 * Create a mock MinutesOutput (Claude API response)
 */
function createMockMinutesOutput(): MinutesOutput {
  return {
    summary: '本日の会議では新機能の開発スケジュールについて議論しました。来週金曜日をリリース日として決定し、鈴木さんがドキュメント作成を担当することになりました。',
    topics: [
      {
        title: 'スケジュール確認',
        startTime: 0,
        endTime: 30000,
        summary: '新機能開発のスケジュールを確認しました。',
        keyPoints: ['本日の議題は新機能開発', 'スケジュール確認を優先'],
        speakers: [{ name: '田中' }, { name: '鈴木' }],
      },
      {
        title: 'リリース日決定',
        startTime: 30000,
        endTime: 90000,
        summary: 'リリース日と担当を決定しました。',
        keyPoints: ['来週金曜日がリリース日', '鈴木さんがドキュメント担当'],
        speakers: [{ name: '田中' }, { name: '鈴木' }],
      },
    ],
    decisions: [
      {
        content: '来週金曜日をリリース日とする',
        context: 'スケジュール確認の結果、来週金曜日に決定',
        decidedAt: 45000,
      },
    ],
    actionItems: [
      {
        content: 'ドキュメント作成',
        assignee: { name: '鈴木' },
        dueDate: '2025-01-24',
        priority: 'high',
      },
    ],
    attendees: [{ name: '田中' }, { name: '鈴木' }],
  };
}

// =============================================================================
// Mock ClaudeClient
// =============================================================================

/**
 * Create a mock ClaudeClient
 */
function createMockClaudeClient(output: MinutesOutput): ClaudeClient {
  const mockClient = {
    generateStructuredOutput: vi.fn().mockResolvedValue(output),
    sendMessage: vi.fn(),
  } as unknown as ClaudeClient;

  return mockClient;
}

// =============================================================================
// Tests
// =============================================================================

describe('MinutesGenerationService', () => {
  let mockClient: ClaudeClient;
  let service: MinutesGenerationService;

  beforeEach(() => {
    const mockOutput = createMockMinutesOutput();
    mockClient = createMockClaudeClient(mockOutput);
    service = createMinutesGenerationServiceWithClient(mockClient);
  });

  // ===========================================================================
  // generateMinutes - Success Cases
  // ===========================================================================

  describe('generateMinutes', () => {
    it('should generate minutes from transcript', async () => {
      const input = createMockInput();

      const result = await service.generateMinutes(input);

      expect(result.minutes).toBeDefined();
      expect(result.minutes.summary).toContain('新機能');
      expect(result.minutes.topics).toHaveLength(2);
      expect(result.minutes.decisions).toHaveLength(1);
      expect(result.minutes.actionItems).toHaveLength(1);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should generate correct minutes ID format', async () => {
      const input = createMockInput();

      const result = await service.generateMinutes(input);

      expect(result.minutes.id).toMatch(/^min_meeting-123_\d+$/);
    });

    it('should generate correct topic IDs', async () => {
      const input = createMockInput();

      const result = await service.generateMinutes(input);

      expect(result.minutes.topics[0]?.id).toBe('topic_0');
      expect(result.minutes.topics[1]?.id).toBe('topic_1');
    });

    it('should generate correct decision IDs', async () => {
      const input = createMockInput();

      const result = await service.generateMinutes(input);

      expect(result.minutes.decisions[0]?.id).toBe('dec_0');
    });

    it('should generate correct action item IDs', async () => {
      const input = createMockInput();

      const result = await service.generateMinutes(input);

      expect(result.minutes.actionItems[0]?.id).toBe('act_0');
    });

    it('should set action item status to pending', async () => {
      const input = createMockInput();

      const result = await service.generateMinutes(input);

      expect(result.minutes.actionItems[0]?.status).toBe('pending');
    });

    it('should include metadata with model info', async () => {
      const input = createMockInput();

      const result = await service.generateMinutes(input);

      expect(result.minutes.metadata).toBeDefined();
      expect(result.minutes.metadata.model).toBe('claude-sonnet-4-20250514');
      expect(result.minutes.metadata.generatedAt).toBeDefined();
      expect(result.minutes.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should calculate confidence score', async () => {
      const input = createMockInput();

      const result = await service.generateMinutes(input);

      expect(result.minutes.metadata.confidence).toBeGreaterThan(0);
      expect(result.minutes.metadata.confidence).toBeLessThanOrEqual(1);
    });

    it('should include usage information', async () => {
      const input = createMockInput();

      const result = await service.generateMinutes(input);

      expect(result.usage).toBeDefined();
      expect(result.usage.inputTokens).toBeGreaterThan(0);
      expect(result.usage.outputTokens).toBeGreaterThan(0);
    });

    it('should call ClaudeClient with correct parameters', async () => {
      const input = createMockInput();

      await service.generateMinutes(input);

      expect(mockClient.generateStructuredOutput).toHaveBeenCalledTimes(1);
      expect(mockClient.generateStructuredOutput).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('田中'),
          }),
        ]),
        expect.any(Object),
        expect.objectContaining({
          maxTokens: 8000,
          retryCount: 2,
        })
      );
    });

    it('should use custom maxTokens when provided', async () => {
      const input = createMockInput();
      input.options = { ...input.options, maxTokens: 16000 };

      await service.generateMinutes(input);

      expect(mockClient.generateStructuredOutput).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Object),
        expect.objectContaining({
          maxTokens: 16000,
        })
      );
    });

    it('should use English system prompt when language is en', async () => {
      const input = createMockInput();
      input.options = { language: 'en' };

      await service.generateMinutes(input);

      expect(mockClient.generateStructuredOutput).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Object),
        expect.objectContaining({
          system: expect.stringContaining('expert meeting minutes creator'),
        })
      );
    });
  });

  // ===========================================================================
  // formatTranscriptForPrompt - Tests
  // ===========================================================================

  describe('formatTranscriptForPrompt (via generateMinutes)', () => {
    it('should format transcript with timestamps and speaker names', async () => {
      const input = createMockInput();

      await service.generateMinutes(input);

      const mockFn = mockClient.generateStructuredOutput as ReturnType<typeof vi.fn>;
      const callArgs = mockFn.mock.calls[0] as Array<Array<{ content: string }>>;
      const promptContent = callArgs[0]?.[0]?.content ?? '';

      expect(promptContent).toContain('[00:00:00]');
      expect(promptContent).toContain('田中:');
      expect(promptContent).toContain('[00:00:15]');
      expect(promptContent).toContain('鈴木:');
    });

    it('should format timestamps correctly', async () => {
      const input = createMockInput();

      // Modify transcript to have longer timestamps
      input.transcript = {
        ...input.transcript,
        segments: [
          createMockSegment(
            'seg-1',
            3661000, // 1:01:01
            3665000,
            createMockSpeaker('user-1', '田中'),
            'テスト'
          ),
        ],
      };

      await service.generateMinutes(input);

      const mockFn = mockClient.generateStructuredOutput as ReturnType<typeof vi.fn>;
      const callArgs = mockFn.mock.calls[0] as Array<Array<{ content: string }>>;
      const promptContent = callArgs[0]?.[0]?.content ?? '';

      expect(promptContent).toContain('[01:01:01]');
    });
  });

  // ===========================================================================
  // Input Validation - Tests
  // ===========================================================================

  describe('input validation', () => {
    it('should throw error when transcript is missing', async () => {
      const input = createMockInput();
      // @ts-expect-error - Testing invalid input
      input.transcript = undefined;

      await expect(service.generateMinutes(input)).rejects.toThrow(
        MinutesGenerationError
      );
      await expect(service.generateMinutes(input)).rejects.toThrow(
        'Transcript is required'
      );
    });

    it('should throw error when transcript has no segments', async () => {
      const input = createMockInput();
      input.transcript = {
        ...input.transcript,
        segments: [],
      };

      await expect(service.generateMinutes(input)).rejects.toThrow(
        MinutesGenerationError
      );
      await expect(service.generateMinutes(input)).rejects.toThrow(
        'at least one segment'
      );
    });

    it('should throw error when meeting is missing', async () => {
      const input = createMockInput();
      // @ts-expect-error - Testing invalid input
      input.meeting = undefined;

      await expect(service.generateMinutes(input)).rejects.toThrow(
        MinutesGenerationError
      );
      await expect(service.generateMinutes(input)).rejects.toThrow(
        'Meeting information is required'
      );
    });

    it('should throw error when meeting ID is empty', async () => {
      const input = createMockInput();
      input.meeting.id = '';

      await expect(service.generateMinutes(input)).rejects.toThrow(
        MinutesGenerationError
      );
      await expect(service.generateMinutes(input)).rejects.toThrow(
        'Meeting ID is required'
      );
    });

    it('should throw error when meeting title is empty', async () => {
      const input = createMockInput();
      input.meeting.title = '';

      await expect(service.generateMinutes(input)).rejects.toThrow(
        MinutesGenerationError
      );
      await expect(service.generateMinutes(input)).rejects.toThrow(
        'Meeting title is required'
      );
    });

    it('should throw error when meeting date is invalid format', async () => {
      const input = createMockInput();
      input.meeting.date = '22-01-2025'; // Wrong format

      await expect(service.generateMinutes(input)).rejects.toThrow(
        MinutesGenerationError
      );
      await expect(service.generateMinutes(input)).rejects.toThrow(
        'YYYY-MM-DD format'
      );
    });

    it('should throw error when attendees is not an array', async () => {
      const input = createMockInput();
      // @ts-expect-error - Testing invalid input
      input.meeting.attendees = 'invalid';

      await expect(service.generateMinutes(input)).rejects.toThrow(
        MinutesGenerationError
      );
      await expect(service.generateMinutes(input)).rejects.toThrow(
        'must be an array'
      );
    });
  });

  // ===========================================================================
  // Error Handling - Tests
  // ===========================================================================

  describe('error handling', () => {
    it('should wrap ClaudeApiError in MinutesGenerationError', async () => {
      const input = createMockInput();
      const apiError = new ClaudeApiError('API rate limit exceeded', 429);

      (mockClient.generateStructuredOutput as ReturnType<typeof vi.fn>).mockRejectedValue(
        apiError
      );

      await expect(service.generateMinutes(input)).rejects.toThrow(
        MinutesGenerationError
      );
      await expect(service.generateMinutes(input)).rejects.toThrow(
        'Claude API error'
      );
    });

    it('should set correct error code for API errors', async () => {
      const input = createMockInput();
      const apiError = new ClaudeApiError('API error');

      (mockClient.generateStructuredOutput as ReturnType<typeof vi.fn>).mockRejectedValue(
        apiError
      );

      try {
        await service.generateMinutes(input);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(MinutesGenerationError);
        expect((error as MinutesGenerationError).code).toBe('CLAUDE_API_ERROR');
      }
    });

    it('should wrap ClaudeParseError in MinutesGenerationError', async () => {
      const input = createMockInput();
      const parseError = new ClaudeParseError('Invalid JSON', 'raw content');

      (mockClient.generateStructuredOutput as ReturnType<typeof vi.fn>).mockRejectedValue(
        parseError
      );

      await expect(service.generateMinutes(input)).rejects.toThrow(
        MinutesGenerationError
      );
      await expect(service.generateMinutes(input)).rejects.toThrow(
        'parse Claude response'
      );
    });

    it('should set correct error code for parse errors', async () => {
      const input = createMockInput();
      const parseError = new ClaudeParseError('Parse error');

      (mockClient.generateStructuredOutput as ReturnType<typeof vi.fn>).mockRejectedValue(
        parseError
      );

      try {
        await service.generateMinutes(input);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(MinutesGenerationError);
        expect((error as MinutesGenerationError).code).toBe('PARSE_ERROR');
      }
    });

    it('should handle unexpected errors', async () => {
      const input = createMockInput();
      const unexpectedError = new Error('Network failure');

      (mockClient.generateStructuredOutput as ReturnType<typeof vi.fn>).mockRejectedValue(
        unexpectedError
      );

      await expect(service.generateMinutes(input)).rejects.toThrow(
        MinutesGenerationError
      );
    });

    it('should set UNKNOWN_ERROR code for unexpected errors', async () => {
      const input = createMockInput();
      const unexpectedError = new Error('Something went wrong');

      (mockClient.generateStructuredOutput as ReturnType<typeof vi.fn>).mockRejectedValue(
        unexpectedError
      );

      try {
        await service.generateMinutes(input);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(MinutesGenerationError);
        expect((error as MinutesGenerationError).code).toBe('UNKNOWN_ERROR');
      }
    });
  });

  // ===========================================================================
  // Transformation - Tests
  // ===========================================================================

  describe('transformation', () => {
    it('should transform attendees with generated IDs', async () => {
      const input = createMockInput();

      const result = await service.generateMinutes(input);

      expect(result.minutes.attendees).toHaveLength(2);
      expect(result.minutes.attendees[0]?.id).toBe('speaker_0');
      expect(result.minutes.attendees[0]?.name).toBe('田中');
    });

    it('should transform topic speakers with IDs', async () => {
      const input = createMockInput();

      const result = await service.generateMinutes(input);

      const firstTopic = result.minutes.topics[0];
      expect(firstTopic?.speakers).toHaveLength(2);
      expect(firstTopic?.speakers[0]?.id).toBe('speaker_0');
    });

    it('should transform action item with assignee', async () => {
      const input = createMockInput();

      const result = await service.generateMinutes(input);

      const firstAction = result.minutes.actionItems[0];
      expect(firstAction?.assignee).toBeDefined();
      expect(firstAction?.assignee?.id).toBe('assignee_0');
      expect(firstAction?.assignee?.name).toBe('鈴木');
    });

    it('should preserve due date in action items', async () => {
      const input = createMockInput();

      const result = await service.generateMinutes(input);

      expect(result.minutes.actionItems[0]?.dueDate).toBe('2025-01-24');
    });

    it('should calculate duration from topics', async () => {
      const input = createMockInput();

      const result = await service.generateMinutes(input);

      // Topics span from 0 to 90000
      expect(result.minutes.duration).toBe(90000);
    });

    it('should handle empty decisions array', async () => {
      const emptyOutput: MinutesOutput = {
        ...createMockMinutesOutput(),
        decisions: [],
      };
      mockClient = createMockClaudeClient(emptyOutput);
      service = createMinutesGenerationServiceWithClient(mockClient);

      const input = createMockInput();
      const result = await service.generateMinutes(input);

      expect(result.minutes.decisions).toHaveLength(0);
    });

    it('should handle empty action items array', async () => {
      const emptyOutput: MinutesOutput = {
        ...createMockMinutesOutput(),
        actionItems: [],
      };
      mockClient = createMockClaudeClient(emptyOutput);
      service = createMinutesGenerationServiceWithClient(mockClient);

      const input = createMockInput();
      const result = await service.generateMinutes(input);

      expect(result.minutes.actionItems).toHaveLength(0);
    });

    it('should handle missing attendees in output', async () => {
      const noAttendeesOutput: MinutesOutput = {
        ...createMockMinutesOutput(),
        attendees: undefined,
      };
      mockClient = createMockClaudeClient(noAttendeesOutput);
      service = createMinutesGenerationServiceWithClient(mockClient);

      const input = createMockInput();
      const result = await service.generateMinutes(input);

      expect(result.minutes.attendees).toHaveLength(0);
    });

    it('should handle action item without assignee', async () => {
      const outputWithNoAssignee: MinutesOutput = {
        ...createMockMinutesOutput(),
        actionItems: [
          {
            content: 'タスク',
            priority: 'medium',
          },
        ],
      };
      mockClient = createMockClaudeClient(outputWithNoAssignee);
      service = createMinutesGenerationServiceWithClient(mockClient);

      const input = createMockInput();
      const result = await service.generateMinutes(input);

      expect(result.minutes.actionItems[0]?.assignee).toBeUndefined();
    });

    it('should handle action item without due date', async () => {
      const outputWithNoDueDate: MinutesOutput = {
        ...createMockMinutesOutput(),
        actionItems: [
          {
            content: 'タスク',
            assignee: { name: '田中' },
            priority: 'high',
          },
        ],
      };
      mockClient = createMockClaudeClient(outputWithNoDueDate);
      service = createMinutesGenerationServiceWithClient(mockClient);

      const input = createMockInput();
      const result = await service.generateMinutes(input);

      expect(result.minutes.actionItems[0]?.dueDate).toBeUndefined();
    });
  });

  // ===========================================================================
  // Confidence Calculation - Tests
  // ===========================================================================

  describe('confidence calculation', () => {
    it('should give high confidence for complete output', async () => {
      const input = createMockInput();

      const result = await service.generateMinutes(input);

      expect(result.minutes.metadata.confidence).toBeGreaterThan(0.7);
    });

    it('should give lower confidence for minimal output', async () => {
      const minimalOutput: MinutesOutput = {
        summary: 'Short',
        topics: [],
        decisions: [],
        actionItems: [],
      };
      mockClient = createMockClaudeClient(minimalOutput);
      service = createMinutesGenerationServiceWithClient(mockClient);

      const input = createMockInput();
      const result = await service.generateMinutes(input);

      expect(result.minutes.metadata.confidence).toBeLessThan(0.5);
    });
  });
});

// =============================================================================
// Factory Function Tests
// =============================================================================

describe('createMinutesGenerationService', () => {
  it('should be exported from module', async () => {
    const { createMinutesGenerationService } = await import(
      '../minutes-generation.service'
    );
    expect(createMinutesGenerationService).toBeDefined();
  });
});

describe('MinutesGenerationError', () => {
  it('should have correct name property', () => {
    const error = new MinutesGenerationError('test', 'TEST_CODE');
    expect(error.name).toBe('MinutesGenerationError');
  });

  it('should preserve error code', () => {
    const error = new MinutesGenerationError('test', 'TEST_CODE');
    expect(error.code).toBe('TEST_CODE');
  });

  it('should preserve cause', () => {
    const cause = new Error('original');
    const error = new MinutesGenerationError('test', 'TEST_CODE', cause);
    expect(error.cause).toBe(cause);
  });

  it('should be instanceof Error', () => {
    const error = new MinutesGenerationError('test', 'TEST_CODE');
    expect(error).toBeInstanceOf(Error);
  });

  it('should be instanceof MinutesGenerationError', () => {
    const error = new MinutesGenerationError('test', 'TEST_CODE');
    expect(error).toBeInstanceOf(MinutesGenerationError);
  });
});
