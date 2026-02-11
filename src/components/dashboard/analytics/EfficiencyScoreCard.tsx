'use client';

/**
 * EfficiencyScoreCard component - Circular progress showing efficiency score
 * @module components/dashboard/analytics/EfficiencyScoreCard
 */

import type { ReadonlyMeetingAnalytics } from '@/types/analytics';

/**
 * Props for EfficiencyScoreCard component
 */
interface EfficiencyScoreCardProps {
  /** Analytics data containing efficiency metrics */
  readonly analytics: ReadonlyMeetingAnalytics;
  /** Optional additional className */
  readonly className?: string;
}

/**
 * Get score color based on efficiency score value
 */
function getScoreColor(score: number): {
  readonly stroke: string;
  readonly text: string;
  readonly bg: string;
  readonly label: string;
} {
  if (score >= 80) {
    return {
      stroke: '#22c55e',
      text: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
      label: '優秀',
    };
  }
  if (score >= 60) {
    return {
      stroke: '#3b82f6',
      text: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      label: '良好',
    };
  }
  if (score >= 40) {
    return {
      stroke: '#f59e0b',
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      label: '改善余地あり',
    };
  }
  return {
    stroke: '#ef4444',
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    label: '要改善',
  };
}

/**
 * Efficiency metric item
 */
interface EfficiencyMetric {
  readonly label: string;
  readonly value: string;
  readonly description: string;
}

/**
 * Build efficiency metrics from analytics data
 */
function buildMetrics(
  analytics: ReadonlyMeetingAnalytics
): readonly EfficiencyMetric[] {
  const completionRate =
    analytics.totalActionItems > 0
      ? Math.round(
          (analytics.completedActionItems / analytics.totalActionItems) * 100
        )
      : 0;

  const totalHours =
    analytics.totalDurationMs / (1000 * 60 * 60);
  const decisionsPerHour =
    totalHours > 0
      ? Math.round((analytics.totalDecisions / totalHours) * 10) / 10
      : 0;

  return [
    {
      label: '決定事項/時間',
      value: `${decisionsPerHour}`,
      description: `合計 ${analytics.totalDecisions}件の決定`,
    },
    {
      label: 'タスク完了率',
      value: `${completionRate}%`,
      description: `${analytics.completedActionItems}/${analytics.totalActionItems}件完了`,
    },
    {
      label: '平均参加者数',
      value: `${analytics.averageParticipants}`,
      description: `合計 ${analytics.totalParticipants}名`,
    },
  ];
}

/**
 * EfficiencyScoreCard component
 *
 * Displays a circular progress indicator showing the meeting efficiency score,
 * along with key efficiency metrics.
 *
 * The efficiency score is calculated from:
 * - Decisions per hour (30% weight)
 * - Action item completion rate (40% weight)
 * - Meeting duration efficiency (30% weight)
 *
 * @example
 * ```tsx
 * <EfficiencyScoreCard analytics={analyticsData} />
 * ```
 */
export function EfficiencyScoreCard({
  analytics,
  className = '',
}: EfficiencyScoreCardProps): JSX.Element {
  const { efficiencyScore } = analytics;
  const scoreColor = getScoreColor(efficiencyScore);
  const metrics = buildMetrics(analytics);

  // SVG circle parameters
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (efficiencyScore / 100) * circumference;

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            効率スコア
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            会議の生産性指標
          </p>
        </div>
        <span
          className={`px-2.5 py-1 text-xs font-medium rounded-full ${scoreColor.text} ${scoreColor.bg}`}
        >
          {scoreColor.label}
        </span>
      </div>

      {/* Circular Progress */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <svg
            width="160"
            height="160"
            viewBox="0 0 160 160"
            className="transform -rotate-90"
          >
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-slate-100 dark:text-slate-700"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={scoreColor.stroke}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`text-4xl font-bold ${scoreColor.text}`}
            >
              {efficiencyScore}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              / 100
            </span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
          >
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {metric.label}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {metric.description}
              </p>
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {metric.value}
            </span>
          </div>
        ))}
      </div>

      {/* Score breakdown hint */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
          決定効率(30%) + タスク完了率(40%) + 時間効率(30%)
        </p>
      </div>
    </div>
  );
}
