'use client';

/**
 * Meeting Filters Component - Search, date range, and status filters
 * @module components/meetings/meeting-filters
 */

import { useCallback, useState, useEffect } from 'react';
import type { MeetingStatus, MeetingSortField, SortDirection } from '@/types/meeting';
import type { MeetingsFilterParams, MeetingsSortParams } from '@/hooks/use-meetings';
import {
  SearchInput,
  DateRangePicker,
  SortSelect,
  type SortOption,
  type DateRange,
} from '@/components/ui';

/**
 * Status filter option
 */
interface StatusOption {
  readonly value: MeetingStatus | 'all';
  readonly label: string;
}

/**
 * Status filter options
 */
const STATUS_OPTIONS: readonly StatusOption[] = [
  { value: 'all', label: '全てのステータス' },
  { value: 'scheduled', label: '予定' },
  { value: 'in_progress', label: '進行中' },
  { value: 'ended', label: '終了' },
  { value: 'cancelled', label: 'キャンセル' },
] as const;

/**
 * Sort options
 */
const SORT_OPTIONS: readonly SortOption<string>[] = [
  { value: 'startTime-desc', label: '開始日時（新しい順）' },
  { value: 'startTime-asc', label: '開始日時（古い順）' },
  { value: 'title-asc', label: 'タイトル（A-Z）' },
  { value: 'title-desc', label: 'タイトル（Z-A）' },
] as const;

/**
 * Meeting filters props
 */
export interface MeetingFiltersProps {
  /** Current filter values */
  readonly filters: MeetingsFilterParams;
  /** Current sort values */
  readonly sort: MeetingsSortParams;
  /** Filter change callback */
  readonly onFiltersChange: (filters: Partial<MeetingsFilterParams>) => void;
  /** Sort change callback */
  readonly onSortChange: (sort: Partial<MeetingsSortParams>) => void;
  /** Loading state */
  readonly isLoading?: boolean;
  /** Custom class name */
  readonly className?: string;
}

/**
 * Status Filter Select Component
 */
function StatusFilter({
  value,
  onChange,
  disabled,
}: {
  readonly value: MeetingStatus | null | undefined;
  readonly onChange: (status: MeetingStatus | null) => void;
  readonly disabled: boolean;
}): JSX.Element {
  const currentValue = value ?? 'all';

  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue === 'all' ? null : (newValue as MeetingStatus));
    },
    [onChange]
  );

  return (
    <SortSelect
      value={currentValue}
      options={STATUS_OPTIONS as readonly SortOption<string>[]}
      onChange={handleChange}
      disabled={disabled}
      label="ステータス"
    />
  );
}

/**
 * Meeting Filters Component
 *
 * @description Provides search, date range, status, and sort filters for meetings
 * @example
 * ```tsx
 * <MeetingFilters
 *   filters={filters}
 *   sort={sort}
 *   onFiltersChange={setFilters}
 *   onSortChange={setSort}
 * />
 * ```
 */
export function MeetingFilters({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  isLoading = false,
  className = '',
}: MeetingFiltersProps): JSX.Element {
  // Local search state for debouncing
  const [searchValue, setSearchValue] = useState(filters.search ?? '');

  // Sync search value with external filters
  useEffect(() => {
    setSearchValue(filters.search ?? '');
  }, [filters.search]);

  /**
   * Handle search change (debounced in SearchInput)
   */
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      if (value === '') {
        onFiltersChange({ search: undefined });
      } else {
        onFiltersChange({ search: value });
      }
    },
    [onFiltersChange]
  );

  /**
   * Handle date range change
   */
  const handleDateRangeChange = useCallback(
    (range: DateRange) => {
      onFiltersChange({
        startDate: range.startDate,
        endDate: range.endDate,
      });
    },
    [onFiltersChange]
  );

  /**
   * Handle status change
   */
  const handleStatusChange = useCallback(
    (status: MeetingStatus | null) => {
      onFiltersChange({ status });
    },
    [onFiltersChange]
  );

  /**
   * Handle sort change
   */
  const handleSortChange = useCallback(
    (value: string) => {
      const [sortBy, sortOrder] = value.split('-') as [
        MeetingSortField,
        SortDirection
      ];
      onSortChange({ sortBy, sortOrder });
    },
    [onSortChange]
  );

  /**
   * Clear all filters
   */
  const handleClearFilters = useCallback(() => {
    setSearchValue('');
    onFiltersChange({
      search: undefined,
      startDate: null,
      endDate: null,
      status: null,
    });
  }, [onFiltersChange]);

  // Current sort value
  const currentSortValue = `${sort.sortBy}-${sort.sortOrder}`;

  // Check if any filters are active
  const hasActiveFilters =
    (filters.search !== undefined && filters.search !== '') ||
    filters.startDate !== null ||
    filters.endDate !== null ||
    filters.status !== null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main filters row */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-medium text-lark-text mb-1">
            検索
          </label>
          <SearchInput
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="会議名、会議番号、ホスト名で検索..."
            disabled={isLoading}
            debounceMs={300}
          />
        </div>

        {/* Date Range */}
        <div className="w-full lg:w-64">
          <label className="block text-sm font-medium text-lark-text mb-1">
            日付範囲
          </label>
          <DateRangePicker
            startDate={filters.startDate ?? null}
            endDate={filters.endDate ?? null}
            onDateChange={handleDateRangeChange}
            disabled={isLoading}
          />
        </div>

        {/* Status Filter */}
        <div className="w-full lg:w-48">
          <StatusFilter
            value={filters.status}
            onChange={handleStatusChange}
            disabled={isLoading}
          />
        </div>

        {/* Sort */}
        <div className="w-full lg:w-56">
          <SortSelect
            value={currentSortValue}
            options={SORT_OPTIONS}
            onChange={handleSortChange}
            disabled={isLoading}
            label="並び替え"
          />
        </div>
      </div>

      {/* Active filters indicator and clear button */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>フィルター適用中</span>
            {filters.search !== undefined && filters.search !== '' && (
              <span className="px-2 py-0.5 bg-lark-background rounded text-xs">
                検索: {filters.search}
              </span>
            )}
            {(filters.startDate !== null || filters.endDate !== null) && (
              <span className="px-2 py-0.5 bg-lark-background rounded text-xs">
                日付: 指定あり
              </span>
            )}
            {filters.status !== null && (
              <span className="px-2 py-0.5 bg-lark-background rounded text-xs">
                ステータス:{' '}
                {STATUS_OPTIONS.find((opt) => opt.value === filters.status)
                  ?.label ?? filters.status}
              </span>
            )}
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

export default MeetingFilters;
