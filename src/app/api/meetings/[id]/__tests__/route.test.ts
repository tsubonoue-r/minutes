/**
 * Meeting detail API route unit tests
 * @module app/api/meetings/[id]/__tests__/route.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../route';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import {
  createMeetingService,
  MeetingNotFoundError,
  MeetingApiError,
} from '@/lib/lark/meeting';
import type { Meeting, MeetingStatus, MeetingType, MinutesStatus } from '@/types/meeting';

// Mock dependencies - keep error classes as actual implementations
vi.mock('@/lib/auth/get-session');
vi.mock('@/lib/lark/client');
vi.mock('@/lib/lark/meeting', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/lark/meeting')>();
  return {
    ...actual,
    createMeetingService: vi.fn(),
  };
});

const mockGetSession = vi.mocked(getSession);
const mockCreateLarkClient = vi.mocked(createLarkClient);
const mockCreateMeetingService = vi.mocked(createMeetingService);

/**
 * Response type for error responses
 */
interface ErrorResponseData {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

/**
 * Response type for meeting detail
 */
interface MeetingDetailResponseData {
  readonly data: {
    readonly id: string;
    readonly title: string;
    readonly meetingNo: string;
    readonly startTime: string;
    readonly endTime: string;
    readonly durationMinutes: number;
    readonly status: MeetingStatus;
    readonly type: MeetingType;
    readonly host: {
      readonly id: string;
      readonly name: string;
      readonly avatarUrl?: string;
    };
    readonly participantCount: number;
    readonly hasRecording: boolean;
    readonly recordingUrl?: string;
    readonly minutesStatus: MinutesStatus;
    readonly createdAt: string;
    readonly updatedAt: string;
  };
}

/**
 * Create mock meeting data
 */
function createMockMeeting(overrides: Partial<Meeting> = {}): Meeting {
  const now = new Date();
  const startTime = new Date(now.getTime() - 3600000); // 1 hour ago
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
  return new Request('http://localhost:3000/api/meetings/meeting_001');
}

describe('GET /api/meetings/[id]', () => {
  let mockMeetingService: {
    getMeetingById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock meeting service
    mockMeetingService = {
      getMeetingById: vi.fn(),
    };

    mockCreateLarkClient.mockReturnValue({} as ReturnType<typeof createLarkClient>);
    mockCreateMeetingService.mockReturnValue(
      mockMeetingService as unknown as ReturnType<typeof createMeetingService>
    );
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
      expect(data.error.code).toBe('INVALID_PARAMS');
      expect(data.error.message).toBe('Meeting ID is required');
    });

    it('should return 400 when meeting ID is whitespace only', async () => {
      const response = await GET(createMockRequest(), createMockContext('   '));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_PARAMS');
    });
  });

  describe('Successful Response', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        isAuthenticated: true,
        accessToken: 'test_token',
      } as unknown as Awaited<ReturnType<typeof getSession>>);
    });

    it('should return meeting data successfully', async () => {
      const mockMeeting = createMockMeeting();
      mockMeetingService.getMeetingById.mockResolvedValue(mockMeeting);

      const response = await GET(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as MeetingDetailResponseData;

      expect(response.status).toBe(200);
      expect(data.data.id).toBe('meeting_001');
      expect(data.data.title).toBe('Weekly Team Standup');
      expect(data.data.meetingNo).toBe('123456789');
      expect(data.data.status).toBe('ended');
      expect(data.data.type).toBe('regular');
      expect(data.data.durationMinutes).toBe(60);
      expect(data.data.participantCount).toBe(5);
      expect(data.data.hasRecording).toBe(true);
      expect(data.data.recordingUrl).toBe('https://example.com/recording');
      expect(data.data.minutesStatus).toBe('not_created');
    });

    it('should serialize dates as ISO strings', async () => {
      const mockMeeting = createMockMeeting();
      mockMeetingService.getMeetingById.mockResolvedValue(mockMeeting);

      const response = await GET(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as MeetingDetailResponseData;

      expect(data.data.startTime).toBe(mockMeeting.startTime.toISOString());
      expect(data.data.endTime).toBe(mockMeeting.endTime.toISOString());
      expect(data.data.createdAt).toBe(mockMeeting.createdAt.toISOString());
      expect(data.data.updatedAt).toBe(mockMeeting.updatedAt.toISOString());
    });

    it('should include host information', async () => {
      const mockMeeting = createMockMeeting();
      mockMeetingService.getMeetingById.mockResolvedValue(mockMeeting);

      const response = await GET(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as MeetingDetailResponseData;

      expect(data.data.host.id).toBe('user_001');
      expect(data.data.host.name).toBe('John Doe');
      expect(data.data.host.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should omit recordingUrl when not available', async () => {
      const mockMeeting = createMockMeeting({
        hasRecording: false,
        recordingUrl: undefined,
      });
      mockMeetingService.getMeetingById.mockResolvedValue(mockMeeting);

      const response = await GET(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as MeetingDetailResponseData;

      expect(data.data.hasRecording).toBe(false);
      expect(data.data.recordingUrl).toBeUndefined();
    });

    it('should omit host avatarUrl when not available', async () => {
      const mockMeeting = createMockMeeting({
        host: {
          id: 'user_001',
          name: 'John Doe',
          avatarUrl: undefined,
        },
      });
      mockMeetingService.getMeetingById.mockResolvedValue(mockMeeting);

      const response = await GET(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as MeetingDetailResponseData;

      expect(data.data.host.id).toBe('user_001');
      expect(data.data.host.name).toBe('John Doe');
      expect(data.data.host.avatarUrl).toBeUndefined();
    });

    it('should pass correct meeting ID to service', async () => {
      const mockMeeting = createMockMeeting();
      mockMeetingService.getMeetingById.mockResolvedValue(mockMeeting);

      await GET(createMockRequest(), createMockContext('custom_meeting_id'));

      expect(mockMeetingService.getMeetingById).toHaveBeenCalledWith(
        'test_token',
        'custom_meeting_id'
      );
    });
  });

  describe('Error Handling', () => {
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

      const response = await GET(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('meeting_001');
    });

    it('should return appropriate status for MeetingApiError', async () => {
      mockMeetingService.getMeetingById.mockRejectedValue(
        new MeetingApiError('Unauthorized', 401, 'getMeetingById', { reason: 'token expired' })
      );

      const response = await GET(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(401);
      expect(data.error.code).toBe('LARK_API_ERROR');
      expect(data.error.message).toBe('Unauthorized');
      expect(data.error.details).toEqual({ reason: 'token expired' });
    });

    it('should return 500 for MeetingApiError with invalid status code', async () => {
      mockMeetingService.getMeetingById.mockRejectedValue(
        new MeetingApiError('Internal error', 999, 'getMeetingById')
      );

      const response = await GET(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('LARK_API_ERROR');
    });

    it('should return 500 for unexpected errors', async () => {
      mockMeetingService.getMeetingById.mockRejectedValue(new Error('Unexpected error'));

      const response = await GET(createMockRequest(), createMockContext('meeting_001'));
      const data = (await response.json()) as ErrorResponseData;

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('An unexpected error occurred');
    });
  });

  describe('Service Integration', () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        isAuthenticated: true,
        accessToken: 'test_token',
      } as unknown as Awaited<ReturnType<typeof getSession>>);
    });

    it('should create Lark client and meeting service', async () => {
      const mockMeeting = createMockMeeting();
      mockMeetingService.getMeetingById.mockResolvedValue(mockMeeting);

      await GET(createMockRequest(), createMockContext('meeting_001'));

      expect(mockCreateLarkClient).toHaveBeenCalled();
      expect(mockCreateMeetingService).toHaveBeenCalled();
    });
  });
});
