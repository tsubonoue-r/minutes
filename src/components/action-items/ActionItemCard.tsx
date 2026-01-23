'use client';

/**
 * ActionItemCard component
 * @module components/action-items/ActionItemCard
 */

import { useCallback, useMemo } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { ActionItemCardProps, Priority, ActionItemStatus } from './types';

/**
 * Get priority badge configuration
 */
function getPriorityConfig(priority: Priority): {
  label: string;
  className: string;
} {
  const config: Record<Priority, { label: string; className: string }> = {
    high: { label: '高', className: 'bg-red-100 text-red-700' },
    medium: { label: '中', className: 'bg-yellow-100 text-yellow-700' },
    low: { label: '低', className: 'bg-gray-100 text-gray-600' },
  };
  return config[priority];
}

/**
 * Get status badge configuration
 */
function getStatusConfig(status: ActionItemStatus): {
  label: string;
  className: string;
} {
  const config: Record<ActionItemStatus, { label: string; className: string }> = {
    pending: { label: '未着手', className: 'bg-gray-100 text-gray-700' },
    in_progress: { label: '進行中', className: 'bg-blue-100 text-blue-700' },
    completed: { label: '完了', className: 'bg-green-100 text-green-700' },
  };
  return config[status];
}

/**
 * Calculate days until due date
 * @returns Object with days count and overdue status
 */
function getDueDateInfo(dueDate: string | undefined): {
  text: string;
  isOverdue: boolean;
  daysUntil: number | null;
} {
  if (dueDate === undefined || dueDate === '') {
    return { text: '期限なし', isOverdue: false, daysUntil: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `${Math.abs(diffDays)}日超過`,
      isOverdue: true,
      daysUntil: diffDays,
    };
  } else if (diffDays === 0) {
    return { text: '今日まで', isOverdue: false, daysUntil: 0 };
  } else if (diffDays === 1) {
    return { text: '明日まで', isOverdue: false, daysUntil: 1 };
  } else {
    return { text: `あと${diffDays}日`, isOverdue: false, daysUntil: diffDays };
  }
}

/**
 * Format date to display format (MM/DD)
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

/**
 * ActionItemCard component
 *
 * @description Displays a single action item with status, priority, assignee, and due date
 * @example
 * ```tsx
 * <ActionItemCard
 *   item={actionItem}
 *   onStatusChange={(id, status) => updateStatus(id, status)}
 *   onEdit={(item) => openEditModal(item)}
 * />
 * ```
 */
export function ActionItemCard({
  item,
  onStatusChange,
  onEdit,
  onClick,
  className = '',
}: ActionItemCardProps): JSX.Element {
  const priorityConfig = getPriorityConfig(item.priority);
  const statusConfig = getStatusConfig(item.status);
  const dueDateInfo = useMemo(() => getDueDateInfo(item.dueDate), [item.dueDate]);
  const isCompleted = item.status === 'completed';

  const handleComplete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onStatusChange(item.id, 'completed');
    },
    [item.id, onStatusChange]
  );

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit?.(item);
    },
    [item, onEdit]
  );

  const handleClick = useCallback(() => {
    onClick?.(item);
  }, [item, onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.(item);
      }
    },
    [item, onClick]
  );

  return (
    <div
      className={`
        border border-gray-200 rounded-lg bg-white p-3 sm:p-4
        hover:border-gray-300 hover:shadow-sm transition-all
        min-h-[44px]
        ${onClick ? 'cursor-pointer' : ''}
        ${isCompleted ? 'opacity-60' : ''}
        ${className}
      `}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`アクションアイテム: ${item.content}`}
    >
      {/* Header Row: Title and Due Date */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {/* Warning icon for overdue items */}
          {dueDateInfo.isOverdue && !isCompleted && (
            <span
              className="text-red-500 flex-shrink-0 mt-0.5"
              aria-label="期限切れ"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          )}
          <h3
            className={`
              text-sm font-medium text-gray-900 line-clamp-2
              ${isCompleted ? 'line-through text-gray-500' : ''}
            `}
          >
            {item.content}
          </h3>
        </div>

        {/* Due Date Display */}
        {item.dueDate !== undefined && item.dueDate !== '' && (
          <div className="flex-shrink-0 text-right">
            <div className="text-xs text-gray-500">
              期限: {formatDate(item.dueDate)}
            </div>
            <div
              className={`
                text-xs font-medium
                ${dueDateInfo.isOverdue && !isCompleted ? 'text-red-600' : 'text-gray-600'}
              `}
            >
              ({dueDateInfo.text})
            </div>
          </div>
        )}
      </div>

      {/* Meta Row: Assignee, Priority, Meeting - responsive wrap */}
      <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-3 text-xs sm:text-sm text-gray-600">
        {/* Assignee */}
        {item.assignee && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">担当:</span>
            <div className="flex items-center gap-1">
              <Avatar name={item.assignee.name} size="sm" />
              <span className="text-gray-700">{item.assignee.name}</span>
            </div>
          </div>
        )}

        {/* Priority Badge */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">優先度:</span>
          <Badge className={priorityConfig.className}>
            {priorityConfig.label}
          </Badge>
        </div>

        {/* Status Badge */}
        <Badge className={statusConfig.className}>
          {statusConfig.label}
        </Badge>

        {/* Meeting Link */}
        {item.meeting && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">会議:</span>
            <span className="text-blue-600 hover:underline">
              {item.meeting.title}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons - full width on mobile */}
      <div className="flex items-center gap-2 flex-wrap">
        {!isCompleted && (
          <button
            type="button"
            onClick={handleComplete}
            className="
              inline-flex items-center px-3 py-2 sm:py-1.5
              min-h-[44px] sm:min-h-0
              text-xs font-medium text-green-700 bg-green-50
              border border-green-200 rounded-md
              hover:bg-green-100 active:bg-green-200 transition-colors
              focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1
            "
            aria-label={`${item.content}を完了にする`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 mr-1"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
            完了にする
          </button>
        )}

        {onEdit && (
          <button
            type="button"
            onClick={handleEdit}
            className="
              inline-flex items-center px-3 py-2 sm:py-1.5
              min-h-[44px] sm:min-h-0
              text-xs font-medium text-gray-700 bg-gray-50
              border border-gray-200 rounded-md
              hover:bg-gray-100 active:bg-gray-200 transition-colors
              focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1
            "
            aria-label={`${item.content}を編集`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 mr-1"
            >
              <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
            </svg>
            編集
          </button>
        )}
      </div>
    </div>
  );
}
