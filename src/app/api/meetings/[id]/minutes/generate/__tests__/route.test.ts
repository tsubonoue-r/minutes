/**
 * Minutes Generation API route unit tests
 * @module app/api/meetings/[id]/minutes/generate/__tests__/route.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import {
  createMeetingService,
  MeetingNotFoundError,
  MeetingApiError,
} from '@/lib/lark/meeting';
import {
  createTranscriptService,
  TranscriptNotFoundError,
  TranscriptServiceError,
} from '@/services/transcript.service';
import {
  createMinutesGenerationService,
  MinutesGenerationError,
} from '@/services/minutes-generation.service';
import type { Meeting } from '@/types/meeting';
import type { Transcript } from '@/types/transcript';
import type { Minutes } from '@/types/minutes';

// Mock dependencies
vi.mock('@/lib/auth/get-session');
vi.mock('@/lib/lark/client');
vi.mock('@/lib/lark/meeting', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/lark/meeting')>();
  return {
    ...actual,
    createMeetingService: vi.fn(),
  };
});
vi.mock('@/services/transcript.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/transcript.service')>();
  return {
    ...actual,
    createTranscriptService: vi.fn(),
  };
});
vi.mock('@/services/minutes-generation.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/minutes-generation.service')>();
  return {
    ...actual,
    createMinutesGenerationService: vi.fn(),
  };
});

const mockGetSession = vi.mocked(getSession);
const mockCreateLarkClient = vi.mocked(createLarkClient);
const mockCreateMeetingService = vi.mocked(createMeetingService);
const mockCreateTranscriptService = vi.mocked(createTranscriptService);
const mockCreateMinutesGenerationService = vi.mocked(createMinutesGenerationService);

/**
 * Success response type
 */
interface SuccessResponseData {
  readonly success: true;
  readonly data: {
    readonly minutes: Minutes;
    readonly processingTimeMs: number;
    readonly usage: {
      readonly inputTokens: number;
      readonly outputTokens: number;
    };
  };
}

/**
 * Error response type
 */
