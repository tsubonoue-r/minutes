'use client';

/**
 * AnalyticsOverview component - Summary cards for meeting analytics
 * @module components/dashboard/analytics/AnalyticsOverview
 */

import type { ReadonlyMeetingAnalytics } from '@/types/analytics';
import { formatDurationMs, formatCurrency } from '@/types/analytics';

/**
 * Props for AnalyticsOverview component
 */
interface AnalyticsOverviewProps {
  /** Analytics data to display */
  readonly analytics: ReadonlyMeetingAnalytics;
  /** Optional additional className */
  readonly className?: string;
}

/**
 * Configuration for a single stat card
 */
interface StatCardConfig {
  readonly title: string;
  readonly value: string;
  readonly subtitle: string;
  readonly iconPath: string;
  readonly iconColor: string;
  readonly iconBg: string;
}

/**
 * Build stat card configurations from analytics data
 */
function buildStatCards(analytics: ReadonlyMeetingAnalytics): readonly StatCardConfig[] {
  return [
    {
      title: '会議回数',
      value: String(analytics.totalMeetings),
      subtitle: `平均${formatDurationMs(analytics.averageDurationMs)} / 回`,
      iconPath:
        'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      title: '合計時間',
      value: formatDurationMs(analytics.totalDurationMs),
      subtitle: `参加者合計 ${analytics.totalParticipants}名`,
      iconPath:
        'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-900/30',
    },
    {
      title: '効率スコア',
      value: `${analytics.efficiencyScore}`,
      subtitle: `決定事項 ${analytics.totalDecisions}件`,
      iconPath:
        'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-900/30',
    },
    {
      title: '会議コスト',
      value: formatCurrency(
        analytics.costEstimate.totalCost,
        analytics.costEstimate.currency
      ),
      subtitle: `${analytics.costEstimate.totalHours}時間 x ${formatCurrency(analytics.costEstimate.hourlyRate, analytics.costEstimate.currency)}/h`,
      iconPath:
        'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
    },
  ] as const;
}

/**
 * AnalyticsOverview component
 *
 * Displays a grid of summary statistic cards including total meetings,
 * duration, efficiency score, and cost estimate.
 *
 * @example
 * ```tsx
 * <AnalyticsOverview analytics={analyticsData} />
 * ```
 */
export function AnalyticsOverview({
  analytics,
  className = '',
}: AnalyticsOverviewProps): JSX.Element {
  const statCards = buildStatCards(analytics);

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}
    >
      {statCards.map((card) => (
        <div
          key={card.title}
          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 transition-all hover:shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {card.title}
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white truncate">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {card.subtitle}
              </p>
            </div>
            <div
              className={`flex-shrink-0 p-3 rounded-lg ${card.iconBg}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={`w-6 h-6 ${card.iconColor}`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={card.iconPath}
                />
              </svg>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
