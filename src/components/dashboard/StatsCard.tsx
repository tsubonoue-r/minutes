'use client';

/**
 * StatsCard component - Displays a single statistic with trend indicator
 * @module components/dashboard/StatsCard
 */

/**
 * Props for StatsCard component
 */
interface StatsCardProps {
  /** Card title */
  readonly title: string;
  /** Main value to display */
  readonly value: number | string;
  /** Optional icon */
  readonly icon?: React.ReactNode;
  /** Change percentage from previous period */
  readonly changePercent?: number;
  /** Optional description text */
  readonly description?: string;
  /** Optional click handler */
  readonly onClick?: () => void;
  /** Optional additional className */
  readonly className?: string;
}

/**
 * Get trend indicator based on change percentage
 */
function getTrendIndicator(
  changePercent: number
): { icon: JSX.Element; color: string; bgColor: string } {
  if (changePercent > 0) {
    return {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path
            fillRule="evenodd"
            d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"
            clipRule="evenodd"
          />
        </svg>
      ),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    };
  } else if (changePercent < 0) {
    return {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path
            fillRule="evenodd"
            d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z"
            clipRule="evenodd"
          />
        </svg>
      ),
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    };
  }

  return {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
      >
        <path
          fillRule="evenodd"
          d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z"
          clipRule="evenodd"
        />
      </svg>
    ),
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
  };
}

/**
 * StatsCard component
 *
 * Displays a statistic card with optional trend indicator and click handler.
 *
 * @example
 * ```tsx
 * <StatsCard
 *   title="Total Meetings"
 *   value={42}
 *   icon={<CalendarIcon />}
 *   changePercent={12}
 *   description="This month"
 * />
 * ```
 */
export function StatsCard({
  title,
  value,
  icon,
  changePercent,
  description,
  onClick,
  className = '',
}: StatsCardProps): JSX.Element {
  const trend =
    changePercent !== undefined ? getTrendIndicator(changePercent) : null;

  const CardWrapper = onClick !== undefined ? 'button' : 'div';
  const cardProps = onClick !== undefined ? { onClick, type: 'button' as const } : {};

  return (
    <CardWrapper
      {...cardProps}
      className={`
        bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700
        p-6 transition-all text-left w-full
        ${onClick !== undefined ? 'hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer' : ''}
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {value}
            </p>
            {trend !== null && changePercent !== undefined && (
              <span
                className={`
                  inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium
                  ${trend.color} ${trend.bgColor}
                `}
              >
                {trend.icon}
                {Math.abs(changePercent)}%
              </span>
            )}
          </div>
          {description !== undefined && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {description}
            </p>
          )}
        </div>
        {icon !== undefined && (
          <div className="flex-shrink-0 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            {icon}
          </div>
        )}
      </div>
    </CardWrapper>
  );
}
