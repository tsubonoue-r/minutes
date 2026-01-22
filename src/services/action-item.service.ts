/**
 * ActionItem service for CRUD operations
 * @module services/action-item.service
 */

import type {
  ManagedActionItem,
  ActionItemFilters,
  ActionItemSortOptions,
  ActionItemListResponse,
  ActionItemStatusUpdate,
  ActionItemStats,
} from '@/types/action-item';
import {
  filterActionItems,
  sortManagedActionItems,
  createPagination,
  paginateItems,
  getActionItemStats,
  toManagedActionItem,
  isActionItemOverdue,
} from '@/types/action-item';
import type { Minutes, Speaker, ActionItemStatus } from '@/types/minutes';

// ============================================================================
// Error Classes
// ============================================================================

/**
 * General ActionItem service error
 */
export class ActionItemServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ActionItemServiceError';
  }
}

/**
 * ActionItem not found error
 */
export class ActionItemNotFoundError extends ActionItemServiceError {
  constructor(id: string) {
    super(`Action item with id '${id}' not found`, 'NOT_FOUND', 404, { id });
    this.name = 'ActionItemNotFoundError';
  }
}

// ============================================================================
// In-Memory Store (Singleton)
// ============================================================================

/**
 * In-memory storage for action items
 * (Phase 2 temporary implementation - will be replaced with Lark Base in Phase 2-3)
 */
class ActionItemStore {
  private items: Map<string, ManagedActionItem> = new Map();
  private static instance: ActionItemStore | undefined;

  /**
   * Get singleton instance
   */
  static getInstance(): ActionItemStore {
    if (ActionItemStore.instance === undefined) {
      ActionItemStore.instance = new ActionItemStore();
    }
    return ActionItemStore.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    ActionItemStore.instance = undefined;
  }

  /**
   * Add an item to the store
   */
  add(item: ManagedActionItem): void {
    this.items.set(item.id, item);
  }

  /**
   * Get an item by ID
   */
  get(id: string): ManagedActionItem | undefined {
    return this.items.get(id);
  }

  /**
   * Get all items
   */
  getAll(): ManagedActionItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Update an item
   */
  update(
    id: string,
    updates: Partial<ManagedActionItem>
  ): ManagedActionItem | undefined {
    const existing = this.items.get(id);
    if (existing === undefined) {
      return undefined;
    }

    const updated: ManagedActionItem = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID from being changed
      updatedAt: new Date().toISOString(),
    };

    // Update isOverdue flag
    updated.isOverdue = isActionItemOverdue(updated);

    // Set completedAt if status changed to completed
    if (updates.status === 'completed' && existing.status !== 'completed') {
      updated.completedAt = new Date().toISOString();
    }

    this.items.set(id, updated);
    return updated;
  }

  /**
   * Delete an item
   */
  delete(id: string): boolean {
    return this.items.delete(id);
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.items.clear();
  }

  /**
   * Get item count
   */
  get size(): number {
    return this.items.size;
  }
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_SORT: ActionItemSortOptions = {
  field: 'dueDate',
  order: 'asc',
};

const DEFAULT_PAGE_SIZE = 20;

// ============================================================================
// ActionItemService
// ============================================================================

/**
 * Service for managing action items with CRUD operations
 */
export class ActionItemService {
  private readonly store: ActionItemStore;

  constructor(store?: ActionItemStore) {
    this.store = store ?? ActionItemStore.getInstance();
  }

