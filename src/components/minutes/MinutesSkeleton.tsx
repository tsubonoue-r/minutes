'use client';

import { Skeleton } from '@/components/ui';

/**
 * Props for MinutesSkeleton component
 */
export interface MinutesSkeletonProps {
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * Topic section skeleton
 */
function TopicSectionSkeleton(): JSX.Element {
  return (
    <div className="p-4 border border-lark-border rounded-lg bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Summary */}
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-4/5 mb-4" />

      {/* Key points */}
      <div className="space-y-2 pl-4">
        <div className="flex items-start gap-2">
          <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex items-start gap-2">
          <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex items-start gap-2">
          <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      {/* Speakers */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
        <div className="flex -space-x-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/**
 * Decision item skeleton
 */
function DecisionItemSkeleton(): JSX.Element {
  return (
    <div className="p-4 border-l-4 border-lark-primary bg-blue-50 rounded-r-lg">
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

/**
 * Action item skeleton
 */
function ActionItemSkeleton(): JSX.Element {
  return (
    <div className="p-4 border border-lark-border rounded-lg bg-white">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

/**
 * MinutesSkeleton component
 *
 * @description Loading skeleton for minutes viewer
 * @example
 * ```tsx
 * <MinutesSkeleton />
 * ```
 */
export function MinutesSkeleton({
  className = '',
}: MinutesSkeletonProps): JSX.Element {
  return (
    <div
      className={`bg-white rounded-lg border border-lark-border ${className}`}
      aria-busy="true"
      aria-label="議事録を読み込み中..."
    >
      {/* Header */}
      <div className="p-4 border-b border-lark-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>

        {/* Overall summary skeleton */}
        <div className="bg-gray-50 rounded-lg p-4">
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="border-b border-lark-border">
        <div className="flex gap-4 px-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-4">
        {/* Topics tab content */}
        <div className="space-y-4">
          <TopicSectionSkeleton />
          <TopicSectionSkeleton />
        </div>
      </div>
    </div>
  );
}

/**
 * Props for MinutesContentSkeleton component
 */
export interface MinutesContentSkeletonProps {
  /** Content type */
  readonly type: 'topics' | 'decisions' | 'actions';
  /** Number of items to show */
  readonly count?: number | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * MinutesContentSkeleton component
 *
 * @description Skeleton for specific content sections
 * @example
 * ```tsx
 * <MinutesContentSkeleton type="topics" count={3} />
 * ```
 */
export function MinutesContentSkeleton({
  type,
  count = 3,
  className = '',
}: MinutesContentSkeletonProps): JSX.Element {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div className={`space-y-4 ${className}`} aria-busy="true">
      {items.map((i) => {
        switch (type) {
          case 'topics':
            return <TopicSectionSkeleton key={i} />;
          case 'decisions':
            return <DecisionItemSkeleton key={i} />;
          case 'actions':
            return <ActionItemSkeleton key={i} />;
        }
      })}
    </div>
  );
}
