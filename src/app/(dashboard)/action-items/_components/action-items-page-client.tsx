'use client';

/**
 * Action Items Page Client Component
 * @module app/(dashboard)/action-items/_components/action-items-page-client
 */

import { useCallback, useState, useEffect, useMemo, useTransition } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import {
  ActionItemStats,
  ActionItemToolbar,
  ActionItemList,
  createDefaultFilters,
  type ActionItemFilters,
  type ActionItemSortOptions,
  type ManagedActionItem,
  type ActionItemStatus,
} from '@/components/action-items';
import { Pagination } from '@/components/ui';
import type {
  ActionItemListResponse,
  ActionItemStatsData,
} from '@/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for ActionItemsPageClient component
 */
export interface ActionItemsPageClientProps {
  /** Initial action items data from server */
  readonly initialData: ActionItemListResponse;
  /** Initial statistics from server */
  readonly initialStats: ActionItemStatsData;
}

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PAGE_SIZE = 20;

// ============================================================================
// URL Parameter Utilities
// ============================================================================

/**
 * Parse filters from URL search params
 */
function parseFiltersFromParams(searchParams: URLSearchParams): ActionItemFilters {
  const statuses = searchParams.get('status');
  const priorities = searchParams.get('priority');
  const assigneeId = searchParams.get('assigneeId');
  const meetingId = searchParams.get('meetingId');
  const overdueOnly = searchParams.get('overdue');

  return {
    statuses: statuses !== null && statuses !== ''
      ? (statuses.split(',') as ActionItemStatus[])
      : [],
    priorities: priorities !== null && priorities !== ''
      ? (priorities.split(',') as ('high' | 'medium' | 'low')[])
      : [],
    assigneeId: assigneeId !== null && assigneeId !== '' ? assigneeId : undefined,
    meetingId: meetingId !== null && meetingId !== '' ? meetingId : undefined,
    overdueOnly: overdueOnly === 'true',
    dueDateRange: undefined,
  };
}

/**
 * Parse sort options from URL search params
 */
function parseSortFromParams(searchParams: URLSearchParams): ActionItemSortOptions {
  const field = searchParams.get('sortField');
  const direction = searchParams.get('sortOrder');

  const validFields = ['dueDate', 'priority', 'createdAt', 'meetingDate'] as const;
  const validDirections = ['asc', 'desc'] as const;

  return {
    field: field !== null && (validFields as readonly string[]).includes(field)
      ? (field as ActionItemSortOptions['field'])
      : 'dueDate',
    direction: direction !== null && (validDirections as readonly string[]).includes(direction)
      ? (direction as ActionItemSortOptions['direction'])
      : 'asc',
  };
}

/**
 * Parse pagination from URL search params
 */
function parsePaginationFromParams(searchParams: URLSearchParams): { page: number; pageSize: number } {
  const page = searchParams.get('page');
  const pageSize = searchParams.get('pageSize');

  const parsedPage = page !== null ? parseInt(page, 10) : 1;
  const parsedPageSize = pageSize !== null ? parseInt(pageSize, 10) : DEFAULT_PAGE_SIZE;

  return {
    page: isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage,
    pageSize: isNaN(parsedPageSize) || parsedPageSize < 1 ? DEFAULT_PAGE_SIZE : Math.min(parsedPageSize, 100),
  };
}

/**
 * Build URL search params from state
 */
