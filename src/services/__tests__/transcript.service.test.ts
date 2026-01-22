/**
 * TranscriptService unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TranscriptService,
  TranscriptServiceError,
  TranscriptNotFoundError,
  transformToAppSpeaker,
  transformToAppSegment,
  transformToAppTranscript,
} from '../transcript.service';
import {
  TranscriptClient,
  TranscriptApiError,
  type Transcript as LarkTranscript,
  type TranscriptSegment as LarkTranscriptSegment,
  type Speaker as LarkSpeaker,
} from '@/lib/lark';

// =============================================================================
// Mock Data Factories
// =============================================================================

const createMockLarkSpeaker = (
  overrides: Partial<LarkSpeaker> = {}
): LarkSpeaker => ({
  id: 'user_001',
  name: 'John Doe',
  ...overrides,
});

const createMockLarkTranscriptSegment = (
  overrides: Partial<LarkTranscriptSegment> = {}
): LarkTranscriptSegment => ({
  id: 'seg_001',
  startTimeMs: 0,
  endTimeMs: 15200,
  durationMs: 15200,
  speaker: createMockLarkSpeaker(),
  text: 'Hello, this is a test transcript.',
  confidence: 0.95,
  ...overrides,
});

const createMockLarkTranscript = (
  overrides: Partial<LarkTranscript> = {}
): LarkTranscript => ({
  meetingId: 'meeting_001',
  language: 'ja',
  segments: [
    createMockLarkTranscriptSegment(),
    createMockLarkTranscriptSegment({
      id: 'seg_002',
      startTimeMs: 15200,
      endTimeMs: 30000,
      durationMs: 14800,
      speaker: createMockLarkSpeaker({ id: 'user_002', name: 'Jane Smith' }),
      text: 'Thank you for joining.',
      confidence: 0.92,
    }),
  ],
  totalDurationMs: 30000,
  segmentCount: 2,
  speakers: [
    createMockLarkSpeaker(),
    createMockLarkSpeaker({ id: 'user_002', name: 'Jane Smith' }),
  ],
  ...overrides,
});

// =============================================================================
// transformToAppSpeaker Tests
// =============================================================================

describe('transformToAppSpeaker', () => {
  it('should transform Lark speaker to application Speaker format', () => {
    const larkSpeaker = createMockLarkSpeaker();
    const speaker = transformToAppSpeaker(larkSpeaker);

    expect(speaker.id).toBe('user_001');
    expect(speaker.name).toBe('John Doe');
  });

  it('should handle different user IDs and names', () => {
    const larkSpeaker = createMockLarkSpeaker({
      id: 'custom_user_123',
      name: 'Custom User',
    });
    const speaker = transformToAppSpeaker(larkSpeaker);

    expect(speaker.id).toBe('custom_user_123');
    expect(speaker.name).toBe('Custom User');
  });

  it('should not include avatarUrl (not provided by Lark API)', () => {
    const larkSpeaker = createMockLarkSpeaker();
    const speaker = transformToAppSpeaker(larkSpeaker);

    expect(speaker.avatarUrl).toBeUndefined();
  });
});

// =============================================================================
// transformToAppSegment Tests
// =============================================================================

describe('transformToAppSegment', () => {
  it('should transform Lark segment to application TranscriptSegment format', () => {
    const larkSegment = createMockLarkTranscriptSegment();
    const segment = transformToAppSegment(larkSegment);

    expect(segment.id).toBe('seg_001');
    expect(segment.startTime).toBe(0);
    expect(segment.endTime).toBe(15200);
    expect(segment.speaker.id).toBe('user_001');
    expect(segment.speaker.name).toBe('John Doe');
    expect(segment.text).toBe('Hello, this is a test transcript.');
    expect(segment.confidence).toBe(0.95);
  });

  it('should map startTimeMs to startTime and endTimeMs to endTime', () => {
    const larkSegment = createMockLarkTranscriptSegment({
      startTimeMs: 5000,
      endTimeMs: 10000,
    });
    const segment = transformToAppSegment(larkSegment);

    expect(segment.startTime).toBe(5000);
    expect(segment.endTime).toBe(10000);
  });

  it('should default confidence to 0 when undefined', () => {
    const larkSegment = createMockLarkTranscriptSegment({
      confidence: undefined,
    });
    const segment = transformToAppSegment(larkSegment);

    expect(segment.confidence).toBe(0);
  });

  it('should preserve confidence when provided', () => {
    const larkSegment = createMockLarkTranscriptSegment({
      confidence: 0.88,
    });
    const segment = transformToAppSegment(larkSegment);

    expect(segment.confidence).toBe(0.88);
  });
});

// =============================================================================
// transformToAppTranscript Tests
// =============================================================================

describe('transformToAppTranscript', () => {
  it('should transform Lark transcript to application Transcript format', () => {
    const larkTranscript = createMockLarkTranscript();
    const transcript = transformToAppTranscript(larkTranscript);

    expect(transcript.meetingId).toBe('meeting_001');
    expect(transcript.language).toBe('ja');
    expect(transcript.segments).toHaveLength(2);
    expect(transcript.totalDuration).toBe(30000);
    expect(transcript.createdAt).toBeDefined();
  });

  it('should map totalDurationMs to totalDuration', () => {
    const larkTranscript = createMockLarkTranscript({
      totalDurationMs: 60000,
    });
    const transcript = transformToAppTranscript(larkTranscript);

    expect(transcript.totalDuration).toBe(60000);
  });

  it('should default language to empty string when undefined', () => {
    const larkTranscript = createMockLarkTranscript({
      language: undefined,
    });
    const transcript = transformToAppTranscript(larkTranscript);

    expect(transcript.language).toBe('');
  });

  it('should generate valid ISO 8601 createdAt timestamp', () => {
    const larkTranscript = createMockLarkTranscript();
    const transcript = transformToAppTranscript(larkTranscript);

    // Should be a valid ISO 8601 date string
    const parsedDate = new Date(transcript.createdAt);
    expect(parsedDate.toISOString()).toBe(transcript.createdAt);
  });

  it('should transform all segments', () => {
    const larkTranscript = createMockLarkTranscript();
    const transcript = transformToAppTranscript(larkTranscript);

    expect(transcript.segments[0]?.id).toBe('seg_001');
    expect(transcript.segments[0]?.startTime).toBe(0);
    expect(transcript.segments[1]?.id).toBe('seg_002');
    expect(transcript.segments[1]?.startTime).toBe(15200);
  });

  it('should handle empty segments array', () => {
    const larkTranscript = createMockLarkTranscript({
      segments: [],
      segmentCount: 0,
      speakers: [],
    });
    const transcript = transformToAppTranscript(larkTranscript);

    expect(transcript.segments).toHaveLength(0);
  });
});

// =============================================================================
// TranscriptServiceError Tests
// =============================================================================

describe('TranscriptServiceError', () => {
  it('should create error with all properties', () => {
    const error = new TranscriptServiceError(
      'Test error message',
      'TEST_CODE',
      400,
      { extra: 'info' }
    );

    expect(error.message).toBe('Test error message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ extra: 'info' });
    expect(error.name).toBe('TranscriptServiceError');
  });

  it('should default statusCode to 500', () => {
    const error = new TranscriptServiceError('Error', 'CODE');

    expect(error.statusCode).toBe(500);
  });
});

// =============================================================================
// TranscriptService Tests
// =============================================================================

describe('TranscriptService', () => {
  let mockTranscriptClient: TranscriptClient;
  let service: TranscriptService;
  const accessToken = 'test_access_token';

  beforeEach(() => {
    // Create mock TranscriptClient
    mockTranscriptClient = {
      getTranscript: vi.fn(),
      hasTranscript: vi.fn(),
    } as unknown as TranscriptClient;

    service = new TranscriptService(mockTranscriptClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTranscript', () => {
    it('should fetch and transform transcript to application format', async () => {
      const mockLarkTranscript = createMockLarkTranscript();
      vi.mocked(mockTranscriptClient.getTranscript).mockResolvedValue(
        mockLarkTranscript
      );

      const transcript = await service.getTranscript(accessToken, 'meeting_001');

      expect(mockTranscriptClient.getTranscript).toHaveBeenCalledWith(
        accessToken,
        'meeting_001'
      );
      expect(transcript.meetingId).toBe('meeting_001');
      expect(transcript.language).toBe('ja');
      expect(transcript.segments).toHaveLength(2);
      expect(transcript.totalDuration).toBe(30000);
      expect(transcript.createdAt).toBeDefined();
    });

    it('should transform segments with correct field mapping', async () => {
      const mockLarkTranscript = createMockLarkTranscript();
      vi.mocked(mockTranscriptClient.getTranscript).mockResolvedValue(
        mockLarkTranscript
      );

      const transcript = await service.getTranscript(accessToken, 'meeting_001');

      const firstSegment = transcript.segments[0];
      expect(firstSegment?.startTime).toBe(0); // mapped from startTimeMs
      expect(firstSegment?.endTime).toBe(15200); // mapped from endTimeMs
    });

    it('should re-throw TranscriptNotFoundError directly', async () => {
      const notFoundError = new TranscriptNotFoundError('meeting_001');
      vi.mocked(mockTranscriptClient.getTranscript).mockRejectedValue(
        notFoundError
      );

      await expect(
        service.getTranscript(accessToken, 'meeting_001')
      ).rejects.toThrow(TranscriptNotFoundError);

      await expect(
        service.getTranscript(accessToken, 'meeting_001')
      ).rejects.toThrow('Transcript not found for meeting: meeting_001');
    });

    it('should wrap TranscriptApiError in TranscriptServiceError', async () => {
      const apiError = new TranscriptApiError(
        'API error',
        401,
        'getTranscript',
        { log_id: '123' }
      );
      vi.mocked(mockTranscriptClient.getTranscript).mockRejectedValue(apiError);

      await expect(
        service.getTranscript(accessToken, 'meeting_001')
      ).rejects.toThrow(TranscriptServiceError);

      await expect(
        service.getTranscript(accessToken, 'meeting_001')
      ).rejects.toMatchObject({
        code: 'TRANSCRIPT_API_ERROR',
        statusCode: 401,
      });
    });

    it('should use 500 for non-HTTP error codes from TranscriptApiError', async () => {
      const apiError = new TranscriptApiError(
        'Internal error',
        99991000,
        'getTranscript'
      );
      vi.mocked(mockTranscriptClient.getTranscript).mockRejectedValue(apiError);

      await expect(
        service.getTranscript(accessToken, 'meeting_001')
      ).rejects.toMatchObject({
        statusCode: 500,
      });
    });

    it('should wrap unknown errors in TranscriptServiceError', async () => {
      vi.mocked(mockTranscriptClient.getTranscript).mockRejectedValue(
        new Error('Unknown error')
      );

      await expect(
        service.getTranscript(accessToken, 'meeting_001')
      ).rejects.toThrow(TranscriptServiceError);

      await expect(
        service.getTranscript(accessToken, 'meeting_001')
      ).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
        statusCode: 500,
      });
    });

    it('should handle non-Error thrown values', async () => {
      vi.mocked(mockTranscriptClient.getTranscript).mockRejectedValue(
        'string error'
      );

      await expect(
        service.getTranscript(accessToken, 'meeting_001')
      ).rejects.toThrow(TranscriptServiceError);

      await expect(
        service.getTranscript(accessToken, 'meeting_001')
      ).rejects.toMatchObject({
        details: { originalError: 'string error' },
      });
    });
  });

  describe('hasTranscript', () => {
    it('should return true when transcript exists', async () => {
      vi.mocked(mockTranscriptClient.hasTranscript).mockResolvedValue(true);

      const result = await service.hasTranscript(accessToken, 'meeting_001');

      expect(mockTranscriptClient.hasTranscript).toHaveBeenCalledWith(
        accessToken,
        'meeting_001'
      );
      expect(result).toBe(true);
    });

    it('should return false when transcript does not exist', async () => {
      vi.mocked(mockTranscriptClient.hasTranscript).mockResolvedValue(false);

      const result = await service.hasTranscript(accessToken, 'meeting_001');

      expect(result).toBe(false);
    });

    it('should return false for TranscriptNotFoundError', async () => {
      vi.mocked(mockTranscriptClient.hasTranscript).mockRejectedValue(
        new TranscriptNotFoundError('meeting_001')
      );

      const result = await service.hasTranscript(accessToken, 'meeting_001');

      expect(result).toBe(false);
    });

    it('should wrap TranscriptApiError in TranscriptServiceError', async () => {
      const apiError = new TranscriptApiError(
        'API error',
        403,
        'hasTranscript'
      );
      vi.mocked(mockTranscriptClient.hasTranscript).mockRejectedValue(apiError);

      await expect(
        service.hasTranscript(accessToken, 'meeting_001')
      ).rejects.toThrow(TranscriptServiceError);

      await expect(
        service.hasTranscript(accessToken, 'meeting_001')
      ).rejects.toMatchObject({
        code: 'TRANSCRIPT_API_ERROR',
        statusCode: 403,
      });
    });

    it('should wrap unknown errors in TranscriptServiceError', async () => {
      vi.mocked(mockTranscriptClient.hasTranscript).mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        service.hasTranscript(accessToken, 'meeting_001')
      ).rejects.toThrow(TranscriptServiceError);

      await expect(
        service.hasTranscript(accessToken, 'meeting_001')
      ).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
      });
    });
  });
});

// =============================================================================
// Integration-like Tests (Data Flow)
// =============================================================================

describe('TranscriptService data transformation flow', () => {
  let mockTranscriptClient: TranscriptClient;
  let service: TranscriptService;

  beforeEach(() => {
    mockTranscriptClient = {
      getTranscript: vi.fn(),
      hasTranscript: vi.fn(),
    } as unknown as TranscriptClient;

    service = new TranscriptService(mockTranscriptClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should correctly transform complete transcript with multiple speakers', async () => {
    const larkTranscript = createMockLarkTranscript({
      meetingId: 'meeting_xyz',
      language: 'en',
      segments: [
        createMockLarkTranscriptSegment({
          id: 'seg_1',
          startTimeMs: 0,
          endTimeMs: 10000,
          speaker: createMockLarkSpeaker({ id: 'speaker_a', name: 'Alice' }),
          text: 'Hello everyone',
          confidence: 0.98,
        }),
        createMockLarkTranscriptSegment({
          id: 'seg_2',
          startTimeMs: 10000,
          endTimeMs: 25000,
          speaker: createMockLarkSpeaker({ id: 'speaker_b', name: 'Bob' }),
          text: 'Hi Alice, nice to meet you',
          confidence: 0.95,
        }),
        createMockLarkTranscriptSegment({
          id: 'seg_3',
          startTimeMs: 25000,
          endTimeMs: 40000,
          speaker: createMockLarkSpeaker({ id: 'speaker_a', name: 'Alice' }),
          text: 'Let us begin the meeting',
          confidence: undefined,
        }),
      ],
      totalDurationMs: 40000,
      segmentCount: 3,
      speakers: [
        createMockLarkSpeaker({ id: 'speaker_a', name: 'Alice' }),
        createMockLarkSpeaker({ id: 'speaker_b', name: 'Bob' }),
      ],
    });

    vi.mocked(mockTranscriptClient.getTranscript).mockResolvedValue(
      larkTranscript
    );

    const transcript = await service.getTranscript('token', 'meeting_xyz');

    // Verify top-level properties
    expect(transcript.meetingId).toBe('meeting_xyz');
    expect(transcript.language).toBe('en');
    expect(transcript.totalDuration).toBe(40000);
    expect(transcript.segments).toHaveLength(3);

    // Verify segment transformations
    expect(transcript.segments[0]?.startTime).toBe(0);
    expect(transcript.segments[0]?.endTime).toBe(10000);
    expect(transcript.segments[0]?.speaker.name).toBe('Alice');
    expect(transcript.segments[0]?.confidence).toBe(0.98);

    expect(transcript.segments[1]?.speaker.name).toBe('Bob');
    expect(transcript.segments[1]?.text).toBe('Hi Alice, nice to meet you');

    // Verify undefined confidence defaults to 0
    expect(transcript.segments[2]?.confidence).toBe(0);

    // Verify createdAt is a valid timestamp
    expect(new Date(transcript.createdAt).toISOString()).toBe(
      transcript.createdAt
    );
  });

  it('should handle empty transcript', async () => {
    const larkTranscript = createMockLarkTranscript({
      meetingId: 'empty_meeting',
      language: undefined,
      segments: [],
      totalDurationMs: 0,
      segmentCount: 0,
      speakers: [],
    });

    vi.mocked(mockTranscriptClient.getTranscript).mockResolvedValue(
      larkTranscript
    );

    const transcript = await service.getTranscript('token', 'empty_meeting');

    expect(transcript.meetingId).toBe('empty_meeting');
    expect(transcript.language).toBe('');
    expect(transcript.segments).toHaveLength(0);
    expect(transcript.totalDuration).toBe(0);
  });
});
