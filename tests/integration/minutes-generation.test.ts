/**
 * Integration tests for Minutes Generation API
 * Tests the transcript -> AI generation -> response flow
 * @module tests/integration/minutes-generation
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { server } from '../mocks/server';
import {
  mockSessionData,
  mockUnauthenticatedSession,
  mockMinutes,
  mockTranscript,
} from '../mocks/data';

// ============================================================================
// MSW Server Lifecycle
// ============================================================================

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

// ============================================================================
// Module Mocking
// ============================================================================

/**
 * Mock the getSession module
 */
vi.mock('@/lib/auth/get-session', () => ({
  getSession: vi.fn(),
}));

/**
 * Mock the meeting service (Lark API interaction)
 */
vi.mock('@/lib/lark/meeting', () => {
  const MeetingNotFoundError = class extends Error {
    readonly meetingId: string;
    constructor(meetingId: string) {
      super(`Meeting not found: ${meetingId}`);
      this.name = 'MeetingNotFoundError';
      this.meetingId = meetingId;
    }
  };

  const MeetingApiError = class extends Error {
    readonly code: number;
    readonly operation: string;
    readonly details: unknown;
    constructor(message: string, code: number, operation: string, details?: unknown) {
      super(message);
      this.name = 'MeetingApiError';
      this.code = code;
      this.operation = operation;
      this.details = details;
    }
  };

  return {
    createMeetingService: vi.fn(),
    MeetingNotFoundError,
    MeetingApiError,
  };
});

/**
 * Mock the transcript service
 */
vi.mock('@/services/transcript.service', () => {
  const TranscriptNotFoundError = class extends Error {
    constructor(meetingId: string) {
      super(`Transcript not found for meeting: ${meetingId}`);
      this.name = 'TranscriptNotFoundError';
    }
  };

  const TranscriptServiceError = class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'TranscriptServiceError';
    }
  };

  return {
    createTranscriptService: vi.fn(),
    TranscriptNotFoundError,
    TranscriptServiceError,
  };
});

/**
 * Mock the minutes generation service
 */
vi.mock('@/services/minutes-generation.service', () => {
  const MinutesGenerationError = class extends Error {
    readonly code: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = 'MinutesGenerationError';
      this.code = code;
    }
  };

  return {
    createMinutesGenerationService: vi.fn(),
    MinutesGenerationError,
  };
});

/**
 * Mock environment variables
 */
vi.stubEnv('LARK_APP_ID', 'test-app-id');
vi.stubEnv('LARK_APP_SECRET', 'test-app-secret');
vi.stubEnv('NEXT_PUBLIC_LARK_REDIRECT_URI', 'http://localhost:3000/api/auth/lark/callback');
vi.stubEnv('ANTHROPIC_API_KEY', 'test-api-key');

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a mock Request object
 */
