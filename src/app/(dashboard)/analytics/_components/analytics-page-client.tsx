'use client';

/**
 * AnalyticsPageClient component - Client-side analytics dashboard
 * @module app/(dashboard)/analytics/_components/analytics-page-client
 */

import { useCallback } from 'react';
import { useAnalytics } from '@/hooks/use-analytics';
import type { AnalyticsPeriod } from '@/types/analytics';
import {
  AnalyticsOverview,
  MeetingCostCard,
  EfficiencyScoreCard,
  MeetingHeatmap,
  WeeklyTrendChart,
} from '@/components/dashboard/analytics';

// ============================================================================
// Period Selector
// ============================================================================

/**
 * Period selector configuration
 */
const PERIOD_OPTIONS: ReadonlyArray<{
  readonly value: AnalyticsPeriod;
  readonly label: string;
}> = [
  { value: 'week', label: '1週間' },
  { value: 'month', label: '1ヶ月' },
  { value: 'quarter', label: '3ヶ月' },
];

/**
 * Props for PeriodSelector component
 */
interface PeriodSelectorProps {
  /** Currently selected period */
  readonly selectedPeriod: AnalyticsPeriod;
  /** Callback when period changes */
  readonly onPeriodChange: (period: AnalyticsPeriod) => void;
}

/**
 * Period selector buttons
 */
function PeriodSelector({
  selectedPeriod,
  onPeriodChange,
}: PeriodSelectorProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={(): void => onPeriodChange(option.value)}
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
  );
}

// ============================================================================
// Loading State
// ============================================================================

/**
 * Loading skeleton for analytics page
 */
function AnalyticsLoadingSkeleton(): JSX.Element {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Overview cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6"
          >
            <div className="h-4 w-20 skeleton rounded mb-3" />
            <div className="h-8 w-24 skeleton rounded mb-2" />
            <div className="h-3 w-32 skeleton rounded" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 h-80">
          <div className="h-5 w-32 skeleton rounded mb-4" />
          <div className="h-full skeleton rounded" />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 h-80">
          <div className="h-5 w-32 skeleton rounded mb-4" />
          <div className="h-full skeleton rounded" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Error State
// ============================================================================

/**
 * Props for ErrorDisplay component
 */
interface ErrorDisplayProps {
  /** Error to display */
  readonly error: Error;
  /** Retry callback */
  readonly onRetry: () => void;
}

/**
 * Error display component
 */
function ErrorDisplay({ error, onRetry }: ErrorDisplayProps): JSX.Element {
  return (
    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-12 h-12 text-red-400 mx-auto mb-3"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
      <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-1">
        データの取得に失敗しました
      </h3>
      <p className="text-sm text-red-600 dark:text-red-400 mb-4">
        {error.message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="btn-primary"
      >
        再試行
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AnalyticsPageClient component
 *
 * Client-side analytics dashboard with period selector and analytics widgets.
 * Uses the useAnalytics hook to fetch data from the analytics API.
 *
 * @example
 * ```tsx
 * <AnalyticsPageClient />
 * ```
 */
export function AnalyticsPageClient(): JSX.Element {
  const { analytics, isLoading, error, period, setPeriod, refetch } =
    useAnalytics('month');

  const handleRetry = useCallback((): void => {
    void refetch();
  }, [refetch]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            会議分析ダッシュボード
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            会議の効率性とコストを可視化します
          </p>
        </div>
        <PeriodSelector
          selectedPeriod={period}
          onPeriodChange={setPeriod}
        />
      </div>

      {/* Loading State */}
      {isLoading && <AnalyticsLoadingSkeleton />}

      {/* Error State */}
      {error !== null && !isLoading && (
        <ErrorDisplay error={error} onRetry={handleRetry} />
      )}

      {/* Analytics Content */}
      {analytics !== null && !isLoading && error === null && (
        <>
          {/* Overview Cards */}
          <AnalyticsOverview analytics={analytics} />

          {/* Charts Row 1: Efficiency + Cost */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <EfficiencyScoreCard analytics={analytics} />
            <MeetingCostCard analytics={analytics} />
          </div>

          {/* Charts Row 2: Weekly Trend + Heatmap */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <WeeklyTrendChart
              meetingsByDayOfWeek={analytics.meetingsByDayOfWeek}
            />
            <MeetingHeatmap
              meetingsByDayOfWeek={analytics.meetingsByDayOfWeek}
              meetingsByHour={analytics.meetingsByHour}
            />
          </div>
        </>
      )}

      {/* Empty State */}
      {analytics !== null &&
        analytics.totalMeetings === 0 &&
        !isLoading &&
        error === null && (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-1">
              分析データがありません
            </h3>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              選択した期間に会議データが見つかりませんでした。期間を変更してお試しください。
            </p>
          </div>
        )}
    </div>
  );
}