function buildSearchParams(
  filters: ActionItemFilters,
  sort: ActionItemSortOptions,
  searchQuery: string,
  page: number,
  pageSize: number
): URLSearchParams {
  const params = new URLSearchParams();

  // Filters
  if (filters.statuses.length > 0) {
    params.set('status', filters.statuses.join(','));
  }
  if (filters.priorities.length > 0) {
    params.set('priority', filters.priorities.join(','));
  }
  if (filters.assigneeId !== undefined) {
    params.set('assigneeId', filters.assigneeId);
  }
  if (filters.meetingId !== undefined) {
    params.set('meetingId', filters.meetingId);
  }
  if (filters.overdueOnly) {
    params.set('overdue', 'true');
  }

  // Search
  if (searchQuery !== '') {
    params.set('search', searchQuery);
  }

  // Sort
  if (sort.field !== 'dueDate') {
    params.set('sortField', sort.field);
  }
  if (sort.direction !== 'asc') {
    params.set('sortOrder', sort.direction);
  }

  // Pagination
  if (page > 1) {
    params.set('page', String(page));
  }
  if (pageSize !== DEFAULT_PAGE_SIZE) {
    params.set('pageSize', String(pageSize));
  }

  return params;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Build API query string from filters
 */
function buildApiQueryString(
  filters: ActionItemFilters,
  sort: ActionItemSortOptions,
  searchQuery: string,
  page: number,
  pageSize: number
): string {
  const params = new URLSearchParams();

  // Filters
  if (filters.statuses.length > 0) {
    params.set('status', filters.statuses.join(','));
  }
  if (filters.priorities.length > 0) {
    params.set('priority', filters.priorities.join(','));
  }
  if (filters.assigneeId !== undefined) {
    params.set('assigneeId', filters.assigneeId);
  }
  if (filters.meetingId !== undefined) {
    params.set('meetingId', filters.meetingId);
  }
  if (filters.overdueOnly) {
    params.set('isOverdue', 'true');
  }
  if (searchQuery !== '') {
    params.set('searchQuery', searchQuery);
  }

  // Sort - convert 'direction' to 'order' for API
  params.set('sortField', sort.field);
  params.set('sortOrder', sort.direction);

  // Pagination
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));

  return params.toString();
}

/**
 * Fetch action items from API
 */
async function fetchActionItems(
  filters: ActionItemFilters,
  sort: ActionItemSortOptions,
  searchQuery: string,
  page: number,
  pageSize: number
): Promise<ActionItemListResponse> {
  const queryString = buildApiQueryString(filters, sort, searchQuery, page, pageSize);
  const response = await fetch(`/api/action-items?${queryString}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch action items: ${response.statusText}`);
  }

  const result = await response.json() as ApiResponse<ActionItemListResponse>;

  if (!result.success || result.data === undefined) {
    throw new Error(result.error?.message ?? 'Failed to fetch action items');
  }

  return result.data;
}

/**
 * Fetch action item statistics from API
 */
