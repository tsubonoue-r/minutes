'use client';

/**
 * Template Category Filter Component
 * @module components/templates/TemplateCategoryFilter
 */

import { memo, useCallback } from 'react';
import type { TemplateCategory, MeetingType } from '@/types/template';
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORY_LABELS,
  MEETING_TYPES,
  MEETING_TYPE_LABELS,
} from '@/types/template';

// ============================================================================
// Types
// ============================================================================

/**
 * Filter state type
 */
export interface TemplateFilterState {
  /** Selected category (null for all) */
  readonly category: TemplateCategory | null;
  /** Selected meeting type (null for all) */
  readonly meetingType: MeetingType | null;
  /** Search query */
  readonly searchQuery: string;
}

/**
 * Template category filter props
 */
export interface TemplateCategoryFilterProps {
  /** Current filter state */
  readonly filters: TemplateFilterState;
  /** Callback when filters change */
  readonly onFiltersChange: (filters: TemplateFilterState) => void;
  /** Disabled state */
  readonly disabled?: boolean | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Filter chip component
 */
interface FilterChipProps {
  readonly label: string;
  readonly isSelected: boolean;
  readonly onClick: () => void;
  readonly disabled: boolean;
}

function FilterChip({
  label,
  isSelected,
  onClick,
  disabled,
}: FilterChipProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        px-3 py-1.5 text-xs font-medium rounded-full transition-colors
        ${isSelected
          ? 'bg-lark-primary text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {label}
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Template Category Filter Component
 *
 * @description Provides filtering options for templates by category, meeting type, and search
 *
 * @example
 * ```tsx
 * <TemplateCategoryFilter
 *   filters={filterState}
 *   onFiltersChange={setFilterState}
 * />
 * ```
 */
function TemplateCategoryFilterInner({
  filters,
  onFiltersChange,
  disabled = false,
  className = '',
}: TemplateCategoryFilterProps): JSX.Element {
  const handleCategoryChange = useCallback(
    (category: TemplateCategory | null) => {
      onFiltersChange({ ...filters, category });
    },
    [filters, onFiltersChange]
  );

  const handleMeetingTypeChange = useCallback(
    (meetingType: MeetingType | null) => {
      onFiltersChange({ ...filters, meetingType });
    },
    [filters, onFiltersChange]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({ ...filters, searchQuery: e.target.value });
    },
    [filters, onFiltersChange]
  );

  const handleClearFilters = useCallback(() => {
    onFiltersChange({
      category: null,
      meetingType: null,
      searchQuery: '',
    });
  }, [onFiltersChange]);

  const hasActiveFilters =
    filters.category !== null ||
    filters.meetingType !== null ||
    filters.searchQuery !== '';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={filters.searchQuery}
          onChange={handleSearchChange}
          disabled={disabled}
          placeholder="テンプレートを検索..."
          className="
            w-full pl-10 pr-4 py-2 text-sm
            border border-gray-300 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
          "
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Category filter */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">
          カテゴリ
        </label>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label="すべて"
            isSelected={filters.category === null}
            onClick={() => handleCategoryChange(null)}
            disabled={disabled}
          />
          {TEMPLATE_CATEGORIES.map((category) => (
            <FilterChip
              key={category}
              label={TEMPLATE_CATEGORY_LABELS[category]}
              isSelected={filters.category === category}
              onClick={() => handleCategoryChange(category)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {/* Meeting type filter */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">
          会議種別
        </label>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label="すべて"
            isSelected={filters.meetingType === null}
            onClick={() => handleMeetingTypeChange(null)}
            disabled={disabled}
          />
          {MEETING_TYPES.map((type) => (
            <FilterChip
              key={type}
              label={MEETING_TYPE_LABELS[type]}
              isSelected={filters.meetingType === type}
              onClick={() => handleMeetingTypeChange(type)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {/* Clear filters button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClearFilters}
          disabled={disabled}
          className="
            text-xs text-lark-primary hover:text-blue-600
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          フィルターをクリア
        </button>
      )}
    </div>
  );
}

export const TemplateCategoryFilter = memo(TemplateCategoryFilterInner);
export default TemplateCategoryFilter;
