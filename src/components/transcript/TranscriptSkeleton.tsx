'use client';

import { memo } from 'react';
import { Skeleton } from '@/components/ui';

/**
 * Props for TranscriptSegmentSkeleton component
 */
export interface TranscriptSegmentSkeletonProps {
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * Single segment skeleton
 */
function TranscriptSegmentSkeletonInner({
  className = '',
}: TranscriptSegmentSkeletonProps): JSX.Element {
  return (
    <div className={`flex gap-3 p-3 ${className}`} aria-hidden="true">
      {/* Timestamp skeleton */}
      <div className="flex-shrink-0 w-12">
        <Skeleton className="h-4 w-10" />
      </div>

      {/* Avatar skeleton */}
      <div className="flex-shrink-0">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Speaker name skeleton */}
        <Skeleton className="h-4 w-24" />

        {/* Text content skeleton (varying widths for realistic appearance) */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

export const TranscriptSegmentSkeleton = memo(TranscriptSegmentSkeletonInner);

/**
 * Props for TranscriptSkeleton component
 */
export interface TranscriptSkeletonProps {
  /** Number of skeleton segments to display */
  readonly segmentCount?: number | undefined;
  /** Whether to show the header skeleton */
  readonly showHeader?: boolean | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * TranscriptSkeleton component
 *
 * @description Loading skeleton for the transcript viewer
 * @example
 * ```tsx
 * <TranscriptSkeleton segmentCount={5} showHeader />
 * ```
 */
function TranscriptSkeletonInner({
  segmentCount = 5,
  showHeader = true,
  className = '',
}: TranscriptSkeletonProps): JSX.Element {
  return (
    <div
      className={`bg-white rounded-lg border border-lark-border ${className}`}
      role="status"
      aria-label="文字起こしを読み込み中"
    >
      {/* Header skeleton */}
      {showHeader && (
        <div className="p-4 border-b border-lark-border">
          <div className="flex items-center justify-between gap-4">
            {/* Title skeleton */}
            <div className="flex items-center gap-2 flex-1">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-48" />
            </div>

            {/* Search input skeleton */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-48 rounded-lg" />
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* Segments skeleton */}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: segmentCount }, (_, index) => (
          <TranscriptSegmentSkeleton key={index} />
        ))}
      </div>

      {/* Visually hidden loading text for screen readers */}
      <span className="sr-only">文字起こしを読み込み中...</span>
    </div>
  );
}

export const TranscriptSkeleton = memo(TranscriptSkeletonInner);
