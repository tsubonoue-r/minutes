/**
 * Transcript service unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LarkClient, LarkClientError } from '../client';
import {
  TranscriptClient,
  TranscriptNotFoundError,
  TranscriptApiError,
  transformLarkSpeaker,
  transformLarkTranscriptSegment,
  transformLarkTranscript,
  extractUniqueSpeakers,
  calculateTotalDuration,
} from '../transcript';
import type { LarkConfig } from '@/types/lark';
import type {
  LarkSpeaker,
  LarkTranscript,
  LarkTranscriptSegment,
} from '../types';

// =============================================================================
// Mock Data Factories
// =============================================================================

const createMockLarkSpeaker = (overrides: Partial<LarkSpeaker> = {}): LarkSpeaker => ({
  user_id: 'user_001',
  name: 'John Doe',
  ...overrides,
});

const createMockLarkTranscriptSegment = (
  overrides: Partial<LarkTranscriptSegment> = {}
): LarkTranscriptSegment => ({
  segment_id: 'seg_001',
  start_time: 0,
  end_time: 15200,
  speaker: createMockLarkSpeaker(),
  text: 'Hello, this is a test transcript.',
  confidence: 0.95,
  ...overrides,
});

const createMockLarkTranscript = (
  overrides: Partial<LarkTranscript> = {}
): LarkTranscript => ({
  meeting_id: 'meeting_001',
  language: 'ja',
  segments: [
    createMockLarkTranscriptSegment(),
    createMockLarkTranscriptSegment({
      segment_id: 'seg_002',
      start_time: 15200,
      end_time: 30000,
      speaker: createMockLarkSpeaker({ user_id: 'user_002', name: 'Jane Smith' }),
      text: 'Thank you for joining.',
      confidence: 0.92,
    }),
  ],
  ...overrides,
});

// =============================================================================
// transformLarkSpeaker Tests
// =============================================================================

describe('transformLarkSpeaker', () => {
  it('should transform Lark speaker to application Speaker format', () => {
    const larkSpeaker = createMockLarkSpeaker();
    const speaker = transformLarkSpeaker(larkSpeaker);

    expect(speaker.id).toBe('user_001');
    expect(speaker.name).toBe('John Doe');
  });

  it('should handle different user IDs', () => {
    const larkSpeaker = createMockLarkSpeaker({
      user_id: 'custom_user_123',
      name: 'Custom User',
    });
    const speaker = transformLarkSpeaker(larkSpeaker);

    expect(speaker.id).toBe('custom_user_123');
    expect(speaker.name).toBe('Custom User');
  });
});

// =============================================================================
// transformLarkTranscriptSegment Tests
// =============================================================================

describe('transformLarkTranscriptSegment', () => {
  it('should transform Lark segment to application TranscriptSegment format', () => {
    const larkSegment = createMockLarkTranscriptSegment();
    const segment = transformLarkTranscriptSegment(larkSegment);

    expect(segment.id).toBe('seg_001');
    expect(segment.startTimeMs).toBe(0);
    expect(segment.endTimeMs).toBe(15200);
    expect(segment.durationMs).toBe(15200);
    expect(segment.speaker.id).toBe('user_001');
    expect(segment.speaker.name).toBe('John Doe');
    expect(segment.text).toBe('Hello, this is a test transcript.');
    expect(segment.confidence).toBe(0.95);
  });

  it('should calculate duration correctly', () => {
    const larkSegment = createMockLarkTranscriptSegment({
      start_time: 5000,
      end_time: 10000,
    });
    const segment = transformLarkTranscriptSegment(larkSegment);

    expect(segment.durationMs).toBe(5000);
  });

  it('should handle missing confidence', () => {
    const larkSegment = createMockLarkTranscriptSegment({
      confidence: undefined,
    });
    const segment = transformLarkTranscriptSegment(larkSegment);

    expect(segment.confidence).toBeUndefined();
  });

  it('should handle zero duration segment', () => {
    const larkSegment = createMockLarkTranscriptSegment({
      start_time: 1000,
      end_time: 1000,
    });
    const segment = transformLarkTranscriptSegment(larkSegment);

    expect(segment.durationMs).toBe(0);
  });
});

// =============================================================================
// extractUniqueSpeakers Tests
// =============================================================================

describe('extractUniqueSpeakers', () => {
  it('should extract unique speakers from segments', () => {
    const larkTranscript = createMockLarkTranscript();
    const transcript = transformLarkTranscript(larkTranscript);
    const speakers = extractUniqueSpeakers(transcript.segments);

    expect(speakers).toHaveLength(2);
    expect(speakers.map((s) => s.id)).toContain('user_001');
    expect(speakers.map((s) => s.id)).toContain('user_002');
  });

  it('should return empty array for empty segments', () => {
    const speakers = extractUniqueSpeakers([]);

    expect(speakers).toHaveLength(0);
  });

  it('should deduplicate same speaker across multiple segments', () => {
    const larkTranscript = createMockLarkTranscript({
      segments: [
        createMockLarkTranscriptSegment({ segment_id: 'seg_001' }),
        createMockLarkTranscriptSegment({ segment_id: 'seg_002' }),
        createMockLarkTranscriptSegment({ segment_id: 'seg_003' }),
      ],
    });
    const transcript = transformLarkTranscript(larkTranscript);
    const speakers = extractUniqueSpeakers(transcript.segments);

    expect(speakers).toHaveLength(1);
    expect(speakers[0]?.id).toBe('user_001');
  });
});

// =============================================================================
// calculateTotalDuration Tests
// =============================================================================

describe('calculateTotalDuration', () => {
  it('should calculate total duration from segments', () => {
    const larkTranscript = createMockLarkTranscript();
    const transcript = transformLarkTranscript(larkTranscript);
    const duration = calculateTotalDuration(transcript.segments);

    expect(duration).toBe(30000); // Last segment ends at 30000ms
  });

  it('should return 0 for empty segments', () => {
    const duration = calculateTotalDuration([]);

    expect(duration).toBe(0);
  });

  it('should find maximum end time regardless of order', () => {
    const larkTranscript = createMockLarkTranscript({
      segments: [
        createMockLarkTranscriptSegment({
          segment_id: 'seg_001',
          start_time: 50000,
          end_time: 60000,
        }),
        createMockLarkTranscriptSegment({
          segment_id: 'seg_002',
          start_time: 0,
          end_time: 10000,
        }),
      ],
    });
    const transcript = transformLarkTranscript(larkTranscript);
    const duration = calculateTotalDuration(transcript.segments);

    expect(duration).toBe(60000);
  });
});

// =============================================================================
// transformLarkTranscript Tests
// =============================================================================

describe('transformLarkTranscript', () => {
  it('should transform Lark transcript to application Transcript format', () => {
    const larkTranscript = createMockLarkTranscript();
    const transcript = transformLarkTranscript(larkTranscript);

    expect(transcript.meetingId).toBe('meeting_001');
    expect(transcript.language).toBe('ja');
    expect(transcript.segments).toHaveLength(2);
    expect(transcript.segmentCount).toBe(2);
    expect(transcript.totalDurationMs).toBe(30000);
    expect(transcript.speakers).toHaveLength(2);
  });

  it('should handle empty segments', () => {
    const larkTranscript = createMockLarkTranscript({ segments: [] });
    const transcript = transformLarkTranscript(larkTranscript);

    expect(transcript.segments).toHaveLength(0);
    expect(transcript.segmentCount).toBe(0);
    expect(transcript.totalDurationMs).toBe(0);
    expect(transcript.speakers).toHaveLength(0);
  });

  it('should handle missing language', () => {
    const larkTranscript = createMockLarkTranscript({ language: undefined });
    const transcript = transformLarkTranscript(larkTranscript);

    expect(transcript.language).toBeUndefined();
  });

  it('should preserve segment order', () => {
    const larkTranscript = createMockLarkTranscript();
    const transcript = transformLarkTranscript(larkTranscript);

    expect(transcript.segments[0]?.id).toBe('seg_001');
    expect(transcript.segments[1]?.id).toBe('seg_002');
  });
});

// =============================================================================
// TranscriptNotFoundError Tests
// =============================================================================

describe('TranscriptNotFoundError', () => {
  it('should create error with meeting ID', () => {
    const error = new TranscriptNotFoundError('meeting_123');

    expect(error.meetingId).toBe('meeting_123');
    expect(error.message).toBe('Transcript not found for meeting: meeting_123');
    expect(error.name).toBe('TranscriptNotFoundError');
  });

  it('should accept custom message', () => {
    const error = new TranscriptNotFoundError('meeting_123', 'Custom error message');

    expect(error.message).toBe('Custom error message');
    expect(error.meetingId).toBe('meeting_123');
  });
});

// =============================================================================
// TranscriptApiError Tests
// =============================================================================

describe('TranscriptApiError', () => {
  it('should create error with details', () => {
    const error = new TranscriptApiError(
      'API failed',
      500,
      'getTranscript',
      { extra: 'info' }
    );

    expect(error.message).toBe('API failed');
    expect(error.code).toBe(500);
    expect(error.operation).toBe('getTranscript');
    expect(error.details).toEqual({ extra: 'info' });
    expect(error.name).toBe('TranscriptApiError');
  });

  it('should create from LarkClientError', () => {
    const clientError = new LarkClientError('Client error', 401, '/test', { log_id: '123' });
    const apiError = TranscriptApiError.fromLarkClientError(clientError, 'testOperation');

    expect(apiError.message).toBe('Client error');
    expect(apiError.code).toBe(401);
    expect(apiError.operation).toBe('testOperation');
    expect(apiError.details).toEqual({ log_id: '123' });
  });
});

// =============================================================================
// TranscriptClient Tests
// =============================================================================

describe('TranscriptClient', () => {
  const config: LarkConfig = {
    appId: 'test_app_id',
    appSecret: 'test_secret',
    baseUrl: 'https://open.larksuite.com',
    redirectUri: 'http://localhost:3000/api/auth/callback',
  };

  let client: LarkClient;
  let transcriptClient: TranscriptClient;
  const accessToken = 'test_access_token';

  beforeEach(() => {
    client = new LarkClient(config);
    transcriptClient = new TranscriptClient(client);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTranscript', () => {
    it('should fetch and transform transcript', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: createMockLarkTranscript(),
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const transcript = await transcriptClient.getTranscript(accessToken, 'meeting_001');

      expect(transcript.meetingId).toBe('meeting_001');
      expect(transcript.language).toBe('ja');
      expect(transcript.segments).toHaveLength(2);
      expect(transcript.speakers).toHaveLength(2);
    });

    it('should throw TranscriptNotFoundError when transcript not found', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(
        transcriptClient.getTranscript(accessToken, 'nonexistent')
      ).rejects.toThrow(TranscriptNotFoundError);
    });

    it('should throw TranscriptNotFoundError on meeting not found error code', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 99991663,
          msg: 'Meeting not found',
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(
        transcriptClient.getTranscript(accessToken, 'invalid_id')
      ).rejects.toThrow(TranscriptNotFoundError);
    });

    it('should throw TranscriptNotFoundError on resource not found error code', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 99991664,
          msg: 'Resource not found',
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(
        transcriptClient.getTranscript(accessToken, 'invalid_id')
      ).rejects.toThrow(TranscriptNotFoundError);
    });

    it('should throw TranscriptNotFoundError on transcript not available error code', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 99991672,
          msg: 'Transcript not available',
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(
        transcriptClient.getTranscript(accessToken, 'no_transcript')
      ).rejects.toThrow(TranscriptNotFoundError);
    });

    it('should throw TranscriptApiError on other API failures', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 99991400,
          msg: 'Invalid token',
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(
        transcriptClient.getTranscript(accessToken, 'meeting_001')
      ).rejects.toThrow(TranscriptApiError);

      await expect(
        transcriptClient.getTranscript(accessToken, 'meeting_001')
      ).rejects.toMatchObject({
        operation: 'getTranscript',
      });
    });

    it('should replace meeting ID in endpoint URL', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: createMockLarkTranscript(),
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await transcriptClient.getTranscript(accessToken, 'meeting_xyz');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/meetings/meeting_xyz/transcript'),
        expect.any(Object)
      );
    });

    it('should include authorization header', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: createMockLarkTranscript(),
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await transcriptClient.getTranscript(accessToken, 'meeting_001');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
      );
    });
  });

  describe('hasTranscript', () => {
    it('should return true when transcript exists', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: createMockLarkTranscript(),
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await transcriptClient.hasTranscript(accessToken, 'meeting_001');

      expect(result).toBe(true);
    });

    it('should return false when transcript not found', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await transcriptClient.hasTranscript(accessToken, 'nonexistent');

      expect(result).toBe(false);
    });

    it('should throw on non-NotFound errors', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 99991400,
          msg: 'Invalid token',
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(
        transcriptClient.hasTranscript(accessToken, 'meeting_001')
      ).rejects.toThrow(TranscriptApiError);
    });
  });
});
