'use client';

import { memo, useCallback, useState } from 'react';
import type { SearchFilters as SearchFiltersType, SearchTarget } from '@/types/search';
import { DateRangePicker, type DateRange } from '@/components/ui';

/**
 * Props for SearchFilters component
 */
export interface SearchFiltersProps {
  /** Current filter values */
  readonly filters: SearchFiltersType;
  /** Selected search targets */
  readonly targets: readonly SearchTarget[];
  /** Filter change callback */
  readonly onFiltersChange: (filters: Partial<SearchFiltersType>) => void;
  /** Target change callback */
  readonly onTargetsChange: (targets: SearchTarget[]) => void;
  /** Loading state */
  readonly isLoading?: boolean | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * Target option configuration
 */
interface TargetOption {
  readonly value: SearchTarget;
  readonly label: string;
}

/**
 * Available search targets
 */
const TARGET_OPTIONS: readonly TargetOption[] = [
  { value: 'all', label: '全て' },
  { value: 'meetings', label: '会議' },
  { value: 'minutes', label: '議事録' },
  { value: 'transcripts', label: 'トランスクリプト' },
  { value: 'action_items', label: 'アクションアイテム' },
];

/**
 * Priority options
 */
const PRIORITY_OPTIONS = [
  { value: '', label: '全ての優先度' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
] as const;

/**
 * Action item status options
 */
const ACTION_ITEM_STATUS_OPTIONS = [
  { value: '', label: '全てのステータス' },
  { value: 'pending', label: '未着手' },
  { value: 'in_progress', label: '進行中' },
  { value: 'completed', label: '完了' },
] as const;

/**
 * Meeting status options
 */
const MEETING_STATUS_OPTIONS = [
  { value: '', label: '全てのステータス' },
  { value: 'scheduled', label: '予定' },
  { value: 'in_progress', label: '進行中' },
  { value: 'ended', label: '終了' },
  { value: 'cancelled', label: 'キャンセル' },
] as const;

/**
 * SearchFilters component
 *
 * @description Provides filters for search including targets, date range, and status filters
 * @example
 * ```tsx
 * <SearchFilters
 *   filters={filters}
 *   targets={targets}
 *   onFiltersChange={setFilters}
 *   onTargetsChange={setTargets}
 * />
 * ```
 */
function SearchFiltersInner({
  filters,
  targets,
  onFiltersChange,
  onTargetsChange,
  isLoading = false,
  className = '',
}: SearchFiltersProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * Handle target toggle
   */
  const handleTargetToggle = useCallback(
    (target: SearchTarget) => {
      if (target === 'all') {
        // If clicking 'all', set to only 'all'
        onTargetsChange(['all']);
      } else {
        // If clicking a specific target
        const newTargets = targets.includes('all')
          ? [target]
          : targets.includes(target)
            ? targets.filter((t) => t !== target)
            : [...targets.filter((t) => t !== 'all'), target];

        // If no targets selected, default to 'all'
        onTargetsChange(newTargets.length === 0 ? ['all'] : newTargets);
      }
    },
    [targets, onTargetsChange]
  );

  /**
   * Handle date range change
   */
  const handleDateRangeChange = useCallback(
    (range: DateRange) => {
      onFiltersChange({
        dateRange: {
          from: range.startDate?.toISOString(),
          to: range.endDate?.toISOString(),
        },
      });
    },
    [onFiltersChange]
  );

  /**
   * Handle meeting status change
   */
  const handleMeetingStatusChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      onFiltersChange({
        meetingStatus:
          value === ''
            ? undefined
            : (value as SearchFiltersType['meetingStatus']),
      });
    },
    [onFiltersChange]
  );

