'use client';

/**
 * PeriodFilter component - Dashboard period selector
 * @module components/dashboard/PeriodFilter
 */

import { useCallback } from 'react';
import type { DashboardPeriod } from '@/types/dashboard';

/**
 * Props for PeriodFilter component
 */
interface PeriodFilterProps {
  /** Currently selected period */
  readonly selectedPeriod: DashboardPeriod;
  /** Custom start date (for custom period) */
  readonly startDate?: string;
  /** Custom end date (for custom period) */
  readonly endDate?: string;
  /** Callback when period changes */
  readonly onPeriodChange: (period: DashboardPeriod) => void;
  /** Callback when custom dates change */
  readonly onDateRangeChange?: (startDate: string, endDate: string) => void;
  /** Optional additional className */
  readonly className?: string;
}

/**
 * Period options configuration
 */
const PERIOD_OPTIONS: ReadonlyArray<{
  readonly value: DashboardPeriod;
  readonly label: string;
}> = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '今週' },
  { value: 'month', label: '今月' },
  { value: 'quarter', label: '四半期' },
  { value: 'year', label: '年間' },
  { value: 'custom', label: 'カスタム' },
];

/**
 * PeriodFilter component
 *
 * Provides period selection buttons and optional custom date range picker.
 *
 * @example
 * ```tsx
 * <PeriodFilter
 *   selectedPeriod="month"
 *   onPeriodChange={(period) => setPeriod(period)}
 *   onDateRangeChange={(start, end) => setDateRange(start, end)}
 * />
 * ```
 */
export function PeriodFilter({
  selectedPeriod,
  startDate,
  endDate,
  onPeriodChange,
  onDateRangeChange,
  className = '',
}: PeriodFilterProps): JSX.Element {
  const handlePeriodClick = useCallback(
    (period: DashboardPeriod) => {
      onPeriodChange(period);
    },
    [onPeriodChange]
  );

  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onDateRangeChange !== undefined && endDate !== undefined) {
        onDateRangeChange(e.target.value, endDate);
      }
    },
    [onDateRangeChange, endDate]
  );

  const handleEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onDateRangeChange !== undefined && startDate !== undefined) {
        onDateRangeChange(startDate, e.target.value);
      }
    },
    [onDateRangeChange, startDate]
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Period buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={(): void => handlePeriodClick(option.value)}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-lg transition-all
              ${
                selectedPeriod === option.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Custom date range picker */}
      {selectedPeriod === 'custom' && onDateRangeChange !== undefined && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="flex items-center gap-2">
            <label
              htmlFor="start-date"
              className="text-sm text-slate-600 dark:text-slate-400"
            >
              開始
            </label>
            <input
              type="date"
              id="start-date"
              value={startDate ?? ''}
              onChange={handleStartDateChange}
              className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="end-date"
              className="text-sm text-slate-600 dark:text-slate-400"
            >
              終了
            </label>
            <input
              type="date"
              id="end-date"
              value={endDate ?? ''}
              onChange={handleEndDateChange}
              className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}
    </div>
  );
}
