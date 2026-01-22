'use client';

/**
 * Meeting Detail Skeleton Component
 * Loading placeholder for the meeting detail page
 * @module app/(dashboard)/meetings/[id]/_components/meeting-detail-skeleton
 */

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Header skeleton component
 */
function HeaderSkeleton(): JSX.Element {
  return (
    <div className="card">
      {/* Title and Status */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <Skeleton className="h-7 w-3/4 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Time Information */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div>
              <Skeleton className="h-3 w-16 mb-1" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        ))}
      </div>

      {/* Host Information */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div>
              <Skeleton className="h-3 w-12 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
    </div>
  );
}

/**
 * Participants skeleton component
 */
function ParticipantsSkeleton(): JSX.Element {
  return (
    <div className="card p-0">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-3 px-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-14 hidden sm:block" />
              <Skeleton className="h-4 w-14 hidden sm:block" />
              <Skeleton className="h-4 w-14" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Recordings skeleton component
 */
function RecordingsSkeleton(): JSX.Element {
  return (
    <div className="card p-0">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {Array.from({ length: 2 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-4 px-4"
          >
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Actions skeleton component
 */
function ActionsSkeleton(): JSX.Element {
  return (
    <div className="card">
      <Skeleton className="h-5 w-20 mb-4" />
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="py-2">
          <Skeleton className="h-px w-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Meeting Detail Skeleton Component
 *
 * @description Full page loading skeleton for meeting detail page.
 * Provides visual feedback while data is being fetched.
 *
 * @example
 * ```tsx
 * <MeetingDetailSkeleton />
 * ```
 */
export function MeetingDetailSkeleton(): JSX.Element {
  return (
    <div className="animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Main content */}
        <div className="lg:col-span-2 space-y-6">
          <HeaderSkeleton />
          <ParticipantsSkeleton />
          <RecordingsSkeleton />
        </div>

        {/* Right column - Actions */}
        <div className="lg:col-span-1">
          <ActionsSkeleton />
        </div>
      </div>
    </div>
  );
}
