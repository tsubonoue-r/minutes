/**
 * Minutes Edit API route unit tests
 * @module app/api/meetings/[id]/minutes/edit/__tests__/route.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PUT } from '../route';
import { getSession } from '@/lib/auth/get-session';

// Mock dependencies
vi.mock('@/lib/auth/get-session');

const mockGetSession = vi.mocked(getSession);

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
 * Success response type
 */
interface SuccessResponseData {
  readonly success: true;
  readonly data: {
    readonly id: string;
    readonly meetingId: string;
    readonly updatedAt: string;
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
 * Create a valid test minutes body
 */
function createValidMinutesBody(meetingId: string = 'meeting_001'): Record<string, unknown> {
  return {
    id: 'min_test_001',
    meetingId,
    title: 'Test Meeting',
    date: '2026-02-11',
    duration: 3600000,
    summary: 'A test meeting summary.',
    topics: [
      {
        id: 'topic_001',
        title: 'Topic One',
        startTime: 0,
        endTime: 600000,
        summary: 'Discussion of topic one.',
        keyPoints: ['Key point A'],
        speakers: [{ id: 'speaker_001', name: 'Alice' }],
      },
    ],
    decisions: [
      {
        id: 'decision_001',
        content: 'Approved budget',
        context: 'After review.',
        decidedAt: 300000,
      },
    ],
    actionItems: [
      {
        id: 'action_001',
        content: 'Prepare report',
        priority: 'high',
        status: 'pending',
      },
    ],
    attendees: [{ id: 'speaker_001', name: 'Alice' }],
    metadata: {
      generatedAt: '2026-02-11T10:00:00.000Z',
      model: 'claude-sonnet-4',
      processingTimeMs: 5000,
      confidence: 0.92,
    },
  };
}

/**
 * Create mock request with JSON body
 */
function createMockRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/meetings/meeting_001/minutes/edit', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Create mock request with invalid body
 */
function createInvalidBodyRequest(): Request {
  return new Request('http://localhost:3000/api/meetings/meeting_001/minutes/edit', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: 'not valid json{{{',
  });
}

describe('PUT /api/meetings/[id]/minutes/edit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when session is null', async () => {
      mockGetSession.mockResolvedValue(null);

      const response = await PUT(
        createMockRequest(createValidMinutesBody()),
        createMockContext('meeting_001')
      );
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when session is not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        isAuthenticated: false,
      } as Awaited<ReturnType<typeof getSession>>);

      const response = await PUT(
        createMockRequest(createValidMinutesBody()),
        createMockContext('meeting_001')
      );
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

      const response = await PUT(
        createMockRequest(createValidMinutesBody()),
        createMockContext('meeting_001')
      );
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
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
      const response = await PUT(
        createMockRequest(createValidMinutesBody()),
        createMockContext('')
      );
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PARAMS');
    });

    it('should return 400 when request body is invalid JSON', async () => {
      const response = await PUT(
        createInvalidBodyRequest(),
        createMockContext('meeting_001')
      );
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_BODY');
    });

    it('should return 400 when minutes data fails validation', async () => {
      const invalidBody = { id: '', title: '' };

      const response = await PUT(
        createMockRequest(invalidBody),
        createMockContext('meeting_001')
      );
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when meetingId does not match URL parameter', async () => {
      const body = createValidMinutesBody('different_meeting_id');

      const response = await PUT(
        createMockRequest(body),
        createMockContext('meeting_001')
      );
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('MEETING_ID_MISMATCH');
    });
  });

  describe('Successful Update', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        isAuthenticated: true,
        accessToken: 'test_token',
      } as unknown as Awaited<ReturnType<typeof getSession>>);
    });

    it('should return 200 with valid minutes data', async () => {
      const body = createValidMinutesBody('meeting_001');

      const response = await PUT(
        createMockRequest(body),
        createMockContext('meeting_001')
      );
      const data = (await response.json()) as SuccessResponseData;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('min_test_001');
      expect(data.data.meetingId).toBe('meeting_001');
      expect(data.data.updatedAt).toBeDefined();
    });

    it('should return valid ISO timestamp in updatedAt', async () => {
      const body = createValidMinutesBody('meeting_001');

      const response = await PUT(
        createMockRequest(body),
        createMockContext('meeting_001')
      );
      const data = (await response.json()) as SuccessResponseData;

      expect(response.status).toBe(200);
      const parsedDate = new Date(data.data.updatedAt);
      expect(parsedDate.getTime()).not.toBeNaN();
    });
  });
});
