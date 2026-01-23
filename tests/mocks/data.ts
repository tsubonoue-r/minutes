/**
 * Mock data for integration tests
 * @module tests/mocks/data
 */

import type { Meeting, Participant } from '@/types/meeting';
import type { Minutes } from '@/types/minutes';
import type { ManagedActionItem } from '@/types/action-item';

// ============================================================================
// Lark API Mock Response Data
// ============================================================================

/**
 * Mock app access token response from Lark API
 */
export const mockAppAccessTokenResponse = {
  code: 0,
  msg: 'ok',
  app_access_token: 'test-app-access-token-12345',
  expire: 7200,
};

/**
 * Mock meeting list response from Lark VC API (meeting_list endpoint)
 * Matches the new response format with formatted datetime strings
 */
export const mockLarkMeetingListResponse = {
  code: 0,
  msg: '',
  data: {
    has_more: false,
    page_token: '',
    meeting_list: [
      {
        meeting_id: 'meeting-001',
        meeting_topic: 'Weekly Team Standup',
        meeting_start_time: '2024.01.15 10:00:00 (GMT+09:00)',
        meeting_end_time: '2024.01.15 11:00:00 (GMT+09:00)',
        meeting_duration: '1:00:00',
        organizer: 'Alice Smith',
        number_of_participants: '5',
        recording: true,
        audio: true,
        video: true,
        sharing: false,
        telephone: false,
        user_id: 'user-host-001',
        department: 'Engineering',
        email: 'alice@example.com',
        employee_id: '001',
        mobile: '-',
      },
      {
        meeting_id: 'meeting-002',
        meeting_topic: 'Sprint Planning',
        meeting_start_time: '2024.01.16 14:00:00 (GMT+09:00)',
        meeting_end_time: '2024.01.16 16:00:00 (GMT+09:00)',
        meeting_duration: '2:00:00',
        organizer: 'Alice Smith',
        number_of_participants: '8',
        recording: false,
        audio: true,
        video: true,
        sharing: true,
        telephone: false,
        user_id: 'user-host-001',
        department: 'Engineering',
        email: 'alice@example.com',
        employee_id: '001',
        mobile: '-',
      },
      {
        meeting_id: 'meeting-003',
        meeting_topic: 'Design Review',
        meeting_start_time: '2024.01.17 14:00:00 (GMT+09:00)',
        meeting_end_time: '2024.01.17 15:00:00 (GMT+09:00)',
        meeting_duration: '1:00:00',
        organizer: 'Bob Johnson',
        number_of_participants: '3',
        recording: false,
        audio: true,
        video: false,
        sharing: false,
        telephone: false,
        user_id: 'user-host-002',
        department: 'Design',
        email: 'bob@example.com',
        employee_id: '002',
        mobile: '-',
      },
    ],
  },
};

/**
 * Mock meeting detail response from Lark VC API
 */
export const mockLarkMeetingDetailResponse = {
  code: 0,
  msg: '',
  data: {
    meeting: {
      meeting_id: 'meeting-001',
      meeting_topic: 'Weekly Team Standup',
      meeting_start_time: '2024.01.15 10:00:00 (GMT+09:00)',
      meeting_end_time: '2024.01.15 11:00:00 (GMT+09:00)',
      meeting_duration: '1:00:00',
      organizer: 'Alice Smith',
      number_of_participants: '5',
      recording: true,
      audio: true,
      video: true,
      sharing: false,
      telephone: false,
      user_id: 'user-host-001',
      department: 'Engineering',
      email: 'alice@example.com',
      employee_id: '001',
      mobile: '-',
    },
  },
};

/**
 * Mock participants response from Lark VC API
 * Matches larkMeetingParticipantSchema:
 * - user_id, user_type (lark_user|rooms_user|...), user_name
 * - join_time (string), leave_time? (string), status ('in_meeting'|'left')
 * Note: Uses 'participant_list' as the field name per larkParticipantListDataSchema
 */