interface ErrorResponseData {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Create mock meeting data
 */
function createMockMeeting(overrides: Partial<Meeting> = {}): Meeting {
  const now = new Date();
  const startTime = new Date(now.getTime() - 3600000);
  const endTime = new Date();

  return {
    id: 'meeting_001',
    title: 'Weekly Team Standup',
    meetingNo: '123456789',
    startTime,
    endTime,
    durationMinutes: 60,
    status: 'ended',
    type: 'regular',
    host: {
      id: 'user_001',
      name: 'John Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
    },
    participantCount: 5,
    hasRecording: true,
    recordingUrl: 'https://example.com/recording',
    minutesStatus: 'not_created',
    createdAt: startTime,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create mock transcript data
 */
function createMockTranscript(): Transcript {
  return {
    meetingId: 'meeting_001',
    language: 'ja',
    segments: [
      {
        id: 'seg_1',
        startTime: 0,
        endTime: 15000,
        speaker: { id: 'user_001', name: 'John Doe' },
        text: 'Let us start the meeting.',
        confidence: 0.95,
      },
      {
        id: 'seg_2',
        startTime: 15000,
        endTime: 30000,
        speaker: { id: 'user_002', name: 'Jane Smith' },
        text: 'Sure, I have updates on the project.',
        confidence: 0.92,
      },
    ],
    totalDuration: 3600000,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create mock minutes
 */
function createMockMinutes(): Minutes {
  return {
    id: 'min_meeting_001_1234567890',
    meetingId: 'meeting_001',
    title: 'Weekly Team Standup',
    date: '2026-01-22',
    duration: 3600000,
    summary: 'The team discussed project updates and action items.',
    topics: [
      {
        id: 'topic_0',
        title: 'Project Updates',
        startTime: 0,
        endTime: 30000,
        summary: 'Discussed current project status.',
        keyPoints: ['Progress is on track', 'No blockers'],
        speakers: [{ id: 'speaker_0', name: 'John Doe' }],
      },
    ],
    decisions: [
      {
        id: 'dec_0',
        content: 'Continue with the current approach',
        context: 'Team agreed the approach is working well',
        decidedAt: 20000,
      },
    ],
    actionItems: [
      {
        id: 'act_0',
        content: 'Update documentation',
        priority: 'medium',
        status: 'pending',
      },
    ],
    attendees: [
      { id: 'speaker_0', name: 'John Doe' },
      { id: 'speaker_1', name: 'Jane Smith' },
    ],
    metadata: {
      generatedAt: new Date().toISOString(),
      model: 'claude-sonnet-4-20250514',
      processingTimeMs: 5000,
      confidence: 0.85,
    },
  };
}

/**
 * Create mock route context
 */
function createMockContext(id: string): { params: Promise<{ id: string }> } {
  return {
    params: Promise.resolve({ id }),
  };
}

/**
 * Create mock request
 */
function createMockRequest(body?: object): Request {
  const init: RequestInit = {
    method: 'POST',
  };

  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }

  return new Request('http://localhost:3000/api/meetings/meeting_001/minutes/generate', init);
}

describe('POST /api/meetings/[id]/minutes/generate', () => {
  let mockMeetingService: {
    getMeetingById: ReturnType<typeof vi.fn>;
  };
  let mockTranscriptService: {
    getTranscript: ReturnType<typeof vi.fn>;
    hasTranscript: ReturnType<typeof vi.fn>;
  };
  let mockMinutesService: {
    generateMinutes: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock services
    mockMeetingService = {
      getMeetingById: vi.fn(),
    };
    mockTranscriptService = {
      getTranscript: vi.fn(),
      hasTranscript: vi.fn(),
    };
    mockMinutesService = {
      generateMinutes: vi.fn(),
    };

    mockCreateLarkClient.mockReturnValue({} as ReturnType<typeof createLarkClient>);
    mockCreateMeetingService.mockReturnValue(
      mockMeetingService as unknown as ReturnType<typeof createMeetingService>
    );
    mockCreateTranscriptService.mockReturnValue(
      mockTranscriptService as unknown as ReturnType<typeof createTranscriptService>
    );
    mockCreateMinutesGenerationService.mockReturnValue(
      mockMinutesService as unknown as ReturnType<typeof createMinutesGenerationService>
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when session is null', async () => {
      mockGetSession.mockResolvedValue(null);

      const response = await POST(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('Authentication required');
    });

    it('should return 401 when session is not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        isAuthenticated: false,
      } as Awaited<ReturnType<typeof getSession>>);

      const response = await POST(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when access token is missing', async () => {
      mockGetSession.mockResolvedValue({
        isAuthenticated: true,
        accessToken: undefined,
      } as unknown as Awaited<ReturnType<typeof getSession>>);

      const response = await POST(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('Access token not found');
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        isAuthenticated: true,
        accessToken: 'test_token',
      } as unknown as Awaited<ReturnType<typeof getSession>>);
    });

    it('should return 400 when meeting ID is empty', async () => {
      const response = await POST(createMockRequest(), createMockContext(''));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PARAMS');
      expect(data.error.message).toBe('Meeting ID is required');
    });

    it('should return 400 when meeting ID is whitespace only', async () => {
      const response = await POST(createMockRequest(), createMockContext('   '));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PARAMS');
    });

    it('should return 400 when language is invalid', async () => {
      const response = await POST(
        createMockRequest({ language: 'fr' }),
        createMockContext('meeting_001')
      );
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should return 400 when regenerate is not boolean', async () => {
      const response = await POST(
        createMockRequest({ regenerate: 'yes' }),
        createMockContext('meeting_001')
      );
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should accept empty body', async () => {
      const mockMeeting = createMockMeeting();
      const mockTranscript = createMockTranscript();
      const mockMinutes = createMockMinutes();

      mockMeetingService.getMeetingById.mockResolvedValue(mockMeeting);
      mockTranscriptService.getTranscript.mockResolvedValue(mockTranscript);
      mockMinutesService.generateMinutes.mockResolvedValue({
        minutes: mockMinutes,
        processingTimeMs: 5000,
        usage: { inputTokens: 1000, outputTokens: 500 },
      });

      const response = await POST(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as SuccessResponseData;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should accept valid language option', async () => {
      const mockMeeting = createMockMeeting();
      const mockTranscript = createMockTranscript();
      const mockMinutes = createMockMinutes();

      mockMeetingService.getMeetingById.mockResolvedValue(mockMeeting);
      mockTranscriptService.getTranscript.mockResolvedValue(mockTranscript);
      mockMinutesService.generateMinutes.mockResolvedValue({
        minutes: mockMinutes,
        processingTimeMs: 5000,
        usage: { inputTokens: 1000, outputTokens: 500 },
      });

      const response = await POST(
        createMockRequest({ language: 'en' }),
        createMockContext('meeting_001')
      );
      const data = (await response.json()) as SuccessResponseData;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Meeting Not Found', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        isAuthenticated: true,
        accessToken: 'test_token',
      } as unknown as Awaited<ReturnType<typeof getSession>>);
    });

    it('should return 404 when meeting is not found', async () => {
      mockMeetingService.getMeetingById.mockRejectedValue(
        new MeetingNotFoundError('meeting_001')
      );

      const response = await POST(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('MEETING_NOT_FOUND');
      expect(data.error.message).toContain('meeting_001');
    });

    it('should return 404 for MeetingApiError', async () => {
      mockMeetingService.getMeetingById.mockRejectedValue(
        new MeetingApiError('API Error', 500, 'getMeetingById')
      );

      const response = await POST(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('MEETING_NOT_FOUND');
    });
  });

  describe('Transcript Not Found', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        isAuthenticated: true,
        accessToken: 'test_token',
      } as unknown as Awaited<ReturnType<typeof getSession>>);
      mockMeetingService.getMeetingById.mockResolvedValue(createMockMeeting());
    });

    it('should return 404 when transcript is not found', async () => {
      mockTranscriptService.getTranscript.mockRejectedValue(
        new TranscriptNotFoundError('meeting_001')
      );

      const response = await POST(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TRANSCRIPT_NOT_FOUND');
      expect(data.error.message).toBe('Transcript not found for this meeting');
    });

    it('should return 404 for TranscriptServiceError', async () => {
      mockTranscriptService.getTranscript.mockRejectedValue(
        new TranscriptServiceError('Service error', 'SERVICE_ERROR', 500)
      );

      const response = await POST(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('TRANSCRIPT_NOT_FOUND');
    });
  });

  describe('Generation Errors', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        isAuthenticated: true,
        accessToken: 'test_token',
      } as unknown as Awaited<ReturnType<typeof getSession>>);
      mockMeetingService.getMeetingById.mockResolvedValue(createMockMeeting());
      mockTranscriptService.getTranscript.mockResolvedValue(createMockTranscript());
    });

    it('should return 500 when API key is missing', async () => {
      mockMinutesService.generateMinutes.mockRejectedValue(
        new MinutesGenerationError('API key missing', 'MISSING_API_KEY')
      );

      const response = await POST(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('GENERATION_FAILED');
      expect(data.error.message).toBe('AI service is not configured');
    });

    it('should return 400 for invalid input errors', async () => {
      mockMinutesService.generateMinutes.mockRejectedValue(
        new MinutesGenerationError('Invalid input', 'INVALID_INPUT')
      );

      const response = await POST(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('GENERATION_FAILED');
    });

    it('should return 500 for other generation errors', async () => {
      mockMinutesService.generateMinutes.mockRejectedValue(
        new MinutesGenerationError('Claude API error', 'CLAUDE_API_ERROR')
      );

      const response = await POST(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('GENERATION_FAILED');
    });

    it('should return 500 for unexpected errors', async () => {
      mockMinutesService.generateMinutes.mockRejectedValue(new Error('Unexpected error'));

      const response = await POST(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('An unexpected error occurred');
    });
  });

  describe('Successful Response', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        isAuthenticated: true,
        accessToken: 'test_token',
      } as unknown as Awaited<ReturnType<typeof getSession>>);
    });

    it('should return generated minutes successfully', async () => {
      const mockMeeting = createMockMeeting();
      const mockTranscript = createMockTranscript();
      const mockMinutes = createMockMinutes();

      mockMeetingService.getMeetingById.mockResolvedValue(mockMeeting);
      mockTranscriptService.getTranscript.mockResolvedValue(mockTranscript);
      mockMinutesService.generateMinutes.mockResolvedValue({
        minutes: mockMinutes,
        processingTimeMs: 5000,
        usage: { inputTokens: 1000, outputTokens: 500 },
      });

      const response = await POST(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as SuccessResponseData;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.minutes).toBeDefined();
      expect(data.data.minutes.meetingId).toBe('meeting_001');
      expect(data.data.processingTimeMs).toBe(5000);
      expect(data.data.usage.inputTokens).toBe(1000);
      expect(data.data.usage.outputTokens).toBe(500);
    });

    it('should use meeting title for minutes', async () => {
      const mockMeeting = createMockMeeting({ title: 'Custom Meeting Title' });
      const mockTranscript = createMockTranscript();
      const mockMinutes = createMockMinutes();

      mockMeetingService.getMeetingById.mockResolvedValue(mockMeeting);
      mockTranscriptService.getTranscript.mockResolvedValue(mockTranscript);
      mockMinutesService.generateMinutes.mockResolvedValue({
        minutes: mockMinutes,
        processingTimeMs: 5000,
        usage: { inputTokens: 1000, outputTokens: 500 },
      });

      const response = await POST(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as SuccessResponseData;

      expect(response.status).toBe(200);
      expect(data.data.minutes.title).toBe('Custom Meeting Title');
    });

    it('should pass correct language option to service', async () => {
      const mockMeeting = createMockMeeting();
      const mockTranscript = createMockTranscript();
      const mockMinutes = createMockMinutes();

      mockMeetingService.getMeetingById.mockResolvedValue(mockMeeting);
      mockTranscriptService.getTranscript.mockResolvedValue(mockTranscript);
      mockMinutesService.generateMinutes.mockResolvedValue({
        minutes: mockMinutes,
        processingTimeMs: 5000,
        usage: { inputTokens: 1000, outputTokens: 500 },
      });

      await POST(createMockRequest({ language: 'en' }), createMockContext('meeting_001'));

      expect(mockMinutesService.generateMinutes).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { language: 'en' },
        })
      );
    });

    it('should default to Japanese language', async () => {
      const mockMeeting = createMockMeeting();
      const mockTranscript = createMockTranscript();
      const mockMinutes = createMockMinutes();

      mockMeetingService.getMeetingById.mockResolvedValue(mockMeeting);
      mockTranscriptService.getTranscript.mockResolvedValue(mockTranscript);
      mockMinutesService.generateMinutes.mockResolvedValue({
        minutes: mockMinutes,
        processingTimeMs: 5000,
        usage: { inputTokens: 1000, outputTokens: 500 },
      });

      await POST(createMockRequest(), createMockContext('meeting_001'));

      expect(mockMinutesService.generateMinutes).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { language: 'ja' },
        })
      );
    });

    it('should include topics, decisions, and action items', async () => {
      const mockMeeting = createMockMeeting();
      const mockTranscript = createMockTranscript();
      const mockMinutes = createMockMinutes();

      mockMeetingService.getMeetingById.mockResolvedValue(mockMeeting);
      mockTranscriptService.getTranscript.mockResolvedValue(mockTranscript);
      mockMinutesService.generateMinutes.mockResolvedValue({
        minutes: mockMinutes,
        processingTimeMs: 5000,
        usage: { inputTokens: 1000, outputTokens: 500 },
      });

      const response = await POST(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as SuccessResponseData;

      expect(data.data.minutes.topics).toHaveLength(1);
      expect(data.data.minutes.decisions).toHaveLength(1);
      expect(data.data.minutes.actionItems).toHaveLength(1);
      expect(data.data.minutes.attendees).toHaveLength(2);
    });
  });

  describe('Service Integration', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        isAuthenticated: true,
        accessToken: 'test_token',
      } as unknown as Awaited<ReturnType<typeof getSession>>);
    });

    it('should create all required services', async () => {
      const mockMeeting = createMockMeeting();
      const mockTranscript = createMockTranscript();
      const mockMinutes = createMockMinutes();

      mockMeetingService.getMeetingById.mockResolvedValue(mockMeeting);
      mockTranscriptService.getTranscript.mockResolvedValue(mockTranscript);
      mockMinutesService.generateMinutes.mockResolvedValue({
        minutes: mockMinutes,
        processingTimeMs: 5000,
        usage: { inputTokens: 1000, outputTokens: 500 },
      });

      await POST(createMockRequest(), createMockContext('meeting_001'));

      expect(mockCreateLarkClient).toHaveBeenCalled();
      expect(mockCreateMeetingService).toHaveBeenCalled();
      expect(mockCreateTranscriptService).toHaveBeenCalled();
      expect(mockCreateMinutesGenerationService).toHaveBeenCalled();
    });

    it('should pass correct access token to services', async () => {
      const mockMeeting = createMockMeeting();
      const mockTranscript = createMockTranscript();
      const mockMinutes = createMockMinutes();

      mockMeetingService.getMeetingById.mockResolvedValue(mockMeeting);
      mockTranscriptService.getTranscript.mockResolvedValue(mockTranscript);
      mockMinutesService.generateMinutes.mockResolvedValue({
        minutes: mockMinutes,
        processingTimeMs: 5000,
        usage: { inputTokens: 1000, outputTokens: 500 },
      });

      await POST(createMockRequest(), createMockContext('meeting_001'));

      expect(mockMeetingService.getMeetingById).toHaveBeenCalledWith('test_token', 'meeting_001');
      expect(mockTranscriptService.getTranscript).toHaveBeenCalledWith('test_token', 'meeting_001');
    });
  });
});
