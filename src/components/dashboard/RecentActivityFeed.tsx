'use client';

/**
 * RecentActivityFeed component - Activity timeline display
 * @module components/dashboard/RecentActivityFeed
 */

import type { RecentActivity } from '@/types/dashboard';

/**
 * Props for RecentActivityFeed component
 */
interface RecentActivityFeedProps {
  /** Activity items */
  readonly activities: readonly RecentActivity[];
  /** Maximum items to show */
  readonly maxItems?: number;
  /** Optional additional className */
  readonly className?: string;
}

/**
 * Get icon for activity type
 */
function getActivityIcon(type: RecentActivity['type']): JSX.Element {
  switch (type) {
    case 'meeting':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'minutes':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'action_item':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clipRule="evenodd"
          />
        </svg>
      );
  }
}

/**
 * Get color classes for activity type
 */
function getActivityColor(
  type: RecentActivity['type']
): { bg: string; text: string } {
  switch (type) {
    case 'meeting':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-600 dark:text-blue-400',
      };
    case 'minutes':
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-600 dark:text-green-400',
      };
    case 'action_item':
      return {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-600 dark:text-purple-400',
      };
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * RecentActivityFeed component
 *
 * Displays a timeline of recent activities (meetings, minutes, action items).
 *
 * @example
 * ```tsx
 * <RecentActivityFeed
 *   activities={[...]}
 *   maxItems={10}
 * />
 * ```
 */
export function RecentActivityFeed({
  activities,
  maxItems = 10,
  className = '',
}: RecentActivityFeedProps): JSX.Element {
  const displayedActivities = activities.slice(0, maxItems);

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 ${className}`}
    >
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Recent Activity
      </h3>

      {displayedActivities.length > 0 ? (
        <div className="space-y-4">
          {displayedActivities.map((activity, index) => {
            const colors = getActivityColor(activity.type);
            const icon = getActivityIcon(activity.type);
            const isLast = index === displayedActivities.length - 1;

            return (
              <div key={activity.id} className="relative flex gap-4">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-5 top-10 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                )}

                {/* Icon */}
                <div
                  className={`
                    flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                    ${colors.bg} ${colors.text}
                  `}
                >
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {activity.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {activity.description}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-slate-400 dark:text-slate-500">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>

                  {/* User info if available */}
                  {activity.user !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-xs">
                        {activity.user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {activity.user.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-6 h-6 text-slate-400"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No recent activity
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Start by syncing your meetings
          </p>
        </div>
      )}
    </div>
  );
}
