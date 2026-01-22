/**
 * Extended ActionItem type definitions for action item management
 * @module types/action-item
 */

import { z } from 'zod';
import {
  ActionItem,
  ActionItemSchema,
  ActionItemStatus,
  ActionItemStatusSchema,
  Priority,
  PrioritySchema,
  generateId,
} from './minutes';

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Zod schema for ManagedActionItem (extended ActionItem with management fields)
 */
export const ManagedActionItemSchema = ActionItemSchema.extend({
  /** Meeting ID where this action item was extracted */
  meetingId: z.string().min(1),
  /** Meeting title */
  meetingTitle: z.string().min(1),
  /** Meeting date in ISO format */
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be ISO date format YYYY-MM-DD'),

  /** Source text from which the action item was extracted */
  sourceText: z.string().optional(),
  /** Extraction timestamp in ISO format */
  extractedAt: z.string().datetime({ offset: true }),

  /** Creation timestamp in ISO format */
  createdAt: z.string().datetime({ offset: true }),
  /** Last update timestamp in ISO format */
  updatedAt: z.string().datetime({ offset: true }),
  /** Completion timestamp in ISO format (only when status is 'completed') */
  completedAt: z.string().datetime({ offset: true }).optional(),

  /** Whether the action item is past its due date */
  isOverdue: z.boolean(),
});

/**
 * Zod schema for ActionItemFilters
 */
export const ActionItemFiltersSchema = z.object({
  /** Filter by status(es) */
  status: z.array(ActionItemStatusSchema).optional(),
  /** Filter by priority/priorities */
  priority: z.array(PrioritySchema).optional(),
  /** Filter by assignee ID */
  assigneeId: z.string().optional(),
  /** Filter by meeting ID */
  meetingId: z.string().optional(),
  /** Filter by overdue status */
  isOverdue: z.boolean().optional(),
  /** Filter by due date range start (inclusive) */
  dueDateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Filter by due date range end (inclusive) */
  dueDateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Text search query */
  searchQuery: z.string().optional(),
});

/**
 * Sort field for action items
 */
export const ActionItemSortFieldSchema = z.enum([
  'dueDate',
  'priority',
  'status',
  'createdAt',
  'meetingDate',
]);

/**
 * Sort order (ascending or descending)
 */
export const SortOrderSchema = z.enum(['asc', 'desc']);

/**
 * Zod schema for ActionItemSortOptions
 */
export const ActionItemSortOptionsSchema = z.object({
  /** Field to sort by */
  field: ActionItemSortFieldSchema,
  /** Sort order */
  order: SortOrderSchema,
});

/**
 * Zod schema for ActionItemPagination
 */
export const ActionItemPaginationSchema = z.object({
  /** Current page number (1-indexed) */
  page: z.number().int().positive(),
  /** Number of items per page */
  pageSize: z.number().int().positive(),
  /** Total number of items */
  total: z.number().int().nonnegative(),
  /** Total number of pages */
  totalPages: z.number().int().nonnegative(),
});

/**
 * Zod schema for ActionItemListResponse
 */
export const ActionItemListResponseSchema = z.object({
  /** List of action items */
  items: z.array(ManagedActionItemSchema),
  /** Pagination information */
  pagination: ActionItemPaginationSchema,
  /** Applied filters */
  filters: ActionItemFiltersSchema,
  /** Applied sort options */
  sort: ActionItemSortOptionsSchema,
});

/**
 * Zod schema for ActionItemStatusUpdate
 */
export const ActionItemStatusUpdateSchema = z.object({
  /** Action item ID to update */
  id: z.string().min(1),
  /** New status */
  status: ActionItemStatusSchema,
});

/**
 * Zod schema for ActionItemStats
 */
export const ActionItemStatsSchema = z.object({
  /** Total number of action items */
  total: z.number().int().nonnegative(),
  /** Number of pending items */
  pending: z.number().int().nonnegative(),
  /** Number of in-progress items */
  inProgress: z.number().int().nonnegative(),
  /** Number of completed items */
  completed: z.number().int().nonnegative(),
  /** Number of overdue items */
  overdue: z.number().int().nonnegative(),
});

// ============================================================================
// Types (inferred from Zod schemas)
// ============================================================================

/**
 * Extended ActionItem with management and tracking fields
 */
export type ManagedActionItem = z.infer<typeof ManagedActionItemSchema>;

/**
 * Filter options for querying action items
 */
