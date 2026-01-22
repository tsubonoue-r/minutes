/**
 * Action Items component type definitions
 * @module components/action-items/types
 */

import type { ActionItem, ActionItemStatus, Priority } from '@/types';

/**
 * Meeting reference for action items
 */
export interface MeetingReference {
  /** Meeting ID */
  readonly id: string;
  /** Meeting title */
  readonly title: string;
}

/**
 * Extended ActionItem with management metadata
 * Used in action item lists and management views
 */
export interface ManagedActionItem extends ActionItem {
  /** Source meeting information */
  readonly meeting?: MeetingReference | undefined;
  /** Created timestamp in ISO format */
  readonly createdAt?: string | undefined;
  /** Last updated timestamp in ISO format */
  readonly updatedAt?: string | undefined;
}

/**
 * Action item statistics
 */
export interface ActionItemStats {
  /** Total number of action items */
  readonly total: number;
  /** Number of pending items */
  readonly pending: number;
  /** Number of in-progress items */
  readonly inProgress: number;
  /** Number of completed items */
  readonly completed: number;
  /** Number of overdue items */
  readonly overdue: number;
}

/**
 * Props for ActionItemCard component
 */
export interface ActionItemCardProps {
  /** The action item to display */
  readonly item: ManagedActionItem;
  /** Callback when status changes */
  readonly onStatusChange: (id: string, status: ActionItemStatus) => void;
  /** Callback when edit is clicked */
  readonly onEdit?: ((item: ManagedActionItem) => void) | undefined;
  /** Callback when card is clicked */
  readonly onClick?: ((item: ManagedActionItem) => void) | undefined;
  /** Additional CSS classes */
  readonly className?: string | undefined;
}

/**
 * Props for ActionItemList component
 */
export interface ActionItemListProps {
  /** Array of action items to display */
  readonly items: readonly ManagedActionItem[];
  /** Whether data is loading */
  readonly isLoading?: boolean | undefined;
  /** Callback when item status changes */
  readonly onStatusChange: (id: string, status: ActionItemStatus) => void;
  /** Callback when item is clicked */
  readonly onItemClick?: ((item: ManagedActionItem) => void) | undefined;
  /** Message to show when list is empty */
  readonly emptyMessage?: string | undefined;
  /** Additional CSS classes */
  readonly className?: string | undefined;
}

/**
 * Props for ActionItemStats component
 */
export interface ActionItemStatsProps {
  /** Statistics data */
  readonly stats: ActionItemStats;
  /** Callback when a stat card is clicked for filtering */
  readonly onFilterChange?: ((filter: ActionItemStatus | 'overdue' | 'all') => void) | undefined;
  /** Currently active filter */
  readonly activeFilter?: ActionItemStatus | 'overdue' | 'all' | undefined;
  /** Additional CSS classes */
  readonly className?: string | undefined;
}

/**
 * Props for ActionItemEmptyState component
 */
export interface ActionItemEmptyStateProps {
  /** Custom message to display */
  readonly message?: string | undefined;
  /** Additional CSS classes */
  readonly className?: string | undefined;
}

/**
 * Props for ActionItemSkeleton component
 */
export interface ActionItemSkeletonProps {
  /** Additional CSS classes */
  readonly className?: string | undefined;
}

/**
 * Props for ActionItemListSkeleton component
 */
export interface ActionItemListSkeletonProps {
  /** Number of skeleton cards to show */
  readonly count?: number | undefined;
  /** Additional CSS classes */
  readonly className?: string | undefined;
}

// ============================================================================
// Filter & Sort Types
// ============================================================================

/**
 * Sort field options for action items
 */
export type ActionItemSortField =
  | 'dueDate'
  | 'priority'
  | 'createdAt'
  | 'meetingDate';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort options for action items
 */
export interface ActionItemSortOptions {
  /** Field to sort by */
  readonly field: ActionItemSortField;
  /** Sort direction */
  readonly direction: SortDirection;
}

/**
 * Filter options for action items (supports multi-select)
 */
export interface ActionItemFilters {
  /** Selected statuses (empty = all) */
  readonly statuses: readonly ActionItemStatus[];
  /** Selected priorities (empty = all) */
  readonly priorities: readonly Priority[];
  /** Selected assignee ID (undefined = all) */
  readonly assigneeId?: string | undefined;
  /** Selected meeting ID (undefined = all) */
  readonly meetingId?: string | undefined;
  /** Show only overdue items */
  readonly overdueOnly: boolean;
  /** Due date range filter */
  readonly dueDateRange?: {
    readonly start: string | undefined;
    readonly end: string | undefined;
  } | undefined;
}

/**
 * Create default filter options
 */
export function createDefaultFilters(): ActionItemFilters {
  return {
    statuses: [],
    priorities: [],
    assigneeId: undefined,
    meetingId: undefined,
    overdueOnly: false,
    dueDateRange: undefined,
  };
}

/**
 * Create default sort options
 */
export function createDefaultSortOptions(): ActionItemSortOptions {
  return {
    field: 'dueDate',
    direction: 'asc',
  };
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: ActionItemFilters): boolean {
  return (
    filters.statuses.length > 0 ||
    filters.priorities.length > 0 ||
    filters.assigneeId !== undefined ||
    filters.meetingId !== undefined ||
    filters.overdueOnly ||
    filters.dueDateRange !== undefined
  );
}

/**
 * Status display labels
 */
export const STATUS_LABELS: Record<ActionItemStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

/**
 * Priority display labels
 */
export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/**
 * Sort field display labels
 */
export const SORT_FIELD_LABELS: Record<ActionItemSortField, string> = {
  dueDate: 'Due Date',
  priority: 'Priority',
  createdAt: 'Created At',
  meetingDate: 'Meeting Date',
};

// Re-export types from base for convenience
export type { ActionItemStatus, Priority };
