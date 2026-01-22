/**
 * Meeting Service for Lark VC API
 * @module lib/lark/meeting
 */

import type { LarkClient } from './client';
import { LarkClientError } from './client';
import {
  type LarkMeeting,
  type LarkMeetingListData,
  type LarkMeetingParticipant,
  type LarkMeetingRecording,
  type LarkMeetingStatus,
  type LarkParticipantListData,
  type LarkRecordingListData,
  larkMeetingListResponseSchema,
  larkMeetingSchema,
  larkParticipantListResponseSchema,
  larkRecordingListResponseSchema,
  LarkVCApiEndpoints,
} from './types';
import type {
  Meeting,
  MeetingFilters,
  MeetingListResponse,
  MeetingStatus,
  MeetingUser,
  Pagination,
  Participant,
  ParticipantStatus,
  Recording,
} from '@/types/meeting';

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown when a meeting is not found
 */
export class MeetingNotFoundError extends Error {
  constructor(
    public readonly meetingId: string,
    message?: string
  ) {
    super(message ?? `Meeting not found: ${meetingId}`);
    this.name = 'MeetingNotFoundError';
  }
}

/**
 * Error thrown when a meeting API operation fails
 */
export class MeetingApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly operation: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'MeetingApiError';
  }

  /**
   * Create from LarkClientError
   */
  static fromLarkClientError(
    error: LarkClientError,
    operation: string
  ): MeetingApiError {
    return new MeetingApiError(error.message, error.code, operation, error.details);
  }
}

// =============================================================================
// Data Transformation Functions
// =============================================================================

/**
 * Map Lark meeting status to application meeting status
 */
function mapLarkMeetingStatus(status: LarkMeetingStatus): MeetingStatus {
  switch (status) {
    case 'not_started':
      return 'scheduled';
    case 'in_progress':
      return 'in_progress';
    case 'ended':
      return 'ended';
  }
}

/**
 * Calculate duration in minutes from start and end times
 * @param startTime - Start time as Unix timestamp string (seconds)
 * @param endTime - End time as Unix timestamp string (seconds)
 * @returns Duration in minutes
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const start = parseInt(startTime, 10);
  const end = parseInt(endTime, 10);
  const durationSeconds = end - start;
  return Math.max(0, Math.round(durationSeconds / 60));
}

/**
 * Convert Unix timestamp string to Date
 */
function timestampToDate(timestamp: string): Date {
  return new Date(parseInt(timestamp, 10) * 1000);
}

/**
 * Transform Lark meeting user to application MeetingUser
 */
function transformLarkMeetingUser(user: {
  readonly user_id: string;
  readonly user_name: string;
  readonly avatar_url?: string | undefined;
}): MeetingUser {
  return {
    id: user.user_id,
    name: user.user_name,
    avatarUrl: user.avatar_url,
  };
}

/**
 * Transform Lark meeting to application Meeting format
 * @param larkMeeting - Meeting data from Lark API
 * @returns Transformed Meeting object for application use
 */
export function transformLarkMeeting(larkMeeting: LarkMeeting): Meeting {
  const startTime = timestampToDate(larkMeeting.start_time);
  const endTime = timestampToDate(larkMeeting.end_time);
  const durationMinutes = calculateDuration(larkMeeting.start_time, larkMeeting.end_time);
  const now = new Date();

  return {
    id: larkMeeting.meeting_id,
    title: larkMeeting.topic,
    meetingNo: larkMeeting.meeting_no,
    startTime,
    endTime,
    durationMinutes,
    status: mapLarkMeetingStatus(larkMeeting.status),
    type: 'regular', // Default to regular, can be enhanced later
    host: transformLarkMeetingUser(larkMeeting.host_user),
    participantCount: larkMeeting.participant_count,
    hasRecording: larkMeeting.record_url !== undefined,
    recordingUrl: larkMeeting.record_url,
    minutesStatus: 'not_created', // Default, can be enhanced with minutes API
    createdAt: startTime, // Use start time as proxy for creation
    updatedAt: now,
  };
}

/**
 * Transform Lark participant to application Participant format
 * @param larkParticipant - Participant data from Lark API
 * @param hostUserId - The host user ID to determine isHost flag
 * @returns Transformed Participant object for application use
 */
export function transformLarkParticipant(
  larkParticipant: LarkMeetingParticipant,
  hostUserId?: string
): Participant {
  const status: ParticipantStatus =
    larkParticipant.status === 'in_meeting' ? 'in_meeting' : 'left';

  return {
    id: larkParticipant.user_id,
    name: larkParticipant.user_name,
    avatarUrl: larkParticipant.avatar_url,
    joinTime: timestampToDate(larkParticipant.join_time),
    leaveTime:
      larkParticipant.leave_time !== undefined
        ? timestampToDate(larkParticipant.leave_time)
        : undefined,
    isHost: hostUserId !== undefined && larkParticipant.user_id === hostUserId,
    status,
  };
}

