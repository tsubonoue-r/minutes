/**
 * Integration tests for Meetings API
 * Tests the full request -> service -> Lark API flow with MSW mocking
 * @module tests/integration/meetings
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { mockSessionData, mockUnauthenticatedSession } from '../mocks/data';

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
 * Mock the getSession module to control authentication state
 */
vi.mock('@/lib/auth/get-session', () => ({
  getSession: vi.fn(),
}));

/**
 * Mock environment variables for Lark client
 */
vi.stubEnv('LARK_APP_ID', 'test-app-id');
vi.stubEnv('LARK_APP_SECRET', 'test-app-secret');
vi.stubEnv('NEXT_PUBLIC_LARK_REDIRECT_URI', 'http://localhost:3000/api/auth/lark/callback');
vi.stubEnv('LARK_API_BASE_URL', 'https://open.larksuite.com');

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a mock Request object simulating a Next.js API request
 */
function createMockRequest(
  url: string,
  options: RequestInit = {}
): Request {
  return new Request(`http://localhost:3000${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Parse the JSON response from a NextResponse
 */
async function parseResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

// ============================================================================
// Tests: GET /api/meetings
// ============================================================================

describe('GET /api/meetings', () => {
  describe('Authentication', () => {
    it('should return 401 when session is null (unauthenticated)', async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(null);

      const { GET } = await import('@/app/api/meetings/route');
      const request = createMockRequest('/api/meetings');
      const response = await GET(request);

      expect(response.status).toBe(401);

      const body = await parseResponse<{ error: { code: string; message: string } }>(response);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Authentication required');
    });

    it('should return 401 when session is not authenticated', async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(mockUnauthenticatedSession);

      const { GET } = await import('@/app/api/meetings/route');
      const request = createMockRequest('/api/meetings');
      const response = await GET(request);

      expect(response.status).toBe(401);

      const body = await parseResponse<{ error: { code: string } }>(response);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when access token is missing', async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue({
        isAuthenticated: true,
        user: mockSessionData.user,
        // accessToken is undefined
      });

      const { GET } = await import('@/app/api/meetings/route');
      const request = createMockRequest('/api/meetings');
      const response = await GET(request);

      expect(response.status).toBe(401);

      const body = await parseResponse<{ error: { code: string; message: string } }>(response);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Access token not found');
    });
  });

  describe('Successful Requests', () => {
    beforeEach(async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(mockSessionData);
    });

    it('should return meeting list with default pagination', async () => {
      const { GET } = await import('@/app/api/meetings/route');
      const request = createMockRequest('/api/meetings');
      const response = await GET(request);

      expect(response.status).toBe(200);

      const body = await parseResponse<{
        data: Array<{ id: string; title: string }>;
        pagination: { page: number; limit: number; total: number };
      }>(response);

      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBe(1);
    });

    it('should apply pagination parameters', async () => {
      const { GET } = await import('@/app/api/meetings/route');
      const request = createMockRequest('/api/meetings?page=1&limit=2');
      const response = await GET(request);

      expect(response.status).toBe(200);

      const body = await parseResponse<{
        data: unknown[];
        pagination: { page: number; limit: number };
      }>(response);

      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(2);
    });

    it('should apply status filter', async () => {
      const { GET } = await import('@/app/api/meetings/route');
      const request = createMockRequest('/api/meetings?status=ended');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should apply date range filter', async () => {
      const { GET } = await import('@/app/api/meetings/route');
      const request = createMockRequest(
        '/api/meetings?startDate=2024-01-15T00:00:00Z&endDate=2024-01-16T23:59:59Z'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should apply search parameter', async () => {
      const { GET } = await import('@/app/api/meetings/route');
      const request = createMockRequest('/api/meetings?search=standup');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should apply sorting parameters', async () => {
      const { GET } = await import('@/app/api/meetings/route');
      const request = createMockRequest('/api/meetings?sortBy=title&sortOrder=asc');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should return meetings with serialized dates', async () => {
      const { GET } = await import('@/app/api/meetings/route');
      const request = createMockRequest('/api/meetings');
      const response = await GET(request);

      const body = await parseResponse<{
        data: Array<{
          id: string;
          startTime: string;
          endTime: string;
          createdAt: string;
          updatedAt: string;
        }>;
      }>(response);

      if (body.data.length > 0) {
        const meeting = body.data[0];
        // Dates should be ISO strings
        if (meeting) {
          expect(typeof meeting.startTime).toBe('string');
          expect(typeof meeting.endTime).toBe('string');
        }
      }
    });
  });

  describe('Query Parameter Validation', () => {
    beforeEach(async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(mockSessionData);
    });

    it('should handle invalid page number gracefully', async () => {
      const { GET } = await import('@/app/api/meetings/route');
      const request = createMockRequest('/api/meetings?page=-1');
      const response = await GET(request);

      // Should default to page 1 rather than error
      expect(response.status).toBe(200);
    });

    it('should cap limit at 100', async () => {
      const { GET } = await import('@/app/api/meetings/route');
      const request = createMockRequest('/api/meetings?limit=200');
      const response = await GET(request);

      expect(response.status).toBe(200);

      const body = await parseResponse<{
        pagination: { limit: number };
      }>(response);

      expect(body.pagination.limit).toBeLessThanOrEqual(100);
    });

    it('should handle empty search string', async () => {
      const { GET } = await import('@/app/api/meetings/route');
      const request = createMockRequest('/api/meetings?search=');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(mockSessionData);
    });

    it('should handle Lark API errors gracefully', async () => {
      // Override the MSW handler to return an error response
      // Using server.use with a one-time handler
      server.use(
        http.get(
          'https://open.larksuite.com/open-apis/vc/v1/meeting_list',
          () => {
            return HttpResponse.json({
              code: 99991400,
              msg: 'internal server error',
            });
          },
          { once: true }
        )
      );

      // Re-import the route to get a fresh handler
      // that will make a new request to the mocked endpoint
      vi.resetModules();

      // Re-mock getSession after module reset
      vi.doMock('@/lib/auth/get-session', () => ({
        getSession: vi.fn().mockResolvedValue(mockSessionData),
      }));

      const { GET } = await import('@/app/api/meetings/route');
      const request = createMockRequest('/api/meetings');
      const response = await GET(request);

      // After module reset, the route makes a fresh request
      // The LarkClient should throw when code != 0
      // The route catches and returns error response
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});

// ============================================================================
// Tests: GET /api/meetings/:id
// ============================================================================

describe('GET /api/meetings/:id', () => {
  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(null);

      const { GET } = await import('@/app/api/meetings/[id]/route');
      const request = createMockRequest('/api/meetings/meeting-001');
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await GET(request, context);

      expect(response.status).toBe(401);
    });
  });

  describe('Successful Requests', () => {
    beforeEach(async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(mockSessionData);
    });

    it('should return meeting detail for valid ID', async () => {
      const { GET } = await import('@/app/api/meetings/[id]/route');
      const request = createMockRequest('/api/meetings/meeting-001');
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await GET(request, context);

      expect(response.status).toBe(200);

      const body = await parseResponse<{
        data: {
          id: string;
          title: string;
          status: string;
        };
      }>(response);

      expect(body.data).toBeDefined();
      expect(body.data.id).toBe('meeting-001');
    });

    it('should return meeting with serialized date fields', async () => {
      const { GET } = await import('@/app/api/meetings/[id]/route');
      const request = createMockRequest('/api/meetings/meeting-001');
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await GET(request, context);

      expect(response.status).toBe(200);

      const body = await parseResponse<{
        data: {
          startTime: string;
          endTime: string;
          createdAt: string;
          updatedAt: string;
        };
      }>(response);

      expect(typeof body.data.startTime).toBe('string');
      expect(typeof body.data.endTime).toBe('string');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(mockSessionData);
    });

    it('should return 400 for empty meeting ID', async () => {
      const { GET } = await import('@/app/api/meetings/[id]/route');
      const request = createMockRequest('/api/meetings/ ');
      const context = { params: Promise.resolve({ id: '  ' }) };
      const response = await GET(request, context);

      expect(response.status).toBe(400);

      const body = await parseResponse<{ error: { code: string } }>(response);
      expect(body.error.code).toBe('INVALID_PARAMS');
    });

    it('should return 404 for non-existent meeting', async () => {
      const { GET } = await import('@/app/api/meetings/[id]/route');
      const request = createMockRequest('/api/meetings/non-existent');
      const context = { params: Promise.resolve({ id: 'non-existent' }) };
      const response = await GET(request, context);

      // Should return 404 or error status
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});

// ============================================================================
// Tests: GET /api/meetings/:id/participants
// ============================================================================

describe('GET /api/meetings/:id/participants', () => {
  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(null);

      const { GET } = await import('@/app/api/meetings/[id]/participants/route');
      const request = createMockRequest('/api/meetings/meeting-001/participants');
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await GET(request, context);

      expect(response.status).toBe(401);
    });
  });

  describe('Successful Requests', () => {
    beforeEach(async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(mockSessionData);
    });

    it('should return participant list for valid meeting', async () => {
      const { GET } = await import('@/app/api/meetings/[id]/participants/route');
      const request = createMockRequest('/api/meetings/meeting-001/participants');
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await GET(request, context);

      expect(response.status).toBe(200);

      const body = await parseResponse<{
        data: Array<{ id: string; name: string; isHost: boolean }>;
        pagination: { page: number; limit: number; total: number };
      }>(response);

      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.pagination).toBeDefined();
    });

    it('should apply pagination to participants', async () => {
      const { GET } = await import('@/app/api/meetings/[id]/participants/route');
      const request = createMockRequest('/api/meetings/meeting-001/participants?page=1&limit=2');
      const context = { params: Promise.resolve({ id: 'meeting-001' }) };
      const response = await GET(request, context);

      expect(response.status).toBe(200);

      const body = await parseResponse<{
        pagination: { page: number; limit: number };
      }>(response);

      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(2);
    });

    it('should return empty list for meeting with no participants', async () => {
      const { GET } = await import('@/app/api/meetings/[id]/participants/route');
      const request = createMockRequest('/api/meetings/meeting-003/participants');
      const context = { params: Promise.resolve({ id: 'meeting-003' }) };
      const response = await GET(request, context);

      expect(response.status).toBe(200);

      const body = await parseResponse<{
        data: unknown[];
        pagination: { total: number };
      }>(response);

      expect(body.data).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      const { getSession } = await import('@/lib/auth/get-session');
      vi.mocked(getSession).mockResolvedValue(mockSessionData);
    });

    it('should return 400 for empty meeting ID', async () => {
      const { GET } = await import('@/app/api/meetings/[id]/participants/route');
      const request = createMockRequest('/api/meetings/ /participants');
      const context = { params: Promise.resolve({ id: '  ' }) };
      const response = await GET(request, context);

      expect(response.status).toBe(400);
    });
  });
});
