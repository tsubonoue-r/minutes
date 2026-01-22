'use client';

import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { Avatar, Badge } from '@/components/ui';
import type {
  ActionItem,
  ActionItemStatus,
  Priority,
  Speaker,
} from '@/types/minutes';

/**
 * Get priority badge variant
 */
function getPriorityVariant(
  priority: Priority
): 'error' | 'warning' | 'default' {
  const variants: Record<Priority, 'error' | 'warning' | 'default'> = {
    high: 'error',
    medium: 'warning',
    low: 'default',
  };
  return variants[priority];
}

/**
 * Get priority label
 */
function getPriorityLabel(priority: Priority): string {
  const labels: Record<Priority, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  return labels[priority];
}

/**
 * Get status label
 */
function getStatusLabel(status: ActionItemStatus): string {
  const labels: Record<ActionItemStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
  };
  return labels[status];
}

/**
 * Get status icon
 */
function StatusIcon({
  status,
  className = '',
}: {
  readonly status: ActionItemStatus;
  readonly className?: string;
}): JSX.Element {
  switch (status) {
    case 'completed':
      return (
        <svg
          className={`w-4 h-4 text-green-500 ${className}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      );
    case 'in_progress':
      return (
        <svg
          className={`w-4 h-4 text-yellow-500 ${className}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    default:
      return (
        <svg
          className={`w-4 h-4 text-gray-400 ${className}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      );
  }
}

/**
 * Props for ActionItemCard component
 */
export interface ActionItemCardProps {
  /** Action item data to display */
  readonly item: ActionItem;
  /** Callback when status is changed */
  readonly onStatusChange?: ((id: string, status: ActionItemStatus) => void) | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * ActionItemCard component
 *
 * @description Displays a single action item with priority, assignee, and due date
 * @example
 * ```tsx
 * <ActionItemCard
 *   item={{
 *     id: '1',
 *     content: 'Prepare Q4 presentation',
 *     assignee: { id: '1', name: 'John Doe' },
 *     dueDate: '2024-12-31',
 *     priority: 'high',
 *     status: 'pending',
 *   }}
 * />
 * ```
 */
function ActionItemCardInner({
  item,
  onStatusChange,
  className = '',
}: ActionItemCardProps): JSX.Element {
  const handleStatusClick = useCallback(() => {
    if (onStatusChange === undefined) return;

    // Cycle through statuses: pending -> in_progress -> completed -> pending
    const nextStatus: Record<ActionItemStatus, ActionItemStatus> = {
      pending: 'in_progress',
      in_progress: 'completed',
      completed: 'pending',
    };
    onStatusChange(item.id, nextStatus[item.status]);
  }, [item.id, item.status, onStatusChange]);

  const isInteractive = onStatusChange !== undefined;

  return (
    <article
      className={`
        p-4 border border-lark-border rounded-lg bg-white
        transition-all duration-200 hover:shadow-sm
        ${item.status === 'completed' ? 'opacity-60' : ''}
        ${className}
      `}
      aria-labelledby={`action-item-${item.id}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        {/* Status icon and content */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Status indicator */}
          <button
            type="button"
            onClick={isInteractive ? handleStatusClick : undefined}
            disabled={!isInteractive}
            className={`
              flex-shrink-0 p-1 rounded transition-colors
              ${isInteractive ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'}
              focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
            `}
            title={`Status: ${getStatusLabel(item.status)}${isInteractive ? ' (click to change)' : ''}`}
            aria-label={`Status: ${getStatusLabel(item.status)}`}
          >
            <StatusIcon status={item.status} />
          </button>

          {/* Content */}
          <p
            id={`action-item-${item.id}`}
            className={`
              text-sm text-lark-text flex-1
              ${item.status === 'completed' ? 'line-through text-gray-500' : ''}
            `}
          >
            {item.content}
          </p>
        </div>

        {/* Priority badge */}
        <Badge variant={getPriorityVariant(item.priority)} className="flex-shrink-0">
          {getPriorityLabel(item.priority)}
        </Badge>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 ml-8 text-sm">
        {/* Assignee */}
        {item.assignee !== undefined && (
          <div className="flex items-center gap-2">
            <Avatar name={item.assignee.name} size="sm" />
            <span className="text-gray-600">{item.assignee.name}</span>
          </div>
        )}

        {/* Due date */}
        {item.dueDate !== undefined && (
          <div className="flex items-center gap-1 text-gray-500">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <time dateTime={item.dueDate}>{item.dueDate}</time>
          </div>
        )}

        {/* Status badge for small screens */}
        <span className="text-xs text-gray-400 ml-auto">
          {getStatusLabel(item.status)}
        </span>
      </div>
    </article>
  );
}

export const ActionItemCard = memo(ActionItemCardInner);

/**
 * Filter value for status (includes 'all' for no filter)
 */
export type StatusFilterValue = ActionItemStatus | 'all';

/**
 * Filter options for action items
 */
export interface ActionItemFilterOptions {
  /** Filter by status */
  readonly status?: StatusFilterValue | undefined;
  /** Filter by assignee ID (use 'all' for no filter) */
  readonly assigneeId?: string | undefined;
}

/**
 * Props for ActionItemFilters component
 */
export interface ActionItemFiltersProps {
  /** Current filter options */
  readonly filters: ActionItemFilterOptions;
  /** Callback when filters change */
  readonly onFiltersChange: (filters: ActionItemFilterOptions) => void;
  /** List of unique assignees for the filter dropdown */
  readonly assignees: readonly Speaker[];
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * ActionItemFilters component
 *
 * @description Filter controls for action items
 */
export function ActionItemFilters({
  filters,
  onFiltersChange,
  assignees,
  className = '',
}: ActionItemFiltersProps): JSX.Element {
  const handleStatusChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      onFiltersChange({
        ...filters,
        status: value === 'all' ? 'all' : (value as ActionItemStatus),
      });
    },
    [filters, onFiltersChange]
  );

  const handleAssigneeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      onFiltersChange({
        ...filters,
        assigneeId: value === 'all' ? 'all' : value,
      });
    },
    [filters, onFiltersChange]
  );

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Status filter */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="status-filter"
          className="text-sm text-gray-600"
        >
          Status:
        </label>
        <select
          id="status-filter"
          value={filters.status ?? 'all'}
          onChange={handleStatusChange}
          className="
            text-sm border border-lark-border rounded-lg
            px-3 py-1.5 bg-white
            focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-lark-primary
          "
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Assignee filter */}
      {assignees.length > 0 && (
        <div className="flex items-center gap-2">
          <label
            htmlFor="assignee-filter"
            className="text-sm text-gray-600"
          >
            Assignee:
          </label>
          <select
            id="assignee-filter"
            value={filters.assigneeId ?? 'all'}
            onChange={handleAssigneeChange}
            className="
              text-sm border border-lark-border rounded-lg
              px-3 py-1.5 bg-white
              focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-lark-primary
            "
          >
            <option value="all">All</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/**
 * Props for ActionItemList component
 */
export interface ActionItemListProps {
  /** List of action items to display */
  readonly actionItems: readonly ActionItem[];
  /** Whether to show filters */
  readonly showFilters?: boolean | undefined;
  /** Callback when an item's status is changed */
  readonly onStatusChange?: ((id: string, status: ActionItemStatus) => void) | undefined;
  /** Whether to sync status changes with API */
  readonly enableApiSync?: boolean | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * ActionItemList component
 *
 * @description Displays a list of action items with filtering capabilities
 * @example
 * ```tsx
 * <ActionItemList
 *   actionItems={minutes.actionItems}
 *   showFilters
 *   onStatusChange={handleStatusChange}
 * />
 * ```
 */
export function ActionItemList({
  actionItems,
  showFilters = false,
  onStatusChange,
  enableApiSync = false,
  className = '',
}: ActionItemListProps): JSX.Element {
  const [filters, setFilters] = useState<ActionItemFilterOptions>({
    status: 'all',
    assigneeId: 'all',
  });
  const [localItems, setLocalItems] = useState<readonly ActionItem[]>(actionItems);
  const [isUpdating, setIsUpdating] = useState<Set<string>>(new Set());

  // Sync localItems when actionItems prop changes
  useEffect(() => {
    setLocalItems(actionItems);
  }, [actionItems]);

  /**
   * Handle status change with optimistic update and API sync
   */
  const handleStatusChangeWithSync = useCallback(
    async (id: string, newStatus: ActionItemStatus): Promise<void> => {
      // Find original item for potential rollback
      const originalItem = localItems.find((item) => item.id === id);
      if (originalItem === undefined) return;

      const originalStatus = originalItem.status;

      // Optimistic update
      setLocalItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: newStatus } : item
        )
      );

      // Mark item as updating
      setIsUpdating((prev) => new Set(prev).add(id));

      // Call parent callback if provided
      onStatusChange?.(id, newStatus);

      // Sync with API if enabled
      if (enableApiSync) {
        try {
          const response = await fetch(`/api/action-items/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          });

          if (!response.ok) {
            // Rollback on error
            setLocalItems((prev) =>
              prev.map((item) =>
                item.id === id ? { ...item, status: originalStatus } : item
              )
            );
            console.error('Failed to update action item status');
          }
        } catch (error) {
          // Rollback on error
          setLocalItems((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, status: originalStatus } : item
            )
          );
          console.error('Error updating action item status:', error);
        }
      }

      // Remove updating state
      setIsUpdating((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [localItems, onStatusChange, enableApiSync]
  );

  // Use either API-synced handler or simple handler
  const effectiveOnStatusChange = enableApiSync
    ? (id: string, status: ActionItemStatus): void => {
        void handleStatusChangeWithSync(id, status);
      }
    : onStatusChange;

  // Get unique assignees
  const uniqueAssignees = useMemo(() => {
    const assigneeMap = new Map<string, Speaker>();
    for (const item of localItems) {
      if (item.assignee !== undefined && !assigneeMap.has(item.assignee.id)) {
        assigneeMap.set(item.assignee.id, item.assignee);
      }
    }
    return Array.from(assigneeMap.values());
  }, [localItems]);

  // Filter action items
  const filteredItems = useMemo(() => {
    return localItems.filter((item) => {
      // Filter by status
      if (filters.status !== undefined && filters.status !== 'all') {
        if (item.status !== filters.status) {
          return false;
        }
      }

      // Filter by assignee
      if (filters.assigneeId !== undefined && filters.assigneeId !== 'all') {
        if (item.assignee?.id !== filters.assigneeId) {
          return false;
        }
      }

      return true;
    });
  }, [localItems, filters]);

  if (localItems.length === 0) {
    return (
      <div
        className={`
          p-8 text-center text-gray-500
          border border-dashed border-lark-border rounded-lg
          ${className}
        `}
      >
        <svg
          className="w-12 h-12 mx-auto mb-3 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <p className="text-sm">No action items</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Filters */}
      {showFilters && (
        <div className="mb-4">
          <ActionItemFilters
            filters={filters}
            onFiltersChange={setFilters}
            assignees={uniqueAssignees}
          />
        </div>
      )}

      {/* Summary */}
      <div className="mb-4 flex items-center gap-4 text-sm text-gray-500">
        <span>
          {filteredItems.length} of {localItems.length} items
        </span>
        <span className="text-gray-300">|</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {localItems.filter((i) => i.status === 'completed').length} completed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          {localItems.filter((i) => i.status === 'in_progress').length} in progress
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          {localItems.filter((i) => i.status === 'pending').length} pending
        </span>
      </div>

      {/* List */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center text-gray-500 border border-dashed border-lark-border rounded-lg">
          <p className="text-sm">No items match the selected filters</p>
        </div>
      ) : (
        <div
          className="space-y-3"
          role="list"
          aria-label="Action items"
        >
          {filteredItems.map((item) => (
            <div key={item.id} role="listitem">
              <ActionItemCard
                item={item}
                onStatusChange={effectiveOnStatusChange}
              />
              {isUpdating.has(item.id) && (
                <div className="text-xs text-gray-400 mt-1 ml-8">
                  Saving...
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