export type ActionItemFilters = z.infer<typeof ActionItemFiltersSchema>;

/**
 * Available sort fields for action items
 */
export type ActionItemSortField = z.infer<typeof ActionItemSortFieldSchema>;

/**
 * Sort order direction
 */
export type SortOrder = z.infer<typeof SortOrderSchema>;

/**
 * Sort options for action item queries
 */
export type ActionItemSortOptions = z.infer<typeof ActionItemSortOptionsSchema>;

/**
 * Pagination information for action item lists
 */
export type ActionItemPagination = z.infer<typeof ActionItemPaginationSchema>;

/**
 * Response structure for action item list queries
 */
export type ActionItemListResponse = z.infer<typeof ActionItemListResponseSchema>;

/**
 * Request structure for updating action item status
 */
export type ActionItemStatusUpdate = z.infer<typeof ActionItemStatusUpdateSchema>;

/**
 * Statistics about action items
 */
export type ActionItemStats = z.infer<typeof ActionItemStatsSchema>;

// ============================================================================
// Read-only Types
// ============================================================================

/**
 * Read-only ManagedActionItem type
 */
export interface ReadonlyManagedActionItem {
  readonly id: string;
  readonly content: string;
  readonly assignee?: {
    readonly id: string;
    readonly name: string;
    readonly larkUserId?: string | undefined;
  } | undefined;
  readonly dueDate?: string | undefined;
  readonly priority: Priority;
  readonly status: ActionItemStatus;
  readonly relatedTopicId?: string | undefined;
  readonly meetingId: string;
  readonly meetingTitle: string;
  readonly meetingDate: string;
  readonly sourceText?: string | undefined;
  readonly extractedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt?: string | undefined;
  readonly isOverdue: boolean;
}

/**
 * Read-only ActionItemFilters type
 */
export interface ReadonlyActionItemFilters {
  readonly status?: readonly ActionItemStatus[] | undefined;
  readonly priority?: readonly Priority[] | undefined;
  readonly assigneeId?: string | undefined;
  readonly meetingId?: string | undefined;
  readonly isOverdue?: boolean | undefined;
  readonly dueDateFrom?: string | undefined;
  readonly dueDateTo?: string | undefined;
  readonly searchQuery?: string | undefined;
}

/**
 * Read-only ActionItemStats type
 */
export interface ReadonlyActionItemStats {
  readonly total: number;
  readonly pending: number;
  readonly inProgress: number;
  readonly completed: number;
  readonly overdue: number;
}

// ============================================================================
// Meeting Info Type (for toManagedActionItem)
// ============================================================================

/**
 * Meeting information for action item conversion
 */
