/**
 * Meeting related type definitions
 * @module types/meeting
 */

/**
 * Meeting status
 */
export type MeetingStatus = 'scheduled' | 'in_progress' | 'ended' | 'cancelled';

/**
 * Meeting type
 */
export type MeetingType = 'regular' | 'adhoc' | 'one_on_one' | 'all_hands';

/**
 * Minutes status
 */
export type MinutesStatus =
  | 'not_created'
  | 'draft'
  | 'pending_approval'
  | 'approved';

/**
 * Meeting user information
 */
export interface MeetingUser {
  /** Unique user identifier */
  readonly id: string;
  /** User display name */
  readonly name: string;
  /** User avatar URL */
  readonly avatarUrl?: string | undefined;
  /** User email address */
  readonly email?: string | undefined;
}

/**
 * Participant status in meeting
 */
export type ParticipantStatus = 'in_meeting' | 'left';

/**
 * Meeting participant information
 */
export interface Participant extends MeetingUser {
  /** Time when participant joined the meeting */
  readonly joinTime: Date;
  /** Time when participant left the meeting (undefined if still in meeting) */
  readonly leaveTime?: Date | undefined;
  /** Whether the participant is the meeting host */
  readonly isHost: boolean;
  /** Current status of the participant */
  readonly status: ParticipantStatus;
}

/**
 * Recording information
 */
export interface Recording {
  /** Unique recording identifier */
  readonly id: string;
  /** Recording URL */
  readonly url: string;
  /** Recording duration in seconds */
  readonly durationSeconds: number;
  /** Recording start time */
  readonly startTime: Date;
  /** Recording end time */
  readonly endTime: Date;
  /** Thumbnail URL for preview */
  readonly thumbnailUrl?: string | undefined;
}

/**
 * Meeting information (application internal use)
 */
export interface Meeting {
  /** Unique meeting identifier */
  readonly id: string;
  /** Meeting title */
  readonly title: string;
  /** Meeting number (for display/reference) */
  readonly meetingNo: string;
  /** Scheduled start time */
  readonly startTime: Date;
  /** Scheduled end time */
  readonly endTime: Date;
  /** Meeting duration in minutes */
  readonly durationMinutes: number;
  /** Current meeting status */
  readonly status: MeetingStatus;
  /** Meeting type */
  readonly type: MeetingType;
  /** Meeting host information */
  readonly host: MeetingUser;
  /** Number of participants */
  readonly participantCount: number;
  /** Whether the meeting has a recording */
  readonly hasRecording: boolean;
  /** Recording URL (if available) */
  readonly recordingUrl?: string | undefined;
  /** Minutes status */
  readonly minutesStatus: MinutesStatus;
  /** Record creation timestamp */
  readonly createdAt: Date;
  /** Record last update timestamp */
  readonly updatedAt: Date;
}

/**
 * Meeting list filter conditions
 */
export interface MeetingFilters {
  /** Search keyword (searches title, meeting number, etc.) */
  readonly search?: string | undefined;
  /** Filter meetings starting from this date */
  readonly startDate?: Date | undefined;
  /** Filter meetings until this date */
  readonly endDate?: Date | undefined;
  /** Filter by meeting status */
  readonly status?: MeetingStatus | undefined;
  /** Filter by host user ID */
  readonly hostId?: string | undefined;
}

/**
 * Sort field options for meeting list
 */
export type MeetingSortField = 'startTime' | 'title' | 'participantCount';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort conditions for meeting list
 */
export interface MeetingSort {
  /** Field to sort by */
  readonly field: MeetingSortField;
  /** Sort direction */
  readonly direction: SortDirection;
}

/**
 * Pagination information
 */
export interface Pagination {
  /** Current page number (1-based) */
  readonly page: number;
  /** Number of items per page */
  readonly pageSize: number;
  /** Total number of items */
  readonly total: number;
  /** Whether more pages are available */
  readonly hasMore: boolean;
}

/**
 * Meeting list response
 */
export interface MeetingListResponse {
  /** List of meetings */
  readonly meetings: readonly Meeting[];
  /** Pagination information */
  readonly pagination: Pagination;
}

/**
 * Create default meeting filters
 */
export function createDefaultMeetingFilters(): MeetingFilters {
  return {};
}

/**
 * Create default meeting sort
 */
export function createDefaultMeetingSort(): MeetingSort {
  return {
    field: 'startTime',
    direction: 'desc',
  };
}

/**
 * Create default pagination
 */
export function createDefaultPagination(
  pageSize: number = 20
): Omit<Pagination, 'total' | 'hasMore'> {
  return {
    page: 1,
    pageSize,
  };
}
