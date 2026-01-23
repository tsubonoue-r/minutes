/**
 * Meeting service unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LarkClient, LarkClientError } from '../client';
import {
  MeetingService,
  MeetingNotFoundError,
  MeetingApiError,
  calculateDuration,
  transformLarkMeeting,
  transformLarkParticipant,
  transformLarkRecording,
} from '../meeting';
import type { LarkConfig } from '@/types/lark';
import type {
  LarkMeeting,
  LarkMeetingParticipant,
  LarkMeetingRecording,
} from '../types';

// Mock data factories
const createMockLarkMeeting = (overrides: Partial<LarkMeeting> = {}): LarkMeeting => ({
  meeting_id: 'meeting_001',
  meeting_topic: 'Weekly Team Standup',
  meeting_start_time: '2023.11.14 00:00:00 (GMT+00:00)', // Past date = ended
  meeting_end_time: '2023.11.14 01:00:00 (GMT+00:00)', // +1 hour
  meeting_duration: '1:00:00',
  organizer: 'John Doe',
  number_of_participants: '5',
  recording: true,
  audio: true,
  video: true,
  sharing: false,
  user_id: 'user_001',
  department: 'Engineering',
  email: 'john@example.com',
  ...overrides,
});

const createMockLarkParticipant = (
  overrides: Partial<LarkMeetingParticipant> = {}
): LarkMeetingParticipant => ({
  user_id: 'user_002',
  user_type: 'lark_user',
  user_name: 'Jane Smith',
  avatar_url: 'https://example.com/jane.jpg',
  join_time: '1700000100',
  leave_time: '1700003500',
  status: 'left',
  ...overrides,
});

const createMockLarkRecording = (
  overrides: Partial<LarkMeetingRecording> = {}
): LarkMeetingRecording => ({
  recording_id: 'rec_001',
  url: 'https://example.com/recording.mp4',
  duration: 3600,
  start_time: '1700000000',
  end_time: '1700003600',
  ...overrides,
});

describe('calculateDuration', () => {
  it('should calculate duration in minutes from duration string', () => {
    expect(calculateDuration('1:00:00')).toBe(60); // 1 hour
  });

  it('should handle hours and minutes', () => {
    expect(calculateDuration('2:30:00')).toBe(150); // 2h30m
  });

  it('should round seconds to nearest minute', () => {
    expect(calculateDuration('0:01:30')).toBe(2); // 1m30s rounds to 2
  });

  it('should return 0 for zero duration', () => {
    expect(calculateDuration('0:00:00')).toBe(0);
  });
});

describe('transformLarkMeeting', () => {
  it('should transform Lark meeting to application Meeting format', () => {
    const larkMeeting = createMockLarkMeeting();
    const meeting = transformLarkMeeting(larkMeeting);

    expect(meeting.id).toBe('meeting_001');
    expect(meeting.title).toBe('Weekly Team Standup');
    expect(meeting.meetingNo).toBe('meeting_001');
    expect(meeting.status).toBe('ended'); // Past date
    expect(meeting.type).toBe('regular');
    expect(meeting.durationMinutes).toBe(60);
    expect(meeting.host.id).toBe('user_001');
    expect(meeting.host.name).toBe('John Doe');
    expect(meeting.participantCount).toBe(5);
    expect(meeting.hasRecording).toBe(true);
    expect(meeting.minutesStatus).toBe('not_created');
  });

  it('should determine status from dates', () => {
    // Past meeting = ended
    const ended = transformLarkMeeting(createMockLarkMeeting({
      meeting_start_time: '2020.01.01 00:00:00 (GMT+00:00)',
      meeting_end_time: '2020.01.01 01:00:00 (GMT+00:00)',
    }));
    expect(ended.status).toBe('ended');

    // Future meeting = scheduled
    const scheduled = transformLarkMeeting(createMockLarkMeeting({
      meeting_start_time: '2099.01.01 00:00:00 (GMT+00:00)',
      meeting_end_time: '2099.01.01 01:00:00 (GMT+00:00)',
    }));
    expect(scheduled.status).toBe('scheduled');
  });

  it('should handle recording flag', () => {
    const withRecording = transformLarkMeeting(createMockLarkMeeting({ recording: true }));
    expect(withRecording.hasRecording).toBe(true);

    const withoutRecording = transformLarkMeeting(createMockLarkMeeting({ recording: false }));
    expect(withoutRecording.hasRecording).toBe(false);
  });

  it('should parse Lark datetime strings to Date objects', () => {
    const larkMeeting = createMockLarkMeeting({
      meeting_start_time: '2025.01.24 15:31:06 (GMT+09:00)',
      meeting_end_time: '2025.01.24 17:33:13 (GMT+09:00)',
    });
    const meeting = transformLarkMeeting(larkMeeting);

    expect(meeting.startTime).toBeInstanceOf(Date);
    expect(meeting.endTime).toBeInstanceOf(Date);
    expect(meeting.startTime.getFullYear()).toBe(2025);
    expect(meeting.startTime.getMonth()).toBe(0); // January
    expect(meeting.startTime.getDate()).toBe(24);
  });
});

describe('transformLarkParticipant', () => {
  it('should transform Lark participant to application Participant format', () => {
    const larkParticipant = createMockLarkParticipant();
    const participant = transformLarkParticipant(larkParticipant);

    expect(participant.id).toBe('user_002');
    expect(participant.name).toBe('Jane Smith');
    expect(participant.avatarUrl).toBe('https://example.com/jane.jpg');
    expect(participant.joinTime).toBeInstanceOf(Date);
    expect(participant.leaveTime).toBeInstanceOf(Date);
    expect(participant.status).toBe('left');
    expect(participant.isHost).toBe(false);
  });

  it('should identify host correctly', () => {
    const larkParticipant = createMockLarkParticipant({ user_id: 'host_user' });
    const participant = transformLarkParticipant(larkParticipant, 'host_user');

    expect(participant.isHost).toBe(true);
  });

  it('should handle participant still in meeting', () => {
    const larkParticipant = createMockLarkParticipant({
      leave_time: undefined,
      status: 'in_meeting',
    });
    const participant = transformLarkParticipant(larkParticipant);

    expect(participant.status).toBe('in_meeting');
    expect(participant.leaveTime).toBeUndefined();
  });

  it('should handle missing avatar URL', () => {
    const larkParticipant = createMockLarkParticipant({ avatar_url: undefined });
    const participant = transformLarkParticipant(larkParticipant);

    expect(participant.avatarUrl).toBeUndefined();
  });
});

describe('transformLarkRecording', () => {
  it('should transform Lark recording to application Recording format', () => {
    const larkRecording = createMockLarkRecording();
    const recording = transformLarkRecording(larkRecording);

    expect(recording.id).toBe('rec_001');
    expect(recording.url).toBe('https://example.com/recording.mp4');
    expect(recording.durationSeconds).toBe(3600);
    expect(recording.startTime).toBeInstanceOf(Date);
    expect(recording.endTime).toBeInstanceOf(Date);
  });
});

describe('MeetingNotFoundError', () => {
  it('should create error with meeting ID', () => {
    const error = new MeetingNotFoundError('meeting_123');

    expect(error.meetingId).toBe('meeting_123');
    expect(error.message).toBe('Meeting not found: meeting_123');
    expect(error.name).toBe('MeetingNotFoundError');
  });

  it('should accept custom message', () => {
    const error = new MeetingNotFoundError('meeting_123', 'Custom error message');

    expect(error.message).toBe('Custom error message');
    expect(error.meetingId).toBe('meeting_123');
  });
});

describe('MeetingApiError', () => {
  it('should create error with details', () => {
    const error = new MeetingApiError('API failed', 500, 'getMeetings', { extra: 'info' });

    expect(error.message).toBe('API failed');
    expect(error.code).toBe(500);
    expect(error.operation).toBe('getMeetings');
    expect(error.details).toEqual({ extra: 'info' });
    expect(error.name).toBe('MeetingApiError');
  });

  it('should create from LarkClientError', () => {
    const clientError = new LarkClientError('Client error', 401, '/test', { log_id: '123' });
    const apiError = MeetingApiError.fromLarkClientError(clientError, 'testOperation');

    expect(apiError.message).toBe('Client error');
    expect(apiError.code).toBe(401);
    expect(apiError.operation).toBe('testOperation');
    expect(apiError.details).toEqual({ log_id: '123' });
  });
});

describe('MeetingService', () => {
  const config: LarkConfig = {
    appId: 'test_app_id',
    appSecret: 'test_secret',
    baseUrl: 'https://open.larksuite.com',
    redirectUri: 'http://localhost:3000/api/auth/callback',
  };

  let client: LarkClient;
  let service: MeetingService;
  const accessToken = 'test_access_token';

  beforeEach(() => {
    client = new LarkClient(config);
    service = new MeetingService(client);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMeetings', () => {
    it('should fetch and transform meeting list', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            has_more: false,
            meeting_list: [createMockLarkMeeting()],
          },
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await service.getMeetings(accessToken);

      expect(result.meetings).toHaveLength(1);
      expect(result.meetings[0]?.id).toBe('meeting_001');
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should handle empty meeting list', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            has_more: false,
            meeting_list: [],
          },
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await service.getMeetings(accessToken);

      expect(result.meetings).toHaveLength(0);
    });

    it('should handle missing data in response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await service.getMeetings(accessToken);

      expect(result.meetings).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should pass filters to API', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            has_more: false,
            meeting_list: [],
          },
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const filters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        hostId: 'host_123',
        search: '123456',
      };

      await service.getMeetings(accessToken, filters);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('start_time='),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('end_time='),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('host_user_id=host_123'),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('meeting_no=123456'),
        expect.any(Object)
      );
    });

    it('should pass pagination options', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            has_more: true,
            page_token: 'next_token',
            meeting_list: [],
          },
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await service.getMeetings(accessToken, {}, { pageSize: 50, pageToken: 'token_123' });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('page_size=50'),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('page_token=token_123'),
        expect.any(Object)
      );
    });

    it('should throw MeetingApiError on API failure', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 99991400,
          msg: 'Invalid token',
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(service.getMeetings(accessToken)).rejects.toThrow(MeetingApiError);
      await expect(service.getMeetings(accessToken)).rejects.toMatchObject({
        operation: 'getMeetings',
      });
    });
  });

  describe('getMeetingById', () => {
    it('should fetch and transform single meeting', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: createMockLarkMeeting(),
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const meeting = await service.getMeetingById(accessToken, 'meeting_001');

      expect(meeting.id).toBe('meeting_001');
      expect(meeting.title).toBe('Weekly Team Standup');
    });

    it('should throw MeetingNotFoundError when meeting not found', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(service.getMeetingById(accessToken, 'nonexistent')).rejects.toThrow(
        MeetingNotFoundError
      );
    });

    it('should throw MeetingNotFoundError on specific Lark error codes', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 99991663,
          msg: 'Meeting not found',
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(service.getMeetingById(accessToken, 'invalid_id')).rejects.toThrow(
        MeetingNotFoundError
      );
    });

    it('should replace meeting ID in endpoint URL', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: createMockLarkMeeting(),
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await service.getMeetingById(accessToken, 'meeting_xyz');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/meetings/meeting_xyz'),
        expect.any(Object)
      );
    });
  });

  describe('getParticipants', () => {
    it('should fetch and transform participants', async () => {
      // Mock for getMeetingById (to get host info)
      const meetingResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: createMockLarkMeeting(),
        }),
      };

      // Mock for getParticipants
      const participantsResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            has_more: false,
            participant_list: [
              createMockLarkParticipant({ user_id: 'user_001' }), // Host
              createMockLarkParticipant({ user_id: 'user_002' }),
            ],
          },
        }),
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce(participantsResponse as unknown as Response)
        .mockResolvedValueOnce(meetingResponse as unknown as Response);

      const participants = await service.getParticipants(accessToken, 'meeting_001');

      expect(participants).toHaveLength(2);
      expect(participants[0]?.isHost).toBe(true); // user_001 is the host
      expect(participants[1]?.isHost).toBe(false);
    });

    it('should handle empty participant list', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            has_more: false,
            participant_list: [],
          },
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const participants = await service.getParticipants(accessToken, 'meeting_001');

      expect(participants).toHaveLength(0);
    });

    it('should throw MeetingNotFoundError when meeting not found', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 99991663,
          msg: 'Meeting not found',
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(service.getParticipants(accessToken, 'invalid_id')).rejects.toThrow(
        MeetingNotFoundError
      );
    });
  });

  describe('getRecordings', () => {
    it('should fetch and transform recordings', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            has_more: false,
            recording_list: [createMockLarkRecording()],
          },
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const recordings = await service.getRecordings(accessToken, 'meeting_001');

      expect(recordings).toHaveLength(1);
      expect(recordings[0]?.id).toBe('rec_001');
      expect(recordings[0]?.url).toBe('https://example.com/recording.mp4');
    });

    it('should handle empty recording list', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            has_more: false,
            recording_list: [],
          },
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const recordings = await service.getRecordings(accessToken, 'meeting_001');

      expect(recordings).toHaveLength(0);
    });

    it('should handle missing data in response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const recordings = await service.getRecordings(accessToken, 'meeting_001');

      expect(recordings).toHaveLength(0);
    });

    it('should throw MeetingNotFoundError when meeting not found', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 99991664,
          msg: 'Meeting not found',
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(service.getRecordings(accessToken, 'invalid_id')).rejects.toThrow(
        MeetingNotFoundError
      );
    });

    it('should pass pagination options', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 0,
          msg: 'success',
          data: {
            has_more: false,
            recording_list: [],
          },
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await service.getRecordings(accessToken, 'meeting_001', {
        pageSize: 10,
        pageToken: 'token_abc',
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('page_size=10'),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('page_token=token_abc'),
        expect.any(Object)
      );
    });
  });
});
