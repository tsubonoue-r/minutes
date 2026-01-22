'use client';

/**
 * Dashboard Page - Statistics and analytics dashboard
 * @module app/(dashboard)/dashboard/page
 */

import { useState, useEffect, useCallback } from 'react';
import type { DashboardStats, DashboardPeriod } from '@/types/dashboard';
import {
  StatsCard,
  MeetingFrequencyChart,
  ActionItemProgressChart,
  ParticipantLeaderboard,
  RecentActivityFeed,
  PeriodFilter,
} from '@/components/dashboard';

/**
 * Loading skeleton for stats cards
 */
function StatsCardSkeleton(): JSX.Element {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="mt-2 h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="mt-1 h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Loading skeleton for charts
 */
function ChartSkeleton({ height = 200 }: { readonly height?: number }): JSX.Element {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
      <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
      <div
        className="bg-slate-200 dark:bg-slate-700 rounded"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}

/**
 * Error display component
 */
function ErrorDisplay({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}): JSX.Element {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-6 h-6 text-red-600 dark:text-red-400"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <p className="text-red-800 dark:text-red-200 font-medium mb-2">
        Failed to load dashboard
      </p>
      <p className="text-red-600 dark:text-red-400 text-sm mb-4">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

/**
 * Meeting icon component
 */
function MeetingIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-6 h-6"
    >
      <path d="M5.25 12a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H6a.75.75 0 01-.75-.75V12zM6 13.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V14a.75.75 0 00-.75-.75H6zM7.25 12a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H8a.75.75 0 01-.75-.75V12zM8 13.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V14a.75.75 0 00-.75-.75H8zM9.25 10a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H10a.75.75 0 01-.75-.75V10zM10 11.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V12a.75.75 0 00-.75-.75H10zM9.25 14a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H10a.75.75 0 01-.75-.75V14zM12 9.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V10a.75.75 0 00-.75-.75H12zM11.25 12a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H12a.75.75 0 01-.75-.75V12zM12 13.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V14a.75.75 0 00-.75-.75H12zM13.25 10a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H14a.75.75 0 01-.75-.75V10zM14 11.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V12a.75.75 0 00-.75-.75H14z" />
      <path
        fillRule="evenodd"
        d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Minutes icon component
 */
function MinutesIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-6 h-6"
    >
      <path
        fillRule="evenodd"
        d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Action items icon component
 */
function ActionItemsIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-6 h-6"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Participants icon component
 */
function ParticipantsIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-6 h-6"
    >
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
    </svg>
  );
}

/**
 * Dashboard Page Component
 *
 * Displays comprehensive statistics including:
 * - Meeting statistics with trend indicators
 * - Minutes generation statistics
 * - Action item completion rates
 * - Meeting frequency chart
 * - Participant analysis
 * - Recent activity feed
 */
export default function DashboardPage(): JSX.Element {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  /**
   * Fetch dashboard statistics
   */
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ period });

      if (period === 'custom' && customStartDate && customEndDate) {
        params.set('startDate', customStartDate);
        params.set('endDate', customEndDate);
      }

      const response = await fetch(`/api/dashboard/stats?${params.toString()}`);
      const data = (await response.json()) as {
        success: boolean;
        data?: DashboardStats;
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(data.error?.message ?? 'Failed to fetch statistics');
      }

      if (data.success && data.data !== undefined) {
        setStats(data.data);
      } else {
        throw new Error(data.error?.message ?? 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [period, customStartDate, customEndDate]);

  // Fetch stats on mount and when period changes
  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  /**
   * Handle period change
   */
  const handlePeriodChange = useCallback((newPeriod: DashboardPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  }, []);

  /**
   * Handle custom date range change
   */
  const handleDateRangeChange = useCallback(
    (startDate: string, endDate: string) => {
      setCustomStartDate(startDate);
      setCustomEndDate(endDate);
    },
    []
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Analytics and statistics overview
          </p>
        </div>

        {/* Period filter */}
        <PeriodFilter
          selectedPeriod={period}
          startDate={customStartDate}
          endDate={customEndDate}
          onPeriodChange={handlePeriodChange}
          onDateRangeChange={handleDateRangeChange}
        />
      </div>

      {/* Error state */}
      {error !== null && <ErrorDisplay message={error} onRetry={(): void => { void fetchStats(); }} />}

      {/* Loading state */}
      {loading && error === null && (
        <>
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </div>

          {/* Charts skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton height={240} />
            <ChartSkeleton height={240} />
          </div>

          {/* Bottom section skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton height={300} />
            <ChartSkeleton height={300} />
          </div>
        </>
      )}

      {/* Loaded state */}
      {!loading && error === null && stats !== null && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Meetings"
              value={stats.meetings.total}
              icon={<MeetingIcon />}
              changePercent={stats.meetings.changePercent}
              description={`${stats.meetings.thisPeriod} this period`}
            />
            <StatsCard
              title="Minutes Generated"
              value={stats.minutes.total}
              icon={<MinutesIcon />}
              changePercent={stats.minutes.changePercent}
              description={`${stats.minutes.thisPeriod} this period`}
            />
            <StatsCard
              title="Action Items"
              value={stats.actionItems.total}
              icon={<ActionItemsIcon />}
              description={`${stats.actionItems.completionRate}% completion rate`}
            />
            <StatsCard
              title="Participants"
              value={stats.participants.totalUnique}
              icon={<ParticipantsIcon />}
              description={`Avg. ${stats.participants.avgPerMeeting} per meeting`}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MeetingFrequencyChart data={stats.frequency} height={240} />
            <ActionItemProgressChart stats={stats.actionItems} />
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ParticipantLeaderboard stats={stats.participants} />
            <RecentActivityFeed activities={stats.recentActivity} maxItems={10} />
          </div>
        </>
      )}
    </div>
  );
}
