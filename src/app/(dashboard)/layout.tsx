/**
 * Dashboard Layout - Authenticated layout with header and navigation
 * @module app/(dashboard)/layout
 */

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-session';
import { LogoutButton } from '@/components/auth/logout-button';
import { Avatar } from '@/components/ui';

/**
 * Dashboard layout props
 */
interface DashboardLayoutProps {
  readonly children: React.ReactNode;
}

/**
 * Navigation links configuration
 */
const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/meetings', label: 'Meetings' },
  { href: '/action-items', label: 'Action Items' },
  { href: '/settings', label: 'Settings' },
] as const;

/**
 * Dashboard Layout Component
 *
 * Provides authenticated layout with header, navigation, and user info.
 * Redirects to login if not authenticated.
 */
export default async function DashboardLayout({
  children,
}: DashboardLayoutProps): Promise<React.ReactElement> {
  const user = await getCurrentUser();

  if (user === null) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-6">
            <a href="/dashboard" className="flex items-center">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Minutes
              </span>
            </a>
            <nav
              className="hidden md:flex items-center gap-4"
              aria-label="Main navigation"
            >
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* User Info and Logout */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3">
              <Avatar
                src={user.avatarUrl}
                name={user.name}
                size="sm"
              />
              <div className="text-sm">
                <p className="font-medium text-slate-900 dark:text-white">
                  {user.name}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  {user.email ?? 'No email'}
                </p>
              </div>
            </div>
            <LogoutButton variant="ghost" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
