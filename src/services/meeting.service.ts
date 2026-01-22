/**
 * Meeting service for Lark VC API integration
 * @module services/meeting.service
 */

import { LarkClient, LarkClientError } from '@/lib/lark/client';
import type {
  LarkMeetingListData,
  LarkMeeting,
  LarkMeetingStatus,
} from '@/lib/lark/types';
import { LarkVCApiEndpoints } from '@/lib/lark/types';
import type {
  Meeting,
  MeetingFilters,
  MeetingSort,
  MeetingStatus,
  MeetingType,
  MinutesStatus,
  MeetingUser,
  MeetingListResponse,
  Pagination,
} from '@/types/meeting';

/**
 * Meeting service error
 */
export class MeetingServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'MeetingServiceError';
  }
}

/**
 * Options for fetching meetings
 */
export interface GetMeetingsOptions {
  /** Current page (1-based) */
  readonly page: number;
  /** Items per page */
  readonly limit: number;
  /** Filter conditions */
  readonly filters: MeetingFilters;
  /** Sort configuration */
  readonly sort: MeetingSort;
}

/**
 * Map Lark meeting status to internal status
 */
function mapLarkStatusToMeetingStatus(status: LarkMeetingStatus): MeetingStatus {
  const statusMap: Record<LarkMeetingStatus, MeetingStatus> = {
    not_started: 'scheduled',
    in_progress: 'in_progress',
    ended: 'ended',
  };
  return statusMap[status];
}

/**
 * Map internal status to Lark status for filtering
 */
function mapMeetingStatusToLarkStatus(
  status: MeetingStatus
): LarkMeetingStatus | undefined {
  const statusMap: Partial<Record<MeetingStatus, LarkMeetingStatus>> = {
    scheduled: 'not_started',
    in_progress: 'in_progress',
    ended: 'ended',
    // 'cancelled' has no Lark equivalent, return undefined
  };
  return statusMap[status];
}

/**
 * Infer meeting type from topic/title
 * (Placeholder implementation - can be enhanced with ML or pattern matching)
 */
function inferMeetingType(_topic: string): MeetingType {
  // Default to regular for now
  // Future: analyze topic for patterns like "1:1", "All Hands", etc.
  return 'regular';
}

/**
 * Convert Unix timestamp string (seconds) to Date
 */
function unixToDate(timestamp: string): Date {
  return new Date(parseInt(timestamp, 10) * 1000);
}

/**
 * Convert Lark meeting to internal Meeting format
 */
function transformLarkMeeting(larkMeeting: LarkMeeting): Meeting {
  const startTime = unixToDate(larkMeeting.start_time);
  const endTime = unixToDate(larkMeeting.end_time);
  const durationMinutes = Math.round(
    (endTime.getTime() - startTime.getTime()) / (1000 * 60)
  );

  const host: MeetingUser = {
    id: larkMeeting.host_user.user_id,
    name: larkMeeting.host_user.user_name,
    avatarUrl: larkMeeting.host_user.avatar_url,
  };

  const now = new Date();

  return {
    id: larkMeeting.meeting_id,
    title: larkMeeting.topic,
    meetingNo: larkMeeting.meeting_no,
    startTime,
    endTime,
    durationMinutes,
    status: mapLarkStatusToMeetingStatus(larkMeeting.status),
    type: inferMeetingType(larkMeeting.topic),
    host,
    participantCount: larkMeeting.participant_count,
    hasRecording: larkMeeting.record_url !== undefined,
    recordingUrl: larkMeeting.record_url,
    minutesStatus: 'not_created' as MinutesStatus,
    createdAt: startTime, // Using start time as creation time
    updatedAt: now,
  };
}

/**
 * Meeting service for fetching and managing meetings
 */
export class MeetingService {
  constructor(
    private readonly client: LarkClient,
    private readonly accessToken: string
  ) {}

  /**
   * Get meetings list with pagination and filters
   *
   * @param options - Query options including page, limit, filters, and sort
   * @returns Paginated list of meetings
   * @throws MeetingServiceError if the API call fails
   */
  async getMeetings(options: GetMeetingsOptions): Promise<MeetingListResponse> {
    const { page, limit, filters, sort } = options;

    try {
      // Build query parameters
      const params: Record<string, string> = {
        page_size: String(limit),
      };

      // Add date filters if provided
      if (filters.startDate !== undefined) {
        params['start_time'] = String(
          Math.floor(filters.startDate.getTime() / 1000)
        );
      }

      if (filters.endDate !== undefined) {
        params['end_time'] = String(
          Math.floor(filters.endDate.getTime() / 1000)
        );
      }

      // Add status filter
      if (filters.status !== undefined) {
        const larkStatus = mapMeetingStatusToLarkStatus(filters.status);
        if (larkStatus !== undefined) {
          params['status'] = larkStatus;
        }
      }

      // Fetch from Lark API
      const response = await this.client.authenticatedRequest<LarkMeetingListData>(
        LarkVCApiEndpoints.MEETING_LIST,
        this.accessToken,
        {
          method: 'GET',
          params,
        }
      );

      if (response.data === undefined) {
        throw new MeetingServiceError(
          'No data returned from Lark API',
          'NO_DATA',
          500
        );
      }

      // Transform Lark meetings to internal format
      let meetings = response.data.meeting_list.map(transformLarkMeeting);

      // Apply search filter (client-side since Lark may not support it)
      if (filters.search !== undefined && filters.search.trim() !== '') {
        const searchLower = filters.search.toLowerCase();
        meetings = meetings.filter(
          (m) =>
            m.title.toLowerCase().includes(searchLower) ||
            m.meetingNo.toLowerCase().includes(searchLower) ||
            m.host.name.toLowerCase().includes(searchLower)
        );
      }

      // Apply host filter
      if (filters.hostId !== undefined) {
        meetings = meetings.filter((m) => m.host.id === filters.hostId);
      }

      // Apply sorting
      meetings.sort((a, b) => {
        let comparison = 0;

        if (sort.field === 'startTime') {
          comparison = a.startTime.getTime() - b.startTime.getTime();
        } else if (sort.field === 'title') {
          comparison = a.title.localeCompare(b.title);
        } else if (sort.field === 'participantCount') {
          comparison = a.participantCount - b.participantCount;
        }

        return sort.direction === 'asc' ? comparison : -comparison;
      });

      // Calculate total (for client-side filtering, we use the filtered length)
      const total = meetings.length;
      const totalPages = Math.ceil(total / limit);

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedMeetings = meetings.slice(startIndex, startIndex + limit);

      const pagination: Pagination = {
        page,
        pageSize: limit,
        total,
        hasMore: page < totalPages,
      };

      return {
        meetings: paginatedMeetings,
        pagination,
      };
    } catch (error) {
      if (error instanceof MeetingServiceError) {
        throw error;
      }

      if (error instanceof LarkClientError) {
        throw new MeetingServiceError(
          error.message,
          'LARK_API_ERROR',
          error.code >= 400 && error.code < 600 ? error.code : 500,
          { endpoint: error.endpoint, details: error.details }
        );
      }

      throw new MeetingServiceError(
        'Failed to fetch meetings',
        'UNKNOWN_ERROR',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }
}

/**
 * Create a meeting service instance
 *
 * @param client - Lark API client
 * @param accessToken - User access token
 * @returns Meeting service instance
 */
export function createMeetingService(
  client: LarkClient,
  accessToken: string
): MeetingService {
  return new MeetingService(client, accessToken);
}
