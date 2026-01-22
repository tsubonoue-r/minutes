/**
 * Action Items Page Loading State
 * @module app/(dashboard)/action-items/loading
 */

import { ActionItemListSkeleton } from '@/components/action-items';

/**
 * Stats skeleton component
 */
function StatsSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg p-4 bg-gray-50 animate-pulse"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="h-3 w-12 bg-gray-200 rounded" />
            <div className="h-5 w-5 bg-gray-200 rounded" />
          </div>
          <div className="h-8 w-8 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * Toolbar skeleton component
 */
function ToolbarSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4 p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex flex-wrap items-center gap-4">
        {/* Filter dropdowns */}
        <div className="flex-1 flex flex-wrap gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-10 w-32 bg-gray-200 rounded animate-pulse"
            />
          ))}
        </div>
        {/* Sort and search */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/**
 * Loading component for action items page
 *
 * @description Displays skeleton loaders while the page is loading
 */
export default function ActionItemsLoading(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Page Header skeleton */}
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-72 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Stats skeleton */}
      <StatsSkeleton />

      {/* Toolbar skeleton */}
      <ToolbarSkeleton />

      {/* Action items list skeleton */}
      <ActionItemListSkeleton count={5} />

      {/* Pagination skeleton */}
      <div className="flex justify-center pt-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-10 w-10 bg-gray-200 rounded animate-pulse"
              />
            ))}
          </div>
          <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
