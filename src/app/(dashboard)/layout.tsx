/**
 * Dashboard Layout - Authenticated layout with header and navigation
 * @module app/(dashboard)/layout
 */

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-session';
import { DashboardLayoutClient } from './layout-client';

/**
 * Dashboard layout props
 */
interface DashboardLayoutProps {
  readonly children: React.ReactNode;
}

/**
 * Dashboard Layout Component
 *
 * Provides authenticated layout with header, navigation, and user info.
 * Redirects to login if not authenticated.
 * Uses a client component for responsive mobile navigation.
 */
export default async function DashboardLayout({
  children,
}: DashboardLayoutProps): Promise<React.ReactElement> {
  const user = await getCurrentUser();

  if (user === null) {
    redirect('/login');
  }

  return (
    <DashboardLayoutClient
      user={{
        name: user.name,
        email: user.email ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
      }}
    >
      {children}
    </DashboardLayoutClient>
  );
}