export const mockLarkParticipantsResponse = {
  code: 0,
  msg: 'ok',
  data: {
    participant_list: [
      {
        user_id: 'user-host-001',
        user_type: 'lark_user' as const,
        user_name: 'Alice Smith',
        avatar_url: 'https://example.com/avatar/alice.jpg',
        join_time: '1705312680', // 2024-01-15T09:58:00Z
        leave_time: '1705316400', // 2024-01-15T11:00:00Z
        status: 'left' as const,
      },
      {
        user_id: 'user-002',
        user_type: 'lark_user' as const,
        user_name: 'Bob Johnson',
        avatar_url: 'https://example.com/avatar/bob.jpg',
        join_time: '1705312800', // 2024-01-15T10:00:00Z
        leave_time: '1705316400', // 2024-01-15T11:00:00Z
        status: 'left' as const,
      },
      {
        user_id: 'user-003',
        user_type: 'lark_user' as const,
        user_name: 'Charlie Brown',
        join_time: '1705312920', // 2024-01-15T10:02:00Z
        leave_time: '1705316100', // 2024-01-15T10:55:00Z
        status: 'left' as const,
      },
    ],
    has_more: false,
    page_token: '',
  },
};

/**
 * Mock Bitable records response from Lark API
 */
export const mockBitableRecordsResponse = {
  code: 0,
  msg: 'ok',
  data: {
    has_more: false,
    page_token: '',
    total: 2,
    items: [
      {
        record_id: 'rec-001',
        fields: {
          title: 'Implement user authentication',
          assignee: 'Alice Smith',
          status: 'pending',
          priority: 'high',
          due_date: 1706140800000, // 2024-01-25
          meeting_id: 'meeting-001',
        },
      },
      {
        record_id: 'rec-002',
        fields: {
          title: 'Update API documentation',
          assignee: 'Bob Johnson',
          status: 'in_progress',
          priority: 'medium',
          due_date: 1706400000000, // 2024-01-28
          meeting_id: 'meeting-001',
        },
      },
    ],
  },
};

// ============================================================================
// Application-Level Mock Data
// ============================================================================

/**
 * Mock meetings for application-level tests
 */
export const mockMeetings: readonly Meeting[] = [
  {
    id: 'meeting-001',
    title: 'Weekly Team Standup',
    meetingNo: 'MTG-2024-001',
    startTime: new Date('2024-01-15T10:00:00Z'),
    endTime: new Date('2024-01-15T11:00:00Z'),
    durationMinutes: 60,
    status: 'ended',
    type: 'regular',
    host: {
      id: 'user-host-001',
      name: 'Alice Smith',
      avatarUrl: 'https://example.com/avatar/alice.jpg',
    },
    participantCount: 5,
    hasRecording: true,
    recordingUrl: 'https://example.com/recordings/meeting-001',
    minutesStatus: 'draft',
    createdAt: new Date('2024-01-15T09:00:00Z'),
    updatedAt: new Date('2024-01-15T11:30:00Z'),
  },
  {
    id: 'meeting-002',
    title: 'Sprint Planning',
    meetingNo: 'MTG-2024-002',
    startTime: new Date('2024-01-16T10:00:00Z'),
    endTime: new Date('2024-01-16T12:00:00Z'),
    durationMinutes: 120,
    status: 'ended',
    type: 'regular',
    host: {
      id: 'user-host-001',
      name: 'Alice Smith',
    },
    participantCount: 8,
    hasRecording: true,
    minutesStatus: 'not_created',
    createdAt: new Date('2024-01-16T09:00:00Z'),
    updatedAt: new Date('2024-01-16T12:30:00Z'),
  },
  {
    id: 'meeting-003',
    title: 'Design Review',
    meetingNo: 'MTG-2024-003',
    startTime: new Date('2024-01-17T10:00:00Z'),
    endTime: new Date('2024-01-17T11:00:00Z'),
    durationMinutes: 60,
    status: 'scheduled',
    type: 'adhoc',
    host: {
      id: 'user-host-002',
      name: 'Bob Johnson',
    },
    participantCount: 3,
    hasRecording: false,
    minutesStatus: 'not_created',
    createdAt: new Date('2024-01-17T08:00:00Z'),
    updatedAt: new Date('2024-01-17T08:00:00Z'),
  },
] as const;

