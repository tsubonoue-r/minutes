'use client';

/**
 * ActionItemProgressChart component - Donut chart for action item status
 * @module components/dashboard/ActionItemProgressChart
 */

import type { DashboardActionItemStats } from '@/types/dashboard';

/**
 * Props for ActionItemProgressChart component
 */
interface ActionItemProgressChartProps {
  /** Action item statistics */
  readonly stats: DashboardActionItemStats;
  /** Optional additional className */
  readonly className?: string;
}

/**
 * Status segment configuration
 */
interface StatusSegment {
  readonly key: keyof Pick<
    DashboardActionItemStats,
    'completed' | 'inProgress' | 'pending' | 'overdue'
  >;
  readonly label: string;
  readonly color: string;
  readonly bgClass: string;
}

const STATUS_SEGMENTS: readonly StatusSegment[] = [
  { key: 'completed', label: '完了', color: '#22c55e', bgClass: 'bg-green-500' },
  { key: 'inProgress', label: '進行中', color: '#3b82f6', bgClass: 'bg-blue-500' },
  { key: 'pending', label: '未着手', color: '#94a3b8', bgClass: 'bg-slate-400' },
  { key: 'overdue', label: '期限切れ', color: '#ef4444', bgClass: 'bg-red-500' },
];

/**
 * ActionItemProgressChart component
 *
 * Displays a donut chart showing action item status distribution
 * with a completion rate in the center.
 *
 * @example
 * ```tsx
 * <ActionItemProgressChart
 *   stats={{
 *     total: 100,
 *     completed: 60,
 *     inProgress: 20,
 *     pending: 15,
 *     overdue: 5,
 *     completionRate: 60,
 *     avgCompletionDays: 3.5,
 *   }}
 * />
 * ```
 */
export function ActionItemProgressChart({
  stats,
  className = '',
}: ActionItemProgressChartProps): JSX.Element {
  const total = stats.total || 1; // Prevent division by zero

  // Calculate SVG arc paths for each segment
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  const segments = STATUS_SEGMENTS.map((segment) => {
    const value = stats[segment.key];
    const percentage = (value / total) * 100;
    const strokeLength = (percentage / 100) * circumference;
    const offset = currentOffset;
    currentOffset += strokeLength;

    return {
      ...segment,
      value,
      percentage,
      strokeLength,
      offset,
    };
  }).filter((s) => s.value > 0);

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 ${className}`}
    >
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        アクションアイテム進捗
      </h3>

      <div className="flex items-center gap-8">
        {/* Donut Chart */}
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full -rotate-90"
          >
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-slate-100 dark:text-slate-700"
            />

            {/* Segments */}
            {segments.map((segment) => (
              <circle
                key={segment.key}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="10"
                strokeDasharray={`${segment.strokeLength} ${circumference}`}
                strokeDashoffset={-segment.offset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            ))}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.completionRate}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              完了
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {STATUS_SEGMENTS.map((segment) => {
            const value = stats[segment.key];
            const percentage = stats.total > 0 ? Math.round((value / stats.total) * 100) : 0;

            return (
              <div key={segment.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${segment.bgClass}`} />
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {segment.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {value}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 w-10 text-right">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional stats */}
      {stats.avgCompletionDays !== null && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              平均完了時間
            </span>
            <span className="font-medium text-slate-900 dark:text-white">
              {stats.avgCompletionDays.toFixed(1)}日
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