async function fetchStats(): Promise<ActionItemStatsData> {
  const response = await fetch('/api/action-items/stats');

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.statusText}`);
  }

  const result = await response.json() as ApiResponse<ActionItemStatsData>;

  if (!result.success || result.data === undefined) {
    throw new Error(result.error?.message ?? 'Failed to fetch stats');
  }

  return result.data;
}

/**
 * Update action item status via API
 */
async function updateActionItemStatus(
  id: string,
  status: ActionItemStatus
): Promise<ManagedActionItem> {
  const response = await fetch(`/api/action-items/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update status: ${response.statusText}`);
  }

  const result = await response.json() as ApiResponse<ManagedActionItem>;

  if (!result.success || result.data === undefined) {
    throw new Error(result.error?.message ?? 'Failed to update status');
  }

  return result.data;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert API ManagedActionItem to component ManagedActionItem
 */
function toComponentActionItem(item: ActionItemListResponse['items'][number]): ManagedActionItem {
  return {
    id: item.id,
    content: item.content,
    assignee: item.assignee,
    dueDate: item.dueDate,
    priority: item.priority,
    status: item.status,
    relatedTopicId: item.relatedTopicId,
    meeting: {
      id: item.meetingId,
      title: item.meetingTitle,
    },
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

// ============================================================================
// Component
// ============================================================================

/**
 * Page Header Component
 */
function PageHeader({
  total,
  isLoading,
}: {
  readonly total: number;
  readonly isLoading: boolean;
}): JSX.Element {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-7 h-7 text-green-600"
        >
          <path
            fillRule="evenodd"
            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
            clipRule="evenodd"
          />
        </svg>
        Action Items
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mt-1">
        {isLoading ? (
          <span className="inline-block h-4 w-32 bg-gray-200 rounded animate-pulse" />
        ) : (
          `${total} items`
        )}
      </p>
    </div>
  );
}

/**
 * Results Info Component
 */
function ResultsInfo({
  currentPage,
  totalPages,
  total,
  pageSize,
}: {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly total: number;
  readonly pageSize: number;
}): JSX.Element {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  if (total === 0) {
    return <></>;
  }

  return (
    <div className="text-sm text-gray-500">
      {total} items - showing {start}-{end}
      {totalPages > 1 && ` (page ${currentPage} of ${totalPages})`}
    </div>
  );
}

/**
 * Error display component
 */
function ErrorDisplay({
  error,
  onRetry,
}: {
  readonly error: string;
  readonly onRetry: () => void;
}): JSX.Element {
  return (
    <div className="text-center py-12">
      <div className="text-red-500 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-12 h-12 mx-auto"
        >
          <path
            fillRule="evenodd"
            d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <p className="text-gray-600 mb-4">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

/**
 * ActionItemsPageClient Component
 *
 * @description Client component that handles filtering, sorting, pagination, and status updates
 *
 * Features:
 * - URL parameter synchronization
 * - Optimistic status updates
 * - Stats-based quick filtering
 * - Debounced search
 */
export function ActionItemsPageClient({
  initialData,
  initialStats,
}: ActionItemsPageClientProps): JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // ============================================================================
  // State
  // ============================================================================

  // Initialize state from URL params or defaults
  const [filters, setFilters] = useState<ActionItemFilters>(() =>
    parseFiltersFromParams(searchParams)
  );
  const [sort, setSort] = useState<ActionItemSortOptions>(() =>
    parseSortFromParams(searchParams)
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get('search') ?? ''
  );
  const [pagination, setPagination] = useState(() =>
    parsePaginationFromParams(searchParams)
  );

  // Data state
  const [data, setData] = useState<ActionItemListResponse>(initialData);
  const [stats, setStats] = useState<ActionItemStatsData>(initialStats);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stats filter state (for quick filtering via stats cards)
  const [activeStatsFilter, setActiveStatsFilter] = useState<
    ActionItemStatus | 'overdue' | 'all'
  >('all');

  // ============================================================================
  // Derived State
  // ============================================================================

  const items: readonly ManagedActionItem[] = useMemo(
    () => data.items.map(toComponentActionItem),
    [data.items]
  );

  const componentStats = useMemo(
    () => ({
      total: stats.total,
      pending: stats.pending,
      inProgress: stats.inProgress,
      completed: stats.completed,
      overdue: stats.overdue,
    }),
    [stats]
  );

  // ============================================================================
  // URL Sync
  // ============================================================================

  /**
   * Update URL when state changes
   */
  const updateUrl = useCallback(
    (
      newFilters: ActionItemFilters,
      newSort: ActionItemSortOptions,
      newSearch: string,
      newPage: number,
      newPageSize: number
    ): void => {
      const params = buildSearchParams(newFilters, newSort, newSearch, newPage, newPageSize);
      const queryString = params.toString();
      const newUrl = queryString !== '' ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        // Use window.history to update URL without triggering Next.js router navigation
        // This avoids type issues with Next.js typed routes while achieving the same effect
        window.history.replaceState(null, '', newUrl);
      });
    },
    [pathname]
  );

  // ============================================================================
  // Data Fetching
  // ============================================================================

  /**
   * Fetch data with current state
   */
  const fetchData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const [newData, newStats] = await Promise.all([
        fetchActionItems(filters, sort, searchQuery, pagination.page, pagination.pageSize),
        fetchStats(),
      ]);

      setData(newData);
      setStats(newStats);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, sort, searchQuery, pagination.page, pagination.pageSize]);

  /**
   * Refetch data (for retry)
   */
  const handleRetry = useCallback((): void => {
    void fetchData();
  }, [fetchData]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle filter changes
   */
  const handleFiltersChange = useCallback(
    (newFilters: ActionItemFilters): void => {
      setFilters(newFilters);
      setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
      setActiveStatsFilter('all'); // Clear stats filter
      updateUrl(newFilters, sort, searchQuery, 1, pagination.pageSize);
    },
    [sort, searchQuery, pagination.pageSize, updateUrl]
  );

  /**
   * Handle sort changes
   */
  const handleSortChange = useCallback(
    (newSort: ActionItemSortOptions): void => {
      setSort(newSort);
      updateUrl(filters, newSort, searchQuery, pagination.page, pagination.pageSize);
    },
    [filters, searchQuery, pagination, updateUrl]
  );

  /**
   * Handle search changes (with debounce handled in component)
   */
  const handleSearchChange = useCallback(
    (newQuery: string): void => {
      setSearchQuery(newQuery);
      setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
      updateUrl(filters, sort, newQuery, 1, pagination.pageSize);
    },
    [filters, sort, pagination.pageSize, updateUrl]
  );

  /**
   * Handle page changes
   */
  const handlePageChange = useCallback(
    (newPage: number): void => {
      setPagination((prev) => ({ ...prev, page: newPage }));
      updateUrl(filters, sort, searchQuery, newPage, pagination.pageSize);
      // Scroll to top on page change
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [filters, sort, searchQuery, pagination.pageSize, updateUrl]
  );

  /**
   * Handle stats card click for quick filtering
   */
  const handleStatsFilterChange = useCallback(
    (filter: ActionItemStatus | 'overdue' | 'all'): void => {
      setActiveStatsFilter(filter);

      let newFilters: ActionItemFilters;

      if (filter === 'all') {
        newFilters = createDefaultFilters();
      } else if (filter === 'overdue') {
        newFilters = {
          ...createDefaultFilters(),
          overdueOnly: true,
        };
      } else {
        newFilters = {
          ...createDefaultFilters(),
          statuses: [filter],
        };
      }

      setFilters(newFilters);
      setPagination((prev) => ({ ...prev, page: 1 }));
      updateUrl(newFilters, sort, searchQuery, 1, pagination.pageSize);
    },
    [sort, searchQuery, pagination.pageSize, updateUrl]
  );

  /**
   * Handle status change with optimistic update
   */
  const handleStatusChange = useCallback(
    (id: string, newStatus: ActionItemStatus): void => {
      // Optimistic update
      setData((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === id
            ? {
                ...item,
                status: newStatus,
                updatedAt: new Date().toISOString(),
                completedAt: newStatus === 'completed' ? new Date().toISOString() : item.completedAt,
                isOverdue: newStatus === 'completed' ? false : item.isOverdue,
              }
            : item
        ),
      }));

      // Optimistic stats update
      setStats((prev) => {
        const oldItem = data.items.find((item) => item.id === id);
        if (oldItem === undefined) return prev;

        const newStats = { ...prev };

        // Decrement old status count
        if (oldItem.status === 'pending') newStats.pending--;
        else if (oldItem.status === 'in_progress') newStats.inProgress--;
        else if (oldItem.status === 'completed') newStats.completed--;

        // Increment new status count
        if (newStatus === 'pending') newStats.pending++;
        else if (newStatus === 'in_progress') newStats.inProgress++;
        else if (newStatus === 'completed') newStats.completed++;

        // Update overdue count
        if (oldItem.isOverdue && newStatus === 'completed') {
          newStats.overdue--;
        }

        return newStats;
      });

      // API call (fire and forget with error handling)
      void (async (): Promise<void> => {
        try {
          await updateActionItemStatus(id, newStatus);
        } catch (err) {
          // Revert on error by refetching
          console.error('Failed to update status:', err);
          void fetchData();
        }
      })();
    },
    [data.items, fetchData]
  );

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Fetch data when filters, sort, search, or pagination change
   */
  useEffect(() => {
    // Skip initial fetch since we have initial data
    const isInitialState =
      filters.statuses.length === 0 &&
      filters.priorities.length === 0 &&
      filters.assigneeId === undefined &&
      filters.meetingId === undefined &&
      !filters.overdueOnly &&
      sort.field === 'dueDate' &&
      sort.direction === 'asc' &&
      searchQuery === '' &&
      pagination.page === 1;

    if (!isInitialState) {
      void fetchData();
    }
  }, [filters, sort, searchQuery, pagination.page, pagination.pageSize, fetchData]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader total={data.pagination.total} isLoading={isLoading || isPending} />

      {/* Stats Cards */}
      <ActionItemStats
        stats={componentStats}
        onFilterChange={handleStatsFilterChange}
        activeFilter={activeStatsFilter}
      />

      {/* Toolbar */}
      <ActionItemToolbar
        filters={filters}
        sortOptions={sort}
        searchQuery={searchQuery}
        onFiltersChange={handleFiltersChange}
        onSortChange={handleSortChange}
        onSearchChange={handleSearchChange}
      />

      {/* Results Info */}
      {!isLoading && error === null && (
        <ResultsInfo
          currentPage={data.pagination.page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          pageSize={data.pagination.pageSize}
        />
      )}

      {/* Error State */}
      {error !== null && (
        <ErrorDisplay error={error} onRetry={handleRetry} />
      )}

      {/* Action Items List */}
      {error === null && (
        <ActionItemList
          items={items}
          isLoading={isLoading || isPending}
          onStatusChange={handleStatusChange}
          emptyMessage="No action items found. Try adjusting your filters."
        />
      )}

      {/* Pagination */}
      {!isLoading && error === null && data.pagination.totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination
            currentPage={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPageChange={handlePageChange}
            disabled={isLoading || isPending}
          />
        </div>
      )}
    </div>
  );
}

export default ActionItemsPageClient;
