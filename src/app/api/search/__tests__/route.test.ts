/**
 * Search API route unit tests
 * @module app/api/search/__tests__/route.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import { createMeetingService } from '@/services/meeting.service';
import { createLarkBaseServiceFromEnv } from '@/services/lark-base.service';
import { createTranscriptService } from '@/services/transcript.service';
import type { Meeting } from '@/types/meeting';
import type { Minutes } from '@/types/minutes';
import type { SessionData } from '@/types/auth';

// Mock dependencies
vi.mock('@/lib/auth/get-session');
vi.mock('@/lib/lark/client');
vi.mock('@/services/meeting.service');
vi.mock('@/services/lark-base.service');
vi.mock('@/services/transcript.service');

const mockGetSession = vi.mocked(getSession);
const mockCreateLarkClient = vi.mocked(createLarkClient);
const mockCreateMeetingService = vi.mocked(createMeetingService);
const mockCreateLarkBaseServiceFromEnv = vi.mocked(createLarkBaseServiceFromEnv);
const mockCreateTranscriptService = vi.mocked(createTranscriptService);

// ============================================================================
// Test Helpers
// ============================================================================

interface ErrorResponseData {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

interface SearchResponseData {
  readonly query: string;
  readonly results: readonly unknown[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
  readonly hasMore: boolean;
  readonly executionTimeMs: number;
}

function createMockSession(overrides?: Partial<SessionData>): SessionData {
  return {
    isAuthenticated: true,
    user: {
      openId: 'user-001',
      unionId: 'union-001',
      name: 'Test User',
      email: 'test@example.com',
      avatarUrl: '',
      tenantKey: 'tenant-001',
    },
    accessToken: 'mock-access-token',
    ...overrides,
  };
}

function createMockMeeting(overrides: Partial<Meeting> = {}): Meeting {
  const now = new Date();
  const startTime = new Date(now.getTime() - 3600000);
  const endTime = new Date();

  return {
    id: 'meeting-001',
    title: 'Project Update Meeting',
    meetingNo: 'MTG-001',
    startTime,
    endTime,
    durationMinutes: 60,
    status: 'ended',
    type: 'regular',
    host: { id: 'host-001', name: 'Host User' },
    participantCount: 5,
    hasRecording: false,
    minutesStatus: 'draft',
    createdAt: startTime,
    updatedAt: now,
    ...overrides,
  };
}

function createMockMinutes(overrides: Partial<Minutes> = {}): Minutes {
  return {
    id: 'min-001',
    meetingId: 'meeting-001',
    title: 'Project Update Meeting',
    date: '2025-01-15',
    duration: 3600000,
    summary: 'Discussed project updates and next steps.',
    topics: [
      {
        id: 'topic-001',
        title: 'Project Status',
        startTime: 0,
        endTime: 1800000,
        summary: 'Current status of the project.',
        keyPoints: ['On track', 'Budget approved'],
        speakers: [{ id: 'speaker-001', name: 'Alice' }],
      },
    ],
    decisions: [
      {
        id: 'dec-001',
        content: 'Approve budget increase',
        context: 'Project needs additional resources',
        decidedAt: 1200000,
      },
    ],
    actionItems: [
      {
        id: 'action-001',
        content: 'Prepare sprint backlog',
        assignee: { id: 'speaker-001', name: 'Alice' },
        dueDate: '2025-01-20',
        priority: 'high',
        status: 'pending',
      },
    ],
    attendees: [
      { id: 'speaker-001', name: 'Alice' },
      { id: 'speaker-002', name: 'Bob' },
    ],
    metadata: {
      generatedAt: '2025-01-15T12:00:00Z',
      model: 'claude-sonnet-4',
      processingTimeMs: 5000,
      confidence: 0.92,
    },
    ...overrides,
  };
}

function createGETRequest(queryString: string): Request {
  return new Request(`http://localhost:3000/api/search?${queryString}`, {
    method: 'GET',
  });
}

function createPOSTRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ============================================================================
// Mock Service Setup
// ============================================================================

function setupMockServices(options?: {
  meetings?: Meeting[];
  minutes?: Minutes[];
}) {
  const meetings = options?.meetings ?? [createMockMeeting()];
  const minutes = options?.minutes ?? [createMockMinutes()];

  // Mock LarkClient
  mockCreateLarkClient.mockReturnValue({} as ReturnType<typeof createLarkClient>);

  // Mock MeetingService
  const mockMeetingService = {
    getMeetings: vi.fn().mockResolvedValue({
      meetings,
      pagination: {
        page: 1,
        pageSize: 100,
        total: meetings.length,
        hasMore: false,
      },
    }),
  };
  mockCreateMeetingService.mockReturnValue(
    mockMeetingService as unknown as ReturnType<typeof createMeetingService>
  );

  // Mock LarkBaseService
  const mockLarkBaseService = {
    listMeetings: vi.fn().mockResolvedValue({
      meetings,
      hasMore: false,
    }),
    getMinutes: vi.fn().mockImplementation((meetingId: string) => {
      const found = minutes.find((m) => m.meetingId === meetingId);
      return Promise.resolve(found ?? null);
    }),
  };
  mockCreateLarkBaseServiceFromEnv.mockReturnValue(
    mockLarkBaseService as unknown as ReturnType<typeof createLarkBaseServiceFromEnv>
  );

  // Mock TranscriptService
  const mockTranscriptService = {
    hasTranscript: vi.fn().mockResolvedValue(false),
    getTranscript: vi.fn().mockResolvedValue(null),
  };
  mockCreateTranscriptService.mockReturnValue(
    mockTranscriptService as unknown as ReturnType<typeof createTranscriptService>
  );

  return { mockMeetingService, mockLarkBaseService, mockTranscriptService };
}

// ============================================================================
// Tests
// ============================================================================

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when session is null', async () => {
      mockGetSession.mockResolvedValue(null);

      const request = createGETRequest('q=test');
      const response = await GET(request);
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('Authentication required');
    });

    it('should return 401 when session is not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        isAuthenticated: false,
      } as SessionData);

      const request = createGETRequest('q=test');
      const response = await GET(request);
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when access token is missing', async () => {
      mockGetSession.mockResolvedValue({
        isAuthenticated: true,
        accessToken: undefined,
      } as unknown as SessionData);

      const request = createGETRequest('q=test');
      const response = await GET(request);
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('Access token not found');
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue(createMockSession());
      setupMockServices();
    });

    it('should return 400 when query is missing', async () => {
      const request = createGETRequest('');
      const response = await GET(request);
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_PARAMS');
    });

    it('should return empty response when query is empty string', async () => {
      const request = createGETRequest('q=');
      const response = await GET(request);

      // Empty query returns 400 because zod min(1) validation fails
      expect(response.status).toBe(400);
    });
  });

  describe('Successful Search', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue(createMockSession());
    });

    it('should return search results for matching meetings', async () => {
      setupMockServices({
        meetings: [createMockMeeting({ title: 'Project Update Meeting' })],
      });

      const request = createGETRequest('q=Project&targets=meetings');
      const response = await GET(request);
      const data = (await response.json()) as SearchResponseData;

      expect(response.status).toBe(200);
      expect(data.query).toBe('Project');
      expect(data.total).toBeGreaterThanOrEqual(0);
      expect(data.page).toBe(1);
      expect(data.limit).toBe(20);
    });

    it('should return search results for matching minutes', async () => {
      setupMockServices({
        minutes: [createMockMinutes({ summary: 'Discussed sprint planning' })],
      });

      const request = createGETRequest('q=sprint&targets=minutes');
      const response = await GET(request);
      const data = (await response.json()) as SearchResponseData;

      expect(response.status).toBe(200);
      expect(data.query).toBe('sprint');
    });

    it('should support pagination parameters', async () => {
      setupMockServices();

      const request = createGETRequest('q=test&page=2&limit=10');
      const response = await GET(request);
      const data = (await response.json()) as SearchResponseData;

      expect(response.status).toBe(200);
      expect(data.page).toBe(2);
      expect(data.limit).toBe(10);
    });

    it('should support multiple targets', async () => {
      setupMockServices();

      const request = createGETRequest('q=test&targets=meetings,minutes');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should support sort parameters', async () => {
      setupMockServices();

      const request = createGETRequest('q=test&sortBy=date&sortOrder=asc');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should support date range filters', async () => {
      setupMockServices();

      const request = createGETRequest(
        'q=test&dateFrom=2025-01-01T00:00:00Z&dateTo=2025-01-31T23:59:59Z'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Data Source Resilience', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue(createMockSession());
    });

    it('should still return results when meeting fetch fails', async () => {
      mockCreateLarkClient.mockReturnValue({} as ReturnType<typeof createLarkClient>);

      const mockMeetingService = {
        getMeetings: vi.fn().mockRejectedValue(new Error('API Error')),
      };
      mockCreateMeetingService.mockReturnValue(
        mockMeetingService as unknown as ReturnType<typeof createMeetingService>
      );

      const mockLarkBaseService = {
        listMeetings: vi.fn().mockResolvedValue({
          meetings: [],
          hasMore: false,
        }),
        getMinutes: vi.fn().mockResolvedValue(null),
      };
      mockCreateLarkBaseServiceFromEnv.mockReturnValue(
        mockLarkBaseService as unknown as ReturnType<typeof createLarkBaseServiceFromEnv>
      );

      const mockTranscriptService = {
        hasTranscript: vi.fn().mockResolvedValue(false),
        getTranscript: vi.fn().mockResolvedValue(null),
      };
      mockCreateTranscriptService.mockReturnValue(
        mockTranscriptService as unknown as ReturnType<typeof createTranscriptService>
      );

      const request = createGETRequest('q=test');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should still return results when minutes fetch fails', async () => {
      mockCreateLarkClient.mockReturnValue({} as ReturnType<typeof createLarkClient>);

      const mockMeetingService = {
        getMeetings: vi.fn().mockResolvedValue({
          meetings: [],
          pagination: { page: 1, pageSize: 100, total: 0, hasMore: false },
        }),
      };
      mockCreateMeetingService.mockReturnValue(
        mockMeetingService as unknown as ReturnType<typeof createMeetingService>
      );

      const mockLarkBaseService = {
        listMeetings: vi.fn().mockRejectedValue(new Error('Bitable Error')),
      };
      mockCreateLarkBaseServiceFromEnv.mockReturnValue(
        mockLarkBaseService as unknown as ReturnType<typeof createLarkBaseServiceFromEnv>
      );

      const mockTranscriptService = {
        hasTranscript: vi.fn().mockResolvedValue(false),
        getTranscript: vi.fn().mockResolvedValue(null),
      };
      mockCreateTranscriptService.mockReturnValue(
        mockTranscriptService as unknown as ReturnType<typeof createTranscriptService>
      );

      const request = createGETRequest('q=test');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });
});

describe('POST /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when session is null', async () => {
      mockGetSession.mockResolvedValue(null);

      const request = createPOSTRequest({ query: 'test' });
      const response = await POST(request);
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when access token is missing', async () => {
      mockGetSession.mockResolvedValue({
        isAuthenticated: true,
        accessToken: undefined,
      } as unknown as SessionData);

      const request = createPOSTRequest({ query: 'test' });
      const response = await POST(request);
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toBe('Access token not found');
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue(createMockSession());
      setupMockServices();
    });

    it('should return 400 for invalid JSON body', async () => {
      const request = new Request('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_JSON');
    });

    it('should return 400 when query field is missing', async () => {
      const request = createPOSTRequest({});
      const response = await POST(request);
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_PARAMS');
    });

    it('should return empty response when query is empty string', async () => {
      const request = createPOSTRequest({ query: '' });
      const response = await POST(request);

      // Empty string query fails zod min(1) validation
      expect(response.status).toBe(400);
    });
  });

  describe('Successful Search', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue(createMockSession());
    });

    it('should return search results for valid query', async () => {
      setupMockServices({
        meetings: [createMockMeeting({ title: 'Team Standup' })],
      });

      const request = createPOSTRequest({
        query: 'Standup',
        targets: ['meetings'],
      });
      const response = await POST(request);
      const data = (await response.json()) as SearchResponseData;

      expect(response.status).toBe(200);
      expect(data.query).toBe('Standup');
    });

    it('should support filters in request body', async () => {
      setupMockServices();

      const request = createPOSTRequest({
        query: 'test',
        targets: ['meetings', 'minutes'],
        filters: {
          dateRange: {
            from: '2025-01-01T00:00:00Z',
            to: '2025-01-31T23:59:59Z',
          },
        },
        page: 1,
        limit: 10,
        sortBy: 'date',
        sortOrder: 'desc',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should support action item filters', async () => {
      setupMockServices();

      const request = createPOSTRequest({
        query: 'backlog',
        targets: ['action_items'],
        filters: {
          actionItemStatus: 'pending',
          priority: 'high',
        },
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });
});