/**
 * Mock participants for meeting-001
 */
export const mockParticipants: readonly Participant[] = [
  {
    id: 'user-host-001',
    name: 'Alice Smith',
    avatarUrl: 'https://example.com/avatar/alice.jpg',
    email: 'alice@example.com',
    joinTime: new Date('2024-01-15T09:58:00Z'),
    leaveTime: new Date('2024-01-15T11:00:00Z'),
    isHost: true,
    status: 'left',
  },
  {
    id: 'user-002',
    name: 'Bob Johnson',
    avatarUrl: 'https://example.com/avatar/bob.jpg',
    email: 'bob@example.com',
    joinTime: new Date('2024-01-15T10:00:00Z'),
    leaveTime: new Date('2024-01-15T11:00:00Z'),
    isHost: false,
    status: 'left',
  },
  {
    id: 'user-003',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    joinTime: new Date('2024-01-15T10:02:00Z'),
    leaveTime: new Date('2024-01-15T10:55:00Z'),
    isHost: false,
    status: 'left',
  },
] as const;

/**
 * Mock managed action items
 */
export const mockManagedActionItems: readonly ManagedActionItem[] = [
  {
    id: 'action-001',
    content: 'Implement user authentication module',
    assignee: { id: 'user-002', name: 'Bob Johnson' },
    dueDate: '2024-01-25',
    priority: 'high',
    status: 'pending',
    meetingId: 'meeting-001',
    meetingTitle: 'Weekly Team Standup',
    meetingDate: '2024-01-15',
    extractedAt: '2024-01-15T11:00:00.000Z',
    isOverdue: false,
    createdAt: '2024-01-15T11:00:00.000Z',
    updatedAt: '2024-01-15T11:00:00.000Z',
  },
  {
    id: 'action-002',
    content: 'Update API documentation for v2 endpoints',
    assignee: { id: 'user-003', name: 'Charlie Brown' },
    dueDate: '2024-01-28',
    priority: 'medium',
    status: 'in_progress',
    meetingId: 'meeting-001',
    meetingTitle: 'Weekly Team Standup',
    meetingDate: '2024-01-15',
    extractedAt: '2024-01-15T11:00:00.000Z',
    isOverdue: false,
    createdAt: '2024-01-15T11:00:00.000Z',
    updatedAt: '2024-01-16T09:00:00.000Z',
  },
  {
    id: 'action-003',
    content: 'Fix performance regression in search feature',
    assignee: { id: 'user-host-001', name: 'Alice Smith' },
    dueDate: '2024-01-20',
    priority: 'high',
    status: 'completed',
    meetingId: 'meeting-001',
    meetingTitle: 'Weekly Team Standup',
    meetingDate: '2024-01-15',
    extractedAt: '2024-01-15T11:00:00.000Z',
    isOverdue: false,
    createdAt: '2024-01-15T11:00:00.000Z',
    updatedAt: '2024-01-19T15:00:00.000Z',
    completedAt: '2024-01-19T15:00:00.000Z',
  },
  {
    id: 'action-004',
    content: 'Schedule design review with UX team',
    priority: 'low',
    status: 'pending',
    meetingId: 'meeting-002',
    meetingTitle: 'Sprint Planning',
    meetingDate: '2024-01-16',
    extractedAt: '2024-01-16T12:00:00.000Z',
    isOverdue: false,
    createdAt: '2024-01-16T12:00:00.000Z',
    updatedAt: '2024-01-16T12:00:00.000Z',
  },
] as const;

/**
 * Mock minutes for minutes generation tests
 */
