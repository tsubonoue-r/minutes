/**
 * Action Items List Page - Display and manage action items
 * @module app/(dashboard)/action-items/page
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getSession } from '@/lib/auth/get-session';
import { createActionItemService } from '@/services/action-item.service';
import { ActionItemsPageClient } from './_components';
import ActionItemsLoading from './loading';

// ============================================================================
// Metadata
// ============================================================================

/**
 * Page metadata for SEO
 */
export const metadata: Metadata = {
  title: 'Action Items',
  description: 'View and manage your action items from meetings',
};

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Fetch initial data for the page
 */
async function getInitialData(): Promise<{
  data: Awaited<ReturnType<ReturnType<typeof createActionItemService>['getActionItems']>>;
  stats: Awaited<ReturnType<ReturnType<typeof createActionItemService>['getStats']>>;
}> {
  const service = createActionItemService();

  // Fetch initial data with default parameters
  const [data, stats] = await Promise.all([
    service.getActionItems(
      {}, // No filters
      { field: 'dueDate', order: 'asc' }, // Default sort
      { page: 1, pageSize: 20 } // Default pagination
    ),
    service.getStats(),
  ]);

  return { data, stats };
}

// ============================================================================
// Page Component
// ============================================================================

/**
 * Action Items Page (Server Component)
 *
 * @description Server component that:
 * - Checks authentication
 * - Fetches initial data
 * - Passes data to client component for interactivity
 *
 * Features:
 * - Server-side data fetching for fast initial load
 * - Authentication protection
 * - Loading state with Suspense
 */
async function ActionItemsPageContent(): Promise<React.ReactElement> {
  // Authentication check
  const session = await getSession();

  if (session === null || !session.isAuthenticated) {
    redirect('/login');
  }

  // Fetch initial data
  const { data, stats } = await getInitialData();

  return (
    <ActionItemsPageClient
      initialData={data}
      initialStats={stats}
    />
  );
}

/**
 * Action Items Page
 *
 * @description Main page component with Suspense boundary for loading state
 */
export default function ActionItemsPage(): JSX.Element {
  return (
    <Suspense fallback={<ActionItemsLoading />}>
      <ActionItemsPageContent />
    </Suspense>
  );
}
