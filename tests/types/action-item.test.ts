/**
 * Unit tests for action-item type definitions, Zod schemas, and utility functions
 * @module tests/types/action-item
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  // Schemas
  ManagedActionItemSchema,
  ActionItemFiltersSchema,
  ActionItemSortFieldSchema,
  SortOrderSchema,
  ActionItemSortOptionsSchema,
  ActionItemPaginationSchema,
  ActionItemListResponseSchema,
  ActionItemStatusUpdateSchema,
  ActionItemStatsSchema,
  // Types
  type ManagedActionItem,
  type ActionItemFilters,
  type ActionItemSortField,
  type SortOrder,
  type ActionItemSortOptions,
  type ActionItemPagination,
  type ActionItemListResponse,
  type ActionItemStatusUpdate,
  type ActionItemStats,
  type MeetingInfo,
  // Utility functions
  isActionItemOverdue,
  sortByPriority,
  sortByDueDate,
  filterActionItems,
  toManagedActionItem,
  getDaysUntilDue,
  getActionItemStats,
  sortManagedActionItems,
  createPagination,
  paginateItems,
  createActionItemListResponse,
  refreshOverdueStatus,
  createManagedActionItem,
  // Validation functions
  validateManagedActionItem,
  validateActionItemFilters,
  validateActionItemSortOptions,
  validateActionItemPagination,
  validateActionItemListResponse,
  validateActionItemStatusUpdate,
  validateActionItemStats,
} from '@/types/action-item';
import {
  type ActionItem,
  type Speaker,
  createActionItem,
  createSpeaker,
} from '@/types/minutes';

// ============================================================================
// Test Data Fixtures
// ============================================================================

const testMeeting: MeetingInfo = {
  id: 'meeting-123',
  title: 'Weekly Team Sync',
  date: '2024-01-15',
};

const testSpeaker: Speaker = {
  id: 'speaker-1',
  name: 'Alice Smith',
};

const testSpeaker2: Speaker = {
  id: 'speaker-2',
  name: 'Bob Johnson',
};

function createTestActionItem(
  overrides: Partial<ActionItem> = {}
): ActionItem {
  const base: ActionItem = {
    id: 'action-1',
    content: 'Complete the project documentation',
    priority: 'medium',
    status: 'pending',
  };

  if (overrides.assignee !== undefined) {
    (base as ActionItem).assignee = overrides.assignee;
  }
  if (overrides.dueDate !== undefined) {
    (base as ActionItem).dueDate = overrides.dueDate;
  }
  if (overrides.relatedTopicId !== undefined) {
    (base as ActionItem).relatedTopicId = overrides.relatedTopicId;
  }

  return {
    ...base,
    ...overrides,
  };
}

function createTestManagedActionItem(
  overrides: Partial<ManagedActionItem> = {}
): ManagedActionItem {
  const now = new Date().toISOString();
  const base: ManagedActionItem = {
    id: 'action-1',
    content: 'Complete the project documentation',
    priority: 'medium',
    status: 'pending',
    meetingId: 'meeting-123',
    meetingTitle: 'Weekly Team Sync',
    meetingDate: '2024-01-15',
    extractedAt: now,
    createdAt: now,
    updatedAt: now,
    isOverdue: false,
  };

  return {
    ...base,
    ...overrides,
  };
}

// ============================================================================
// Zod Schema Tests
// ============================================================================

describe('Zod Schemas', () => {
  describe('ManagedActionItemSchema', () => {
    it('should validate a complete managed action item', () => {
      const item = createTestManagedActionItem({
        assignee: testSpeaker,
        dueDate: '2024-02-01',
        sourceText: 'We need to complete the documentation by next month',
        completedAt: undefined,
      });

      const result = ManagedActionItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it('should validate minimal managed action item', () => {
      const item = createTestManagedActionItem();

      const result = ManagedActionItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it('should reject invalid meeting ID', () => {
      const item = createTestManagedActionItem({ meetingId: '' });

      const result = ManagedActionItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    it('should reject invalid meeting date format', () => {
      const item = createTestManagedActionItem({ meetingDate: '2024/01/15' });

      const result = ManagedActionItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });

    it('should reject invalid extractedAt format', () => {
      const item = createTestManagedActionItem({ extractedAt: 'not-a-date' });

      const result = ManagedActionItemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });
  });

  describe('ActionItemFiltersSchema', () => {
    it('should validate empty filters', () => {
      const filters = {};

      const result = ActionItemFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
    });

    it('should validate complete filters', () => {
      const filters: ActionItemFilters = {
        status: ['pending', 'in_progress'],
        priority: ['high', 'medium'],
        assigneeId: 'speaker-1',
        meetingId: 'meeting-123',
        isOverdue: true,
        dueDateFrom: '2024-01-01',
        dueDateTo: '2024-12-31',
        searchQuery: 'documentation',
      };

      const result = ActionItemFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const filters = {
        status: ['invalid-status'],
      };

      const result = ActionItemFiltersSchema.safeParse(filters);
      expect(result.success).toBe(false);
    });

    it('should reject invalid due date format', () => {
      const filters = {
        dueDateFrom: '01-01-2024',
      };

      const result = ActionItemFiltersSchema.safeParse(filters);
      expect(result.success).toBe(false);
    });
  });

  describe('ActionItemSortOptionsSchema', () => {
    it('should validate valid sort options', () => {
      const options: ActionItemSortOptions = {
        field: 'dueDate',
        order: 'asc',
      };

      const result = ActionItemSortOptionsSchema.safeParse(options);
      expect(result.success).toBe(true);
    });

    it('should validate all sort fields', () => {
      const fields: ActionItemSortField[] = [
        'dueDate',
        'priority',
        'status',
        'createdAt',
        'meetingDate',
      ];

      for (const field of fields) {
        const result = ActionItemSortOptionsSchema.safeParse({
          field,
          order: 'desc',
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid sort field', () => {
      const options = {
        field: 'invalidField',
        order: 'asc',
      };

      const result = ActionItemSortOptionsSchema.safeParse(options);
      expect(result.success).toBe(false);
    });
  });

  describe('ActionItemPaginationSchema', () => {
    it('should validate valid pagination', () => {
      const pagination: ActionItemPagination = {
        page: 1,
        pageSize: 10,
        total: 100,
        totalPages: 10,
      };

      const result = ActionItemPaginationSchema.safeParse(pagination);
      expect(result.success).toBe(true);
    });

    it('should reject non-positive page', () => {
      const pagination = {
        page: 0,
        pageSize: 10,
        total: 100,
        totalPages: 10,
      };

      const result = ActionItemPaginationSchema.safeParse(pagination);
      expect(result.success).toBe(false);
    });

    it('should reject negative total', () => {
      const pagination = {
        page: 1,
        pageSize: 10,
        total: -1,
        totalPages: 0,
      };

      const result = ActionItemPaginationSchema.safeParse(pagination);
      expect(result.success).toBe(false);
    });
  });

  describe('ActionItemStatusUpdateSchema', () => {
    it('should validate valid status update', () => {
      const update: ActionItemStatusUpdate = {
        id: 'action-1',
        status: 'completed',
      };

      const result = ActionItemStatusUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should reject empty id', () => {
      const update = {
        id: '',
        status: 'completed',
      };

      const result = ActionItemStatusUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  describe('ActionItemStatsSchema', () => {
    it('should validate valid stats', () => {
      const stats: ActionItemStats = {
        total: 10,
        pending: 4,
        inProgress: 3,
        completed: 3,
        overdue: 2,
      };

      const result = ActionItemStatsSchema.safeParse(stats);
      expect(result.success).toBe(true);
    });

    it('should reject negative values', () => {
      const stats = {
        total: -1,
        pending: 4,
        inProgress: 3,
        completed: 3,
        overdue: 2,
      };

      const result = ActionItemStatsSchema.safeParse(stats);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Utility Functions', () => {
  describe('isActionItemOverdue', () => {
    beforeEach(() => {
      // Mock current date to 2024-01-15
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return false for items without due date', () => {
      const item = createTestActionItem();
      expect(isActionItemOverdue(item)).toBe(false);
    });

    it('should return false for completed items', () => {
      const item = createTestActionItem({
        dueDate: '2024-01-01', // Past due
        status: 'completed',
      });
      expect(isActionItemOverdue(item)).toBe(false);
    });

    it('should return true for past due pending items', () => {
      const item = createTestActionItem({
        dueDate: '2024-01-14', // Yesterday
        status: 'pending',
      });
      expect(isActionItemOverdue(item)).toBe(true);
    });

    it('should return false for future due items', () => {
      const item = createTestActionItem({
        dueDate: '2024-01-16', // Tomorrow
        status: 'pending',
      });
      expect(isActionItemOverdue(item)).toBe(false);
    });

    it('should return false for items due today', () => {
      const item = createTestActionItem({
        dueDate: '2024-01-15', // Today
        status: 'pending',
      });
      expect(isActionItemOverdue(item)).toBe(false);
    });
  });

  describe('sortByPriority', () => {
    it('should sort by priority descending (high first) by default', () => {
      const items = [
        createTestActionItem({ id: '1', priority: 'low' }),
        createTestActionItem({ id: '2', priority: 'high' }),
        createTestActionItem({ id: '3', priority: 'medium' }),
      ];

      const sorted = sortByPriority(items);

      expect(sorted[0]?.priority).toBe('high');
      expect(sorted[1]?.priority).toBe('medium');
      expect(sorted[2]?.priority).toBe('low');
    });

    it('should sort by priority ascending when specified', () => {
      const items = [
        createTestActionItem({ id: '1', priority: 'high' }),
        createTestActionItem({ id: '2', priority: 'low' }),
        createTestActionItem({ id: '3', priority: 'medium' }),
      ];

      const sorted = sortByPriority(items, 'asc');

      expect(sorted[0]?.priority).toBe('low');
      expect(sorted[1]?.priority).toBe('medium');
      expect(sorted[2]?.priority).toBe('high');
    });

    it('should not mutate the original array', () => {
      const items = [
        createTestActionItem({ id: '1', priority: 'low' }),
        createTestActionItem({ id: '2', priority: 'high' }),
      ];
      const originalFirst = items[0];

      sortByPriority(items);

      expect(items[0]).toBe(originalFirst);
    });
  });

  describe('sortByDueDate', () => {
    it('should sort by due date ascending by default', () => {
      const items = [
        createTestActionItem({ id: '1', dueDate: '2024-03-01' }),
        createTestActionItem({ id: '2', dueDate: '2024-01-01' }),
        createTestActionItem({ id: '3', dueDate: '2024-02-01' }),
      ];

      const sorted = sortByDueDate(items);

      expect(sorted[0]?.dueDate).toBe('2024-01-01');
      expect(sorted[1]?.dueDate).toBe('2024-02-01');
      expect(sorted[2]?.dueDate).toBe('2024-03-01');
    });

    it('should sort by due date descending when specified', () => {
      const items = [
        createTestActionItem({ id: '1', dueDate: '2024-01-01' }),
        createTestActionItem({ id: '2', dueDate: '2024-03-01' }),
        createTestActionItem({ id: '3', dueDate: '2024-02-01' }),
      ];

      const sorted = sortByDueDate(items, 'desc');

      expect(sorted[0]?.dueDate).toBe('2024-03-01');
      expect(sorted[1]?.dueDate).toBe('2024-02-01');
      expect(sorted[2]?.dueDate).toBe('2024-01-01');
    });

    it('should place items without due date at the end', () => {
      const items = [
        createTestActionItem({ id: '1' }), // No due date
        createTestActionItem({ id: '2', dueDate: '2024-01-01' }),
        createTestActionItem({ id: '3' }), // No due date
      ];

      const sorted = sortByDueDate(items);

      expect(sorted[0]?.dueDate).toBe('2024-01-01');
      expect(sorted[1]?.dueDate).toBeUndefined();
      expect(sorted[2]?.dueDate).toBeUndefined();
    });
  });

  describe('filterActionItems', () => {
    const items: ManagedActionItem[] = [
      createTestManagedActionItem({
        id: '1',
        status: 'pending',
        priority: 'high',
        assignee: testSpeaker,
        meetingId: 'meeting-1',
        dueDate: '2024-01-10',
        isOverdue: true,
      }),
      createTestManagedActionItem({
        id: '2',
        status: 'in_progress',
        priority: 'medium',
        assignee: testSpeaker2,
        meetingId: 'meeting-2',
        dueDate: '2024-01-20',
        isOverdue: false,
      }),
      createTestManagedActionItem({
        id: '3',
        status: 'completed',
        priority: 'low',
        meetingId: 'meeting-1',
        isOverdue: false,
      }),
    ];

    it('should return all items with empty filters', () => {
      const filtered = filterActionItems(items, {});
      expect(filtered).toHaveLength(3);
    });

    it('should filter by status', () => {
      const filtered = filterActionItems(items, {
        status: ['pending', 'in_progress'],
      });
      expect(filtered).toHaveLength(2);
      expect(filtered.every((i) => ['pending', 'in_progress'].includes(i.status))).toBe(true);
    });

    it('should filter by priority', () => {
      const filtered = filterActionItems(items, {
        priority: ['high'],
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.priority).toBe('high');
    });

    it('should filter by assignee ID', () => {
      const filtered = filterActionItems(items, {
        assigneeId: 'speaker-1',
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.assignee?.id).toBe('speaker-1');
    });

    it('should filter by meeting ID', () => {
      const filtered = filterActionItems(items, {
        meetingId: 'meeting-1',
      });
      expect(filtered).toHaveLength(2);
    });

    it('should filter by overdue status', () => {
      const filtered = filterActionItems(items, {
        isOverdue: true,
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.id).toBe('1');
    });

    it('should filter by due date range', () => {
      const filtered = filterActionItems(items, {
        dueDateFrom: '2024-01-15',
        dueDateTo: '2024-01-25',
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.dueDate).toBe('2024-01-20');
    });

    it('should filter by search query in content', () => {
      const itemsWithContent: ManagedActionItem[] = [
        createTestManagedActionItem({
          id: '1',
          content: 'Write documentation',
        }),
        createTestManagedActionItem({
          id: '2',
          content: 'Fix bugs',
        }),
      ];

      const filtered = filterActionItems(itemsWithContent, {
        searchQuery: 'document',
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.content).toContain('documentation');
    });

    it('should combine multiple filters', () => {
      const filtered = filterActionItems(items, {
        status: ['pending'],
        priority: ['high'],
        isOverdue: true,
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.id).toBe('1');
    });
  });

  describe('toManagedActionItem', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should convert basic action item to managed action item', () => {
      const actionItem = createTestActionItem({
        dueDate: '2024-01-20',
      });

      const managed = toManagedActionItem(actionItem, testMeeting);

      expect(managed.meetingId).toBe(testMeeting.id);
      expect(managed.meetingTitle).toBe(testMeeting.title);
      expect(managed.meetingDate).toBe(testMeeting.date);
      expect(managed.isOverdue).toBe(false);
      expect(managed.createdAt).toBeDefined();
      expect(managed.updatedAt).toBeDefined();
    });

    it('should include source text when provided', () => {
      const actionItem = createTestActionItem();
      const sourceText = 'We need to do this by next week';

      const managed = toManagedActionItem(actionItem, testMeeting, sourceText);

      expect(managed.sourceText).toBe(sourceText);
    });

    it('should detect overdue items', () => {
      const actionItem = createTestActionItem({
        dueDate: '2024-01-10', // Past
        status: 'pending',
      });

      const managed = toManagedActionItem(actionItem, testMeeting);

      expect(managed.isOverdue).toBe(true);
    });
  });

  describe('getDaysUntilDue', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return positive days for future dates', () => {
      expect(getDaysUntilDue('2024-01-20')).toBe(5);
    });

    it('should return negative days for past dates', () => {
      expect(getDaysUntilDue('2024-01-10')).toBe(-5);
    });

    it('should return 0 for today', () => {
      expect(getDaysUntilDue('2024-01-15')).toBe(0);
    });
  });

  describe('getActionItemStats', () => {
    it('should calculate correct statistics', () => {
      const items: ManagedActionItem[] = [
        createTestManagedActionItem({ status: 'pending', isOverdue: true }),
        createTestManagedActionItem({ status: 'pending', isOverdue: false }),
        createTestManagedActionItem({ status: 'in_progress', isOverdue: true }),
        createTestManagedActionItem({ status: 'completed', isOverdue: false }),
      ];

      const stats = getActionItemStats(items);

      expect(stats.total).toBe(4);
      expect(stats.pending).toBe(2);
      expect(stats.inProgress).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.overdue).toBe(2);
    });

    it('should return zeros for empty array', () => {
      const stats = getActionItemStats([]);

      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.inProgress).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.overdue).toBe(0);
    });
  });

  describe('sortManagedActionItems', () => {
    const items: ManagedActionItem[] = [
      createTestManagedActionItem({
        id: '1',
        priority: 'low',
        status: 'completed',
        dueDate: '2024-03-01',
        createdAt: '2024-01-03T00:00:00Z',
        meetingDate: '2024-01-03',
      }),
      createTestManagedActionItem({
        id: '2',
        priority: 'high',
        status: 'pending',
        dueDate: '2024-01-01',
        createdAt: '2024-01-01T00:00:00Z',
        meetingDate: '2024-01-01',
      }),
      createTestManagedActionItem({
        id: '3',
        priority: 'medium',
        status: 'in_progress',
        dueDate: '2024-02-01',
        createdAt: '2024-01-02T00:00:00Z',
        meetingDate: '2024-01-02',
      }),
    ];

    it('should sort by priority', () => {
      const sorted = sortManagedActionItems(items, { field: 'priority', order: 'desc' });
      expect(sorted[0]?.priority).toBe('high');
      expect(sorted[1]?.priority).toBe('medium');
      expect(sorted[2]?.priority).toBe('low');
    });

    it('should sort by status', () => {
      const sorted = sortManagedActionItems(items, { field: 'status', order: 'asc' });
      expect(sorted[0]?.status).toBe('pending');
      expect(sorted[1]?.status).toBe('in_progress');
      expect(sorted[2]?.status).toBe('completed');
    });

    it('should sort by createdAt', () => {
      const sorted = sortManagedActionItems(items, { field: 'createdAt', order: 'asc' });
      expect(sorted[0]?.id).toBe('2');
      expect(sorted[1]?.id).toBe('3');
      expect(sorted[2]?.id).toBe('1');
    });

    it('should sort by meetingDate', () => {
      const sorted = sortManagedActionItems(items, { field: 'meetingDate', order: 'desc' });
      expect(sorted[0]?.meetingDate).toBe('2024-01-03');
      expect(sorted[1]?.meetingDate).toBe('2024-01-02');
      expect(sorted[2]?.meetingDate).toBe('2024-01-01');
    });
  });

  describe('createPagination', () => {
    it('should create correct pagination for first page', () => {
      const pagination = createPagination(100, 1, 10);

      expect(pagination.page).toBe(1);
      expect(pagination.pageSize).toBe(10);
      expect(pagination.total).toBe(100);
      expect(pagination.totalPages).toBe(10);
    });

    it('should handle partial last page', () => {
      const pagination = createPagination(95, 1, 10);

      expect(pagination.totalPages).toBe(10);
    });

    it('should clamp page to valid range', () => {
      const pagination = createPagination(100, 15, 10);

      expect(pagination.page).toBe(10); // Max valid page
    });

    it('should handle zero items', () => {
      const pagination = createPagination(0, 1, 10);

      expect(pagination.total).toBe(0);
      expect(pagination.totalPages).toBe(1);
      expect(pagination.page).toBe(1);
    });
  });

  describe('paginateItems', () => {
    const items = Array.from({ length: 25 }, (_, i) =>
      createTestManagedActionItem({ id: `item-${i + 1}` })
    );

    it('should return correct items for first page', () => {
      const result = paginateItems(items, 1, 10);

      expect(result).toHaveLength(10);
      expect(result[0]?.id).toBe('item-1');
      expect(result[9]?.id).toBe('item-10');
    });

    it('should return correct items for middle page', () => {
      const result = paginateItems(items, 2, 10);

      expect(result).toHaveLength(10);
      expect(result[0]?.id).toBe('item-11');
      expect(result[9]?.id).toBe('item-20');
    });

    it('should return remaining items for last partial page', () => {
      const result = paginateItems(items, 3, 10);

      expect(result).toHaveLength(5);
      expect(result[0]?.id).toBe('item-21');
      expect(result[4]?.id).toBe('item-25');
    });

    it('should return empty array for out of range page', () => {
      const result = paginateItems(items, 10, 10);

      expect(result).toHaveLength(0);
    });
  });

  describe('createActionItemListResponse', () => {
    const items: ManagedActionItem[] = [
      createTestManagedActionItem({
        id: '1',
        status: 'pending',
        priority: 'high',
        dueDate: '2024-02-01',
      }),
      createTestManagedActionItem({
        id: '2',
        status: 'pending',
        priority: 'medium',
        dueDate: '2024-01-15',
      }),
      createTestManagedActionItem({
        id: '3',
        status: 'completed',
        priority: 'low',
      }),
    ];

    it('should create complete response with filters and sorting', () => {
      const filters: ActionItemFilters = { status: ['pending'] };
      const sort: ActionItemSortOptions = { field: 'priority', order: 'desc' };

      const response = createActionItemListResponse(items, filters, sort, 1, 10);

      expect(response.items).toHaveLength(2);
      expect(response.items[0]?.priority).toBe('high');
      expect(response.pagination.total).toBe(2);
      expect(response.filters).toEqual(filters);
      expect(response.sort).toEqual(sort);
    });

    it('should apply pagination correctly', () => {
      const allPendingItems = Array.from({ length: 25 }, (_, i) =>
        createTestManagedActionItem({ id: `item-${i + 1}`, status: 'pending' })
      );

      const response = createActionItemListResponse(
        allPendingItems,
        {},
        { field: 'createdAt', order: 'asc' },
        2,
        10
      );

      expect(response.items).toHaveLength(10);
      expect(response.pagination.page).toBe(2);
      expect(response.pagination.totalPages).toBe(3);
    });
  });

  describe('refreshOverdueStatus', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should update overdue status for all items', () => {
      const items: ManagedActionItem[] = [
        createTestManagedActionItem({
          id: '1',
          dueDate: '2024-01-10',
          status: 'pending',
          isOverdue: false, // Wrong, should be true
        }),
        createTestManagedActionItem({
          id: '2',
          dueDate: '2024-01-20',
          status: 'pending',
          isOverdue: true, // Wrong, should be false
        }),
      ];

      const refreshed = refreshOverdueStatus(items);

      expect(refreshed[0]?.isOverdue).toBe(true);
      expect(refreshed[1]?.isOverdue).toBe(false);
    });

    it('should not mutate original array', () => {
      const items: ManagedActionItem[] = [
        createTestManagedActionItem({ isOverdue: false }),
      ];
      const original = items[0]?.isOverdue;

      refreshOverdueStatus(items);

      expect(items[0]?.isOverdue).toBe(original);
    });
  });

  describe('createManagedActionItem', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should create minimal managed action item', () => {
      const item = createManagedActionItem('Complete task', testMeeting);

      expect(item.content).toBe('Complete task');
      expect(item.meetingId).toBe(testMeeting.id);
      expect(item.priority).toBe('medium');
      expect(item.status).toBe('pending');
      expect(item.isOverdue).toBe(false);
      expect(item.id).toMatch(/^action_/);
    });

    it('should create managed action item with all options', () => {
      const item = createManagedActionItem('Complete task', testMeeting, {
        priority: 'high',
        status: 'in_progress',
        assignee: testSpeaker,
        dueDate: '2024-01-20',
        relatedTopicId: 'topic-1',
        sourceText: 'Original speech',
      });

      expect(item.priority).toBe('high');
      expect(item.status).toBe('in_progress');
      expect(item.assignee).toEqual(testSpeaker);
      expect(item.dueDate).toBe('2024-01-20');
      expect(item.relatedTopicId).toBe('topic-1');
      expect(item.sourceText).toBe('Original speech');
    });

    it('should detect overdue status on creation', () => {
      const item = createManagedActionItem('Complete task', testMeeting, {
        dueDate: '2024-01-10', // Past
      });

      expect(item.isOverdue).toBe(true);
    });
  });
});

// ============================================================================
// Validation Function Tests
// ============================================================================

describe('Validation Functions', () => {
  describe('validateManagedActionItem', () => {
    it('should validate correct data', () => {
      const item = createTestManagedActionItem();
      const result = validateManagedActionItem(item);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(item);
      }
    });

    it('should reject invalid data', () => {
      const result = validateManagedActionItem({});

      expect(result.success).toBe(false);
    });
  });

  describe('validateActionItemFilters', () => {
    it('should validate correct filters', () => {
      const filters: ActionItemFilters = {
        status: ['pending'],
        priority: ['high'],
      };
      const result = validateActionItemFilters(filters);

      expect(result.success).toBe(true);
    });

    it('should validate empty filters', () => {
      const result = validateActionItemFilters({});

      expect(result.success).toBe(true);
    });
  });

  describe('validateActionItemSortOptions', () => {
    it('should validate correct sort options', () => {
      const options: ActionItemSortOptions = {
        field: 'dueDate',
        order: 'asc',
      };
      const result = validateActionItemSortOptions(options);

      expect(result.success).toBe(true);
    });
  });

  describe('validateActionItemPagination', () => {
    it('should validate correct pagination', () => {
      const pagination: ActionItemPagination = {
        page: 1,
        pageSize: 10,
        total: 100,
        totalPages: 10,
      };
      const result = validateActionItemPagination(pagination);

      expect(result.success).toBe(true);
    });
  });

  describe('validateActionItemListResponse', () => {
    it('should validate correct response', () => {
      const response: ActionItemListResponse = {
        items: [createTestManagedActionItem()],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        },
        filters: {},
        sort: {
          field: 'dueDate',
          order: 'asc',
        },
      };
      const result = validateActionItemListResponse(response);

      expect(result.success).toBe(true);
    });
  });

  describe('validateActionItemStatusUpdate', () => {
    it('should validate correct update', () => {
      const update: ActionItemStatusUpdate = {
        id: 'action-1',
        status: 'completed',
      };
      const result = validateActionItemStatusUpdate(update);

      expect(result.success).toBe(true);
    });
  });

  describe('validateActionItemStats', () => {
    it('should validate correct stats', () => {
      const stats: ActionItemStats = {
        total: 10,
        pending: 4,
        inProgress: 3,
        completed: 3,
        overdue: 2,
      };
      const result = validateActionItemStats(stats);

      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Type Tests (compile-time verification)
// ============================================================================

describe('Type Definitions', () => {
  it('should enforce correct ManagedActionItem type', () => {
    // This test verifies that types are correctly defined
    const item: ManagedActionItem = {
      id: 'action-1',
      content: 'Task content',
      priority: 'high',
      status: 'pending',
      meetingId: 'meeting-1',
      meetingTitle: 'Meeting Title',
      meetingDate: '2024-01-15',
      extractedAt: '2024-01-15T00:00:00Z',
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
      isOverdue: false,
    };

    expect(item).toBeDefined();
  });

  it('should allow optional fields to be undefined', () => {
    const item: ManagedActionItem = {
      id: 'action-1',
      content: 'Task content',
      priority: 'high',
      status: 'pending',
      meetingId: 'meeting-1',
      meetingTitle: 'Meeting Title',
      meetingDate: '2024-01-15',
      extractedAt: '2024-01-15T00:00:00Z',
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
      isOverdue: false,
      // Optional fields not set
    };

    expect(item.assignee).toBeUndefined();
    expect(item.dueDate).toBeUndefined();
    expect(item.sourceText).toBeUndefined();
    expect(item.completedAt).toBeUndefined();
    expect(item.relatedTopicId).toBeUndefined();
  });

  it('should correctly type ActionItemFilters', () => {
    const filters: ActionItemFilters = {
      status: ['pending', 'in_progress'],
      priority: ['high', 'medium', 'low'],
    };

    expect(filters.status).toBeDefined();
    expect(filters.priority).toBeDefined();
  });

  it('should correctly type SortOrder and ActionItemSortField', () => {
    const sortOrder: SortOrder = 'asc';
    const sortField: ActionItemSortField = 'dueDate';

    expect(sortOrder).toBe('asc');
    expect(sortField).toBe('dueDate');
  });
});
