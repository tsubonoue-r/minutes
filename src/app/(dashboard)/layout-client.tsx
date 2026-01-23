'use client';

/**
 * DashboardLayoutClient - Client-side layout with responsive navigation
 * @module app/(dashboard)/layout-client
 */

import { useCallback } from 'react';
import { Header } from '@/components/layout/header';

/**
 * User information passed from server component
 */
interface UserInfo {
  readonly name: string;
  readonly email?: string | undefined;
  readonly avatarUrl?: string | undefined;
}

/**
 * DashboardLayoutClient props
 */
interface DashboardLayoutClientProps {
  readonly user: UserInfo;
  readonly children: React.ReactNode;
}

/**
 * DashboardLayoutClient Component
 *
 * @description Client-side wrapper for the dashboard layout that provides
 * responsive mobile navigation through the Header component. The Header
 * includes a hamburger menu for mobile and full nav links for desktop.
 */
export function DashboardLayoutClient({
  user,
  children,
}: DashboardLayoutClientProps): JSX.Element {
  // Get current path from window.location (client-side only)
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  const handleLogout = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        window.location.href = '/login';
      }
    } catch {
      // Fallback: redirect to login
      window.location.href = '/login';
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Responsive Header with Mobile Nav */}
      <Header
        user={user}
        currentPath={currentPath}
        onLogout={handleLogout}
      />

      {/* Main Content - responsive padding */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}
