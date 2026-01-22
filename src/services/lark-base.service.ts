/**
 * Lark Base Service for data persistence
 * @module services/lark-base.service
 *
 * Provides data management for meetings, minutes, and action items
 * using Lark Bitable (Base) as the backend storage.
 */

import type { LarkClient } from '@/lib/lark/client';
import {
  BitableClient,
  BitableApiError,
  RecordNotFoundError,
  createBitableClient,
  type BitableClientConfig,
  type BitableRecordFields,
  type TypedBitableRecord,
  type BitableUserValue,
  type BitableLinkValue,
} from '@/lib/lark/bitable';
import type {
  Meeting,
  MeetingStatus,
  MeetingType,
  MinutesStatus,
} from '@/types/meeting';
import type { Minutes } from '@/types/minutes';
import type {
  ManagedActionItem,
  ActionItemFilters,
} from '@/types/action-item';
import { isActionItemOverdue } from '@/types/action-item';
import type { Priority, ActionItemStatus } from '@/types/minutes';

// =============================================================================
// Table Field Types (matching Lark Base schema)
// =============================================================================

/**
 * Meeting table fields (Meetings table)
 */
export interface MeetingTableFields extends BitableRecordFields {
  meeting_id: string;
  meeting_title: string;
  meeting_type: string; // SingleSelect
  start_time: number; // DateTime as timestamp
  end_time: number; // DateTime as timestamp
  participants: BitableUserValue[]; // User[]
  minutes_status: string; // SingleSelect
  host_id: string;
  host_name: string;
  participant_count: number;
  has_recording: boolean;
  recording_url: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * Minutes table fields (Minutes table)
 */
export interface MinutesTableFields extends BitableRecordFields {
  minutes_id: string;
  meeting: BitableLinkValue; // Link to Meetings table
  version: number;
  title: string;
  summary: string;
  decisions_json: string; // JSON string
  topics_json: string; // JSON string
  action_items_json: string; // JSON string
  attendees_json: string; // JSON string
  doc_url: string | null;
  generated_at: string; // ISO datetime
  model: string;
  confidence: number;
  created_at: number;
  updated_at: number;
}

/**
 * Action item table fields (ActionItems table)
 */
export interface ActionItemTableFields extends BitableRecordFields {
  action_id: string;
  meeting: BitableLinkValue; // Link to Meetings table
  title: string; // content
  assignee: BitableUserValue[] | null; // User (single, but API returns array)
  assignee_name: string | null;
  due_date: number | null; // DateTime as timestamp
  priority: string; // SingleSelect: high, medium, low
  status: string; // SingleSelect: pending, in_progress, completed
  meeting_title: string;
  meeting_date: string; // ISO date
  source_text: string | null;
  related_topic_id: string | null;
  extracted_at: string;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
}

// =============================================================================
// Service Error Classes
// =============================================================================

/**
 * LarkBase service error
 */
export class LarkBaseServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'LarkBaseServiceError';
  }
}

/**
 * Entity not found error
 */
export class EntityNotFoundError extends LarkBaseServiceError {
  constructor(entityType: string, id: string) {
    super(`${entityType} with id '${id}' not found`, 'NOT_FOUND', 404, {
      entityType,
      id,
    });
    this.name = 'EntityNotFoundError';
  }
}

// =============================================================================
// Transformation Utilities
// =============================================================================

/**
 * Convert Date to timestamp (milliseconds)
 */
function dateToTimestamp(date: Date): number {
  return date.getTime();
}

/**
 * Convert timestamp to Date
 */