/**
 * Transform Lark recording to application Recording format
 * @param larkRecording - Recording data from Lark API
 * @returns Transformed Recording object for application use
 */
export function transformLarkRecording(larkRecording: LarkMeetingRecording): Recording {
  return {
    id: larkRecording.recording_id,
    url: larkRecording.url,
    durationSeconds: larkRecording.duration,
    startTime: timestampToDate(larkRecording.start_time),
    endTime: timestampToDate(larkRecording.end_time),
  };
}

// =============================================================================
// Request Types
// =============================================================================

/**
 * Pagination options for API requests
 */
export interface PaginationOptions {
  /** Page size (number of items per page) */
  readonly pageSize?: number | undefined;
  /** Page token for pagination */
  readonly pageToken?: string | undefined;
}

// =============================================================================
// MeetingService Class
// =============================================================================

/**
 * Service for interacting with Lark VC Meeting API
 *
 * Provides methods to fetch meeting lists, details, participants, and recordings.
 * Handles data transformation from Lark API format to application format.
 *
 * @example
 * ```typescript
 * const client = createLarkClient();
 * const service = new MeetingService(client);
 *
 * // Get meetings list
 * const response = await service.getMeetings(accessToken, {}, { pageSize: 20 });
 *
 * // Get meeting details
 * const meeting = await service.getMeetingById(accessToken, 'meeting_id');
 *
 * // Get participants
 * const participants = await service.getParticipants(accessToken, 'meeting_id');
 * ```
 */
export class MeetingService {
  private readonly client: LarkClient;

  constructor(client: LarkClient) {
    this.client = client;
  }

  /**
   * Build query parameters for meeting list API
   */
  private buildMeetingListParams(
    filters: MeetingFilters,
    pagination: PaginationOptions
  ): Record<string, string> {
    const params: Record<string, string> = {};

    // Pagination
    if (pagination.pageSize !== undefined) {
      params['page_size'] = pagination.pageSize.toString();
    }
    if (pagination.pageToken !== undefined) {
      params['page_token'] = pagination.pageToken;
    }

    // Filters
    if (filters.startDate !== undefined) {
      params['start_time'] = Math.floor(filters.startDate.getTime() / 1000).toString();
    }
    if (filters.endDate !== undefined) {
      params['end_time'] = Math.floor(filters.endDate.getTime() / 1000).toString();
    }
    if (filters.hostId !== undefined) {
      params['host_user_id'] = filters.hostId;
    }
    if (filters.search !== undefined) {
      params['meeting_no'] = filters.search;
    }

    return params;
  }

