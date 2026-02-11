'use client';

/**
 * MeetingCostCard component - Cost breakdown visualization
 * @module components/dashboard/analytics/MeetingCostCard
 */

import type { ReadonlyMeetingAnalytics } from '@/types/analytics';
import { formatCurrency, formatDurationMs } from '@/types/analytics';

/**
 * Props for MeetingCostCard component
 */
interface MeetingCostCardProps {
  /** Analytics data containing cost information */
  readonly analytics: ReadonlyMeetingAnalytics;
  /** Optional additional className */
  readonly className?: string;
}

/**
 * Cost breakdown line item
 */
interface CostLineItem {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly percentage: number;
}

/**
 * Build cost line items from analytics data
 */
function buildCostLineItems(
  analytics: ReadonlyMeetingAnalytics
): readonly CostLineItem[] {
  const { costEstimate, totalMeetings, averageParticipants, averageDurationMs } =
    analytics;

  const avgCostPerMeeting =
    totalMeetings > 0
      ? Math.round(costEstimate.totalCost / totalMeetings)
      : 0;
  const avgCostPerHour =
    costEstimate.totalHours > 0
      ? Math.round(costEstimate.totalCost / costEstimate.totalHours)
      : 0;

  return [
    {
      label: '合計コスト',
      value: formatCurrency(costEstimate.totalCost, costEstimate.currency),
      detail: `${costEstimate.totalHours}人時`,
      percentage: 100,
    },
    {
      label: '1会議あたり',
      value: formatCurrency(avgCostPerMeeting, costEstimate.currency),
      detail: `${averageParticipants}名 x ${formatDurationMs(averageDurationMs)}`,
      percentage: totalMeetings > 0 ? Math.round(100 / totalMeetings) : 0,
    },
    {
      label: '1時間あたり',
      value: formatCurrency(avgCostPerHour, costEstimate.currency),
      detail: `時給 ${formatCurrency(costEstimate.hourlyRate, costEstimate.currency)} x 平均${averageParticipants}名`,
      percentage:
        costEstimate.totalHours > 0
          ? Math.min(100, Math.round((1 / costEstimate.totalHours) * 100))
          : 0,
    },
  ];
}

/**
 * MeetingCostCard component
 *
 * Displays a cost breakdown card showing total meeting costs
 * with a visual bar chart of cost components.
 *
 * Cost formula: Participants x Duration (hours) x Hourly Rate
 *
 * @example
 * ```tsx
 * <MeetingCostCard analytics={analyticsData} />
 * ```
 */
export function MeetingCostCard({
  analytics,
  className = '',
}: MeetingCostCardProps): JSX.Element {
  const lineItems = buildCostLineItems(analytics);
  const { costEstimate } = analytics;

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            会議コスト分析
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            参加者数 x 時間 x 時給で算出
          </p>
        </div>
        <div className="flex-shrink-0 p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
            />
          </svg>
        </div>
      </div>

      {/* Total cost highlight */}
      <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
        <p className="text-sm text-slate-500 dark:text-slate-400">合計コスト</p>
        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
          {formatCurrency(costEstimate.totalCost, costEstimate.currency)}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {analytics.totalMeetings}回の会議 / {costEstimate.totalHours}人時
        </p>
      </div>

      {/* Cost breakdown */}
      <div className="space-y-4">
        {lineItems.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {item.label}
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {item.value}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, item.percentage)}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 min-w-0 truncate">
                {item.detail}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Cost formula */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
          計算式: 参加者数 x 会議時間(h) x 時給(
          {formatCurrency(costEstimate.hourlyRate, costEstimate.currency)})
        </p>
      </div>
    </div>
  );
}
