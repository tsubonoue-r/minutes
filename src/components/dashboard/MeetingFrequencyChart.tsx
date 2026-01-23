'use client';

/**
 * MeetingFrequencyChart component - Simple bar chart for meeting frequency
 * @module components/dashboard/MeetingFrequencyChart
 */

import type { MeetingFrequency } from '@/types/dashboard';

/**
 * Props for MeetingFrequencyChart component
 */
interface MeetingFrequencyChartProps {
  /** Frequency data */
  readonly data: MeetingFrequency;
  /** Chart height in pixels */
  readonly height?: number;
  /** Optional additional className */
  readonly className?: string;
}

/**
 * MeetingFrequencyChart component
 *
 * Displays a simple bar chart showing meeting frequency over time.
 * Uses pure CSS/HTML for rendering (no external chart library required).
 *
 * @example
 * ```tsx
 * <MeetingFrequencyChart
 *   data={{ data: [...], interval: 'day' }}
 *   height={200}
 * />
 * ```
 */
export function MeetingFrequencyChart({
  data,
  height = 200,
  className = '',
}: MeetingFrequencyChartProps): JSX.Element {
  const maxCount = Math.max(...data.data.map((d) => d.count), 1);

  // Determine how many labels to show based on data length
  const showEveryNth = data.data.length > 14 ? 7 : data.data.length > 7 ? 2 : 1;

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 ${className}`}
    >
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        会議頻度
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        {data.interval === 'day' ? '日' : data.interval === 'week' ? '週' : '月'}ごとの会議数
      </p>

      {/* Chart container */}
      <div className="relative" style={{ height: `${height}px` }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-xs text-slate-400">
          <span>{maxCount}</span>
          <span>{Math.round(maxCount / 2)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="ml-10 h-full flex items-end gap-1 pb-6">
          {data.data.map((point, index) => {
            const heightPercent = (point.count / maxCount) * 100;
            const showLabel = index % showEveryNth === 0;

            return (
              <div
                key={point.date}
                className="flex-1 flex flex-col items-center min-w-0"
              >
                {/* Bar */}
                <div
                  className="w-full relative group"
                  style={{ height: `${height - 40}px` }}
                >
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-8 bg-blue-500 dark:bg-blue-600 rounded-t transition-all hover:bg-blue-600 dark:hover:bg-blue-500"
                    style={{ height: `${heightPercent}%`, minHeight: point.count > 0 ? '4px' : '0' }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-slate-900 dark:bg-slate-700 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                        <div className="font-medium">{point.count}件の会議</div>
                        <div className="text-slate-300">合計{point.totalDurationMinutes}分</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* X-axis label */}
                <span
                  className={`
                    text-xs text-slate-400 mt-1 truncate w-full text-center
                    ${showLabel ? '' : 'invisible'}
                  `}
                  title={point.date}
                >
                  {data.interval === 'day'
                    ? point.date.split('-').slice(1).join('/')
                    : data.interval === 'week'
                    ? point.date.replace('Week of ', '').split('-').slice(1).join('/')
                    : point.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span>会議</span>
        </div>
      </div>
    </div>
  );
}
