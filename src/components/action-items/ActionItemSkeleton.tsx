'use client';

/**
 * ActionItemSkeleton component
 * @module components/action-items/ActionItemSkeleton
 */

import { Skeleton } from '@/components/ui/skeleton';
import type { ActionItemSkeletonProps, ActionItemListSkeletonProps } from './types';

/**
 * ActionItemSkeleton component
 *
 * @description Skeleton loading placeholder for a single action item card
 * @example
 * ```tsx
 * <ActionItemSkeleton />
 * ```
 */
export function ActionItemSkeleton({
  className = '',
}: ActionItemSkeletonProps): JSX.Element {
  return (
    <div
      className={`
        border border-gray-200 rounded-lg bg-white p-4
        ${className}
      `}
      aria-hidden="true"
    >
      {/* Header Row: Title and Due Date */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          {/* Title skeleton */}
          <Skeleton className="h-4 w-3/4 mb-1" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        {/* Due date skeleton */}
        <div className="flex-shrink-0">
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>

      {/* Meta Row: Assignee, Priority, Meeting */}
      <div className="flex items-center flex-wrap gap-2 mb-3">
        {/* Assignee skeleton */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>

        {/* Priority badge skeleton */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>

        {/* Status badge skeleton */}
        <Skeleton className="h-5 w-12 rounded-full" />

        {/* Meeting skeleton */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-20 rounded-md" />
        <Skeleton className="h-7 w-14 rounded-md" />
      </div>
    </div>
  );
}

/**
 * ActionItemListSkeleton component
 *
 * @description Skeleton loading placeholder for a list of action items
 * @example
 * ```tsx
 * <ActionItemListSkeleton count={5} />
 * ```
 */
export function ActionItemListSkeleton({
  count = 3,
  className = '',
}: ActionItemListSkeletonProps): JSX.Element {
  return (
    <div
      className={`space-y-4 ${className}`}
      role="status"
      aria-label="読み込み中"
    >
      {Array.from({ length: count }, (_, index) => (
        <ActionItemSkeleton key={index} />
      ))}
      <span className="sr-only">読み込み中...</span>
    </div>
  );
}