function createMockRequest(
  url: string,
  options: RequestInit = {}
): Request {
  return new Request(`http://localhost:3000${url}`, {
    method: 'POST',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Parse the JSON response
 */
async function parseResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

/**
 * Mock meeting data for the meeting service
 */
const mockMeetingData = {
  id: 'meeting-001',
  title: 'Weekly Team Standup',
  meetingNo: 'MTG-2024-001',
  startTime: new Date('2024-01-15T10:00:00Z'),
  endTime: new Date('2024-01-15T11:00:00Z'),
  durationMinutes: 60,
  status: 'ended' as const,
  type: 'regular' as const,
  host: {
    id: 'user-host-001',
    name: 'Alice Smith',
  },
  participantCount: 5,
  hasRecording: true,
  minutesStatus: 'not_created' as const,
  createdAt: new Date('2024-01-15T09:00:00Z'),
  updatedAt: new Date('2024-01-15T11:30:00Z'),
};

/**
 * Mock minutes generation result
 */
const mockGenerationResult = {
  minutes: mockMinutes,
  processingTimeMs: 3500,
  usage: {
    inputTokens: 1500,
    outputTokens: 800,
  },
};

// ============================================================================
// Tests: POST /api/meetings/:id/minutes/generate
// ============================================================================

describe('POST /api/meetings/:id/minutes/generate', () => {
  describe('Authentication', () => {
    it('should return 401 when session is null', async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(null);

      const { POST } = await import('@/app/api/meetings/[id]/minutes/generate/route');
      const request = createMockRequest('/api/meetings/meeting-001/minutes/generate');
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await POST(request, context);

      expect(response.status).toBe(401);

      const body = await parseResponse<{ success: false; error: { code: string } }>(response);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(mockUnauthenticatedSession);

      const { POST } = await import('@/app/api/meetings/[id]/minutes/generate/route');
      const request = createMockRequest('/api/meetings/meeting-001/minutes/generate');
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await POST(request, context);

      expect(response.status).toBe(401);
    });

    it('should return 401 when access token is missing', async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue({
        isAuthenticated: true,
        user: mockSessionData.user,
        // accessToken is undefined
      });

      const { POST } = await import('@/app/api/meetings/[id]/minutes/generate/route');
      const request = createMockRequest('/api/meetings/meeting-001/minutes/generate');
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await POST(request, context);

      expect(response.status).toBe(401);
    });
  });

  describe('Parameter Validation', () => {
    beforeEach(async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(mockSessionData);
    });

    it('should return 400 for empty meeting ID', async () => {
      const { POST } = await import('@/app/api/meetings/[id]/minutes/generate/route');
      const request = createMockRequest('/api/meetings/ /minutes/generate');
      const context = { params: Promise.resolve({ id: '  ' }) };
      const response = await POST(request, context);

      expect(response.status).toBe(400);

      const body = await parseResponse<{ success: false; error: { code: string } }>(response);
      expect(body.error.code).toBe('INVALID_PARAMS');
    });

    it('should return 400 for invalid request body', async () => {
      const { createMeetingService } = await import('@/lib/lark/meeting');
      vi.mocked(createMeetingService).mockReturnValue({
        getMeetingById: vi.fn().mockResolvedValue(mockMeetingData),
      } as unknown as ReturnType<typeof createMeetingService>);

      const { POST } = await import('@/app/api/meetings/[id]/minutes/generate/route');
      const request = new Request(
        'http://localhost:3000/api/meetings/meeting-001/minutes/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: 'invalid-language' }),
        }
      );
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await POST(request, context);

      expect(response.status).toBe(400);
    });

    it('should accept empty body (use defaults)', async () => {
      const { createMeetingService } = await import('@/lib/lark/meeting');
      vi.mocked(createMeetingService).mockReturnValue({
        getMeetingById: vi.fn().mockResolvedValue(mockMeetingData),
      } as unknown as ReturnType<typeof createMeetingService>);

      const { createTranscriptService } = await import('@/services/transcript.service');
      vi.mocked(createTranscriptService).mockReturnValue({
        getTranscript: vi.fn().mockResolvedValue(mockTranscript),
      } as unknown as ReturnType<typeof createTranscriptService>);

      const { createMinutesGenerationService } = await import('@/services/minutes-generation.service');
      vi.mocked(createMinutesGenerationService).mockReturnValue({
        generateMinutes: vi.fn().mockResolvedValue(mockGenerationResult),
      } as unknown as ReturnType<typeof createMinutesGenerationService>);

      const { POST } = await import('@/app/api/meetings/[id]/minutes/generate/route');
      const request = new Request(
        'http://localhost:3000/api/meetings/meeting-001/minutes/generate',
        {
          method: 'POST',
          // No body or content-type
        }
      );
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await POST(request, context);

      expect(response.status).toBe(200);
    });
  });

  describe('Successful Generation Flow', () => {
    beforeEach(async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(mockSessionData);

      const { createMeetingService } = await import('@/lib/lark/meeting');
      vi.mocked(createMeetingService).mockReturnValue({
        getMeetingById: vi.fn().mockResolvedValue(mockMeetingData),
      } as unknown as ReturnType<typeof createMeetingService>);

      const { createTranscriptService } = await import('@/services/transcript.service');
      vi.mocked(createTranscriptService).mockReturnValue({
        getTranscript: vi.fn().mockResolvedValue(mockTranscript),
      } as unknown as ReturnType<typeof createTranscriptService>);

      const { createMinutesGenerationService } = await import('@/services/minutes-generation.service');
      vi.mocked(createMinutesGenerationService).mockReturnValue({
        generateMinutes: vi.fn().mockResolvedValue(mockGenerationResult),
      } as unknown as ReturnType<typeof createMinutesGenerationService>);
    });

    it('should generate minutes with default language (ja)', async () => {
      const { POST } = await import('@/app/api/meetings/[id]/minutes/generate/route');
      const request = createMockRequest('/api/meetings/meeting-001/minutes/generate', {
        body: JSON.stringify({}),
      });
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await POST(request, context);

      expect(response.status).toBe(200);

      const body = await parseResponse<{
        success: true;
        data: {
          minutes: typeof mockMinutes;
          processingTimeMs: number;
          usage: { inputTokens: number; outputTokens: number };
        };
      }>(response);

      expect(body.success).toBe(true);
      expect(body.data.minutes).toBeDefined();
      expect(body.data.processingTimeMs).toBe(3500);
      expect(body.data.usage.inputTokens).toBe(1500);
      expect(body.data.usage.outputTokens).toBe(800);
    });

    it('should generate minutes with specified language', async () => {
      const { createMinutesGenerationService } = await import('@/services/minutes-generation.service');
      const mockGenerate = vi.fn().mockResolvedValue(mockGenerationResult);
      vi.mocked(createMinutesGenerationService).mockReturnValue({
        generateMinutes: mockGenerate,
      } as unknown as ReturnType<typeof createMinutesGenerationService>);

      const { POST } = await import('@/app/api/meetings/[id]/minutes/generate/route');
      const request = createMockRequest('/api/meetings/meeting-001/minutes/generate', {
        body: JSON.stringify({ language: 'en' }),
      });
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await POST(request, context);

      expect(response.status).toBe(200);

      // Verify language was passed to the service
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            language: 'en',
          }),
        })
      );
    });

    it('should include meeting title in generated minutes', async () => {
      const { POST } = await import('@/app/api/meetings/[id]/minutes/generate/route');
      const request = createMockRequest('/api/meetings/meeting-001/minutes/generate', {
        body: JSON.stringify({ language: 'ja' }),
      });
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await POST(request, context);

      expect(response.status).toBe(200);

      const body = await parseResponse<{
        success: true;
        data: {
          minutes: { title: string };
        };
      }>(response);

      // Title should be set from meeting data
      expect(body.data.minutes.title).toBe('Weekly Team Standup');
    });

    it('should pass transcript to generation service', async () => {
      const { createMinutesGenerationService } = await import('@/services/minutes-generation.service');
      const mockGenerate = vi.fn().mockResolvedValue(mockGenerationResult);
      vi.mocked(createMinutesGenerationService).mockReturnValue({
        generateMinutes: mockGenerate,
      } as unknown as ReturnType<typeof createMinutesGenerationService>);

      const { POST } = await import('@/app/api/meetings/[id]/minutes/generate/route');
      const request = createMockRequest('/api/meetings/meeting-001/minutes/generate', {
        body: JSON.stringify({}),
      });
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      await POST(request, context);

      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          transcript: mockTranscript,
          meeting: expect.objectContaining({
            id: 'meeting-001',
            title: 'Weekly Team Standup',
          }),
        })
      );
    });
  });

  describe('Error Handling - Meeting Not Found', () => {
    beforeEach(async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(mockSessionData);
    });

    it('should return 404 when meeting is not found', async () => {
      const { createMeetingService, MeetingNotFoundError } = await import('@/lib/lark/meeting');
      vi.mocked(createMeetingService).mockReturnValue({
        getMeetingById: vi.fn().mockRejectedValue(
          new MeetingNotFoundError('non-existent-meeting')
        ),
      } as unknown as ReturnType<typeof createMeetingService>);

      const { POST } = await import('@/app/api/meetings/[id]/minutes/generate/route');
      const request = createMockRequest('/api/meetings/non-existent-meeting/minutes/generate', {
        body: JSON.stringify({}),
      });
      const context = { params: Promise.resolve({ id: 'non-existent-meeting' }) };
      const response = await POST(request, context);

      expect(response.status).toBe(404);

      const body = await parseResponse<{ success: false; error: { code: string } }>(response);
      expect(body.error.code).toBe('MEETING_NOT_FOUND');
    });
  });

  describe('Error Handling - Transcript Not Found', () => {
    beforeEach(async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(mockSessionData);

      const { createMeetingService } = await import('@/lib/lark/meeting');
      vi.mocked(createMeetingService).mockReturnValue({
        getMeetingById: vi.fn().mockResolvedValue(mockMeetingData),
      } as unknown as ReturnType<typeof createMeetingService>);
    });

    it('should return 404 when transcript is not found', async () => {
      const { createTranscriptService, TranscriptNotFoundError } = await import('@/services/transcript.service');
      vi.mocked(createTranscriptService).mockReturnValue({
        getTranscript: vi.fn().mockRejectedValue(
          new TranscriptNotFoundError('meeting-001')
        ),
      } as unknown as ReturnType<typeof createTranscriptService>);

      const { POST } = await import('@/app/api/meetings/[id]/minutes/generate/route');
      const request = createMockRequest('/api/meetings/meeting-001/minutes/generate', {
        body: JSON.stringify({}),
      });
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await POST(request, context);

      expect(response.status).toBe(404);

      const body = await parseResponse<{ success: false; error: { code: string } }>(response);
      expect(body.error.code).toBe('TRANSCRIPT_NOT_FOUND');
    });
  });

  describe('Error Handling - Generation Failure', () => {
    beforeEach(async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(mockSessionData);

      const { createMeetingService } = await import('@/lib/lark/meeting');
      vi.mocked(createMeetingService).mockReturnValue({
        getMeetingById: vi.fn().mockResolvedValue(mockMeetingData),
      } as unknown as ReturnType<typeof createMeetingService>);

      const { createTranscriptService } = await import('@/services/transcript.service');
      vi.mocked(createTranscriptService).mockReturnValue({
        getTranscript: vi.fn().mockResolvedValue(mockTranscript),
      } as unknown as ReturnType<typeof createTranscriptService>);
    });

    it('should return 500 when AI generation fails', async () => {
      const { createMinutesGenerationService, MinutesGenerationError } = await import('@/services/minutes-generation.service');
      vi.mocked(createMinutesGenerationService).mockReturnValue({
        generateMinutes: vi.fn().mockRejectedValue(
          new MinutesGenerationError('AI service unavailable', 'API_ERROR')
        ),
      } as unknown as ReturnType<typeof createMinutesGenerationService>);

      const { POST } = await import('@/app/api/meetings/[id]/minutes/generate/route');
      const request = createMockRequest('/api/meetings/meeting-001/minutes/generate', {
        body: JSON.stringify({}),
      });
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await POST(request, context);

      expect(response.status).toBe(500);

      const body = await parseResponse<{ success: false; error: { code: string } }>(response);
      expect(body.error.code).toBe('GENERATION_FAILED');
    });

    it('should return 500 when API key is missing', async () => {
      const { createMinutesGenerationService, MinutesGenerationError } = await import('@/services/minutes-generation.service');
      vi.mocked(createMinutesGenerationService).mockReturnValue({
        generateMinutes: vi.fn().mockRejectedValue(
          new MinutesGenerationError('ANTHROPIC_API_KEY is not set', 'MISSING_API_KEY')
        ),
      } as unknown as ReturnType<typeof createMinutesGenerationService>);

      const { POST } = await import('@/app/api/meetings/[id]/minutes/generate/route');
      const request = createMockRequest('/api/meetings/meeting-001/minutes/generate', {
        body: JSON.stringify({}),
      });
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await POST(request, context);

      expect(response.status).toBe(500);

      const body = await parseResponse<{ success: false; error: { code: string; message: string } }>(response);
      expect(body.error.code).toBe('GENERATION_FAILED');
      expect(body.error.message).toContain('not configured');
    });

    it('should return 400 for invalid input error', async () => {
      const { createMinutesGenerationService, MinutesGenerationError } = await import('@/services/minutes-generation.service');
      vi.mocked(createMinutesGenerationService).mockReturnValue({
        generateMinutes: vi.fn().mockRejectedValue(
          new MinutesGenerationError('Empty transcript', 'INVALID_INPUT')
        ),
      } as unknown as ReturnType<typeof createMinutesGenerationService>);

      const { POST } = await import('@/app/api/meetings/[id]/minutes/generate/route');
      const request = createMockRequest('/api/meetings/meeting-001/minutes/generate', {
        body: JSON.stringify({}),
      });
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await POST(request, context);

      expect(response.status).toBe(400);

      const body = await parseResponse<{ success: false; error: { code: string } }>(response);
      expect(body.error.code).toBe('GENERATION_FAILED');
    });
  });

  describe('Error Handling - Unexpected Errors', () => {
    beforeEach(async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(mockSessionData);
    });

    it('should return 500 for unexpected errors', async () => {
      const { createMeetingService } = await import('@/lib/lark/meeting');
      vi.mocked(createMeetingService).mockReturnValue({
        getMeetingById: vi.fn().mockRejectedValue(new Error('Unexpected failure')),
      } as unknown as ReturnType<typeof createMeetingService>);

      const { POST } = await import('@/app/api/meetings/[id]/minutes/generate/route');
      const request = createMockRequest('/api/meetings/meeting-001/minutes/generate', {
        body: JSON.stringify({}),
      });
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await POST(request, context);

      expect(response.status).toBe(500);

      const body = await parseResponse<{ success: false; error: { code: string } }>(response);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
