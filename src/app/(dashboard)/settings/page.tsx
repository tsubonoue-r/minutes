/**
 * Settings Page - User settings and preferences
 * @module app/(dashboard)/settings/page
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-session';
import { SettingsPageClient } from './_components';

// ============================================================================
// Metadata
// ============================================================================

/**
 * Page metadata for SEO
 */
export const metadata: Metadata = {
  title: '設定',
  description: 'アプリケーションの設定を管理します',
};

// ============================================================================
// Page Component
// ============================================================================

/**
 * Settings Page (Server Component)
 *
 * @description Server component that:
 * - Checks authentication
 * - Passes authenticated user to client component
 *
 * The client component handles settings loading, display, and updates
 * via the useSettings hook and settings API.
 */
export default async function SettingsPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();

  if (user === null) {
    redirect('/login');
  }

  return <SettingsPageClient user={user} />;
}
