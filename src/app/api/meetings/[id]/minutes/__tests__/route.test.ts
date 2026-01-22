/**
 * Minutes API route unit tests
 * @module app/api/meetings/[id]/minutes/__tests__/route.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';
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
function createMockRequest(): Request {
  return new Request('http://localhost:3000/api/meetings/meeting_001/minutes');
}

describe('GET /api/meetings/[id]/minutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when session is null', async () => {
      mockGetSession.mockResolvedValue(null);

      const response = await GET(createMockRequest(), createMockContext('meeting_001'));
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

      const response = await GET(createMockRequest(), createMockContext('meeting_001'));
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

      const response = await GET(createMockRequest(), createMockContext('meeting_001'));
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
      const response = await GET(createMockRequest(), createMockContext(''));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PARAMS');
      expect(data.error.message).toBe('Meeting ID is required');
    });

    it('should return 400 when meeting ID is whitespace only', async () => {
      const response = await GET(createMockRequest(), createMockContext('   '));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PARAMS');
    });
  });

  describe('Default Response (Not Found)', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        isAuthenticated: true,
        accessToken: 'test_token',
      } as unknown as Awaited<ReturnType<typeof getSession>>);
    });

    it('should return 404 for valid request (minutes storage not implemented)', async () => {
      const response = await GET(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('MINUTES_NOT_FOUND');
      expect(data.error.message).toBe('Minutes not found for this meeting');
    });

    it('should return 404 for any valid meeting ID', async () => {
      const response = await GET(createMockRequest(), createMockContext('any_meeting_id'));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('MINUTES_NOT_FOUND');
    });
  });
});