export interface MeetingInfo {
  id: string;
  title: string;
  date: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Priority order mapping for sorting
 */
const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Status order mapping for sorting
 */
const STATUS_ORDER: Record<ActionItemStatus, number> = {
  pending: 0,
  in_progress: 1,
  completed: 2,
};

/**
 * Check if an action item is overdue
 *
 * @param item - Action item to check
 * @returns true if the item has a due date and is past it, false otherwise
 *
 * @example
 * ```typescript
 * const item = { dueDate: '2024-01-01', status: 'pending', ... };
 * const overdue = isActionItemOverdue(item);
 * // Returns true if today is after 2024-01-01
 * ```
 */
export function isActionItemOverdue(item: ActionItem): boolean {
  if (item.dueDate === undefined) {
    return false;
  }
  if (item.status === 'completed') {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(item.dueDate);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

/**
 * Sort action items by priority
 *
 * @param items - Array of action items to sort
 * @param order - Sort order ('asc' for low->high, 'desc' for high->low). Default: 'desc' (high first)
 * @returns New sorted array of action items
 *
 * @example
 * ```typescript
 * const sorted = sortByPriority(items);
 * // sorted[0].priority === 'high'
 *
 * const sortedAsc = sortByPriority(items, 'asc');
 * // sortedAsc[0].priority === 'low'
 * ```
 */
export function sortByPriority<T extends ActionItem>(
  items: readonly T[],
  order: SortOrder = 'desc'
): T[] {
  const sorted = [...items].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );
  return order === 'asc' ? sorted.reverse() : sorted;
}

/**
 * Sort action items by due date
 *
 * @param items - Array of action items to sort
 * @param order - Sort order ('asc' for earliest first, 'desc' for latest first). Default: 'asc'
 * @returns New sorted array of action items (items without due date are placed at the end)
 *
 * @example
 * ```typescript
 * const sorted = sortByDueDate(items);
 * // Items with earliest due dates first, items without due dates at end
 * ```
 */
export function sortByDueDate<T extends ActionItem>(
  items: readonly T[],
  order: SortOrder = 'asc'
): T[] {
  return [...items].sort((a, b) => {
    // Items without due date go to the end
    if (a.dueDate === undefined && b.dueDate === undefined) {
      return 0;
    }
    if (a.dueDate === undefined) {
      return 1;
    }
    if (b.dueDate === undefined) {
      return -1;
    }

    const dateA = new Date(a.dueDate).getTime();
    const dateB = new Date(b.dueDate).getTime();
    const comparison = dateA - dateB;

    return order === 'asc' ? comparison : -comparison;
  });
}

/**
 * Filter managed action items based on filter criteria
 *
 * @param items - Array of managed action items to filter
 * @param filters - Filter criteria
 * @returns Filtered array of managed action items
 *
 * @example
 * ```typescript
 * const filtered = filterActionItems(items, {
 *   status: ['pending', 'in_progress'],
 *   priority: ['high'],
 *   isOverdue: true,
 * });
 * ```
 */
export function filterActionItems(
  items: readonly ManagedActionItem[],
  filters: ActionItemFilters
): ManagedActionItem[] {
  let result = [...items];

  // Filter by status
  if (filters.status !== undefined && filters.status.length > 0) {
    result = result.filter((item) => filters.status!.includes(item.status));
  }

  // Filter by priority
  if (filters.priority !== undefined && filters.priority.length > 0) {
    result = result.filter((item) => filters.priority!.includes(item.priority));
  }

  // Filter by assignee ID
  if (filters.assigneeId !== undefined) {
    result = result.filter((item) => item.assignee?.id === filters.assigneeId);
  }

  // Filter by meeting ID
  if (filters.meetingId !== undefined) {
    result = result.filter((item) => item.meetingId === filters.meetingId);
  }

  // Filter by overdue status
  if (filters.isOverdue !== undefined) {
    result = result.filter((item) => item.isOverdue === filters.isOverdue);
  }

  // Filter by due date range (from)
  if (filters.dueDateFrom !== undefined) {
    const fromDate = new Date(filters.dueDateFrom);
    fromDate.setHours(0, 0, 0, 0);
    result = result.filter((item) => {
      if (item.dueDate === undefined) {
        return false;
      }
      const itemDate = new Date(item.dueDate);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate >= fromDate;
    });
  }

  // Filter by due date range (to)
  if (filters.dueDateTo !== undefined) {
    const toDate = new Date(filters.dueDateTo);
    toDate.setHours(0, 0, 0, 0);
    result = result.filter((item) => {
      if (item.dueDate === undefined) {
        return false;
      }
      const itemDate = new Date(item.dueDate);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate <= toDate;
    });
  }

  // Filter by search query (searches in content, meetingTitle, and assignee name)
  if (filters.searchQuery !== undefined && filters.searchQuery.trim() !== '') {
    const query = filters.searchQuery.toLowerCase().trim();
    result = result.filter((item) => {
      const contentMatch = item.content.toLowerCase().includes(query);
      const titleMatch = item.meetingTitle.toLowerCase().includes(query);
      const assigneeMatch = item.assignee?.name.toLowerCase().includes(query) ?? false;
      const sourceMatch = item.sourceText?.toLowerCase().includes(query) ?? false;
      return contentMatch || titleMatch || assigneeMatch || sourceMatch;
    });
  }

  return result;
}

/**
 * Convert a basic ActionItem to a ManagedActionItem
 *
 * @param item - Basic action item to convert
 * @param meeting - Meeting information (id, title, date)
 * @param sourceText - Optional source text from which the item was extracted
 * @returns ManagedActionItem with all management fields populated
 *
 * @example
 * ```typescript
 * const managed = toManagedActionItem(actionItem, {
 *   id: 'meeting-123',
 *   title: 'Weekly Sync',
 *   date: '2024-01-15',
 * });
 * ```
 */
export function toManagedActionItem(
  item: ActionItem,
  meeting: MeetingInfo,
  sourceText?: string
): ManagedActionItem {
  const now = new Date().toISOString();
  const isOverdue = isActionItemOverdue(item);

  const base: ManagedActionItem = {
    ...item,
    meetingId: meeting.id,
    meetingTitle: meeting.title,
    meetingDate: meeting.date,
    extractedAt: now,
    createdAt: now,
    updatedAt: now,
    isOverdue,
  };

  if (sourceText !== undefined) {
    return { ...base, sourceText };
  }

  return base;
}

/**
 * Calculate the number of days until due date
 *
 * @param dueDate - Due date in ISO format (YYYY-MM-DD)
 * @returns Number of days until due (negative if overdue, 0 if due today)
 *
 * @example
 * ```typescript
 * const days = getDaysUntilDue('2024-01-15');
 * // Returns -5 if today is 2024-01-20 (5 days overdue)
 * // Returns 5 if today is 2024-01-10 (5 days until due)
 * // Returns 0 if today is 2024-01-15 (due today)
 * ```
 */
export function getDaysUntilDue(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get statistics about managed action items
 *
 * @param items - Array of managed action items
 * @returns Statistics object with counts for each category
 *
 * @example
 * ```typescript
 * const stats = getActionItemStats(items);
 * // { total: 10, pending: 4, inProgress: 3, completed: 3, overdue: 2 }
 * ```
 */
export function getActionItemStats(
  items: readonly ManagedActionItem[]
): ActionItemStats {
  const stats = {
    total: items.length,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  };

  for (const item of items) {
    switch (item.status) {
      case 'pending':
        stats.pending++;
        break;
      case 'in_progress':
        stats.inProgress++;
        break;
      case 'completed':
        stats.completed++;
        break;
    }

    if (item.isOverdue) {
      stats.overdue++;
    }
  }

  return stats;
}

/**
 * Sort managed action items by the specified field and order
 *
 * @param items - Array of managed action items to sort
 * @param options - Sort options (field and order)
 * @returns New sorted array of managed action items
 *
 * @example
 * ```typescript
 * const sorted = sortManagedActionItems(items, { field: 'dueDate', order: 'asc' });
 * ```
 */
export function sortManagedActionItems(
  items: readonly ManagedActionItem[],
  options: ActionItemSortOptions
): ManagedActionItem[] {
  const { field, order } = options;

  switch (field) {
    case 'dueDate':
      return sortByDueDate(items, order);

    case 'priority':
      return sortByPriority(items, order);

    case 'status':
      return [...items].sort((a, b) => {
        const comparison = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        return order === 'asc' ? comparison : -comparison;
      });

    case 'createdAt':
      return [...items].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        const comparison = dateA - dateB;
        return order === 'asc' ? comparison : -comparison;
      });

    case 'meetingDate':
      return [...items].sort((a, b) => {
        const dateA = new Date(a.meetingDate).getTime();
        const dateB = new Date(b.meetingDate).getTime();
        const comparison = dateA - dateB;
        return order === 'asc' ? comparison : -comparison;
      });

    default:
      return [...items];
  }
}

/**
 * Create pagination info for action item list
 *
 * @param totalItems - Total number of items
 * @param page - Current page (1-indexed)
 * @param pageSize - Items per page
 * @returns ActionItemPagination object
 */
export function createPagination(
  totalItems: number,
  page: number,
  pageSize: number
): ActionItemPagination {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(Math.max(1, page), totalPages);

  return {
    page: validPage,
    pageSize,
    total: totalItems,
    totalPages,
  };
}

/**
 * Apply pagination to an array of items
 *
 * @param items - Array of items to paginate
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page
 * @returns Paginated slice of items
 */
export function paginateItems<T>(
  items: readonly T[],
  page: number,
  pageSize: number
): T[] {
  const startIndex = (page - 1) * pageSize;
  return items.slice(startIndex, startIndex + pageSize);
}

/**
 * Create a complete list response for action items
 *
 * @param items - All managed action items
 * @param filters - Filter criteria
 * @param sort - Sort options
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page
 * @returns Complete ActionItemListResponse
 */
export function createActionItemListResponse(
  items: readonly ManagedActionItem[],
  filters: ActionItemFilters,
  sort: ActionItemSortOptions,
  page: number,
  pageSize: number
): ActionItemListResponse {
  // Apply filters
  const filteredItems = filterActionItems(items, filters);

  // Apply sorting
  const sortedItems = sortManagedActionItems(filteredItems, sort);

  // Create pagination
  const pagination = createPagination(sortedItems.length, page, pageSize);

  // Apply pagination
  const paginatedItems = paginateItems(sortedItems, pagination.page, pageSize);

  return {
    items: paginatedItems,
    pagination,
    filters,
    sort,
  };
}

/**
 * Update the isOverdue flag for all items based on current date
 *
 * @param items - Array of managed action items
 * @returns New array with updated isOverdue flags
 */
export function refreshOverdueStatus(
  items: readonly ManagedActionItem[]
): ManagedActionItem[] {
  return items.map((item) => ({
    ...item,
    isOverdue: isActionItemOverdue(item),
    updatedAt: new Date().toISOString(),
  }));
}

/**
 * Create a new ManagedActionItem
 *
 * @param content - Task content
 * @param meeting - Meeting information
 * @param options - Optional properties
 * @returns New ManagedActionItem
 */
export function createManagedActionItem(
  content: string,
  meeting: MeetingInfo,
  options?: Partial<{
    priority: Priority;
    status: ActionItemStatus;
    assignee: ManagedActionItem['assignee'];
    dueDate: string;
    relatedTopicId: string;
    sourceText: string;
  }>
): ManagedActionItem {
  const now = new Date().toISOString();
  const priority = options?.priority ?? 'medium';
  const status = options?.status ?? 'pending';
  const dueDate = options?.dueDate;

  const base: ManagedActionItem = {
    id: generateId('action'),
    content,
    priority,
    status,
    meetingId: meeting.id,
    meetingTitle: meeting.title,
    meetingDate: meeting.date,
    extractedAt: now,
    createdAt: now,
    updatedAt: now,
    isOverdue: dueDate !== undefined
      ? isActionItemOverdue({ id: '', content: '', priority, status, dueDate })
      : false,
  };

  // Add optional properties
  if (options?.assignee !== undefined) {
    base.assignee = options.assignee;
  }
  if (options?.dueDate !== undefined) {
    base.dueDate = options.dueDate;
  }
  if (options?.relatedTopicId !== undefined) {
    base.relatedTopicId = options.relatedTopicId;
  }
  if (options?.sourceText !== undefined) {
    base.sourceText = options.sourceText;
  }

  return base;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a ManagedActionItem using Zod schema
 *
 * @param data - Data to validate
 * @returns Validation result with success flag and data/error
 */
export function validateManagedActionItem(
  data: unknown
): z.SafeParseReturnType<unknown, ManagedActionItem> {
  return ManagedActionItemSchema.safeParse(data);
}

/**
 * Validate ActionItemFilters using Zod schema
 *
 * @param data - Data to validate
 * @returns Validation result with success flag and data/error
 */
export function validateActionItemFilters(
  data: unknown
): z.SafeParseReturnType<unknown, ActionItemFilters> {
  return ActionItemFiltersSchema.safeParse(data);
}

/**
 * Validate ActionItemSortOptions using Zod schema
 *
 * @param data - Data to validate
 * @returns Validation result with success flag and data/error
 */
export function validateActionItemSortOptions(
  data: unknown
): z.SafeParseReturnType<unknown, ActionItemSortOptions> {
  return ActionItemSortOptionsSchema.safeParse(data);
}

/**
 * Validate ActionItemPagination using Zod schema
 *
 * @param data - Data to validate
 * @returns Validation result with success flag and data/error
 */
export function validateActionItemPagination(
  data: unknown
): z.SafeParseReturnType<unknown, ActionItemPagination> {
  return ActionItemPaginationSchema.safeParse(data);
}

/**
 * Validate ActionItemListResponse using Zod schema
 *
 * @param data - Data to validate
 * @returns Validation result with success flag and data/error
 */
export function validateActionItemListResponse(
  data: unknown
): z.SafeParseReturnType<unknown, ActionItemListResponse> {
  return ActionItemListResponseSchema.safeParse(data);
}

/**
 * Validate ActionItemStatusUpdate using Zod schema
 *
 * @param data - Data to validate
 * @returns Validation result with success flag and data/error
 */
export function validateActionItemStatusUpdate(
  data: unknown
): z.SafeParseReturnType<unknown, ActionItemStatusUpdate> {
  return ActionItemStatusUpdateSchema.safeParse(data);
}

/**
 * Validate ActionItemStats using Zod schema
 *
 * @param data - Data to validate
 * @returns Validation result with success flag and data/error
 */
export function validateActionItemStats(
  data: unknown
): z.SafeParseReturnType<unknown, ActionItemStats> {
  return ActionItemStatsSchema.safeParse(data);
}