  /**
   * Get paginated list of action items with filtering and sorting
   *
   * @param filters - Filter criteria
   * @param sort - Sort options
   * @param pagination - Pagination options
   * @returns Paginated list response
   */
  async getActionItems(
    filters?: ActionItemFilters,
    sort?: ActionItemSortOptions,
    pagination?: { page: number; pageSize: number }
  ): Promise<ActionItemListResponse> {
    // Note: async for future Lark Base integration
    const allItems = await Promise.resolve(this.store.getAll());
    const appliedFilters = filters ?? {};
    const appliedSort = sort ?? DEFAULT_SORT;
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? DEFAULT_PAGE_SIZE;

    // Apply filters
    const filteredItems = filterActionItems(allItems, appliedFilters);

    // Apply sorting
    const sortedItems = sortManagedActionItems(filteredItems, appliedSort);

    // Create pagination info
    const paginationInfo = createPagination(sortedItems.length, page, pageSize);

    // Apply pagination
    const paginatedItems = paginateItems(
      sortedItems,
      paginationInfo.page,
      pageSize
    );

    return {
      items: paginatedItems,
      pagination: paginationInfo,
      filters: appliedFilters,
      sort: appliedSort,
    };
  }

  /**
   * Get a single action item by ID
   *
   * @param id - Action item ID
   * @returns ManagedActionItem or null if not found
   */
  async getActionItem(id: string): Promise<ManagedActionItem | null> {
    // Note: async for future Lark Base integration
    const item = await Promise.resolve(this.store.get(id));
    return item ?? null;
  }

  /**
   * Get all action items for a specific meeting
   *
   * @param meetingId - Meeting ID
   * @returns Array of action items for the meeting
   */
  async getActionItemsByMeetingId(
    meetingId: string
  ): Promise<ManagedActionItem[]> {
    // Note: async for future Lark Base integration
    const allItems = await Promise.resolve(this.store.getAll());
    return allItems.filter((item) => item.meetingId === meetingId);
  }

  /**
   * Update the status of an action item
   *
   * @param id - Action item ID
   * @param status - New status
   * @returns Updated action item
   * @throws ActionItemNotFoundError if item not found
   */
  async updateStatus(
    id: string,
    status: ActionItemStatus
  ): Promise<ManagedActionItem> {
    // Note: async for future Lark Base integration
    const updated = await Promise.resolve(this.store.update(id, { status }));
    if (updated === undefined) {
      throw new ActionItemNotFoundError(id);
    }
    return updated;
  }

  /**
   * Batch update status for multiple action items
   *
   * @param updates - Array of status updates
   * @returns Array of updated action items
   * @throws ActionItemServiceError if any update fails
   */
  async updateStatusBatch(
    updates: ActionItemStatusUpdate[]
  ): Promise<ManagedActionItem[]> {
    // Note: async for future Lark Base integration
    const results: ManagedActionItem[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const update of updates) {
      const existing = await Promise.resolve(this.store.get(update.id));
      if (existing === undefined) {
        errors.push({ id: update.id, error: 'Not found' });
        continue;
      }

      const updated = this.store.update(update.id, { status: update.status });
      if (updated !== undefined) {
        results.push(updated);
      }
    }

    if (errors.length > 0) {
      throw new ActionItemServiceError(
        `Failed to update ${errors.length} action item(s)`,
        'BATCH_UPDATE_PARTIAL_FAILURE',
        400,
        { errors, successCount: results.length }
      );
    }

    return results;
  }

  /**
   * Create action items from minutes
   *
   * @param minutes - Minutes containing action items
   * @param meeting - Meeting information
   * @returns Array of created ManagedActionItems
   */
  async createFromMinutes(
    minutes: Minutes,
    meeting: { id: string; title: string; date: string }
  ): Promise<ManagedActionItem[]> {
    // Note: async for future Lark Base integration
    const createdItems: ManagedActionItem[] = [];

    for (const actionItem of minutes.actionItems) {
      // Find source text from topics if relatedTopicId is provided
      let sourceText: string | undefined;
      if (actionItem.relatedTopicId !== undefined) {
        const relatedTopic = minutes.topics.find(
          (topic) => topic.id === actionItem.relatedTopicId
        );
        if (relatedTopic !== undefined) {
          sourceText = relatedTopic.summary;
        }
      }

      const managedItem = toManagedActionItem(actionItem, meeting, sourceText);
      await Promise.resolve(this.store.add(managedItem));
      createdItems.push(managedItem);
    }

    return createdItems;
  }

