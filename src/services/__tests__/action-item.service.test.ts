/**
 * ActionItemService unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ActionItemService,
  ActionItemServiceError,
  ActionItemNotFoundError,
  ActionItemStore,
  createActionItemService,
  createTestActionItemService,
} from '../action-item.service';
import type { ManagedActionItem, ActionItemFilters } from '@/types/action-item';
import type { Minutes } from '@/types/minutes';
import { createEmptyMinutes, createActionItem, createSpeaker } from '@/types/minutes';

// =============================================================================
// Mock Data Factories
// =============================================================================

const createMockManagedActionItem = (
  overrides: Partial<ManagedActionItem> = {}
): ManagedActionItem => {
  const now = new Date().toISOString();
  return {
    id: `action_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    content: 'Test action item content',
    priority: 'medium',
    status: 'pending',
    meetingId: 'meeting_001',
    meetingTitle: 'Weekly Team Sync',
    meetingDate: '2024-01-15',
    extractedAt: now,
    createdAt: now,
    updatedAt: now,
    isOverdue: false,
    ...overrides,
  };
};

const createMockMinutes = (actionItemCount: number = 2): Minutes => {
  const minutes = createEmptyMinutes('meeting_001', 'Weekly Team Sync');

  for (let i = 0; i < actionItemCount; i++) {
    const item = createActionItem(
      `Action item ${i + 1}`,
      i === 0 ? 'high' : 'medium',
      createSpeaker(`user_${i}`, `User ${i}`),
      `2024-02-${String(i + 15).padStart(2, '0')}`
    );
    minutes.actionItems.push(item);
  }

  return minutes;
};

// =============================================================================
// ActionItemStore Tests
// =============================================================================

describe('ActionItemStore', () => {
  let store: ActionItemStore;

  beforeEach(() => {
    // Create fresh store for each test
    const result = createTestActionItemService();
    store = result.store;
  });

  describe('add and get', () => {
    it('should add and retrieve an item', () => {
      const item = createMockManagedActionItem({ id: 'test_id_001' });
      store.add(item);

      const retrieved = store.get('test_id_001');
      expect(retrieved).toEqual(item);
    });

    it('should return undefined for non-existent item', () => {
      const retrieved = store.get('non_existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return empty array when no items', () => {
      expect(store.getAll()).toEqual([]);
    });

    it('should return all items', () => {
      const item1 = createMockManagedActionItem({ id: 'item_1' });
      const item2 = createMockManagedActionItem({ id: 'item_2' });

      store.add(item1);
      store.add(item2);

      const all = store.getAll();
      expect(all).toHaveLength(2);
      expect(all.map(i => i.id)).toContain('item_1');
      expect(all.map(i => i.id)).toContain('item_2');
    });
  });

  describe('update', () => {
    it('should update an existing item', () => {
      const item = createMockManagedActionItem({ id: 'update_test', status: 'pending' });
      store.add(item);

      const updated = store.update('update_test', { status: 'in_progress' });

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('in_progress');
      expect(updated?.id).toBe('update_test'); // ID should not change
    });

    it('should return undefined for non-existent item', () => {
      const updated = store.update('non_existent', { status: 'completed' });
      expect(updated).toBeUndefined();
    });

    it('should set completedAt when status changes to completed', () => {
      const item = createMockManagedActionItem({ id: 'complete_test', status: 'pending' });
      store.add(item);

      const updated = store.update('complete_test', { status: 'completed' });

      expect(updated?.status).toBe('completed');
      expect(updated?.completedAt).toBeDefined();
    });

    it('should update isOverdue flag', () => {
      const pastDate = '2020-01-01';
      const item = createMockManagedActionItem({
        id: 'overdue_test',
        status: 'pending',
        dueDate: pastDate,
      });
      store.add(item);

      const updated = store.update('overdue_test', { priority: 'high' });

      expect(updated?.isOverdue).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete an existing item', () => {
      const item = createMockManagedActionItem({ id: 'delete_test' });
      store.add(item);

      const deleted = store.delete('delete_test');

      expect(deleted).toBe(true);
      expect(store.get('delete_test')).toBeUndefined();
    });

    it('should return false for non-existent item', () => {
      const deleted = store.delete('non_existent');
      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all items', () => {
      store.add(createMockManagedActionItem({ id: 'item_1' }));
      store.add(createMockManagedActionItem({ id: 'item_2' }));

      store.clear();

      expect(store.getAll()).toHaveLength(0);
    });
  });
});

// =============================================================================
// ActionItemService - Basic CRUD Tests
// =============================================================================

describe('ActionItemService', () => {
  let service: ActionItemService;

  beforeEach(() => {
    const result = createTestActionItemService();
    service = result.service;
  });

  describe('createActionItem', () => {
    it('should create a new action item', async () => {
      const item = createMockManagedActionItem({ id: 'create_test' });

      const created = await service.createActionItem(item);

      expect(created.id).toBe('create_test');
      expect(created.content).toBe(item.content);
    });

    it('should throw error for duplicate ID', async () => {
      const item = createMockManagedActionItem({ id: 'duplicate_test' });
      await service.createActionItem(item);

      await expect(service.createActionItem(item)).rejects.toThrow(
        ActionItemServiceError
      );
      await expect(service.createActionItem(item)).rejects.toMatchObject({
        code: 'DUPLICATE_ID',
        statusCode: 409,
      });
    });
  });

  describe('getActionItem', () => {
    it('should return action item by ID', async () => {
      const item = createMockManagedActionItem({ id: 'get_test' });
      await service.createActionItem(item);

      const retrieved = await service.getActionItem('get_test');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('get_test');
    });

    it('should return null for non-existent item', async () => {
      const retrieved = await service.getActionItem('non_existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('deleteActionItem', () => {
    it('should delete an existing item', async () => {
      const item = createMockManagedActionItem({ id: 'delete_service_test' });
      await service.createActionItem(item);

      await service.deleteActionItem('delete_service_test');

      const retrieved = await service.getActionItem('delete_service_test');
      expect(retrieved).toBeNull();
    });

    it('should throw ActionItemNotFoundError for non-existent item', async () => {
      await expect(service.deleteActionItem('non_existent')).rejects.toThrow(
        ActionItemNotFoundError
      );
    });
  });

  describe('updateStatus', () => {
    it('should update item status', async () => {
      const item = createMockManagedActionItem({
        id: 'status_test',
        status: 'pending',
      });
      await service.createActionItem(item);

      const updated = await service.updateStatus('status_test', 'in_progress');

      expect(updated.status).toBe('in_progress');
    });

    it('should throw ActionItemNotFoundError for non-existent item', async () => {
      await expect(
        service.updateStatus('non_existent', 'completed')
      ).rejects.toThrow(ActionItemNotFoundError);
    });
  });

  describe('updateStatusBatch', () => {
    it('should update multiple items', async () => {
      await service.createActionItem(
        createMockManagedActionItem({ id: 'batch_1', status: 'pending' })
      );
      await service.createActionItem(
        createMockManagedActionItem({ id: 'batch_2', status: 'pending' })
      );

      const updates = [
        { id: 'batch_1', status: 'in_progress' as const },
        { id: 'batch_2', status: 'completed' as const },
      ];

      const results = await service.updateStatusBatch(updates);

      expect(results).toHaveLength(2);
      expect(results.find(r => r.id === 'batch_1')?.status).toBe('in_progress');
      expect(results.find(r => r.id === 'batch_2')?.status).toBe('completed');
    });

    it('should throw error with partial failure info', async () => {
      await service.createActionItem(
        createMockManagedActionItem({ id: 'batch_exists', status: 'pending' })
      );

      const updates = [
        { id: 'batch_exists', status: 'completed' as const },
        { id: 'batch_not_exists', status: 'completed' as const },
      ];

      await expect(service.updateStatusBatch(updates)).rejects.toMatchObject({
        code: 'BATCH_UPDATE_PARTIAL_FAILURE',
        details: {
          successCount: 1,
          errors: [{ id: 'batch_not_exists', error: 'Not found' }],
        },
      });
    });
  });

  describe('updateActionItem', () => {
    it('should update action item fields', async () => {
      const item = createMockManagedActionItem({
        id: 'update_fields_test',
        content: 'Original content',
        priority: 'low',
      });
      await service.createActionItem(item);

      const updated = await service.updateActionItem('update_fields_test', {
        content: 'Updated content',
        priority: 'high',
      });

      expect(updated.content).toBe('Updated content');
      expect(updated.priority).toBe('high');
    });

    it('should throw ActionItemNotFoundError for non-existent item', async () => {
      await expect(
        service.updateActionItem('non_existent', { content: 'New content' })
      ).rejects.toThrow(ActionItemNotFoundError);
    });
  });
});

// =============================================================================
// ActionItemService - Query Tests
// =============================================================================

describe('ActionItemService - Queries', () => {
  let service: ActionItemService;

  beforeEach(async () => {
    const result = createTestActionItemService();
    service = result.service;

    // Seed test data
    const items: ManagedActionItem[] = [
      createMockManagedActionItem({
        id: 'query_1',
        meetingId: 'meeting_001',
        status: 'pending',
        priority: 'high',
        dueDate: '2024-01-20',
        assignee: { id: 'user_1', name: 'Alice' },
      }),
      createMockManagedActionItem({
        id: 'query_2',
        meetingId: 'meeting_001',
        status: 'in_progress',
        priority: 'medium',
        dueDate: '2024-01-25',
        assignee: { id: 'user_2', name: 'Bob' },
      }),
      createMockManagedActionItem({
        id: 'query_3',
        meetingId: 'meeting_002',
        status: 'completed',
        priority: 'low',
        dueDate: '2024-01-15',
        assignee: { id: 'user_1', name: 'Alice' },
      }),
      createMockManagedActionItem({
        id: 'query_4',
        meetingId: 'meeting_002',
        status: 'pending',
        priority: 'high',
        isOverdue: true,
        dueDate: '2023-12-01',
      }),
    ];

    for (const item of items) {
      await service.createActionItem(item);
    }
  });

  describe('getActionItems', () => {
    it('should return all items with default pagination', async () => {
      const result = await service.getActionItems();

      expect(result.items.length).toBe(4);
      expect(result.pagination.total).toBe(4);
      expect(result.pagination.page).toBe(1);
    });

    it('should apply pagination', async () => {
      const result = await service.getActionItems(
        undefined,
        undefined,
        { page: 1, pageSize: 2 }
      );

      expect(result.items.length).toBe(2);
      expect(result.pagination.total).toBe(4);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('should return second page', async () => {
      const page1 = await service.getActionItems(
        undefined,
        undefined,
        { page: 1, pageSize: 2 }
      );
      const page2 = await service.getActionItems(
        undefined,
        undefined,
        { page: 2, pageSize: 2 }
      );

      expect(page1.items.length).toBe(2);
      expect(page2.items.length).toBe(2);

      // Ensure different items
      const page1Ids = page1.items.map(i => i.id);
      const page2Ids = page2.items.map(i => i.id);
      expect(page1Ids.some(id => page2Ids.includes(id))).toBe(false);
    });
  });

  describe('getActionItemsByMeetingId', () => {
    it('should return items for specific meeting', async () => {
      const items = await service.getActionItemsByMeetingId('meeting_001');

      expect(items.length).toBe(2);
      expect(items.every(i => i.meetingId === 'meeting_001')).toBe(true);
    });

    it('should return empty array for meeting with no items', async () => {
      const items = await service.getActionItemsByMeetingId('non_existent_meeting');
      expect(items).toEqual([]);
    });
  });

  describe('getAssignees', () => {
    it('should return unique assignees', async () => {
      const assignees = await service.getAssignees();

      expect(assignees.length).toBe(2);
      expect(assignees.map(a => a.name).sort()).toEqual(['Alice', 'Bob']);
    });
  });

  describe('getMeetings', () => {
    it('should return unique meetings', async () => {
      const meetings = await service.getMeetings();

      expect(meetings.length).toBe(2);
      expect(meetings.map(m => m.id).sort()).toEqual(['meeting_001', 'meeting_002']);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const stats = await service.getStats();

      expect(stats.total).toBe(4);
      expect(stats.pending).toBe(2);
      expect(stats.inProgress).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.overdue).toBe(1);
    });
  });
});

// =============================================================================
// ActionItemService - Filtering Tests
// =============================================================================

describe('ActionItemService - Filtering', () => {
  let service: ActionItemService;

  beforeEach(async () => {
    const result = createTestActionItemService();
    service = result.service;

    // Seed test data
    const items: ManagedActionItem[] = [
      createMockManagedActionItem({
        id: 'filter_1',
        status: 'pending',
        priority: 'high',
        dueDate: '2024-01-20',
        isOverdue: false,
        assignee: { id: 'user_1', name: 'Alice' },
        content: 'Review documentation',
      }),
      createMockManagedActionItem({
        id: 'filter_2',
        status: 'in_progress',
        priority: 'medium',
        dueDate: '2024-01-25',
        isOverdue: false,
        assignee: { id: 'user_2', name: 'Bob' },
        content: 'Implement feature',
      }),
      createMockManagedActionItem({
        id: 'filter_3',
        status: 'pending',
        priority: 'low',
        dueDate: '2024-01-15',
        isOverdue: true,
        assignee: { id: 'user_1', name: 'Alice' },
        content: 'Fix bug',
      }),
    ];

    for (const item of items) {
      await service.createActionItem(item);
    }
  });

  it('should filter by status', async () => {
    const filters: ActionItemFilters = { status: ['pending'] };
    const result = await service.getActionItems(filters);

    expect(result.items.length).toBe(2);
    expect(result.items.every(i => i.status === 'pending')).toBe(true);
  });

  it('should filter by multiple statuses', async () => {
    const filters: ActionItemFilters = { status: ['pending', 'in_progress'] };
    const result = await service.getActionItems(filters);

    expect(result.items.length).toBe(3);
  });

  it('should filter by priority', async () => {
    const filters: ActionItemFilters = { priority: ['high'] };
    const result = await service.getActionItems(filters);

    expect(result.items.length).toBe(1);
    expect(result.items[0]?.priority).toBe('high');
  });

  it('should filter by assignee', async () => {
    const filters: ActionItemFilters = { assigneeId: 'user_1' };
    const result = await service.getActionItems(filters);

    expect(result.items.length).toBe(2);
    expect(result.items.every(i => i.assignee?.id === 'user_1')).toBe(true);
  });

  it('should filter by overdue status', async () => {
    const filters: ActionItemFilters = { isOverdue: true };
    const result = await service.getActionItems(filters);

    expect(result.items.length).toBe(1);
    expect(result.items[0]?.isOverdue).toBe(true);
  });

  it('should filter by search query', async () => {
    const filters: ActionItemFilters = { searchQuery: 'documentation' };
    const result = await service.getActionItems(filters);

    expect(result.items.length).toBe(1);
    expect(result.items[0]?.content).toContain('documentation');
  });

  it('should filter by due date range', async () => {
    const filters: ActionItemFilters = {
      dueDateFrom: '2024-01-16',
      dueDateTo: '2024-01-24',
    };
    const result = await service.getActionItems(filters);

    expect(result.items.length).toBe(1);
    expect(result.items[0]?.dueDate).toBe('2024-01-20');
  });

  it('should combine multiple filters', async () => {
    const filters: ActionItemFilters = {
      status: ['pending'],
      assigneeId: 'user_1',
    };
    const result = await service.getActionItems(filters);

    expect(result.items.length).toBe(2);
    expect(result.items.every(i => i.status === 'pending' && i.assignee?.id === 'user_1')).toBe(true);
  });
});

// =============================================================================
// ActionItemService - Sorting Tests
// =============================================================================

describe('ActionItemService - Sorting', () => {
  let service: ActionItemService;

  beforeEach(async () => {
    const result = createTestActionItemService();
    service = result.service;

    // Seed test data with known values
    const items: ManagedActionItem[] = [
      createMockManagedActionItem({
        id: 'sort_1',
        priority: 'low',
        dueDate: '2024-01-25',
        createdAt: '2024-01-10T10:00:00.000Z',
      }),
      createMockManagedActionItem({
        id: 'sort_2',
        priority: 'high',
        dueDate: '2024-01-15',
        createdAt: '2024-01-10T08:00:00.000Z',
      }),
      createMockManagedActionItem({
        id: 'sort_3',
        priority: 'medium',
        dueDate: '2024-01-20',
        createdAt: '2024-01-10T12:00:00.000Z',
      }),
    ];

    for (const item of items) {
      await service.createActionItem(item);
    }
  });

  it('should sort by due date ascending', async () => {
    const result = await service.getActionItems(
      undefined,
      { field: 'dueDate', order: 'asc' }
    );

    expect(result.items[0]?.dueDate).toBe('2024-01-15');
    expect(result.items[1]?.dueDate).toBe('2024-01-20');
    expect(result.items[2]?.dueDate).toBe('2024-01-25');
  });

  it('should sort by due date descending', async () => {
    const result = await service.getActionItems(
      undefined,
      { field: 'dueDate', order: 'desc' }
    );

    expect(result.items[0]?.dueDate).toBe('2024-01-25');
    expect(result.items[2]?.dueDate).toBe('2024-01-15');
  });

  it('should sort by priority descending (high first)', async () => {
    const result = await service.getActionItems(
      undefined,
      { field: 'priority', order: 'desc' }
    );

    expect(result.items[0]?.priority).toBe('high');
    expect(result.items[1]?.priority).toBe('medium');
    expect(result.items[2]?.priority).toBe('low');
  });

  it('should sort by priority ascending (low first)', async () => {
    const result = await service.getActionItems(
      undefined,
      { field: 'priority', order: 'asc' }
    );

    expect(result.items[0]?.priority).toBe('low');
    expect(result.items[2]?.priority).toBe('high');
  });

  it('should sort by createdAt ascending', async () => {
    const result = await service.getActionItems(
      undefined,
      { field: 'createdAt', order: 'asc' }
    );

    expect(result.items[0]?.id).toBe('sort_2'); // 08:00
    expect(result.items[1]?.id).toBe('sort_1'); // 10:00
    expect(result.items[2]?.id).toBe('sort_3'); // 12:00
  });
});

// =============================================================================
// ActionItemService - createFromMinutes Tests
// =============================================================================

describe('ActionItemService - createFromMinutes', () => {
  let service: ActionItemService;

  beforeEach(() => {
    const result = createTestActionItemService();
    service = result.service;
  });

  it('should create action items from minutes', async () => {
    const minutes = createMockMinutes(3);
    const meeting = {
      id: 'meeting_from_minutes',
      title: 'Planning Meeting',
      date: '2024-01-15',
    };

    const created = await service.createFromMinutes(minutes, meeting);

    expect(created.length).toBe(3);
    expect(created.every(i => i.meetingId === 'meeting_from_minutes')).toBe(true);
    expect(created.every(i => i.meetingTitle === 'Planning Meeting')).toBe(true);
  });

  it('should preserve action item properties', async () => {
    const minutes = createMockMinutes(2);
    const meeting = {
      id: 'meeting_preserve',
      title: 'Test Meeting',
      date: '2024-01-15',
    };

    const created = await service.createFromMinutes(minutes, meeting);

    // Check first item has high priority
    expect(created[0]?.priority).toBe('high');
    // Check second item has medium priority
    expect(created[1]?.priority).toBe('medium');
  });

  it('should handle empty action items', async () => {
    const minutes = createMockMinutes(0);
    const meeting = {
      id: 'meeting_empty',
      title: 'Empty Meeting',
      date: '2024-01-15',
    };

    const created = await service.createFromMinutes(minutes, meeting);

    expect(created).toEqual([]);
  });
});

// =============================================================================
// Error Classes Tests
// =============================================================================

describe('Error Classes', () => {
  describe('ActionItemServiceError', () => {
    it('should create error with all properties', () => {
      const error = new ActionItemServiceError(
        'Test error',
        'TEST_CODE',
        400,
        { extra: 'details' }
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ extra: 'details' });
      expect(error.name).toBe('ActionItemServiceError');
    });

    it('should use default statusCode of 500', () => {
      const error = new ActionItemServiceError('Test error', 'TEST_CODE');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('ActionItemNotFoundError', () => {
    it('should create error with correct properties', () => {
      const error = new ActionItemNotFoundError('test_id_123');

      expect(error.message).toBe("Action item with id 'test_id_123' not found");
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual({ id: 'test_id_123' });
      expect(error.name).toBe('ActionItemNotFoundError');
    });
  });
});

// =============================================================================
// Factory Functions Tests
// =============================================================================

describe('Factory Functions', () => {
  describe('createActionItemService', () => {
    it('should create service instance', () => {
      // Reset singleton before test
      ActionItemStore.resetInstance();

      const service = createActionItemService();
      expect(service).toBeInstanceOf(ActionItemService);
    });
  });

  describe('createTestActionItemService', () => {
    it('should create service with isolated store', async () => {
      const { service: service1, store: store1 } = createTestActionItemService();
      const { service: service2, store: store2 } = createTestActionItemService();

      // Add item to first service
      await service1.createActionItem(
        createMockManagedActionItem({ id: 'isolated_test' })
      );

      // Second service should not see it
      const item = await service2.getActionItem('isolated_test');
      expect(item).toBeNull();

      // But first service should
      const found = await service1.getActionItem('isolated_test');
      expect(found).not.toBeNull();

      // Stores should be different instances
      expect(store1).not.toBe(store2);
    });
  });
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe('Edge Cases', () => {
  let service: ActionItemService;

  beforeEach(() => {
    const result = createTestActionItemService();
    service = result.service;
  });

  it('should handle empty filters object', async () => {
    await service.createActionItem(createMockManagedActionItem({ id: 'edge_1' }));

    const result = await service.getActionItems({});
    expect(result.items.length).toBe(1);
  });

  it('should handle page beyond total', async () => {
    await service.createActionItem(createMockManagedActionItem({ id: 'edge_2' }));

    const result = await service.getActionItems(
      undefined,
      undefined,
      { page: 100, pageSize: 10 }
    );

    // createPagination normalizes page to valid range, so we get the last valid page
    // With 1 item and pageSize 10, totalPages is 1, so page is clamped to 1
    expect(result.items.length).toBe(1);
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.page).toBe(1); // Normalized to valid page
    expect(result.pagination.totalPages).toBe(1);
  });

  it('should handle clearAll', async () => {
    await service.createActionItem(createMockManagedActionItem({ id: 'clear_1' }));
    await service.createActionItem(createMockManagedActionItem({ id: 'clear_2' }));

    await service.clearAll();

    const result = await service.getActionItems();
    expect(result.items.length).toBe(0);
  });

  it('should handle items without assignee', async () => {
    const item = createMockManagedActionItem({ id: 'no_assignee' });
    delete (item as Partial<ManagedActionItem>).assignee;
    await service.createActionItem(item);

    const assignees = await service.getAssignees();
    expect(assignees.length).toBe(0);
  });

  it('should handle items without dueDate in sorting', async () => {
    const itemWithDate = createMockManagedActionItem({
      id: 'with_date',
      dueDate: '2024-01-15',
    });
    const itemWithoutDate = createMockManagedActionItem({ id: 'without_date' });
    delete (itemWithoutDate as Partial<ManagedActionItem>).dueDate;

    await service.createActionItem(itemWithDate);
    await service.createActionItem(itemWithoutDate);

    const result = await service.getActionItems(
      undefined,
      { field: 'dueDate', order: 'asc' }
    );

    // Items without dueDate should be at the end
    expect(result.items[0]?.id).toBe('with_date');
    expect(result.items[1]?.id).toBe('without_date');
  });
});
