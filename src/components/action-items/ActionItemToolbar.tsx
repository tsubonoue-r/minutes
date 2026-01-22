'use client';

import { memo } from 'react';
import type { Speaker } from '@/types/minutes';
import type {
  ActionItemFilters as FilterState,
  ActionItemSortOptions,
  MeetingReference,
} from './types';
import { ActionItemFilters } from './ActionItemFilters';
import { ActionItemSearch } from './ActionItemSearch';
import { ActionItemSort } from './ActionItemSort';

/**
 * Props for ActionItemToolbar component
 */
export interface ActionItemToolbarProps {
  /** Current filter state */
  readonly filters: FilterState;
  /** Current sort options */
  readonly sortOptions: ActionItemSortOptions;
  /** Current search query */
  readonly searchQuery: string;
  /** Callback when filters change */
  readonly onFiltersChange: (filters: FilterState) => void;
  /** Callback when sort options change */
  readonly onSortChange: (options: ActionItemSortOptions) => void;
  /** Callback when search query changes */
  readonly onSearchChange: (query: string) => void;
  /** Available assignees for filter dropdown */
  readonly assignees?: readonly Speaker[] | undefined;
  /** Available meetings for filter dropdown */
  readonly meetings?: readonly MeetingReference[] | undefined;
  /** Hide search input */
  readonly hideSearch?: boolean | undefined;
  /** Hide filters */
  readonly hideFilters?: boolean | undefined;
  /** Hide sort */
  readonly hideSort?: boolean | undefined;
  /** Additional CSS classes */
  readonly className?: string | undefined;
}

/**
 * ActionItemToolbar component
 *
 * @description Combined toolbar with filters, sort, and search for action items
 *
 * Layout:
 * ```
 * ┌────────────────────────────────────────────────────────────────┐
 * │ [Assignee ▼] [Status ▼] [Priority ▼] [Sort ▼]  [🔍 Search...] │
 * └────────────────────────────────────────────────────────────────┘
 * ```
 *
 * @example
 * ```tsx
 * <ActionItemToolbar
 *   filters={filters}
 *   sortOptions={sortOptions}
 *   searchQuery={searchQuery}
 *   onFiltersChange={setFilters}
 *   onSortChange={setSortOptions}
 *   onSearchChange={setSearchQuery}
 *   assignees={speakers}
 *   meetings={meetingList}
 * />
 * ```
 */
function ActionItemToolbarInner({
  filters,
  sortOptions,
  searchQuery,
  onFiltersChange,
  onSortChange,
  onSearchChange,
  assignees = [],
  meetings = [],
  hideSearch = false,
  hideFilters = false,
  hideSort = false,
  className = '',
}: ActionItemToolbarProps): JSX.Element {
  return (
    <div
      className={`
        flex flex-col gap-4 p-4
        bg-white border border-lark-border rounded-lg
        ${className}
      `}
    >
      {/* Main toolbar row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Filters section */}
        {!hideFilters && (
          <ActionItemFilters
            filters={filters}
            onChange={onFiltersChange}
            assignees={assignees}
            meetings={meetings}
            className="flex-1 min-w-0"
          />
        )}

        {/* Sort and Search section */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Sort dropdown */}
          {!hideSort && (
            <ActionItemSort
              sortOptions={sortOptions}
              onChange={onSortChange}
            />
          )}

          {/* Search input */}
          {!hideSearch && (
            <ActionItemSearch
              value={searchQuery}
              onChange={onSearchChange}
              className="w-64"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export const ActionItemToolbar = memo(ActionItemToolbarInner);

/**
 * Compact toolbar variant
 *
 * @description Minimal toolbar with just search and sort
 */
export interface ActionItemCompactToolbarProps {
  /** Current sort options */
  readonly sortOptions: ActionItemSortOptions;
  /** Current search query */
  readonly searchQuery: string;
  /** Callback when sort options change */
  readonly onSortChange: (options: ActionItemSortOptions) => void;
  /** Callback when search query changes */
  readonly onSearchChange: (query: string) => void;
  /** Additional CSS classes */
  readonly className?: string | undefined;
}

function ActionItemCompactToolbarInner({
  sortOptions,
  searchQuery,
  onSortChange,
  onSearchChange,
  className = '',
}: ActionItemCompactToolbarProps): JSX.Element {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <ActionItemSort
        sortOptions={sortOptions}
        onChange={onSortChange}
      />
      <ActionItemSearch
        value={searchQuery}
        onChange={onSearchChange}
        className="flex-1"
      />
    </div>
  );
}

export const ActionItemCompactToolbar = memo(ActionItemCompactToolbarInner);