function timestampToDate(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * Convert ISO date string to timestamp
 */
function isoDateToTimestamp(isoDate: string): number | null {
  if (isoDate === '' || isoDate === undefined) {
    return null;
  }
  return new Date(isoDate).getTime();
}

/**
 * Convert timestamp to ISO date string (YYYY-MM-DD)
 */
function timestampToIsoDate(timestamp: number | null): string | undefined {
  if (timestamp === null) {
    return undefined;
  }
  return new Date(timestamp).toISOString().split('T')[0];
}

/**
 * Convert Meeting to table fields
 */
export function meetingToTableFields(meeting: Meeting): MeetingTableFields {
  return {
    meeting_id: meeting.id,
    meeting_title: meeting.title,
    meeting_type: meeting.type,
    start_time: dateToTimestamp(meeting.startTime),
    end_time: dateToTimestamp(meeting.endTime),
    participants: [], // Will be populated separately
    minutes_status: meeting.minutesStatus,
    host_id: meeting.host.id,
    host_name: meeting.host.name,
    participant_count: meeting.participantCount,
    has_recording: meeting.hasRecording,
    recording_url: meeting.recordingUrl ?? null,
    created_at: dateToTimestamp(meeting.createdAt),
    updated_at: dateToTimestamp(meeting.updatedAt),
  };
}

/**
 * Convert table fields to Meeting
 */
export function tableFieldsToMeeting(
  record: TypedBitableRecord<MeetingTableFields>
): Meeting {
  return {
    id: record.fields.meeting_id,
    title: record.fields.meeting_title,
    meetingNo: record.record_id,
    startTime: timestampToDate(record.fields.start_time),
    endTime: timestampToDate(record.fields.end_time),
    durationMinutes: Math.round(
      (record.fields.end_time - record.fields.start_time) / (1000 * 60)
    ),
    status: 'ended' as MeetingStatus, // Default status
    type: record.fields.meeting_type as MeetingType,
    host: {
      id: record.fields.host_id,
      name: record.fields.host_name,
    },
    participantCount: record.fields.participant_count,
    hasRecording: record.fields.has_recording,
    recordingUrl: record.fields.recording_url ?? undefined,
    minutesStatus: record.fields.minutes_status as MinutesStatus,
    createdAt: timestampToDate(record.fields.created_at),
    updatedAt: timestampToDate(record.fields.updated_at),
  };
}

/**
 * Convert Minutes to table fields
 */
export function minutesToTableFields(
  minutes: Minutes,
  meetingRecordId: string,
  version: number = 1,
  docUrl?: string
): MinutesTableFields {
  const now = Date.now();
  return {
    minutes_id: minutes.id,
    meeting: {
      record_ids: [meetingRecordId],
    },
    version,
    title: minutes.title,
    summary: minutes.summary,
    decisions_json: JSON.stringify(minutes.decisions),
    topics_json: JSON.stringify(minutes.topics),
    action_items_json: JSON.stringify(minutes.actionItems),
    attendees_json: JSON.stringify(minutes.attendees),
    doc_url: docUrl ?? null,
    generated_at: minutes.metadata.generatedAt,
    model: minutes.metadata.model,
    confidence: minutes.metadata.confidence,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Convert table fields to Minutes
 */
export function tableFieldsToMinutes(
  record: TypedBitableRecord<MinutesTableFields>,
  meetingId: string
): Minutes {
  return {
    id: record.fields.minutes_id,
    meetingId,
    title: record.fields.title,
    date: new Date(record.fields.created_at).toISOString().split('T')[0] ?? '',
    duration: 0, // Not stored in table
    summary: record.fields.summary,
    topics: JSON.parse(record.fields.topics_json !== '' ? record.fields.topics_json : '[]') as Minutes['topics'],
    decisions: JSON.parse(record.fields.decisions_json !== '' ? record.fields.decisions_json : '[]') as Minutes['decisions'],
    actionItems: JSON.parse(record.fields.action_items_json !== '' ? record.fields.action_items_json : '[]') as Minutes['actionItems'],
    attendees: JSON.parse(record.fields.attendees_json !== '' ? record.fields.attendees_json : '[]') as Minutes['attendees'],
    metadata: {
      generatedAt: record.fields.generated_at,
      model: record.fields.model,
      processingTimeMs: 0, // Not stored
      confidence: record.fields.confidence,
    },
  };
}

/**
 * Convert ManagedActionItem to table fields
 */
export function actionItemToTableFields(
  item: ManagedActionItem,
  meetingRecordId: string
): ActionItemTableFields {
  const now = Date.now();
  return {
    action_id: item.id,
    meeting: {
      record_ids: [meetingRecordId],
    },
    title: item.content,
    assignee: item.assignee
      ? [{ id: item.assignee.larkUserId ?? item.assignee.id, name: item.assignee.name }]
      : null,
    assignee_name: item.assignee?.name ?? null,
    due_date: item.dueDate !== undefined && item.dueDate !== '' ? isoDateToTimestamp(item.dueDate) : null,
    priority: item.priority,
    status: item.status,
    meeting_title: item.meetingTitle,
    meeting_date: item.meetingDate,
    source_text: item.sourceText ?? null,
    related_topic_id: item.relatedTopicId ?? null,
    extracted_at: item.extractedAt,
    created_at: new Date(item.createdAt).getTime(),
    updated_at: now,
    completed_at: item.completedAt ? new Date(item.completedAt).getTime() : null,
  };
}

/**
 * Convert table fields to ManagedActionItem
 */
export function tableFieldsToActionItem(
  record: TypedBitableRecord<ActionItemTableFields>
): ManagedActionItem {
  const fields = record.fields;
  const dueDate = timestampToIsoDate(fields.due_date);

  const baseItem: ManagedActionItem = {
    id: fields.action_id,
    content: fields.title,
    priority: fields.priority as Priority,
    status: fields.status as ActionItemStatus,
    meetingId: fields.meeting.record_ids[0] ?? '',
    meetingTitle: fields.meeting_title,
    meetingDate: fields.meeting_date,
    extractedAt: fields.extracted_at,
    createdAt: new Date(fields.created_at).toISOString(),
    updatedAt: new Date(fields.updated_at).toISOString(),
    isOverdue: false, // Will be calculated
  };

  // Add optional fields
  if (fields.assignee !== null && fields.assignee.length > 0) {
    const assigneeData = fields.assignee[0]!;
    baseItem.assignee = {
      id: assigneeData.id,
      name: assigneeData.name ?? fields.assignee_name ?? 'Unknown',
      larkUserId: assigneeData.id,
    };
  }

  if (dueDate !== undefined) {
    baseItem.dueDate = dueDate;
  }

  if (fields.source_text !== null) {
    baseItem.sourceText = fields.source_text;
  }

  if (fields.related_topic_id !== null) {
    baseItem.relatedTopicId = fields.related_topic_id;
  }

  if (fields.completed_at !== null) {
    baseItem.completedAt = new Date(fields.completed_at).toISOString();
  }

  // Calculate isOverdue
  baseItem.isOverdue = isActionItemOverdue(baseItem);

  return baseItem;
}

// =============================================================================
// LarkBaseService
// =============================================================================

/**
 * Service for managing data in Lark Base (Bitable)
 *
 * Provides CRUD operations for meetings, minutes, and action items
 * with automatic data transformation between application types and
 * Lark Base table fields.
 *
 * @example
 * ```typescript
 * const service = createLarkBaseService(larkClient, accessToken, config);
 *
 * // Save a meeting
 * const meetingRecord = await service.saveMeeting(meeting);
 *
 * // Get action items for a meeting
 * const actionItems = await service.getActionItemsByMeetingId(meetingId);
 * ```
 */
export class LarkBaseService {
  private readonly bitableClient: BitableClient;

  constructor(
    private readonly client: LarkClient,
    private readonly accessToken: string,
    config: BitableClientConfig
  ) {
    this.bitableClient = createBitableClient(client, accessToken, config);
  }

  // ===========================================================================
  // Meeting Operations
  // ===========================================================================

  /**
   * Save a meeting to Lark Base
   *
   * @param meeting - Meeting to save
   * @returns Saved meeting with record ID
   */
  async saveMeeting(
    meeting: Meeting
  ): Promise<{ recordId: string; meeting: Meeting }> {
    try {
      // Check if meeting already exists
      const existing = await this.bitableClient.findOneRecord<MeetingTableFields>(
        'meetings',
        `CurrentValue.[meeting_id]="${meeting.id}"`
      );

      if (existing !== null) {
        // Update existing record
        const updated = await this.bitableClient.updateRecord<MeetingTableFields>(
          'meetings',
          existing.record_id,
          meetingToTableFields(meeting)
        );
        return {
          recordId: updated.record_id,
          meeting: tableFieldsToMeeting(updated),
        };
      }

      // Create new record
      const created = await this.bitableClient.createRecord<MeetingTableFields>(
        'meetings',
        meetingToTableFields(meeting)
      );

      return {
        recordId: created.record_id,
        meeting: tableFieldsToMeeting(created),
      };
    } catch (error) {
      if (error instanceof BitableApiError) {
        throw new LarkBaseServiceError(
          error.message,
          'BITABLE_ERROR',
          error.code,
          error.details
        );
      }
      throw new LarkBaseServiceError(
        'Failed to save meeting',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Get a meeting by ID
   *
   * @param meetingId - Meeting ID (not record ID)
   * @returns Meeting or null if not found
   */
  async getMeeting(meetingId: string): Promise<Meeting | null> {
    try {
      const record = await this.bitableClient.findOneRecord<MeetingTableFields>(
        'meetings',
        `CurrentValue.[meeting_id]="${meetingId}"`
      );

      if (record === null) {
        return null;
      }

      return tableFieldsToMeeting(record);
    } catch (error) {
      if (error instanceof RecordNotFoundError) {
        return null;
      }
      if (error instanceof BitableApiError) {
        throw new LarkBaseServiceError(
          error.message,
          'BITABLE_ERROR',
          error.code,
          error.details
        );
      }
      throw new LarkBaseServiceError(
        'Failed to get meeting',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Get meeting record ID by meeting ID
   *
   * @param meetingId - Meeting ID
   * @returns Record ID or null
   */
  async getMeetingRecordId(meetingId: string): Promise<string | null> {
    try {
      const record = await this.bitableClient.findOneRecord<MeetingTableFields>(
        'meetings',
        `CurrentValue.[meeting_id]="${meetingId}"`
      );

      return record?.record_id ?? null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * List meetings with optional filtering
   *
   * @param options - List options
   * @returns Array of meetings
   */
  async listMeetings(options?: {
    pageSize?: number;
    pageToken?: string;
  }): Promise<{
    meetings: Meeting[];
    hasMore: boolean;
    pageToken?: string;
  }> {
    try {
      const listParams: { page_size?: number; page_token?: string } = {
        page_size: options?.pageSize ?? 20,
      };
      if (options?.pageToken !== undefined) {
        listParams.page_token = options.pageToken;
      }

      const result = await this.bitableClient.listRecords<MeetingTableFields>(
        'meetings',
        listParams
      );

      const response: {
        meetings: Meeting[];
        hasMore: boolean;
        pageToken?: string;
      } = {
        meetings: result.records.map(tableFieldsToMeeting),
        hasMore: result.hasMore,
      };

      if (result.pageToken !== undefined) {
        response.pageToken = result.pageToken;
      }

      return response;
    } catch (error) {
      if (error instanceof BitableApiError) {
        throw new LarkBaseServiceError(
          error.message,
          'BITABLE_ERROR',
          error.code,
          error.details
        );
      }
      throw new LarkBaseServiceError(
        'Failed to list meetings',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Update meeting minutes status
   *
   * @param meetingId - Meeting ID
   * @param status - New minutes status
   */
  async updateMeetingMinutesStatus(
    meetingId: string,
    status: MinutesStatus
  ): Promise<void> {
    try {
      const record = await this.bitableClient.findOneRecord<MeetingTableFields>(
        'meetings',
        `CurrentValue.[meeting_id]="${meetingId}"`
      );

      if (record === null) {
        throw new EntityNotFoundError('Meeting', meetingId);
      }

      await this.bitableClient.updateRecord<MeetingTableFields>(
        'meetings',
        record.record_id,
        {
          minutes_status: status,
          updated_at: Date.now(),
        }
      );
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw error;
      }
      if (error instanceof BitableApiError) {
        throw new LarkBaseServiceError(
          error.message,
          'BITABLE_ERROR',
          error.code,
          error.details
        );
      }
      throw new LarkBaseServiceError(
        'Failed to update meeting status',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Delete a meeting from Lark Base
   *
   * @param meetingId - Meeting ID to delete
   * @throws EntityNotFoundError if meeting doesn't exist
   */
  async deleteMeeting(meetingId: string): Promise<void> {
    try {
      const record = await this.bitableClient.findOneRecord<MeetingTableFields>(
        'meetings',
        `CurrentValue.[meeting_id]="${meetingId}"`
      );

      if (record === null) {
        throw new EntityNotFoundError('Meeting', meetingId);
      }

      await this.bitableClient.deleteRecord('meetings', record.record_id);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw error;
      }
      if (error instanceof BitableApiError) {
        throw new LarkBaseServiceError(
          error.message,
          'BITABLE_ERROR',
          error.code,
          error.details
        );
      }
      throw new LarkBaseServiceError(
        'Failed to delete meeting',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }

  // ===========================================================================
  // Minutes Operations
  // ===========================================================================

  /**
   * Save minutes to Lark Base
   *
   * @param minutes - Minutes to save
   * @param meetingId - Associated meeting ID
   * @param docUrl - Optional Lark Docs URL
   * @returns Saved minutes with record ID and version
   */
  async saveMinutes(
    minutes: Minutes,
    meetingId: string,
    docUrl?: string
  ): Promise<{ recordId: string; version: number; minutes: Minutes }> {
    try {
      // Get meeting record ID
      const meetingRecordId = await this.getMeetingRecordId(meetingId);
      if (meetingRecordId === null) {
        throw new EntityNotFoundError('Meeting', meetingId);
      }

      // Check for existing minutes and get latest version
      const existingMinutes = await this.bitableClient.findRecords<MinutesTableFields>(
        'minutes',
        `CurrentValue.[meeting]="${meetingRecordId}"`
      );

      let version = 1;
      if (existingMinutes.length > 0) {
        // Find max version
        version =
          Math.max(...existingMinutes.map((r) => r.fields.version ?? 0)) + 1;
      }

      // Create new minutes record (append, not replace)
      const fields = minutesToTableFields(
        minutes,
        meetingRecordId,
        version,
        docUrl
      );
      const created = await this.bitableClient.createRecord<MinutesTableFields>(
        'minutes',
        fields
      );

      // Update meeting minutes status
      await this.updateMeetingMinutesStatus(meetingId, 'draft');

      return {
        recordId: created.record_id,
        version,
        minutes: tableFieldsToMinutes(created, meetingId),
      };
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw error;
      }
      if (error instanceof BitableApiError) {
        throw new LarkBaseServiceError(
          error.message,
          'BITABLE_ERROR',
          error.code,
          error.details
        );
      }
      throw new LarkBaseServiceError(
        'Failed to save minutes',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Get minutes by meeting ID
   *
   * @param meetingId - Meeting ID
   * @param version - Optional specific version (defaults to latest)
   * @returns Minutes or null if not found
   */
  async getMinutes(meetingId: string, version?: number): Promise<Minutes | null> {
    try {
      const meetingRecordId = await this.getMeetingRecordId(meetingId);
      if (meetingRecordId === null) {
        return null;
      }

      let filter = `CurrentValue.[meeting]="${meetingRecordId}"`;
      if (version !== undefined) {
        filter += ` AND CurrentValue.[version]=${version}`;
      }

      const records = await this.bitableClient.findRecords<MinutesTableFields>(
        'minutes',
        filter
      );

      if (records.length === 0) {
        return null;
      }

      // Get latest version if no specific version requested
      let record: TypedBitableRecord<MinutesTableFields>;
      if (version !== undefined) {
        const firstRecord = records[0];
        if (firstRecord === undefined) {
          return null;
        }
        record = firstRecord;
      } else {
        record = records.reduce((latest, current) =>
          (current.fields.version ?? 0) > (latest.fields.version ?? 0)
            ? current
            : latest
        );
      }

      return tableFieldsToMinutes(record, meetingId);
    } catch (error) {
      if (error instanceof BitableApiError) {
        throw new LarkBaseServiceError(
          error.message,
          'BITABLE_ERROR',
          error.code,
          error.details
        );
      }
      throw new LarkBaseServiceError(
        'Failed to get minutes',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }

  /**
   * List all versions of minutes for a meeting
   *
   * @param meetingId - Meeting ID
   * @returns Array of minutes versions
   */
  async listMinutesVersions(
    meetingId: string
  ): Promise<Array<{ version: number; generatedAt: string; recordId: string }>> {
    try {
      const meetingRecordId = await this.getMeetingRecordId(meetingId);
      if (meetingRecordId === null) {
        return [];
      }

      const records = await this.bitableClient.findRecords<MinutesTableFields>(
        'minutes',
        `CurrentValue.[meeting]="${meetingRecordId}"`
      );

      return records
        .map((r) => ({
          version: r.fields.version,
          generatedAt: r.fields.generated_at,
          recordId: r.record_id,
        }))
        .sort((a, b) => b.version - a.version);
    } catch (error) {
      if (error instanceof BitableApiError) {
        throw new LarkBaseServiceError(
          error.message,
          'BITABLE_ERROR',
          error.code,
          error.details
        );
      }
      throw new LarkBaseServiceError(
        'Failed to list minutes versions',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Update minutes doc URL
   *
   * @param minutesId - Minutes ID
   * @param docUrl - Lark Docs URL
   */
  async updateMinutesDocUrl(minutesId: string, docUrl: string): Promise<void> {
    try {
      const record = await this.bitableClient.findOneRecord<MinutesTableFields>(
        'minutes',
        `CurrentValue.[minutes_id]="${minutesId}"`
      );

      if (record === null) {
        throw new EntityNotFoundError('Minutes', minutesId);
      }

      await this.bitableClient.updateRecord<MinutesTableFields>(
        'minutes',
        record.record_id,
        {
          doc_url: docUrl,
          updated_at: Date.now(),
        }
      );
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw error;
      }
      if (error instanceof BitableApiError) {
        throw new LarkBaseServiceError(
          error.message,
          'BITABLE_ERROR',
          error.code,
          error.details
        );
      }
      throw new LarkBaseServiceError(
        'Failed to update minutes doc URL',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }

  // ===========================================================================
  // Action Item Operations
  // ===========================================================================

  /**
   * Save action items for a meeting
   *
   * @param actionItems - Action items to save
   * @param meetingId - Associated meeting ID
   * @returns Array of saved action items with record IDs
   */
  async saveActionItems(
    actionItems: ManagedActionItem[],
    meetingId: string
  ): Promise<Array<{ recordId: string; actionItem: ManagedActionItem }>> {
    try {
      const meetingRecordId = await this.getMeetingRecordId(meetingId);
      if (meetingRecordId === null) {
        throw new EntityNotFoundError('Meeting', meetingId);
      }

      if (actionItems.length === 0) {
        return [];
      }

      // Batch create action items
      const fields = actionItems.map((item) =>
        actionItemToTableFields(item, meetingRecordId)
      );
      const created =
        await this.bitableClient.batchCreateRecords<ActionItemTableFields>(
          'actionItems',
          fields
        );

      return created.map((record) => ({
        recordId: record.record_id,
        actionItem: tableFieldsToActionItem(record),
      }));
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw error;
      }
      if (error instanceof BitableApiError) {
        throw new LarkBaseServiceError(
          error.message,
          'BITABLE_ERROR',
          error.code,
          error.details
        );
      }
      throw new LarkBaseServiceError(
        'Failed to save action items',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Get action items by meeting ID
   *
   * @param meetingId - Meeting ID
   * @returns Array of action items
   */
  async getActionItemsByMeetingId(
    meetingId: string
  ): Promise<ManagedActionItem[]> {
    try {
      const meetingRecordId = await this.getMeetingRecordId(meetingId);
      if (meetingRecordId === null) {
        return [];
      }

      const records =
        await this.bitableClient.findRecords<ActionItemTableFields>(
          'actionItems',
          `CurrentValue.[meeting]="${meetingRecordId}"`
        );

      return records.map(tableFieldsToActionItem);
    } catch (error) {
      if (error instanceof BitableApiError) {
        throw new LarkBaseServiceError(
          error.message,
          'BITABLE_ERROR',
          error.code,
          error.details
        );
      }
      throw new LarkBaseServiceError(
        'Failed to get action items',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Get a single action item by ID
   *
   * @param actionItemId - Action item ID
   * @returns Action item or null if not found
   */
  async getActionItem(actionItemId: string): Promise<ManagedActionItem | null> {
    try {
      const record =
        await this.bitableClient.findOneRecord<ActionItemTableFields>(
          'actionItems',
          `CurrentValue.[action_id]="${actionItemId}"`
        );

      if (record === null) {
        return null;
      }

      return tableFieldsToActionItem(record);
    } catch (error) {
      if (error instanceof BitableApiError) {
        throw new LarkBaseServiceError(
          error.message,
          'BITABLE_ERROR',
          error.code,
          error.details
        );
      }
      throw new LarkBaseServiceError(
        'Failed to get action item',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Update action item status
   *
   * @param actionItemId - Action item ID
   * @param status - New status
   * @returns Updated action item
   */
  async updateActionItemStatus(
    actionItemId: string,
    status: ActionItemStatus
  ): Promise<ManagedActionItem> {
    try {
      const record =
        await this.bitableClient.findOneRecord<ActionItemTableFields>(
          'actionItems',
          `CurrentValue.[action_id]="${actionItemId}"`
        );

      if (record === null) {
        throw new EntityNotFoundError('ActionItem', actionItemId);
      }

      const updates: Partial<ActionItemTableFields> = {
        status,
        updated_at: Date.now(),
      };

      // Set completed_at if transitioning to completed
      if (status === 'completed' && record.fields.status !== 'completed') {
        updates.completed_at = Date.now();
      }

      const updated = await this.bitableClient.updateRecord<ActionItemTableFields>(
        'actionItems',
        record.record_id,
        updates
      );

      return tableFieldsToActionItem(updated);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw error;
      }
      if (error instanceof BitableApiError) {
        throw new LarkBaseServiceError(
          error.message,
          'BITABLE_ERROR',
          error.code,
          error.details
        );
      }
      throw new LarkBaseServiceError(
        'Failed to update action item status',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Update action item fields
   *
   * @param actionItemId - Action item ID
   * @param updates - Fields to update
   * @returns Updated action item
   */
  async updateActionItem(
    actionItemId: string,
    updates: Partial<
      Pick<
        ManagedActionItem,
        'content' | 'assignee' | 'dueDate' | 'priority' | 'status'
      >
    >
  ): Promise<ManagedActionItem> {
    try {
      const record =
        await this.bitableClient.findOneRecord<ActionItemTableFields>(
          'actionItems',
          `CurrentValue.[action_id]="${actionItemId}"`
        );

      if (record === null) {
        throw new EntityNotFoundError('ActionItem', actionItemId);
      }

      const fieldUpdates: Partial<ActionItemTableFields> = {
        updated_at: Date.now(),
      };

      if (updates.content !== undefined) {
        fieldUpdates.title = updates.content;
      }
      if (updates.assignee !== undefined) {
        fieldUpdates.assignee = [
          {
            id: updates.assignee.larkUserId ?? updates.assignee.id,
            name: updates.assignee.name,
          },
        ];
        fieldUpdates.assignee_name = updates.assignee.name;
      }
      if (updates.dueDate !== undefined) {
        fieldUpdates.due_date = isoDateToTimestamp(updates.dueDate);
      }
      if (updates.priority !== undefined) {
        fieldUpdates.priority = updates.priority;
      }
      if (updates.status !== undefined) {
        fieldUpdates.status = updates.status;
        if (updates.status === 'completed' && record.fields.status !== 'completed') {
          fieldUpdates.completed_at = Date.now();
        }
      }

      const updated = await this.bitableClient.updateRecord<ActionItemTableFields>(
        'actionItems',
        record.record_id,
        fieldUpdates
      );

      return tableFieldsToActionItem(updated);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw error;
      }
      if (error instanceof BitableApiError) {
        throw new LarkBaseServiceError(
          error.message,
          'BITABLE_ERROR',
          error.code,
          error.details
        );
      }
      throw new LarkBaseServiceError(
        'Failed to update action item',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Delete an action item
   *
   * @param actionItemId - Action item ID
   */
  async deleteActionItem(actionItemId: string): Promise<void> {
    try {
      const record =
        await this.bitableClient.findOneRecord<ActionItemTableFields>(
          'actionItems',
          `CurrentValue.[action_id]="${actionItemId}"`
        );

      if (record === null) {
        throw new EntityNotFoundError('ActionItem', actionItemId);
      }

      await this.bitableClient.deleteRecord('actionItems', record.record_id);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw error;
      }
      if (error instanceof BitableApiError) {
        throw new LarkBaseServiceError(
          error.message,
          'BITABLE_ERROR',
          error.code,
          error.details
        );
      }
      throw new LarkBaseServiceError(
        'Failed to delete action item',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }

  /**
   * List all action items with filtering
   *
   * @param filters - Optional filters
   * @param options - Pagination options
   * @returns Array of action items
   */
  async listActionItems(
    filters?: ActionItemFilters,
    options?: { pageSize?: number; pageToken?: string }
  ): Promise<{
    actionItems: ManagedActionItem[];
    hasMore: boolean;
    pageToken?: string;
  }> {
    try {
      // Build filter string
      const filterParts: string[] = [];

      if (filters?.status !== undefined && filters.status.length > 0) {
        const statusFilters = filters.status
          .map((s) => `CurrentValue.[status]="${s}"`)
          .join(' OR ');
        filterParts.push(`(${statusFilters})`);
      }

      if (filters?.priority !== undefined && filters.priority.length > 0) {
        const priorityFilters = filters.priority
          .map((p) => `CurrentValue.[priority]="${p}"`)
          .join(' OR ');
        filterParts.push(`(${priorityFilters})`);
      }

      if (filters?.assigneeId !== undefined) {
        filterParts.push(
          `CurrentValue.[assignee]="${filters.assigneeId}"`
        );
      }

      const listParams: {
        filter?: string;
        page_size?: number;
        page_token?: string;
      } = {
        page_size: options?.pageSize ?? 20,
      };

      if (filterParts.length > 0) {
        listParams.filter = filterParts.join(' AND ');
      }
      if (options?.pageToken !== undefined) {
        listParams.page_token = options.pageToken;
      }

      const result = await this.bitableClient.listRecords<ActionItemTableFields>(
        'actionItems',
        listParams
      );

      let actionItems = result.records.map(tableFieldsToActionItem);

      // Apply additional filters that can't be done in API
      if (filters?.isOverdue !== undefined) {
        actionItems = actionItems.filter(
          (item) => item.isOverdue === filters.isOverdue
        );
      }

      if (filters?.searchQuery !== undefined && filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.toLowerCase();
        actionItems = actionItems.filter(
          (item) =>
            item.content.toLowerCase().includes(query) ||
            item.meetingTitle.toLowerCase().includes(query) ||
            (item.assignee?.name.toLowerCase().includes(query) ?? false)
        );
      }

      const response: {
        actionItems: ManagedActionItem[];
        hasMore: boolean;
        pageToken?: string;
      } = {
        actionItems,
        hasMore: result.hasMore,
      };

      if (result.pageToken !== undefined) {
        response.pageToken = result.pageToken;
      }

      return response;
    } catch (error) {
      if (error instanceof BitableApiError) {
        throw new LarkBaseServiceError(
          error.message,
          'BITABLE_ERROR',
          error.code,
          error.details
        );
      }
      throw new LarkBaseServiceError(
        'Failed to list action items',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }

  /**
   * Batch update action item statuses
   *
   * @param updates - Array of { id, status } updates
   * @returns Array of updated action items
   */
  async batchUpdateActionItemStatus(
    updates: Array<{ id: string; status: ActionItemStatus }>
  ): Promise<ManagedActionItem[]> {
    try {
      // First, get all records to update
      const records = await Promise.all(
        updates.map(async (update) => {
          const record =
            await this.bitableClient.findOneRecord<ActionItemTableFields>(
              'actionItems',
              `CurrentValue.[action_id]="${update.id}"`
            );
          return { update, record };
        })
      );

      // Filter out not found records
      const validRecords = records.filter((r) => r.record !== null) as Array<{
        update: { id: string; status: ActionItemStatus };
        record: TypedBitableRecord<ActionItemTableFields>;
      }>;

      if (validRecords.length === 0) {
        return [];
      }

      // Batch update
      const now = Date.now();
      const updatePayload = validRecords.map(({ update, record }) => ({
        record_id: record.record_id,
        fields: {
          status: update.status,
          updated_at: now,
          completed_at:
            update.status === 'completed' && record.fields.status !== 'completed'
              ? now
              : record.fields.completed_at,
        },
      }));

      const updated =
        await this.bitableClient.batchUpdateRecords<ActionItemTableFields>(
          'actionItems',
          updatePayload
        );

      return updated.map(tableFieldsToActionItem);
    } catch (error) {
      if (error instanceof BitableApiError) {
        throw new LarkBaseServiceError(
          error.message,
          'BITABLE_ERROR',
          error.code,
          error.details
        );
      }
      throw new LarkBaseServiceError(
        'Failed to batch update action items',
        'UNKNOWN_ERROR',
        500,
        error
      );
    }
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a LarkBaseService instance
 *
 * @param client - Lark HTTP client
 * @param accessToken - User access token
 * @param config - Bitable configuration
 * @returns LarkBaseService instance
 */
export function createLarkBaseService(
  client: LarkClient,
  accessToken: string,
  config: BitableClientConfig
): LarkBaseService {
  return new LarkBaseService(client, accessToken, config);
}

/**
 * Create a LarkBaseService instance from environment variables
 *
 * @param client - Lark HTTP client
 * @param accessToken - User access token
 * @returns LarkBaseService instance
 */
export function createLarkBaseServiceFromEnv(
  client: LarkClient,
  accessToken: string
): LarkBaseService {
  const appToken = process.env.LARK_BASE_APP_TOKEN;
  const meetingsTableId = process.env.LARK_BASE_MEETINGS_TABLE_ID;
  const minutesTableId = process.env.LARK_BASE_MINUTES_TABLE_ID;
  const actionItemsTableId = process.env.LARK_BASE_ACTION_ITEMS_TABLE_ID;

  if (
    appToken === undefined ||
    appToken === '' ||
    meetingsTableId === undefined ||
    meetingsTableId === '' ||
    minutesTableId === undefined ||
    minutesTableId === '' ||
    actionItemsTableId === undefined ||
    actionItemsTableId === ''
  ) {
    throw new LarkBaseServiceError(
      'Missing required Lark Base environment variables',
      'CONFIG_ERROR',
      500,
      {
        required: [
          'LARK_BASE_APP_TOKEN',
          'LARK_BASE_MEETINGS_TABLE_ID',
          'LARK_BASE_MINUTES_TABLE_ID',
          'LARK_BASE_ACTION_ITEMS_TABLE_ID',
        ],
      }
    );
  }

  return createLarkBaseService(client, accessToken, {
    appToken,
    tableIds: {
      meetings: meetingsTableId,
      minutes: minutesTableId,
      actionItems: actionItemsTableId,
    },
  });
}
