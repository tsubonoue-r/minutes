/**
 * Meeting service for Lark VC API integration
 * @module services/meeting.service
 */

import { LarkClient, LarkClientError } from '@/lib/lark/client';
import type {
  LarkMeetingListData,
  LarkMeeting,
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

// Status mapping removed - meeting_list endpoint doesn't use status filter
// Status is now determined from meeting start/end times in transformLarkMeeting

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
 * Parse Lark formatted datetime string to Date
 * Format: "2025.01.24 15:31:06 (GMT+08:00)"
 */
function parseLarkDateTime(dateStr: string): Date {
  // Extract date/time part before timezone
  const match = dateStr.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+\(GMT([+-]\d{2}):(\d{2})\)$/);
  if (match) {
    const [, year, month, day, hour, minute, second, tzHour, tzMinute] = match;
    const isoStr = `${year}-${month}-${day}T${hour}:${minute}:${second}${tzHour}:${tzMinute}`;
    const parsed = new Date(isoStr);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  // Fallback: try direct parsing
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
}

/**
 * Parse duration string to minutes
 * Format: "2:02:07" or "00:06:52"
 */
function parseDurationToMinutes(duration: string): number {
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) {
    const [h, m, s] = parts as [number, number, number];
    return h * 60 + m + Math.round(s / 60);
  }
  if (parts.length === 2) {
    const [m, s] = parts as [number, number];
    return m + Math.round(s / 60);
  }
  return 0;
}

/**
 * Convert Lark meeting to internal Meeting format
 */
function transformLarkMeeting(larkMeeting: LarkMeeting): Meeting {
  const startTime = parseLarkDateTime(larkMeeting.meeting_start_time);
  const endTime = parseLarkDateTime(larkMeeting.meeting_end_time);
  const durationMinutes = parseDurationToMinutes(larkMeeting.meeting_duration);

  const host: MeetingUser = {
    id: larkMeeting.user_id ?? 'unknown',
    name: larkMeeting.organizer,
    avatarUrl: undefined,
  };

  // Determine status from end time
  const now = new Date();
  let status: MeetingStatus;
  if (endTime < now) {
    status = 'ended';
  } else if (startTime <= now) {
    status = 'in_progress';
  } else {
    status = 'scheduled';
  }

  return {
    id: larkMeeting.meeting_id,
    title: larkMeeting.meeting_topic,
    meetingNo: larkMeeting.meeting_id,
    startTime,
    endTime,
    durationMinutes,
    status,
    type: inferMeetingType(larkMeeting.meeting_topic),
    host,
    participantCount: parseInt(larkMeeting.number_of_participants, 10) || 0,
    hasRecording: larkMeeting.recording,
    recordingUrl: undefined,
    minutesStatus: 'not_created' as MinutesStatus,
    createdAt: startTime,
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
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const params: Record<string, string> = {
        page_size: String(limit),
        // meeting_list endpoint requires start_time and end_time (Unix seconds)
        start_time: String(
          Math.floor(
            (filters.startDate ?? thirtyDaysAgo).getTime() / 1000
          )
        ),
        end_time: String(
          Math.floor(
            (filters.endDate ?? now).getTime() / 1000
          )
        ),
      };

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
