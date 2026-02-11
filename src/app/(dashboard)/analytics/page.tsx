/**
 * Analytics Page - Meeting efficiency and cost analytics dashboard
 * @module app/(dashboard)/analytics/page
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getSession } from '@/lib/auth/get-session';
import { AnalyticsPageClient } from './_components';

// ============================================================================
// Metadata
// ============================================================================

/**
 * Page metadata for SEO
 */
export const metadata: Metadata = {
  title: '会議分析 | Minutes',
  description: '会議の効率性分析とコスト可視化ダッシュボード',
};

// ============================================================================
// Loading Component
// ============================================================================

/**
 * Loading fallback for the analytics page
 */
function AnalyticsLoading(): JSX.Element {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-48 skeleton rounded" />
          <div className="h-4 w-64 skeleton rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-16 skeleton rounded-lg" />
          <div className="h-8 w-16 skeleton rounded-lg" />
          <div className="h-8 w-16 skeleton rounded-lg" />
        </div>
      </div>

      {/* Overview cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6"
          >
            <div className="h-4 w-20 skeleton rounded mb-3" />
            <div className="h-8 w-24 skeleton rounded mb-2" />
            <div className="h-3 w-32 skeleton rounded" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 h-80"
          >
            <div className="h-5 w-32 skeleton rounded mb-2" />
            <div className="h-3 w-48 skeleton rounded mb-6" />
            <div className="h-44 skeleton rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Page Component
// ============================================================================

/**
 * Analytics page content (server component)
 *
 * Checks authentication and renders the client-side analytics dashboard.
 */
async function AnalyticsPageContent(): Promise<React.ReactElement> {
  // Authentication check
  const session = await getSession();

  if (session === null || !session.isAuthenticated) {
    redirect('/login');
  }

  return <AnalyticsPageClient />;
}

/**
 * Analytics Page
 *
 * Server component entry point for the analytics dashboard.
 * Uses Suspense for streaming and loading state.
 *
 * Features:
 * - Authentication protection
 * - Period-based filtering (week/month/quarter)
 * - Meeting efficiency score visualization
 * - Cost breakdown and analysis
 * - Meeting frequency heatmap
 * - Weekly trend bar chart
 */
export default function AnalyticsPage(): JSX.Element {
  return (
    <Suspense fallback={<AnalyticsLoading />}>
      <AnalyticsPageContent />
    </Suspense>
  );
}
