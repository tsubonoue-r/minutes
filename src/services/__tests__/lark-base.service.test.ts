/**
 * Tests for LarkBaseService
 * @module services/__tests__/lark-base.service.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LarkBaseService,
  LarkBaseServiceError,
  EntityNotFoundError,
  createLarkBaseService,
  createLarkBaseServiceFromEnv,
  meetingToTableFields,
  tableFieldsToMeeting,
  actionItemToTableFields,
  tableFieldsToActionItem,
  type MeetingTableFields,
  type ActionItemTableFields,
} from '../lark-base.service';
import type { Meeting, MeetingStatus, MeetingType, MinutesStatus } from '@/types/meeting';
import type { Minutes } from '@/types/minutes';
import type { ManagedActionItem } from '@/types/action-item';
import type { LarkClient } from '@/lib/lark/client';
import type { BitableClientConfig, TypedBitableRecord } from '@/lib/lark/bitable';

// =============================================================================
// Test Fixtures
// =============================================================================

const mockConfig: BitableClientConfig = {
  appToken: 'test_app_token',
  tableIds: {
    meetings: 'tbl_meetings',
    minutes: 'tbl_minutes',
    actionItems: 'tbl_action_items',
  },
};

interface MockLarkClient {
  authenticatedRequest: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  getConfig: ReturnType<typeof vi.fn>;
}

const createMockLarkClient = (): MockLarkClient => ({
  authenticatedRequest: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  getConfig: vi.fn(() => ({
    appId: 'test_app_id',
    appSecret: 'test_secret',
    baseUrl: 'https://open.larksuite.com',
    redirectUri: 'http://localhost:3000/callback',
  })),
});

const createMockMeeting = (overrides?: Partial<Meeting>): Meeting => ({
  id: 'meeting-123',
  title: 'Test Meeting',
  meetingNo: 'MTG-001',
  startTime: new Date('2024-01-15T10:00:00Z'),
  endTime: new Date('2024-01-15T11:00:00Z'),
  durationMinutes: 60,
  status: 'ended' as MeetingStatus,
  type: 'regular' as MeetingType,
  host: {
    id: 'user-1',
    name: 'Test Host',
    avatarUrl: 'https://example.com/avatar.png',
  },
  participantCount: 5,
  hasRecording: false,
  recordingUrl: undefined,
  minutesStatus: 'not_created' as MinutesStatus,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T11:00:00Z'),
  ...overrides,
});

const createMockMinutes = (overrides?: Partial<Minutes>): Minutes => ({
  id: 'minutes-123',
  meetingId: 'meeting-123',
  title: 'Test Meeting Minutes',
  date: '2024-01-15',
  duration: 3600000,
  summary: 'This is a test summary.',
  topics: [],
  decisions: [],
  actionItems: [],
  attendees: [{ id: 'user-1', name: 'Test User' }],
  metadata: {
    generatedAt: '2024-01-15T12:00:00Z',
    model: 'claude-sonnet-4-20250514',
    processingTimeMs: 1000,
    confidence: 0.95,
  },
  ...overrides,
});

const createMockActionItem = (
  overrides?: Partial<ManagedActionItem>
): ManagedActionItem => ({
  id: 'action-123',
  content: 'Complete the task',
  priority: 'high',
  status: 'pending',
  meetingId: 'meeting-123',
  meetingTitle: 'Test Meeting',
  meetingDate: '2024-01-15',
  extractedAt: '2024-01-15T12:00:00Z',
  createdAt: '2024-01-15T12:00:00Z',
  updatedAt: '2024-01-15T12:00:00Z',
  isOverdue: false,
  assignee: {
    id: 'user-1',
    name: 'Test User',
    larkUserId: 'lark-user-1',
  },
  dueDate: '2024-01-20',
  ...overrides,
});

// =============================================================================
// Transformation Tests
// =============================================================================

describe('Transformation Functions', () => {
  describe('meetingToTableFields', () => {
    it('should convert Meeting to table fields', () => {
      const meeting = createMockMeeting();
      const fields = meetingToTableFields(meeting);

      expect(fields.meeting_id).toBe('meeting-123');
      expect(fields.meeting_title).toBe('Test Meeting');
      expect(fields.meeting_type).toBe('regular');
      expect(fields.host_id).toBe('user-1');
      expect(fields.host_name).toBe('Test Host');
      expect(fields.participant_count).toBe(5);
      expect(fields.has_recording).toBe(false);
      expect(fields.minutes_status).toBe('not_created');
    });

    it('should handle optional recording URL', () => {
      const meetingWithRecording = createMockMeeting({
        hasRecording: true,
        recordingUrl: 'https://example.com/recording',
      });
      const fields = meetingToTableFields(meetingWithRecording);

      expect(fields.has_recording).toBe(true);
      expect(fields.recording_url).toBe('https://example.com/recording');
    });
  });

  describe('tableFieldsToMeeting', () => {
    it('should convert table fields to Meeting', () => {
      const now = Date.now();
      const record: TypedBitableRecord<MeetingTableFields> = {
        record_id: 'rec_123',
        fields: {
          meeting_id: 'meeting-123',
          meeting_title: 'Test Meeting',
          meeting_type: 'regular',
          start_time: new Date('2024-01-15T10:00:00Z').getTime(),
          end_time: new Date('2024-01-15T11:00:00Z').getTime(),
          participants: [],
          minutes_status: 'not_created',
          host_id: 'user-1',
          host_name: 'Test Host',
          participant_count: 5,
          has_recording: false,
          recording_url: null,
          created_at: now,
          updated_at: now,
        },
      };

      const meeting = tableFieldsToMeeting(record);

      expect(meeting.id).toBe('meeting-123');
      expect(meeting.title).toBe('Test Meeting');
      expect(meeting.type).toBe('regular');
      expect(meeting.host.id).toBe('user-1');
      expect(meeting.host.name).toBe('Test Host');
      expect(meeting.durationMinutes).toBe(60);
    });
  });

  describe('actionItemToTableFields', () => {
    it('should convert ManagedActionItem to table fields', () => {
      const actionItem = createMockActionItem();
      const fields = actionItemToTableFields(actionItem, 'rec_meeting_123');

      expect(fields.action_id).toBe('action-123');
      expect(fields.title).toBe('Complete the task');
      expect(fields.priority).toBe('high');
      expect(fields.status).toBe('pending');
      expect(fields.meeting.record_ids).toContain('rec_meeting_123');
      expect(fields.assignee_name).toBe('Test User');
    });

    it('should handle action item without assignee', () => {
      const actionItem = createMockActionItem({ assignee: undefined });
      const fields = actionItemToTableFields(actionItem, 'rec_meeting_123');

      expect(fields.assignee).toBeNull();
      expect(fields.assignee_name).toBeNull();
    });
  });

  describe('tableFieldsToActionItem', () => {
    it('should convert table fields to ManagedActionItem', () => {
      const now = Date.now();
      const record: TypedBitableRecord<ActionItemTableFields> = {
        record_id: 'rec_123',
        fields: {
          action_id: 'action-123',
          meeting: { record_ids: ['rec_meeting_123'] },
          title: 'Complete the task',
          assignee: [{ id: 'lark-user-1', name: 'Test User' }],
          assignee_name: 'Test User',
          due_date: new Date('2024-01-20').getTime(),
          priority: 'high',
          status: 'pending',
          meeting_title: 'Test Meeting',
          meeting_date: '2024-01-15',
          source_text: null,
          related_topic_id: null,
          extracted_at: '2024-01-15T12:00:00Z',
          created_at: now,
          updated_at: now,
          completed_at: null,
        },
      };

      const actionItem = tableFieldsToActionItem(record);

      expect(actionItem.id).toBe('action-123');
      expect(actionItem.content).toBe('Complete the task');
      expect(actionItem.priority).toBe('high');
      expect(actionItem.status).toBe('pending');
      expect(actionItem.assignee?.name).toBe('Test User');
      expect(actionItem.dueDate).toBe('2024-01-20');
    });

    it('should calculate isOverdue for past due items', () => {
      const pastDue = new Date();
      pastDue.setDate(pastDue.getDate() - 5);

      const record: TypedBitableRecord<ActionItemTableFields> = {
        record_id: 'rec_123',
        fields: {
          action_id: 'action-123',
          meeting: { record_ids: ['rec_meeting_123'] },
          title: 'Overdue task',
          assignee: null,
          assignee_name: null,
          due_date: pastDue.getTime(),
          priority: 'high',
          status: 'pending',
          meeting_title: 'Test Meeting',
          meeting_date: '2024-01-15',
          source_text: null,
          related_topic_id: null,
          extracted_at: '2024-01-15T12:00:00Z',
          created_at: Date.now(),
          updated_at: Date.now(),
          completed_at: null,
        },
      };

      const actionItem = tableFieldsToActionItem(record);
      expect(actionItem.isOverdue).toBe(true);
    });
  });
});

// =============================================================================
// LarkBaseService Tests
// =============================================================================

describe('LarkBaseService', () => {
  let mockClient: ReturnType<typeof createMockLarkClient>;
  let service: LarkBaseService;

  beforeEach(() => {
    mockClient = createMockLarkClient();
    service = new LarkBaseService(
      mockClient as unknown as LarkClient,
      'test_access_token',
      mockConfig
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('saveMeeting', () => {
    it('should create new meeting when not exists', async () => {
      // First call: check if exists (returns empty)
      mockClient.authenticatedRequest
        .mockResolvedValueOnce({
          code: 0,
          msg: 'success',
          data: { has_more: false, items: [] },
        })
        // Second call: create record
        .mockResolvedValueOnce({
          code: 0,
          msg: 'success',
          data: {
            record: {
              record_id: 'rec_new',
              fields: meetingToTableFields(createMockMeeting()),
            },
          },
        });

      const meeting = createMockMeeting();
      const result = await service.saveMeeting(meeting);

      expect(result.recordId).toBe('rec_new');
      expect(mockClient.authenticatedRequest).toHaveBeenCalledTimes(2);
    });

    it('should update existing meeting', async () => {
      const existingRecord = {
        record_id: 'rec_existing',
        fields: meetingToTableFields(createMockMeeting()),
      };

      // First call: check if exists
      mockClient.authenticatedRequest
        .mockResolvedValueOnce({
          code: 0,
          msg: 'success',
          data: { has_more: false, items: [existingRecord] },
        })
        // Second call: update record
        .mockResolvedValueOnce({
          code: 0,
          msg: 'success',
          data: { record: existingRecord },
        });

      const meeting = createMockMeeting();
      const result = await service.saveMeeting(meeting);

      expect(result.recordId).toBe('rec_existing');
    });
  });

  describe('getMeeting', () => {
    it('should return meeting when found', async () => {
      const fields = meetingToTableFields(createMockMeeting());
      mockClient.authenticatedRequest.mockResolvedValue({
        code: 0,
        msg: 'success',
        data: {
          has_more: false,
          items: [{ record_id: 'rec_123', fields }],
        },
      });

      const meeting = await service.getMeeting('meeting-123');

      expect(meeting).not.toBeNull();
      expect(meeting?.id).toBe('meeting-123');
    });

    it('should return null when meeting not found', async () => {
      mockClient.authenticatedRequest.mockResolvedValue({
        code: 0,
        msg: 'success',
        data: { has_more: false, items: [] },
      });

      const meeting = await service.getMeeting('nonexistent');

      expect(meeting).toBeNull();
    });
  });

  describe('saveMinutes', () => {
    it('should save minutes with version 1 for new meeting', async () => {
      const meetingFields = meetingToTableFields(createMockMeeting());

      // Get meeting record ID
      mockClient.authenticatedRequest
        .mockResolvedValueOnce({
          code: 0,
          msg: 'success',
          data: {
            has_more: false,
            items: [{ record_id: 'rec_meeting', fields: meetingFields }],
          },
        })
        // Check existing minutes (none)
        .mockResolvedValueOnce({
          code: 0,
          msg: 'success',
          data: { has_more: false, items: [] },
        })
        // Create minutes
        .mockResolvedValueOnce({
          code: 0,
          msg: 'success',
          data: {
            record: {
              record_id: 'rec_minutes',
              fields: {
                minutes_id: 'minutes-123',
                meeting: { record_ids: ['rec_meeting'] },
                version: 1,
                title: 'Test Meeting Minutes',
                summary: 'This is a test summary.',
                decisions_json: '[]',
                topics_json: '[]',
                action_items_json: '[]',
                attendees_json: '[{"id":"user-1","name":"Test User"}]',
                doc_url: null,
                generated_at: '2024-01-15T12:00:00Z',
                model: 'claude-sonnet-4-20250514',
                confidence: 0.95,
                created_at: Date.now(),
                updated_at: Date.now(),
              },
            },
          },
        })
        // Update meeting status
        .mockResolvedValueOnce({
          code: 0,
          msg: 'success',
          data: {
            has_more: false,
            items: [{ record_id: 'rec_meeting', fields: meetingFields }],
          },
        })
        .mockResolvedValueOnce({
          code: 0,
          msg: 'success',
          data: { record: { record_id: 'rec_meeting', fields: meetingFields } },
        });

      const minutes = createMockMinutes();
      const result = await service.saveMinutes(minutes, 'meeting-123');

      expect(result.version).toBe(1);
      expect(result.recordId).toBe('rec_minutes');
    });

    it('should throw EntityNotFoundError when meeting not found', async () => {
      mockClient.authenticatedRequest.mockResolvedValue({
        code: 0,
        msg: 'success',
        data: { has_more: false, items: [] },
      });

      const minutes = createMockMinutes();
      await expect(
        service.saveMinutes(minutes, 'nonexistent')
      ).rejects.toThrow(EntityNotFoundError);
    });
  });

  describe('saveActionItems', () => {
    it('should save action items for meeting', async () => {
      const meetingFields = meetingToTableFields(createMockMeeting());
      const actionItem = createMockActionItem();

      // Get meeting record ID
      mockClient.authenticatedRequest
        .mockResolvedValueOnce({
          code: 0,
          msg: 'success',
          data: {
            has_more: false,
            items: [{ record_id: 'rec_meeting', fields: meetingFields }],
          },
        })
        // Batch create
        .mockResolvedValueOnce({
          code: 0,
          msg: 'success',
          data: {
            records: [
              {
                record_id: 'rec_action',
                fields: actionItemToTableFields(actionItem, 'rec_meeting'),
              },
            ],
          },
        });

      const result = await service.saveActionItems([actionItem], 'meeting-123');

      expect(result).toHaveLength(1);
      expect(result[0]!.recordId).toBe('rec_action');
    });

    it('should return empty array for empty action items', async () => {
      mockClient.authenticatedRequest.mockResolvedValue({
        code: 0,
        msg: 'success',
        data: {
          has_more: false,
          items: [
            {
              record_id: 'rec_meeting',
              fields: meetingToTableFields(createMockMeeting()),
            },
          ],
        },
      });

      const result = await service.saveActionItems([], 'meeting-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteMeeting', () => {
    it('should delete meeting successfully', async () => {
      const meetingFields = meetingToTableFields(createMockMeeting());

      // Find meeting
      mockClient.authenticatedRequest
        .mockResolvedValueOnce({
          code: 0,
          msg: 'success',
          data: {
            has_more: false,
            items: [{ record_id: 'rec_meeting', fields: meetingFields }],
          },
        })
        // Delete meeting
        .mockResolvedValueOnce({
          code: 0,
          msg: 'success',
          data: { deleted: true, record_id: 'rec_meeting' },
        });

      await expect(service.deleteMeeting('meeting-123')).resolves.not.toThrow();
      expect(mockClient.authenticatedRequest).toHaveBeenCalledTimes(2);
    });

    it('should throw EntityNotFoundError when meeting not found', async () => {
      mockClient.authenticatedRequest.mockResolvedValue({
        code: 0,
        msg: 'success',
        data: { has_more: false, items: [] },
      });

      await expect(service.deleteMeeting('nonexistent')).rejects.toThrow(
        EntityNotFoundError
      );
    });
  });

  describe('updateActionItemStatus', () => {
    it('should update action item status', async () => {
      const actionItem = createMockActionItem();
      const fields = actionItemToTableFields(actionItem, 'rec_meeting');

      // Find action item
      mockClient.authenticatedRequest
        .mockResolvedValueOnce({
          code: 0,
          msg: 'success',
          data: {
            has_more: false,
            items: [{ record_id: 'rec_action', fields }],
          },
        })
        // Update action item
        .mockResolvedValueOnce({
          code: 0,
          msg: 'success',
          data: {
            record: {
              record_id: 'rec_action',
              fields: { ...fields, status: 'completed' },
            },
          },
        });

      const result = await service.updateActionItemStatus(
        'action-123',
        'completed'
      );

      expect(result.status).toBe('completed');
    });

    it('should set completedAt when transitioning to completed', async () => {
      const actionItem = createMockActionItem({ status: 'pending' });
      const fields = actionItemToTableFields(actionItem, 'rec_meeting');

      mockClient.authenticatedRequest
        .mockResolvedValueOnce({
          code: 0,
          msg: 'success',
          data: {
            has_more: false,
            items: [{ record_id: 'rec_action', fields }],
          },
        })
        .mockResolvedValueOnce({
          code: 0,
          msg: 'success',
          data: {
            record: {
              record_id: 'rec_action',
              fields: {
                ...fields,
                status: 'completed',
                completed_at: Date.now(),
              },
            },
          },
        });

      const result = await service.updateActionItemStatus(
        'action-123',
        'completed'
      );

      expect(result.completedAt).toBeDefined();
    });
  });
});

// =============================================================================
// Factory Function Tests
// =============================================================================

describe('createLarkBaseService', () => {
  it('should create service instance', () => {
    const mockClient = createMockLarkClient();
    const service = createLarkBaseService(
      mockClient as unknown as LarkClient,
      'token',
      mockConfig
    );

    expect(service).toBeInstanceOf(LarkBaseService);
  });
});

describe('createLarkBaseServiceFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create service from environment variables', () => {
    process.env.LARK_BASE_APP_TOKEN = 'env_app_token';
    process.env.LARK_BASE_MEETINGS_TABLE_ID = 'env_meetings';
    process.env.LARK_BASE_MINUTES_TABLE_ID = 'env_minutes';
    process.env.LARK_BASE_ACTION_ITEMS_TABLE_ID = 'env_actions';

    const mockClient = createMockLarkClient();
    const service = createLarkBaseServiceFromEnv(
      mockClient as unknown as LarkClient,
      'token'
    );

    expect(service).toBeInstanceOf(LarkBaseService);
  });

  it('should throw error when environment variables are missing', () => {
    process.env.LARK_BASE_APP_TOKEN = '';

    const mockClient = createMockLarkClient();
    expect(() =>
      createLarkBaseServiceFromEnv(mockClient as unknown as LarkClient, 'token')
    ).toThrow(LarkBaseServiceError);
  });
});

// =============================================================================
// Error Class Tests
// =============================================================================

describe('Error Classes', () => {
  describe('LarkBaseServiceError', () => {
    it('should create error with correct properties', () => {
      const error = new LarkBaseServiceError(
        'Test error',
        'TEST_CODE',
        400,
        { extra: 'info' }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ extra: 'info' });
      expect(error.name).toBe('LarkBaseServiceError');
    });
  });

  describe('EntityNotFoundError', () => {
    it('should create error with correct message', () => {
      const error = new EntityNotFoundError('Meeting', 'meeting-123');

      expect(error.message).toBe("Meeting with id 'meeting-123' not found");
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('EntityNotFoundError');
    });
  });
});
