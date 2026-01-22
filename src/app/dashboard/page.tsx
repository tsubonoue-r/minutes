/**
 * Dashboard Page - Authenticated user dashboard
 * @module app/dashboard/page
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/get-session';
import { LogoutButton } from '@/components/auth/logout-button';

/**
 * Page metadata
 */
export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your Minutes dashboard',
};

/**
 * User avatar component
 */
function UserAvatar({
  user,
}: {
  readonly user: { readonly name: string; readonly avatarUrl: string };
}): React.ReactElement {
  return (
    <div className="relative">
      {user.avatarUrl !== '' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt={user.name}
          className="avatar-lg object-cover"
        />
      ) : (
        <div className="avatar-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <span className="text-blue-600 dark:text-blue-300 font-semibold text-lg">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full" />
    </div>
  );
}

/**
 * Stats card component
 */
function StatsCard({
  title,
  value,
  icon,
  description,
}: {
  readonly title: string;
  readonly value: string | number;
  readonly icon: string;
  readonly description: string;
}): React.ReactElement {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {value}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {description}
          </p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

/**
 * Quick action card component
 */
function QuickAction({
  title,
  description,
  icon,
  href,
}: {
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly href: string;
}): React.ReactElement {
  return (
    <a
      href={href}
      className="card hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-4">
        <span className="text-3xl group-hover:scale-110 transition-transform">
          {icon}
        </span>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </a>
  );
}

/**
 * Dashboard Page Component
 *
 * Protected page showing user's dashboard with meeting minutes overview.
 */
export default async function DashboardPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();

  if (user === null) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="container-app flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <a href="/dashboard">
              <span className="text-xl font-bold text-gradient">Minutes</span>
            </a>
            <nav className="hidden md:flex items-center gap-4">
              <a
                href="/dashboard"
                className="text-sm font-medium text-slate-900 dark:text-white"
              >
                Dashboard
              </a>
              <a
                href="/minutes"
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Minutes
              </a>
              <a
                href="/settings"
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Settings
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3">
              <UserAvatar user={user} />
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

      {/* Main content */}
      <div className="container-app py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back, {user.name.split(' ')[0]}!
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Here is an overview of your meeting notes.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Minutes"
            value={0}
            icon="📝"
            description="Meeting notes stored"
          />
          <StatsCard
            title="This Week"
            value={0}
            icon="📅"
            description="New minutes created"
          />
          <StatsCard
            title="Shared"
            value={0}
            icon="👥"
            description="Minutes shared with others"
          />
        </div>

        {/* Quick actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickAction
              title="View Minutes"
              description="Browse all your meeting notes"
              icon="📋"
              href="/minutes"
            />
            <QuickAction
              title="Sync with Lark"
              description="Fetch latest meeting data"
              icon="🔄"
              href="/dashboard/sync"
            />
            <QuickAction
              title="Settings"
              description="Manage your preferences"
              icon="⚙️"
              href="/settings"
            />
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          <div className="card">
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">📭</span>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No recent activity
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                Start by syncing your Lark meetings to see your minutes here.
              </p>
              <a
                href="/dashboard/sync"
                className="btn-primary inline-flex"
              >
                Sync with Lark
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
