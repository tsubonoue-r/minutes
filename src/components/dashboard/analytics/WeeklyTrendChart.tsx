'use client';

/**
 * WeeklyTrendChart component - Bar chart showing meetings per day of week
 * @module components/dashboard/analytics/WeeklyTrendChart
 */

import { useMemo } from 'react';
import type { ReadonlyMeetingsByDayOfWeek } from '@/types/analytics';
import { getDayLabel, formatDurationMs } from '@/types/analytics';

/**
 * Props for WeeklyTrendChart component
 */
interface WeeklyTrendChartProps {
  /** Meeting frequency by day of week */
  readonly meetingsByDayOfWeek: readonly ReadonlyMeetingsByDayOfWeek[];
  /** Optional additional className */
  readonly className?: string;
}

/**
 * Bar data for rendering
 */
interface BarData {
  readonly day: number;
  readonly label: string;
  readonly count: number;
  readonly durationMs: number;
  readonly heightPercent: number;
  readonly isWeekend: boolean;
}

/**
 * Build bar data from meetings by day of week
 * Reorders to Monday-first convention for display
 */
function buildBarData(
  meetingsByDayOfWeek: readonly ReadonlyMeetingsByDayOfWeek[]
): readonly BarData[] {
  // Monday-first order
  const displayOrder = [1, 2, 3, 4, 5, 6, 0] as const;

  const maxCount = Math.max(
    ...meetingsByDayOfWeek.map((d) => d.count),
    1
  );

  const dayMap = new Map<number, ReadonlyMeetingsByDayOfWeek>();
  for (const d of meetingsByDayOfWeek) {
    dayMap.set(d.day, d);
  }

  return displayOrder.map((day) => {
    const data = dayMap.get(day);
    const count = data?.count ?? 0;
    const durationMs = data?.totalDurationMs ?? 0;

    return {
      day,
      label: getDayLabel(day),
      count,
      durationMs,
      heightPercent: maxCount > 0 ? (count / maxCount) * 100 : 0,
      isWeekend: day === 0 || day === 6,
    };
  });
}

/**
 * WeeklyTrendChart component
 *
 * Displays a bar chart showing the number of meetings per day of the week.
 * Uses pure CSS for rendering (no chart library).
 * Weekdays are shown in blue, weekends in a lighter shade.
 *
 * @example
 * ```tsx
 * <WeeklyTrendChart
 *   meetingsByDayOfWeek={analytics.meetingsByDayOfWeek}
 * />
 * ```
 */
export function WeeklyTrendChart({
  meetingsByDayOfWeek,
  className = '',
}: WeeklyTrendChartProps): JSX.Element {
  const bars = useMemo(
    () => buildBarData(meetingsByDayOfWeek),
    [meetingsByDayOfWeek]
  );

  const totalMeetings = bars.reduce((sum, bar) => sum + bar.count, 0);
  const busiestDay = bars.reduce((max, bar) =>
    bar.count > max.count ? bar : max
  , bars[0]!);

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            曜日別会議数
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            合計 {totalMeetings}回
          </p>
        </div>
        {busiestDay !== undefined && busiestDay.count > 0 && (
          <div className="text-right">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              最多
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {busiestDay.label}曜日 ({busiestDay.count}回)
            </p>
          </div>
        )}
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-2 h-48 px-2">
        {bars.map((bar) => (
          <div
            key={bar.day}
            className="flex-1 flex flex-col items-center gap-1"
          >
            {/* Value label */}
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {bar.count > 0 ? bar.count : ''}
            </span>

            {/* Bar */}
            <div className="w-full flex-1 flex items-end">
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${
                  bar.isWeekend
                    ? 'bg-slate-200 dark:bg-slate-600'
                    : 'bg-gradient-to-t from-blue-600 to-blue-400 dark:from-blue-500 dark:to-blue-300'
                }`}
                style={{
                  height: `${Math.max(bar.heightPercent, bar.count > 0 ? 4 : 0)}%`,
                  minHeight: bar.count > 0 ? '4px' : '0px',
                }}
                title={`${bar.label}曜日: ${bar.count}回 (${formatDurationMs(bar.durationMs)})`}
              />
            </div>

            {/* Day label */}
            <span
              className={`text-xs font-medium ${
                bar.isWeekend
                  ? 'text-slate-400 dark:text-slate-500'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {bar.label}
            </span>
          </div>
        ))}
      </div>

      {/* Duration summary per day */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
          {bars
            .filter((bar) => bar.count > 0)
            .map((bar) => (
              <span
                key={bar.day}
                className="text-xs text-slate-400 dark:text-slate-500"
              >
                {bar.label}: {formatDurationMs(bar.durationMs)}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
