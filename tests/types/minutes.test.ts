/**
 * Unit tests for minutes type definitions, Zod schemas, and utility functions
 * @module tests/types/minutes
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Schemas
  SpeakerSchema,
  TopicSegmentSchema,
  DecisionItemSchema,
  ActionItemSchema,
  MinutesMetadataSchema,
  MinutesSchema,
  PrioritySchema,
  ActionItemStatusSchema,
  // Types
  type Speaker,
  type TopicSegment,
  type DecisionItem,
  type ActionItem,
  type Minutes,
  type MinutesMetadata,
  type Priority,
  type ActionItemStatus,
  // Utility functions
  generateId,
  createEmptyMinutes,
  minutesToMarkdown,
  filterActionItemsByStatus,
  sortActionItemsByPriority,
  getActionItemsByAssignee,
  getTotalTopicsDuration,
  findTopicById,
  getDecisionsByTopicId,
  getActionItemsByTopicId,
  calculateCompletionPercentage,
  createSpeaker,
  createActionItem,
  createDecisionItem,
  createTopicSegment,
  // Validation functions
  validateMinutes,
  validateActionItem,
  validateTopicSegment,
  validateSpeaker,
  validateDecisionItem,
} from '@/types/minutes';

// ============================================================================
// Test Data Fixtures
// ============================================================================

const createTestSpeaker = (id: string, name: string, larkUserId?: string): Speaker => {
  const speaker: Speaker = { id, name };
  if (larkUserId !== undefined) {
    return { ...speaker, larkUserId };
  }
  return speaker;
};

const speaker1 = createTestSpeaker('speaker-1', 'Alice');
const speaker2 = createTestSpeaker('speaker-2', 'Bob');
const speaker3 = createTestSpeaker('speaker-3', 'Charlie', 'lark-user-123');

const createTestTopic = (
  id: string,
  title: string,
  startTime: number,
  endTime: number,
  speakers: Speaker[] = []
): TopicSegment => ({
  id,
  title,
  startTime,
  endTime,
  summary: `Summary of ${title}`,
  keyPoints: ['Point 1', 'Point 2'],
  speakers,
});

const createTestDecision = (
  id: string,
  content: string,
  decidedAt: number,
  relatedTopicId?: string
): DecisionItem => {
  const decision: DecisionItem = {
    id,
    content,
    context: 'Background context',
    decidedAt,
  };
  if (relatedTopicId !== undefined) {
    return { ...decision, relatedTopicId };
  }
  return decision;
};

const createTestActionItem = (
  id: string,
  content: string,
  priority: Priority,
  status: ActionItemStatus,
  assignee?: Speaker,
  relatedTopicId?: string,
  dueDate?: string
): ActionItem => {
  const item: ActionItem = {
    id,
    content,
    priority,
    status,
  };

  const result: ActionItem = {
    ...item,
    ...(assignee !== undefined ? { assignee } : {}),
    ...(relatedTopicId !== undefined ? { relatedTopicId } : {}),
    ...(dueDate !== undefined ? { dueDate } : {}),
  };

  return result;
};

const createTestMinutes = (): Minutes => ({
  id: 'min-123',
  meetingId: 'meeting-456',
  title: 'Weekly Standup',
  date: '2024-01-15',
  duration: 3600000, // 1 hour
  summary: 'Discussed project progress and upcoming tasks.',
  topics: [
    createTestTopic('topic-1', 'Project Status', 0, 1200000, [speaker1, speaker2]),
    createTestTopic('topic-2', 'Technical Issues', 1200000, 2400000, [speaker2, speaker3]),
  ],
  decisions: [
    createTestDecision('decision-1', 'Use TypeScript for new modules', 600000, 'topic-1'),
    createTestDecision('decision-2', 'Schedule code review weekly', 1800000),
  ],
  actionItems: [
    createTestActionItem('action-1', 'Update documentation', 'high', 'pending', speaker1, 'topic-1', '2024-01-20'),
    createTestActionItem('action-2', 'Fix bug in auth module', 'medium', 'in_progress', speaker2),
    createTestActionItem('action-3', 'Review PR #123', 'low', 'completed', speaker3, 'topic-2'),
  ],
  attendees: [speaker1, speaker2, speaker3],
  metadata: {
    generatedAt: '2024-01-15T10:00:00Z',
    model: 'claude-sonnet-4-20250514',
    processingTimeMs: 2500,
    confidence: 0.92,
  },
});

// ============================================================================
// Zod Schema Tests - Speaker
// ============================================================================

describe('SpeakerSchema', () => {
  it('should validate a valid speaker without larkUserId', () => {
    const result = SpeakerSchema.safeParse({ id: 'user-1', name: 'John' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ id: 'user-1', name: 'John' });
    }
  });

  it('should validate a valid speaker with larkUserId', () => {
    const result = SpeakerSchema.safeParse({
      id: 'user-1',
      name: 'John',
      larkUserId: 'lark-123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.larkUserId).toBe('lark-123');
    }
  });

  it('should reject speaker with empty id', () => {
    const result = SpeakerSchema.safeParse({ id: '', name: 'John' });
    expect(result.success).toBe(false);
  });

  it('should reject speaker with empty name', () => {
    const result = SpeakerSchema.safeParse({ id: 'user-1', name: '' });
    expect(result.success).toBe(false);
  });

  it('should reject speaker without required fields', () => {
    const result = SpeakerSchema.safeParse({ id: 'user-1' });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Zod Schema Tests - TopicSegment
// ============================================================================

describe('TopicSegmentSchema', () => {
  it('should validate a valid topic segment', () => {
    const topic = {
      id: 'topic-1',
      title: 'Introduction',
      startTime: 0,
      endTime: 60000,
      summary: 'Opening remarks',
      keyPoints: ['Welcome', 'Agenda overview'],
      speakers: [{ id: 'user-1', name: 'Host' }],
    };
    const result = TopicSegmentSchema.safeParse(topic);
    expect(result.success).toBe(true);
  });

  it('should reject topic where endTime is less than startTime', () => {
    const topic = {
      id: 'topic-1',
      title: 'Introduction',
      startTime: 60000,
      endTime: 30000, // Invalid: less than startTime
      summary: 'Opening remarks',
      keyPoints: [],
      speakers: [],
    };
    const result = TopicSegmentSchema.safeParse(topic);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('endTime');
    }
  });

  it('should accept topic where endTime equals startTime', () => {
    const topic = {
      id: 'topic-1',
      title: 'Quick Note',
      startTime: 60000,
      endTime: 60000,
      summary: '',
      keyPoints: [],
      speakers: [],
    };
    const result = TopicSegmentSchema.safeParse(topic);
    expect(result.success).toBe(true);
  });

  it('should reject negative startTime', () => {
    const topic = {
      id: 'topic-1',
      title: 'Introduction',
      startTime: -1000,
      endTime: 60000,
      summary: '',
      keyPoints: [],
      speakers: [],
    };
    const result = TopicSegmentSchema.safeParse(topic);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Zod Schema Tests - DecisionItem
// ============================================================================

describe('DecisionItemSchema', () => {
  it('should validate a valid decision item', () => {
    const decision = {
      id: 'decision-1',
      content: 'Approved new feature',
      context: 'Based on user feedback',
      decidedAt: 120000,
    };
    const result = DecisionItemSchema.safeParse(decision);
    expect(result.success).toBe(true);
  });

  it('should validate decision with relatedTopicId', () => {
    const decision = {
      id: 'decision-1',
      content: 'Approved new feature',
      context: 'Based on user feedback',
      decidedAt: 120000,
      relatedTopicId: 'topic-1',
    };
    const result = DecisionItemSchema.safeParse(decision);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.relatedTopicId).toBe('topic-1');
    }
  });

  it('should reject decision with empty content', () => {
    const decision = {
      id: 'decision-1',
      content: '',
      context: 'Background',
      decidedAt: 120000,
    };
    const result = DecisionItemSchema.safeParse(decision);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Zod Schema Tests - ActionItem
// ============================================================================

describe('ActionItemSchema', () => {
  it('should validate a valid action item', () => {
    const action = {
      id: 'action-1',
      content: 'Complete task',
      priority: 'high',
      status: 'pending',
    };
    const result = ActionItemSchema.safeParse(action);
    expect(result.success).toBe(true);
  });

  it('should validate action item with all optional fields', () => {
    const action = {
      id: 'action-1',
      content: 'Complete task',
      assignee: { id: 'user-1', name: 'Alice' },
      dueDate: '2024-01-20',
      priority: 'medium',
      status: 'in_progress',
      relatedTopicId: 'topic-1',
    };
    const result = ActionItemSchema.safeParse(action);
    expect(result.success).toBe(true);
  });

  it('should reject invalid priority', () => {
    const action = {
      id: 'action-1',
      content: 'Complete task',
      priority: 'urgent', // Invalid
      status: 'pending',
    };
    const result = ActionItemSchema.safeParse(action);
    expect(result.success).toBe(false);
  });

  it('should reject invalid status', () => {
    const action = {
      id: 'action-1',
      content: 'Complete task',
      priority: 'high',
      status: 'cancelled', // Invalid - not in the enum
    };
    const result = ActionItemSchema.safeParse(action);
    expect(result.success).toBe(false);
  });

  it('should reject invalid dueDate format', () => {
    const action = {
      id: 'action-1',
      content: 'Complete task',
      priority: 'high',
      status: 'pending',
      dueDate: '01-20-2024', // Invalid format
    };
    const result = ActionItemSchema.safeParse(action);
    expect(result.success).toBe(false);
  });

  it('should accept valid ISO date format for dueDate', () => {
    const action = {
      id: 'action-1',
      content: 'Complete task',
      priority: 'high',
      status: 'pending',
      dueDate: '2024-01-20',
    };
    const result = ActionItemSchema.safeParse(action);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Zod Schema Tests - MinutesMetadata
// ============================================================================

describe('MinutesMetadataSchema', () => {
  it('should validate valid metadata', () => {
    const metadata = {
      generatedAt: '2024-01-15T10:00:00Z',
      model: 'claude-sonnet-4-20250514',
      processingTimeMs: 2500,
      confidence: 0.92,
    };
    const result = MinutesMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(true);
  });

  it('should reject confidence greater than 1', () => {
    const metadata = {
      generatedAt: '2024-01-15T10:00:00Z',
      model: 'claude-sonnet-4-20250514',
      processingTimeMs: 2500,
      confidence: 1.5, // Invalid
    };
    const result = MinutesMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(false);
  });

  it('should reject negative confidence', () => {
    const metadata = {
      generatedAt: '2024-01-15T10:00:00Z',
      model: 'claude-sonnet-4-20250514',
      processingTimeMs: 2500,
      confidence: -0.1, // Invalid
    };
    const result = MinutesMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(false);
  });

  it('should accept confidence at boundaries (0 and 1)', () => {
    const metadata0 = {
      generatedAt: '2024-01-15T10:00:00Z',
      model: 'test',
      processingTimeMs: 0,
      confidence: 0,
    };
    const metadata1 = {
      generatedAt: '2024-01-15T10:00:00Z',
      model: 'test',
      processingTimeMs: 0,
      confidence: 1,
    };
    expect(MinutesMetadataSchema.safeParse(metadata0).success).toBe(true);
    expect(MinutesMetadataSchema.safeParse(metadata1).success).toBe(true);
  });
});

// ============================================================================
// Zod Schema Tests - Minutes
// ============================================================================

describe('MinutesSchema', () => {
  it('should validate a complete minutes object', () => {
    const minutes = createTestMinutes();
    const result = MinutesSchema.safeParse(minutes);
    expect(result.success).toBe(true);
  });

  it('should reject invalid date format', () => {
    const minutes = createTestMinutes();
    const invalidMinutes = { ...minutes, date: '15-01-2024' };
    const result = MinutesSchema.safeParse(invalidMinutes);
    expect(result.success).toBe(false);
  });

  it('should reject minutes with empty arrays', () => {
    const minutes = createTestMinutes();
    const minimalMinutes = {
      ...minutes,
      topics: [],
      decisions: [],
      actionItems: [],
      attendees: [],
    };
    const result = MinutesSchema.safeParse(minimalMinutes);
    expect(result.success).toBe(true); // Empty arrays are valid
  });
});

// ============================================================================
// Priority and Status Schema Tests
// ============================================================================

describe('PrioritySchema', () => {
  it('should accept valid priorities', () => {
    expect(PrioritySchema.safeParse('high').success).toBe(true);
    expect(PrioritySchema.safeParse('medium').success).toBe(true);
    expect(PrioritySchema.safeParse('low').success).toBe(true);
  });

  it('should reject invalid priorities', () => {
    expect(PrioritySchema.safeParse('urgent').success).toBe(false);
    expect(PrioritySchema.safeParse('critical').success).toBe(false);
    expect(PrioritySchema.safeParse('').success).toBe(false);
  });
});

describe('ActionItemStatusSchema', () => {
  it('should accept valid statuses', () => {
    expect(ActionItemStatusSchema.safeParse('pending').success).toBe(true);
    expect(ActionItemStatusSchema.safeParse('in_progress').success).toBe(true);
    expect(ActionItemStatusSchema.safeParse('completed').success).toBe(true);
  });

  it('should reject invalid statuses', () => {
    expect(ActionItemStatusSchema.safeParse('cancelled').success).toBe(false);
    expect(ActionItemStatusSchema.safeParse('done').success).toBe(false);
    expect(ActionItemStatusSchema.safeParse('').success).toBe(false);
  });
});

// ============================================================================
// generateId Tests
// ============================================================================

describe('generateId', () => {
  it('should generate ID with correct prefix', () => {
    const id = generateId('test');
    expect(id.startsWith('test_')).toBe(true);
  });

  it('should generate unique IDs', () => {
    const id1 = generateId('item');
    const id2 = generateId('item');
    expect(id1).not.toBe(id2);
  });

  it('should generate IDs with expected format', () => {
    const id = generateId('prefix');
    // Format: prefix_timestamp_random
    const parts = id.split('_');
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe('prefix');
  });
});

// ============================================================================
// createEmptyMinutes Tests
// ============================================================================

describe('createEmptyMinutes', () => {
  it('should create minutes with provided meetingId', () => {
    const minutes = createEmptyMinutes('meeting-123');
    expect(minutes.meetingId).toBe('meeting-123');
  });

  it('should create minutes with provided title', () => {
    const minutes = createEmptyMinutes('meeting-123', 'Team Sync');
    expect(minutes.title).toBe('Team Sync');
  });

  it('should use default title when not provided', () => {
    const minutes = createEmptyMinutes('meeting-123');
    expect(minutes.title).toBe('Untitled Meeting');
  });

  it('should have empty arrays for collections', () => {
    const minutes = createEmptyMinutes('meeting-123');
    expect(minutes.topics).toEqual([]);
    expect(minutes.decisions).toEqual([]);
    expect(minutes.actionItems).toEqual([]);
    expect(minutes.attendees).toEqual([]);
  });

  it('should have valid metadata', () => {
    const minutes = createEmptyMinutes('meeting-123');
    expect(minutes.metadata.model).toBe('unknown');
    expect(minutes.metadata.processingTimeMs).toBe(0);
    expect(minutes.metadata.confidence).toBe(0);
    expect(minutes.metadata.generatedAt).toBeDefined();
  });

  it('should generate unique ID', () => {
    const minutes1 = createEmptyMinutes('meeting-1');
    const minutes2 = createEmptyMinutes('meeting-2');
    expect(minutes1.id).not.toBe(minutes2.id);
  });

  it('should set date to current date', () => {
    const minutes = createEmptyMinutes('meeting-123');
    const today = new Date().toISOString().split('T')[0];
    expect(minutes.date).toBe(today);
  });
});

// ============================================================================
// minutesToMarkdown Tests
// ============================================================================

describe('minutesToMarkdown', () => {
  let testMinutes: Minutes;

  beforeEach(() => {
    testMinutes = createTestMinutes();
  });

  it('should include title as H1 header', () => {
    const markdown = minutesToMarkdown(testMinutes);
    expect(markdown).toContain('# Weekly Standup');
  });

  it('should include date and duration', () => {
    const markdown = minutesToMarkdown(testMinutes);
    expect(markdown).toContain('**Date:** 2024-01-15');
    expect(markdown).toContain('**Duration:** 1h');
  });

  it('should include attendees section', () => {
    const markdown = minutesToMarkdown(testMinutes);
    expect(markdown).toContain('## Attendees');
    expect(markdown).toContain('- Alice');
    expect(markdown).toContain('- Bob');
    expect(markdown).toContain('- Charlie');
  });

  it('should include summary section', () => {
    const markdown = minutesToMarkdown(testMinutes);
    expect(markdown).toContain('## Summary');
    expect(markdown).toContain('Discussed project progress and upcoming tasks.');
  });

  it('should include topics section', () => {
    const markdown = minutesToMarkdown(testMinutes);
    expect(markdown).toContain('## Topics Discussed');
    expect(markdown).toContain('### Project Status');
    expect(markdown).toContain('### Technical Issues');
  });

  it('should include topic time ranges', () => {
    const markdown = minutesToMarkdown(testMinutes);
    expect(markdown).toContain('*00:00 - 20:00*'); // 0ms - 1200000ms
    expect(markdown).toContain('*20:00 - 40:00*'); // 1200000ms - 2400000ms
  });

  it('should include decisions section', () => {
    const markdown = minutesToMarkdown(testMinutes);
    expect(markdown).toContain('## Decisions');
    expect(markdown).toContain('### Use TypeScript for new modules');
    expect(markdown).toContain('### Schedule code review weekly');
  });

  it('should include action items table', () => {
    const markdown = minutesToMarkdown(testMinutes);
    expect(markdown).toContain('## Action Items');
    expect(markdown).toContain('| Task | Assignee | Priority | Due Date | Status |');
    expect(markdown).toContain('| Update documentation | Alice | high | 2024-01-20 | pending |');
  });

  it('should include metadata footer', () => {
    const markdown = minutesToMarkdown(testMinutes);
    expect(markdown).toContain('*Generated: 2024-01-15T10:00:00Z');
    expect(markdown).toContain('Model: claude-sonnet-4-20250514');
    expect(markdown).toContain('Confidence: 92.0%');
  });

  it('should handle empty minutes gracefully', () => {
    const emptyMinutes = createEmptyMinutes('meeting-123', 'Empty Meeting');
    const markdown = minutesToMarkdown(emptyMinutes);
    expect(markdown).toContain('# Empty Meeting');
    expect(markdown).not.toContain('## Attendees');
    expect(markdown).not.toContain('## Topics Discussed');
    expect(markdown).not.toContain('## Decisions');
    expect(markdown).not.toContain('## Action Items');
  });

  it('should format duration correctly for various lengths', () => {
    const shortMeeting = { ...testMinutes, duration: 1800000 }; // 30 minutes
    expect(minutesToMarkdown(shortMeeting)).toContain('**Duration:** 30m');

    const longMeeting = { ...testMinutes, duration: 5400000 }; // 1.5 hours
    expect(minutesToMarkdown(longMeeting)).toContain('**Duration:** 1h 30m');

    const exactHour = { ...testMinutes, duration: 7200000 }; // 2 hours
    expect(minutesToMarkdown(exactHour)).toContain('**Duration:** 2h');
  });
});

// ============================================================================
// filterActionItemsByStatus Tests
// ============================================================================

describe('filterActionItemsByStatus', () => {
  const testItems: ActionItem[] = [
    createTestActionItem('action-1', 'Task 1', 'high', 'pending'),
    createTestActionItem('action-2', 'Task 2', 'medium', 'in_progress'),
    createTestActionItem('action-3', 'Task 3', 'low', 'completed'),
    createTestActionItem('action-4', 'Task 4', 'high', 'pending'),
  ];

  it('should filter pending items', () => {
    const result = filterActionItemsByStatus(testItems, 'pending');
    expect(result).toHaveLength(2);
    expect(result.every((item) => item.status === 'pending')).toBe(true);
  });

  it('should filter in_progress items', () => {
    const result = filterActionItemsByStatus(testItems, 'in_progress');
    expect(result).toHaveLength(1);
    expect(result[0]?.status).toBe('in_progress');
  });

  it('should filter completed items', () => {
    const result = filterActionItemsByStatus(testItems, 'completed');
    expect(result).toHaveLength(1);
    expect(result[0]?.status).toBe('completed');
  });

  it('should return empty array when no items match', () => {
    const pendingOnly = testItems.filter((item) => item.status === 'pending');
    const result = filterActionItemsByStatus(pendingOnly, 'completed');
    expect(result).toHaveLength(0);
  });

  it('should work with empty array', () => {
    const result = filterActionItemsByStatus([], 'pending');
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// sortActionItemsByPriority Tests
// ============================================================================

describe('sortActionItemsByPriority', () => {
  it('should sort items by priority (high first)', () => {
    const items: ActionItem[] = [
      createTestActionItem('action-1', 'Low task', 'low', 'pending'),
      createTestActionItem('action-2', 'High task', 'high', 'pending'),
      createTestActionItem('action-3', 'Medium task', 'medium', 'pending'),
    ];

    const sorted = sortActionItemsByPriority(items);
    expect(sorted[0]?.priority).toBe('high');
    expect(sorted[1]?.priority).toBe('medium');
    expect(sorted[2]?.priority).toBe('low');
  });

  it('should not mutate original array', () => {
    const items: ActionItem[] = [
      createTestActionItem('action-1', 'Low task', 'low', 'pending'),
      createTestActionItem('action-2', 'High task', 'high', 'pending'),
    ];
    const originalFirst = items[0];

    sortActionItemsByPriority(items);
    expect(items[0]).toBe(originalFirst);
  });

  it('should handle items with same priority', () => {
    const items: ActionItem[] = [
      createTestActionItem('action-1', 'First high', 'high', 'pending'),
      createTestActionItem('action-2', 'Second high', 'high', 'pending'),
    ];

    const sorted = sortActionItemsByPriority(items);
    expect(sorted).toHaveLength(2);
    expect(sorted.every((item) => item.priority === 'high')).toBe(true);
  });

  it('should handle empty array', () => {
    const sorted = sortActionItemsByPriority([]);
    expect(sorted).toHaveLength(0);
  });
});

// ============================================================================
// getActionItemsByAssignee Tests
// ============================================================================

describe('getActionItemsByAssignee', () => {
  const testItems: ActionItem[] = [
    createTestActionItem('action-1', 'Task 1', 'high', 'pending', speaker1),
    createTestActionItem('action-2', 'Task 2', 'medium', 'pending', speaker2),
    createTestActionItem('action-3', 'Task 3', 'low', 'pending', speaker1),
    createTestActionItem('action-4', 'Task 4', 'high', 'pending'), // No assignee
  ];

  it('should return items assigned to specific speaker', () => {
    const result = getActionItemsByAssignee(testItems, 'speaker-1');
    expect(result).toHaveLength(2);
    expect(result.every((item) => item.assignee?.id === 'speaker-1')).toBe(true);
  });

  it('should return empty array for speaker with no assignments', () => {
    const result = getActionItemsByAssignee(testItems, 'speaker-999');
    expect(result).toHaveLength(0);
  });

  it('should not include items without assignee', () => {
    const result = getActionItemsByAssignee(testItems, 'speaker-1');
    expect(result.every((item) => item.assignee !== undefined)).toBe(true);
  });
});

// ============================================================================
// getTotalTopicsDuration Tests
// ============================================================================

describe('getTotalTopicsDuration', () => {
  it('should calculate total duration of topics', () => {
    const topics: TopicSegment[] = [
      createTestTopic('topic-1', 'Topic 1', 0, 60000),
      createTestTopic('topic-2', 'Topic 2', 60000, 180000),
    ];

    const total = getTotalTopicsDuration(topics);
    expect(total).toBe(180000); // 60000 + 120000
  });

  it('should return 0 for empty array', () => {
    const total = getTotalTopicsDuration([]);
    expect(total).toBe(0);
  });

  it('should handle overlapping topics correctly (sums individual durations)', () => {
    const topics: TopicSegment[] = [
      createTestTopic('topic-1', 'Topic 1', 0, 120000),
      createTestTopic('topic-2', 'Topic 2', 60000, 180000), // Overlaps
    ];

    const total = getTotalTopicsDuration(topics);
    expect(total).toBe(240000); // 120000 + 120000
  });
});

// ============================================================================
// findTopicById Tests
// ============================================================================

describe('findTopicById', () => {
  const testMinutes = createTestMinutes();

  it('should find topic by ID', () => {
    const topic = findTopicById(testMinutes, 'topic-1');
    expect(topic).toBeDefined();
    expect(topic?.title).toBe('Project Status');
  });

  it('should return undefined for non-existent ID', () => {
    const topic = findTopicById(testMinutes, 'topic-999');
    expect(topic).toBeUndefined();
  });
});

// ============================================================================
// getDecisionsByTopicId Tests
// ============================================================================

describe('getDecisionsByTopicId', () => {
  const testMinutes = createTestMinutes();

  it('should return decisions related to specific topic', () => {
    const decisions = getDecisionsByTopicId(testMinutes, 'topic-1');
    expect(decisions).toHaveLength(1);
    expect(decisions[0]?.content).toBe('Use TypeScript for new modules');
  });

  it('should return empty array for topic with no decisions', () => {
    const decisions = getDecisionsByTopicId(testMinutes, 'topic-2');
    expect(decisions).toHaveLength(0);
  });
});

// ============================================================================
// getActionItemsByTopicId Tests
// ============================================================================

describe('getActionItemsByTopicId', () => {
  const testMinutes = createTestMinutes();

  it('should return action items related to specific topic', () => {
    const actions = getActionItemsByTopicId(testMinutes, 'topic-1');
    expect(actions).toHaveLength(1);
    expect(actions[0]?.content).toBe('Update documentation');
  });

  it('should return action items for another topic', () => {
    const actions = getActionItemsByTopicId(testMinutes, 'topic-2');
    expect(actions).toHaveLength(1);
    expect(actions[0]?.content).toBe('Review PR #123');
  });
});

// ============================================================================
// calculateCompletionPercentage Tests
// ============================================================================

describe('calculateCompletionPercentage', () => {
  it('should calculate 0% for no completed items', () => {
    const items: ActionItem[] = [
      createTestActionItem('action-1', 'Task 1', 'high', 'pending'),
      createTestActionItem('action-2', 'Task 2', 'medium', 'in_progress'),
    ];
    expect(calculateCompletionPercentage(items)).toBe(0);
  });

  it('should calculate 100% when all items completed', () => {
    const items: ActionItem[] = [
      createTestActionItem('action-1', 'Task 1', 'high', 'completed'),
      createTestActionItem('action-2', 'Task 2', 'medium', 'completed'),
    ];
    expect(calculateCompletionPercentage(items)).toBe(100);
  });

  it('should calculate 50% when half items completed', () => {
    const items: ActionItem[] = [
      createTestActionItem('action-1', 'Task 1', 'high', 'completed'),
      createTestActionItem('action-2', 'Task 2', 'medium', 'pending'),
    ];
    expect(calculateCompletionPercentage(items)).toBe(50);
  });

  it('should return 0 for empty array', () => {
    expect(calculateCompletionPercentage([])).toBe(0);
  });

  it('should round to nearest integer', () => {
    const items: ActionItem[] = [
      createTestActionItem('action-1', 'Task 1', 'high', 'completed'),
      createTestActionItem('action-2', 'Task 2', 'medium', 'pending'),
      createTestActionItem('action-3', 'Task 3', 'low', 'pending'),
    ];
    expect(calculateCompletionPercentage(items)).toBe(33); // 1/3 = 33.33...%
  });
});

// ============================================================================
// Factory Function Tests - createSpeaker
// ============================================================================

describe('createSpeaker', () => {
  it('should create speaker without larkUserId', () => {
    const speaker = createSpeaker('user-1', 'John');
    expect(speaker).toEqual({ id: 'user-1', name: 'John' });
    expect(speaker.larkUserId).toBeUndefined();
  });

  it('should create speaker with larkUserId', () => {
    const speaker = createSpeaker('user-1', 'John', 'lark-123');
    expect(speaker).toEqual({
      id: 'user-1',
      name: 'John',
      larkUserId: 'lark-123',
    });
  });
});

// ============================================================================
// Factory Function Tests - createActionItem
// ============================================================================

describe('createActionItem', () => {
  it('should create action item with default values', () => {
    const item = createActionItem('Complete task');
    expect(item.content).toBe('Complete task');
    expect(item.priority).toBe('medium');
    expect(item.status).toBe('pending');
    expect(item.id).toMatch(/^action_/);
  });

  it('should create action item with custom priority', () => {
    const item = createActionItem('Urgent task', 'high');
    expect(item.priority).toBe('high');
  });

  it('should create action item with assignee', () => {
    const item = createActionItem('Assigned task', 'medium', speaker1);
    expect(item.assignee).toEqual(speaker1);
  });

  it('should create action item with due date', () => {
    const item = createActionItem('Task with deadline', 'medium', undefined, '2024-01-20');
    expect(item.dueDate).toBe('2024-01-20');
  });

  it('should create action item with all options', () => {
    const item = createActionItem('Full task', 'high', speaker1, '2024-01-20');
    expect(item.content).toBe('Full task');
    expect(item.priority).toBe('high');
    expect(item.assignee).toEqual(speaker1);
    expect(item.dueDate).toBe('2024-01-20');
  });
});

// ============================================================================
// Factory Function Tests - createDecisionItem
// ============================================================================

describe('createDecisionItem', () => {
  it('should create decision item without relatedTopicId', () => {
    const decision = createDecisionItem('Approved', 'After discussion', 60000);
    expect(decision.content).toBe('Approved');
    expect(decision.context).toBe('After discussion');
    expect(decision.decidedAt).toBe(60000);
    expect(decision.id).toMatch(/^decision_/);
    expect(decision.relatedTopicId).toBeUndefined();
  });

  it('should create decision item with relatedTopicId', () => {
    const decision = createDecisionItem('Approved', 'Context', 60000, 'topic-1');
    expect(decision.relatedTopicId).toBe('topic-1');
  });
});

// ============================================================================
// Factory Function Tests - createTopicSegment
// ============================================================================

describe('createTopicSegment', () => {
  it('should create topic segment with required fields', () => {
    const topic = createTopicSegment('Introduction', 0, 60000);
    expect(topic.title).toBe('Introduction');
    expect(topic.startTime).toBe(0);
    expect(topic.endTime).toBe(60000);
    expect(topic.summary).toBe('');
    expect(topic.keyPoints).toEqual([]);
    expect(topic.speakers).toEqual([]);
    expect(topic.id).toMatch(/^topic_/);
  });

  it('should create topic segment with all fields', () => {
    const topic = createTopicSegment(
      'Discussion',
      0,
      60000,
      'We discussed important matters',
      ['Point 1', 'Point 2'],
      [speaker1, speaker2]
    );
    expect(topic.summary).toBe('We discussed important matters');
    expect(topic.keyPoints).toEqual(['Point 1', 'Point 2']);
    expect(topic.speakers).toEqual([speaker1, speaker2]);
  });
});

// ============================================================================
// Validation Function Tests
// ============================================================================

describe('validateMinutes', () => {
  it('should return success for valid minutes', () => {
    const minutes = createTestMinutes();
    const result = validateMinutes(minutes);
    expect(result.success).toBe(true);
  });

  it('should return error for invalid minutes', () => {
    const invalid = { id: '', meetingId: 'test' }; // Missing required fields
    const result = validateMinutes(invalid);
    expect(result.success).toBe(false);
  });
});

describe('validateActionItem', () => {
  it('should return success for valid action item', () => {
    const item = createActionItem('Task');
    const result = validateActionItem(item);
    expect(result.success).toBe(true);
  });

  it('should return error for invalid action item', () => {
    const invalid = { id: 'test', content: '' }; // Empty content
    const result = validateActionItem(invalid);
    expect(result.success).toBe(false);
  });
});

describe('validateTopicSegment', () => {
  it('should return success for valid topic segment', () => {
    const topic = createTopicSegment('Test', 0, 60000);
    const result = validateTopicSegment(topic);
    expect(result.success).toBe(true);
  });

  it('should return error for invalid topic segment', () => {
    const invalid = { id: 'test', title: '', startTime: 100, endTime: 50 };
    const result = validateTopicSegment(invalid);
    expect(result.success).toBe(false);
  });
});

describe('validateSpeaker', () => {
  it('should return success for valid speaker', () => {
    const speaker = createSpeaker('user-1', 'John');
    const result = validateSpeaker(speaker);
    expect(result.success).toBe(true);
  });

  it('should return error for invalid speaker', () => {
    const invalid = { id: '', name: 'John' }; // Empty ID
    const result = validateSpeaker(invalid);
    expect(result.success).toBe(false);
  });
});

describe('validateDecisionItem', () => {
  it('should return success for valid decision item', () => {
    const decision = createDecisionItem('Decision', 'Context', 60000);
    const result = validateDecisionItem(decision);
    expect(result.success).toBe(true);
  });

  it('should return error for invalid decision item', () => {
    const invalid = { id: 'test', content: '', context: '', decidedAt: -1 };
    const result = validateDecisionItem(invalid);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Type Safety Tests
// ============================================================================

describe('Type Safety', () => {
  it('should enforce correct types for Priority', () => {
    const priority: Priority = 'high';
    expect(['high', 'medium', 'low']).toContain(priority);
  });

  it('should enforce correct types for ActionItemStatus', () => {
    const status: ActionItemStatus = 'pending';
    expect(['pending', 'in_progress', 'completed']).toContain(status);
  });

  it('should allow readonly arrays in utility functions', () => {
    const readonlyItems: readonly ActionItem[] = [
      createTestActionItem('action-1', 'Task 1', 'high', 'pending'),
    ];
    const filtered = filterActionItemsByStatus(readonlyItems, 'pending');
    expect(filtered).toHaveLength(1);
  });
});