  /**
   * Handle action item status change
   */
  const handleActionItemStatusChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      onFiltersChange({
        actionItemStatus:
          value === ''
            ? undefined
            : (value as SearchFiltersType['actionItemStatus']),
      });
    },
    [onFiltersChange]
  );

  /**
   * Handle priority change
   */
  const handlePriorityChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      onFiltersChange({
        priority:
          value === '' ? undefined : (value as SearchFiltersType['priority']),
      });
    },
    [onFiltersChange]
  );

  /**
   * Clear all filters
   */
  const handleClearFilters = useCallback(() => {
    onFiltersChange({
      dateRange: undefined,
      participants: undefined,
      tags: undefined,
      meetingStatus: undefined,
      minutesStatus: undefined,
      actionItemStatus: undefined,
      priority: undefined,
    });
    onTargetsChange(['all']);
  }, [onFiltersChange, onTargetsChange]);

  /**
   * Check if any filters are active
   */
  const hasActiveFilters =
    targets.length > 0 &&
    !targets.includes('all') ||
    filters.dateRange?.from !== undefined ||
    filters.dateRange?.to !== undefined ||
    filters.meetingStatus !== undefined ||
    filters.actionItemStatus !== undefined ||
    filters.priority !== undefined;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search targets */}
      <div>
        <label className="block text-sm font-medium text-lark-text mb-2">
          検索対象
        </label>
        <div className="flex flex-wrap gap-2">
          {TARGET_OPTIONS.map((option) => {
            const isSelected = targets.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleTargetToggle(option.value)}
                disabled={isLoading}
                className={`
                  px-3 py-1.5 text-sm rounded-full
                  border transition-colors duration-150
                  ${
                    isSelected
                      ? 'bg-lark-primary text-white border-lark-primary'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-lark-primary'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expand/collapse advanced filters */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-sm text-lark-primary hover:underline"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
        詳細フィルター
      </button>

      {/* Advanced filters (expandable) */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Date range */}
          <div>
            <label className="block text-sm font-medium text-lark-text mb-1">
              日付範囲
            </label>
            <DateRangePicker
              startDate={
                filters.dateRange?.from !== undefined && filters.dateRange.from !== ''
                  ? new Date(filters.dateRange.from)
                  : null
              }
              endDate={
                filters.dateRange?.to !== undefined && filters.dateRange.to !== ''
                  ? new Date(filters.dateRange.to)
                  : null
              }
              onDateChange={handleDateRangeChange}
              disabled={isLoading}
            />
          </div>

          {/* Meeting status */}
          {(targets.includes('all') || targets.includes('meetings')) && (
            <div>
              <label className="block text-sm font-medium text-lark-text mb-1">
                会議ステータス
              </label>
              <select
                value={filters.meetingStatus ?? ''}
                onChange={handleMeetingStatusChange}
                disabled={isLoading}
                className="
                  w-full px-3 py-2 text-sm
                  border border-lark-border rounded-lg
                  bg-white text-lark-text
                  focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-transparent
                  disabled:bg-gray-100 disabled:cursor-not-allowed
                "
              >
                {MEETING_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action item status */}
          {(targets.includes('all') || targets.includes('action_items')) && (
            <div>
              <label className="block text-sm font-medium text-lark-text mb-1">
                アクションアイテムステータス
              </label>
              <select
                value={filters.actionItemStatus ?? ''}
                onChange={handleActionItemStatusChange}
                disabled={isLoading}
                className="
                  w-full px-3 py-2 text-sm
                  border border-lark-border rounded-lg
                  bg-white text-lark-text
                  focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-transparent
                  disabled:bg-gray-100 disabled:cursor-not-allowed
                "
              >
                {ACTION_ITEM_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Priority */}
          {(targets.includes('all') || targets.includes('action_items')) && (
            <div>
              <label className="block text-sm font-medium text-lark-text mb-1">
                優先度
              </label>
              <select
                value={filters.priority ?? ''}
                onChange={handlePriorityChange}
                disabled={isLoading}
                className="
                  w-full px-3 py-2 text-sm
                  border border-lark-border rounded-lg
                  bg-white text-lark-text
                  focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-transparent
                  disabled:bg-gray-100 disabled:cursor-not-allowed
                "
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Active filters indicator and clear button */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>フィルター適用中</span>
          </div>
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-sm text-lark-primary hover:underline"
            disabled={isLoading}
          >
            フィルターをクリア
          </button>
        </div>
      )}
    </div>
  );
}

export const SearchFilters = memo(SearchFiltersInner);