  /**
   * Create a single action item
   *
   * @param item - ManagedActionItem to create
   * @returns Created action item
   * @throws ActionItemServiceError if item with same ID already exists
   */
  async createActionItem(item: ManagedActionItem): Promise<ManagedActionItem> {
    // Note: async for future Lark Base integration
    const existing = await Promise.resolve(this.store.get(item.id));
    if (existing !== undefined) {
      throw new ActionItemServiceError(
        `Action item with id '${item.id}' already exists`,
        'DUPLICATE_ID',
        409,
        { id: item.id }
      );
    }

    await Promise.resolve(this.store.add(item));
    return item;
  }

  /**
   * Delete an action item
   *
   * @param id - Action item ID
   * @throws ActionItemNotFoundError if item not found
   */
  async deleteActionItem(id: string): Promise<void> {
    // Note: async for future Lark Base integration
    const deleted = await Promise.resolve(this.store.delete(id));
    if (!deleted) {
      throw new ActionItemNotFoundError(id);
    }
  }

  /**
   * Get action item statistics
   *
   * @returns Statistics about all action items
   */
  async getStats(): Promise<ActionItemStats> {
    // Note: async for future Lark Base integration
    const allItems = await Promise.resolve(this.store.getAll());
    return getActionItemStats(allItems);
  }

  /**
   * Get unique list of assignees
   *
   * @returns Array of unique speakers who have action items assigned
   */
  async getAssignees(): Promise<Speaker[]> {
    // Note: async for future Lark Base integration
    const allItems = await Promise.resolve(this.store.getAll());
    const assigneeMap = new Map<string, Speaker>();

    for (const item of allItems) {
      if (item.assignee !== undefined) {
        assigneeMap.set(item.assignee.id, item.assignee);
      }
    }

    return Array.from(assigneeMap.values());
  }

  /**
   * Get unique list of meetings
   *
   * @returns Array of unique meeting references
   */
  async getMeetings(): Promise<Array<{ id: string; title: string }>> {
    // Note: async for future Lark Base integration
    const allItems = await Promise.resolve(this.store.getAll());
    const meetingMap = new Map<string, { id: string; title: string }>();

    for (const item of allItems) {
      if (!meetingMap.has(item.meetingId)) {
        meetingMap.set(item.meetingId, {
          id: item.meetingId,
          title: item.meetingTitle,
        });
      }
    }

    return Array.from(meetingMap.values());
  }

  /**
   * Update action item fields
   *
   * @param id - Action item ID
   * @param updates - Fields to update
   * @returns Updated action item
   * @throws ActionItemNotFoundError if item not found
   */
  async updateActionItem(
    id: string,
    updates: Partial<
      Pick<
        ManagedActionItem,
        'content' | 'assignee' | 'dueDate' | 'priority' | 'status'
      >
    >
  ): Promise<ManagedActionItem> {
    // Note: async for future Lark Base integration
    const updated = await Promise.resolve(this.store.update(id, updates));
    if (updated === undefined) {
      throw new ActionItemNotFoundError(id);
    }
    return updated;
  }

  /**
   * Clear all action items (for testing)
   */
  async clearAll(): Promise<void> {
    // Note: async for future Lark Base integration
    await Promise.resolve(this.store.clear());
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an ActionItemService instance
 *
 * @returns ActionItemService instance using singleton store
 */
export function createActionItemService(): ActionItemService {
  return new ActionItemService();
}

/**
 * Create an ActionItemService instance with a fresh store (for testing)
 *
 * @returns ActionItemService instance with isolated store
 */
export function createTestActionItemService(): {
  service: ActionItemService;
  store: ActionItemStore;
} {
  const store = new (ActionItemStore as unknown as {
    new (): ActionItemStore;
  })();
  const service = new ActionItemService(store);
  return { service, store };
}

// Export store class for testing
export { ActionItemStore };