  /**
   * Get list of meetings with optional filters and pagination
   * @param accessToken - User access token
   * @param filters - Optional filters for the meeting list
   * @param pagination - Optional pagination options
   * @returns Paginated list of meetings
   * @throws {MeetingApiError} When the API request fails
   */
  async getMeetings(
    accessToken: string,
    filters: MeetingFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<MeetingListResponse> {
    try {
      const params = this.buildMeetingListParams(filters, pagination);

      const response = await this.client.authenticatedRequest<LarkMeetingListData>(
        LarkVCApiEndpoints.MEETING_LIST,
        accessToken,
        { params }
      );

      // Validate response with Zod
      const validated = larkMeetingListResponseSchema.parse(response);

      if (validated.data === undefined) {
        return {
          meetings: [],
          pagination: {
            page: 1,
            pageSize: pagination.pageSize ?? 20,
            total: 0,
            hasMore: false,
          },
        };
      }

      const meetings = validated.data.meeting_list.map(transformLarkMeeting);

      const paginationInfo: Pagination = {
        page: 1, // Lark uses token-based pagination, page number is approximated
        pageSize: pagination.pageSize ?? 20,
        total: meetings.length, // Lark API doesn't provide total count
        hasMore: validated.data.has_more,
      };

      return {
        meetings,
        pagination: paginationInfo,
      };
    } catch (error) {
      if (error instanceof LarkClientError) {
        throw MeetingApiError.fromLarkClientError(error, 'getMeetings');
      }
      throw error;
    }
  }

  /**
   * Get meeting details by ID
   * @param accessToken - User access token
   * @param meetingId - The meeting ID to fetch
   * @returns Meeting details
   * @throws {MeetingNotFoundError} When the meeting is not found
   * @throws {MeetingApiError} When the API request fails
   */
  async getMeetingById(accessToken: string, meetingId: string): Promise<Meeting> {
    try {
      const endpoint = LarkVCApiEndpoints.MEETING_GET.replace(':meeting_id', meetingId);

      const response = await this.client.authenticatedRequest<LarkMeeting>(
        endpoint,
        accessToken
      );

      if (response.data === undefined) {
        throw new MeetingNotFoundError(meetingId);
      }

      // Validate response with Zod
      const validated = larkMeetingSchema.parse(response.data);

      return transformLarkMeeting(validated);
    } catch (error) {
      if (error instanceof MeetingNotFoundError) {
        throw error;
      }
      if (error instanceof LarkClientError) {
        // Check for not found error codes
        if (error.code === 99991663 || error.code === 99991664) {
          throw new MeetingNotFoundError(meetingId, error.message);
        }
        throw MeetingApiError.fromLarkClientError(error, 'getMeetingById');
      }
      throw error;
    }
  }

  /**
   * Get list of participants for a meeting
   * @param accessToken - User access token
   * @param meetingId - The meeting ID to fetch participants for
   * @param pagination - Optional pagination options
   * @returns List of participants
   * @throws {MeetingNotFoundError} When the meeting is not found
   * @throws {MeetingApiError} When the API request fails
   */
  async getParticipants(
    accessToken: string,
    meetingId: string,
    pagination: PaginationOptions = {}
  ): Promise<readonly Participant[]> {
    try {
      const endpoint = LarkVCApiEndpoints.PARTICIPANT_LIST.replace(
        ':meeting_id',
        meetingId
      );

      const params: Record<string, string> = {};
      if (pagination.pageSize !== undefined) {
        params['page_size'] = pagination.pageSize.toString();
      }
      if (pagination.pageToken !== undefined) {
        params['page_token'] = pagination.pageToken;
      }

      const response = await this.client.authenticatedRequest<LarkParticipantListData>(
        endpoint,
        accessToken,
        { params }
      );

      // Validate response with Zod
      const validated = larkParticipantListResponseSchema.parse(response);

      if (validated.data === undefined) {
        return [];
      }

      // Get meeting to determine host
      let hostUserId: string | undefined;
      try {
        const meeting = await this.getMeetingById(accessToken, meetingId);
        hostUserId = meeting.host.id;
      } catch {
        // If we can't get the meeting, proceed without host info
      }

      return validated.data.participant_list.map((p) =>
        transformLarkParticipant(p, hostUserId)
      );
    } catch (error) {
      if (error instanceof MeetingNotFoundError) {
        throw error;
      }
      if (error instanceof LarkClientError) {
        if (error.code === 99991663 || error.code === 99991664) {
          throw new MeetingNotFoundError(meetingId, error.message);
        }
        throw MeetingApiError.fromLarkClientError(error, 'getParticipants');
      }
      throw error;
    }
  }

  /**
   * Get list of recordings for a meeting
   * @param accessToken - User access token
   * @param meetingId - The meeting ID to fetch recordings for
   * @param pagination - Optional pagination options
   * @returns List of recordings
   * @throws {MeetingNotFoundError} When the meeting is not found
   * @throws {MeetingApiError} When the API request fails
   */
  async getRecordings(
    accessToken: string,
    meetingId: string,
    pagination: PaginationOptions = {}
  ): Promise<readonly Recording[]> {
    try {
      const endpoint = LarkVCApiEndpoints.RECORDING_LIST.replace(
        ':meeting_id',
        meetingId
      );

      const params: Record<string, string> = {};
      if (pagination.pageSize !== undefined) {
        params['page_size'] = pagination.pageSize.toString();
      }
      if (pagination.pageToken !== undefined) {
        params['page_token'] = pagination.pageToken;
      }

      const response = await this.client.authenticatedRequest<LarkRecordingListData>(
        endpoint,
        accessToken,
        { params }
      );

      // Validate response with Zod
      const validated = larkRecordingListResponseSchema.parse(response);

      if (validated.data === undefined) {
        return [];
      }

      return validated.data.recording_list.map(transformLarkRecording);
    } catch (error) {
      if (error instanceof LarkClientError) {
        if (error.code === 99991663 || error.code === 99991664) {
          throw new MeetingNotFoundError(meetingId, error.message);
        }
        throw MeetingApiError.fromLarkClientError(error, 'getRecordings');
      }
      throw error;
    }
  }
}

/**
 * Create a MeetingService instance with the provided LarkClient
 * @param client - LarkClient instance
 * @returns New MeetingService instance
 */
export function createMeetingService(client: LarkClient): MeetingService {
  return new MeetingService(client);
}
