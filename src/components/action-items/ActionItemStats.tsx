'use client';

/**
 * ActionItemStats component
 * @module components/action-items/ActionItemStats
 */

import { useCallback } from 'react';
import type { ActionItemStatsProps, ActionItemStatus } from './types';

/**
 * Stat card configuration
 */
interface StatCardConfig {
  key: 'all' | ActionItemStatus | 'overdue';
  label: string;
  getValue: (stats: ActionItemStatsProps['stats']) => number;
  bgColor: string;
  textColor: string;
  iconColor: string;
  icon: JSX.Element;
}

/**
 * Get stat card configurations
 */
function getStatCards(): readonly StatCardConfig[] {
  return [
    {
      key: 'all',
      label: '全体',
      getValue: (stats) => stats.total,
      bgColor: 'bg-gray-50 hover:bg-gray-100',
      textColor: 'text-gray-900',
      iconColor: 'text-gray-500',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M6 4.75A.75.75 0 016.75 4h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 4.75zM6 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 10zm0 5.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75zM1.99 4.75a1 1 0 011-1H3a1 1 0 011 1v.01a1 1 0 01-1 1h-.01a1 1 0 01-1-1v-.01zM1.99 15.25a1 1 0 011-1H3a1 1 0 011 1v.01a1 1 0 01-1 1h-.01a1 1 0 01-1-1v-.01zM1.99 10a1 1 0 011-1H3a1 1 0 011 1v.01a1 1 0 01-1 1h-.01a1 1 0 01-1-1V10z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      key: 'pending',
      label: '未着手',
      getValue: (stats) => stats.pending,
      bgColor: 'bg-gray-50 hover:bg-gray-100',
      textColor: 'text-gray-700',
      iconColor: 'text-gray-400',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      key: 'in_progress',
      label: '進行中',
      getValue: (stats) => stats.inProgress,
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-500',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.242a.75.75 0 00.53-.219z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      key: 'completed',
      label: '完了',
      getValue: (stats) => stats.completed,
      bgColor: 'bg-green-50 hover:bg-green-100',
      textColor: 'text-green-700',
      iconColor: 'text-green-500',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      key: 'overdue',
      label: '期限切れ',
      getValue: (stats) => stats.overdue,
      bgColor: 'bg-red-50 hover:bg-red-100',
      textColor: 'text-red-700',
      iconColor: 'text-red-500',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ] as const;
}

/**
 * ActionItemStats component
 *
 * @description Displays statistics summary cards for action items
 * @example
 * ```tsx
 * <ActionItemStats
 *   stats={{ total: 10, pending: 3, inProgress: 4, completed: 2, overdue: 1 }}
 *   onFilterChange={(filter) => setFilter(filter)}
 *   activeFilter="all"
 * />
 * ```
 */
export function ActionItemStats({
  stats,
  onFilterChange,
  activeFilter,
  className = '',
}: ActionItemStatsProps): JSX.Element {
  const statCards = getStatCards();

  const handleCardClick = useCallback(
    (key: 'all' | ActionItemStatus | 'overdue') => {
      onFilterChange?.(key);
    },
    [onFilterChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, key: 'all' | ActionItemStatus | 'overdue') => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onFilterChange?.(key);
      }
    },
    [onFilterChange]
  );

  return (
    <div
      className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 ${className}`}
      role="group"
      aria-label="アクションアイテム統計"
    >
      {statCards.map((card) => {
        const value = card.getValue(stats);
        const isActive = activeFilter === card.key;
        const isClickable = onFilterChange !== undefined;

        return (
          <div
            key={card.key}
            className={`
              rounded-lg p-4 transition-all
              ${card.bgColor}
              ${isClickable ? 'cursor-pointer' : ''}
              ${isActive ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
            `}
            onClick={isClickable ? (): void => handleCardClick(card.key) : undefined}
            onKeyDown={isClickable ? (e: React.KeyboardEvent): void => handleKeyDown(e, card.key) : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            aria-pressed={isClickable ? isActive : undefined}
            aria-label={`${card.label}: ${value}件`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${card.textColor}`}>
                {card.label}
              </span>
              <span className={card.iconColor}>{card.icon}</span>
            </div>
            <div className={`text-2xl font-bold ${card.textColor}`}>
              {value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
