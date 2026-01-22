'use client';

/**
 * ActionItemList component
 * @module components/action-items/ActionItemList
 */

import { ActionItemCard } from './ActionItemCard';
import { ActionItemEmptyState } from './ActionItemEmptyState';
import { ActionItemListSkeleton } from './ActionItemSkeleton';
import type { ActionItemListProps } from './types';

/**
 * ActionItemList component
 *
 * @description Displays a list of action items with loading and empty states
 * @example
 * ```tsx
 * <ActionItemList
 *   items={actionItems}
 *   isLoading={isLoading}
 *   onStatusChange={(id, status) => updateStatus(id, status)}
 *   onItemClick={(item) => openDetails(item)}
 *   emptyMessage="タスクが見つかりません"
 * />
 * ```
 */
export function ActionItemList({
  items,
  isLoading = false,
  onStatusChange,
  onItemClick,
  emptyMessage,
  className = '',
}: ActionItemListProps): JSX.Element {
  // Show loading skeleton
  if (isLoading) {
    return <ActionItemListSkeleton count={3} className={className} />;
  }

  // Show empty state
  if (items.length === 0) {
    return <ActionItemEmptyState message={emptyMessage} className={className} />;
  }

  return (
    <div
      className={`space-y-4 ${className}`}
      role="list"
      aria-label="アクションアイテム一覧"
    >
      {items.map((item) => (
        <div key={item.id} role="listitem">
          <ActionItemCard
            item={item}
            onStatusChange={onStatusChange}
            onClick={onItemClick}
          />
        </div>
      ))}
    </div>
  );
}