export const mockMinutes: Minutes = {
  id: 'min_meeting-001_1705316400',
  meetingId: 'meeting-001',
  title: 'Weekly Team Standup',
  date: '2024-01-15',
  duration: 3600000,
  summary: 'The team discussed authentication module implementation, API documentation updates, and addressed a search performance issue.',
  topics: [
    {
      id: 'topic-001',
      title: 'Authentication Module',
      startTime: 0,
      endTime: 1800000,
      summary: 'Discussion about implementing user authentication using JWT tokens.',
      keyPoints: [
        'Use JWT for session management',
        'Implement refresh token rotation',
        'Add rate limiting for auth endpoints',
      ],
      speakers: [
        { id: 'user-host-001', name: 'Alice Smith' },
        { id: 'user-002', name: 'Bob Johnson' },
      ],
    },
    {
      id: 'topic-002',
      title: 'API Documentation',
      startTime: 1800000,
      endTime: 2700000,
      summary: 'Review of pending API documentation tasks for v2 endpoints.',
      keyPoints: [
        'OpenAPI spec needs updating',
        'Add examples for all endpoints',
        'Include error response documentation',
      ],
      speakers: [
        { id: 'user-003', name: 'Charlie Brown' },
        { id: 'user-host-001', name: 'Alice Smith' },
      ],
    },
  ],
  decisions: [
    {
      id: 'decision-001',
      content: 'Adopt JWT with refresh token rotation for authentication',
      context: 'Team evaluated multiple authentication strategies',
      decidedAt: 1500000,
      relatedTopicId: 'topic-001',
    },
  ],
  actionItems: [
    {
      id: 'ai-001',
      content: 'Implement user authentication module',
      assignee: { id: 'user-002', name: 'Bob Johnson' },
      dueDate: '2024-01-25',
      priority: 'high',
      status: 'pending',
      relatedTopicId: 'topic-001',
    },
    {
      id: 'ai-002',
      content: 'Update API documentation for v2 endpoints',
      assignee: { id: 'user-003', name: 'Charlie Brown' },
      dueDate: '2024-01-28',
      priority: 'medium',
      status: 'pending',
      relatedTopicId: 'topic-002',
    },
  ],
  attendees: [
    { id: 'user-host-001', name: 'Alice Smith' },
    { id: 'user-002', name: 'Bob Johnson' },
    { id: 'user-003', name: 'Charlie Brown' },
  ],
  metadata: {
    generatedAt: '2024-01-15T11:00:00.000Z',
    model: 'claude-sonnet-4-20250514',
    processingTimeMs: 3500,
    confidence: 0.92,
  },
};

/**
 * Mock transcript for minutes generation tests
 */
export const mockTranscript = {
  meetingId: 'meeting-001',
  language: 'en',
  segments: [
    {
      id: 'seg-001',
      speaker: { id: 'user-host-001', name: 'Alice Smith' },
      text: "Good morning everyone. Let's start with the authentication module update.",
      startTime: 0,
      endTime: 5000,
    },
    {
      id: 'seg-002',
      speaker: { id: 'user-002', name: 'Bob Johnson' },
      text: 'I have been researching JWT implementation options. I recommend using refresh token rotation.',
      startTime: 5000,
      endTime: 12000,
    },
    {
      id: 'seg-003',
      speaker: { id: 'user-host-001', name: 'Alice Smith' },
      text: 'That sounds good. What about rate limiting for the auth endpoints?',
      startTime: 12000,
      endTime: 16000,
    },
    {
      id: 'seg-004',
      speaker: { id: 'user-002', name: 'Bob Johnson' },
      text: 'We should definitely add rate limiting. I will include that in the implementation.',
      startTime: 16000,
      endTime: 21000,
    },
    {
      id: 'seg-005',
      speaker: { id: 'user-003', name: 'Charlie Brown' },
      text: 'Moving to the API documentation topic. The OpenAPI spec needs updating for all v2 endpoints.',
      startTime: 1800000,
      endTime: 1806000,
    },
  ],
};

/**
 * Mock session data for authenticated user
 */
export const mockSessionData = {
  isAuthenticated: true,
  user: {
    openId: 'test-user-001',
    unionId: 'test-union-001',
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: 'https://example.com/avatar/test.jpg',
    tenantKey: 'test-tenant-001',
  },
  accessToken: 'test-access-token-12345',
  refreshToken: 'test-refresh-token-67890',
  tokenExpiresAt: Date.now() + 7200000,
};

/**
 * Mock unauthenticated session
 */
export const mockUnauthenticatedSession = {
  isAuthenticated: false,
};
