/**
 * Meetings List Page - Display and filter meetings
 * @module app/(dashboard)/meetings/page
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MeetingsPageContent } from './meetings-content';
import { TableSkeleton } from '@/components/ui';

/**
 * Page metadata
 */
export const metadata: Metadata = {
  title: 'Meetings',
  description: 'View and manage your meetings',
};

/**
 * Loading fallback component
 */
function MeetingsLoadingFallback(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-72 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse" />
        <div className="w-64 h-10 bg-gray-200 rounded animate-pulse" />
        <div className="w-48 h-10 bg-gray-200 rounded animate-pulse" />
        <div className="w-56 h-10 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-lg border border-lark-border">
        <TableSkeleton rows={10} columns={8} />
      </div>
    </div>
  );
}

/**
 * Meetings Page Component
 *
 * Server component that renders the meetings list page.
 * The actual content is wrapped in Suspense for loading states.
 */
export default function MeetingsPage(): JSX.Element {
  return (
    <div>
      <Suspense fallback={<MeetingsLoadingFallback />}>
        <MeetingsPageContent />
      </Suspense>
    </div>
  );
}
