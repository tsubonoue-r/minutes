'use client';

/**
 * Meetings Page Content - Client component with filters and list
 * @module app/(dashboard)/meetings/meetings-content
 */

import { useCallback } from 'react';
import { useMeetings } from '@/hooks/use-meetings';
import { MeetingList, MeetingFilters } from '@/components/meetings';
import { Pagination } from '@/components/ui';

/**
 * Page header component
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
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        会議一覧
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mt-1">
        {isLoading ? (
          <span className="inline-block h-4 w-32 bg-gray-200 rounded animate-pulse" />
        ) : (
          `${total}件の会議`
        )}
      </p>
    </div>
  );
}

/**
 * Results info component
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
      {total}件中 {start}-{end}件を表示
      {totalPages > 1 && ` (${totalPages}ページ中${currentPage}ページ目)`}
    </div>
  );
}

/**
 * Meetings Page Content Component
 *
 * @description Client component that provides interactive filters and list
 */
export function MeetingsPageContent(): JSX.Element {
  const {
    meetings,
    isLoading,
    error,
    total,
    totalPages,
    currentPage,
    setFilters,
    setSort,
    setPage,
    filters,
    sort,
    refetch,
  } = useMeetings({
    page: 1,
    limit: 20,
    sortBy: 'startTime',
    sortOrder: 'desc',
  });

  /**
   * Handle page change
   */
  const handlePageChange = useCallback(
    (page: number): void => {
      setPage(page);
      // Scroll to top on page change
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setPage]
  );

  /**
   * Handle retry on error
   */
  const handleRetry = useCallback((): void => {
    void refetch();
  }, [refetch]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader total={total} isLoading={isLoading} />

      {/* Filters */}
      <MeetingFilters
        filters={filters}
        sort={sort}
        onFiltersChange={setFilters}
        onSortChange={setSort}
        isLoading={isLoading}
      />

      {/* Results Info */}
      {!isLoading && !error && (
        <ResultsInfo
          currentPage={currentPage}
          totalPages={totalPages}
          total={total}
          pageSize={20}
        />
      )}

      {/* Meeting List */}
      <MeetingList
        meetings={meetings}
        isLoading={isLoading}
        error={error}
      />

      {/* Error Retry Button (shown in list) */}
      {error !== null && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 text-sm font-medium text-white bg-lark-primary rounded-lg hover:bg-lark-primary/90 transition-colors"
          >
            再読み込み
          </button>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  );
}

export default MeetingsPageContent;
