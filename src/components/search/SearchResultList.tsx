'use client';

import { memo, useCallback } from 'react';
import type { SearchResultItem, SearchResponse, SearchFacets } from '@/types/search';
import { SearchResultCard } from './SearchResultCard';
import { Pagination } from '@/components/ui';
import { Skeleton } from '@/components/ui';

/**
 * Props for SearchResultList component
 */
export interface SearchResultListProps {
  /** Search response data */
  readonly response: SearchResponse | null;
  /** Loading state */
  readonly isLoading?: boolean | undefined;
  /** Error state */
  readonly error?: Error | null | undefined;
  /** Result click handler */
  readonly onResultClick?: (result: SearchResultItem) => void;
  /** Page change handler */
  readonly onPageChange?: (page: number) => void;
  /** Facet filter click handler */
  readonly onFacetClick?: (facetType: string, value: string) => void;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * Loading skeleton for search results
 */
function SearchResultSkeleton(): JSX.Element {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-4 bg-white border border-lark-border rounded-lg"
        >
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState({ query }: { readonly query: string }): JSX.Element {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        検索結果が見つかりません
      </h3>
      <p className="text-gray-500 max-w-md mx-auto">
        「{query}」に一致する結果はありませんでした。
        別のキーワードで検索してみてください。
      </p>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ error }: { readonly error: Error }): JSX.Element {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
        <svg
          className="w-8 h-8 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        エラーが発生しました
      </h3>
      <p className="text-gray-500 max-w-md mx-auto">{error.message}</p>
    </div>
  );
}

/**
 * Facets sidebar component
 */
function FacetsSidebar({
  facets,
  onFacetClick,
}: {
  readonly facets: SearchFacets;
  readonly onFacetClick: ((facetType: string, value: string) => void) | undefined;
}): JSX.Element {
  const handleFacetClick = useCallback(
    (type: string, value: string) => {
      if (onFacetClick !== undefined) {
        onFacetClick(type, value);
      }
    },
    [onFacetClick]
  );

  return (
    <div className="space-y-4">
      {/* By Type */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">種類</h4>
        <div className="space-y-1">
          {facets.byType.map((facet) => (
            <button
              key={facet.value}
              type="button"
              onClick={() => handleFacetClick('type', facet.value)}
              className="
                flex items-center justify-between w-full px-2 py-1.5
                text-sm text-gray-600 rounded
                hover:bg-gray-100 transition-colors
              "
            >
              <span>{facet.label}</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                {facet.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* By Participant */}
      {facets.byParticipant && facets.byParticipant.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">参加者</h4>
          <div className="space-y-1">
            {facets.byParticipant.slice(0, 5).map((facet) => (
              <button
                key={facet.value}
                type="button"
                onClick={() => handleFacetClick('participant', facet.value)}
                className="
                  flex items-center justify-between w-full px-2 py-1.5
                  text-sm text-gray-600 rounded
                  hover:bg-gray-100 transition-colors
                "
              >
                <span className="truncate">{facet.label}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded ml-2">
                  {facet.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SearchResultList component
 *
 * @description Displays search results with pagination and facet filtering
 * @example
 * ```tsx
 * <SearchResultList
 *   response={searchResponse}
 *   isLoading={isLoading}
 *   onResultClick={handleResultClick}
 *   onPageChange={handlePageChange}
 * />
 * ```
 */
function SearchResultListInner({
  response,
  isLoading = false,
  error = null,
  onResultClick,
  onPageChange,
  onFacetClick,
  className = '',
}: SearchResultListProps): JSX.Element {
  const handlePageChange = useCallback(
    (page: number) => {
      onPageChange?.(page);
    },
    [onPageChange]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <SearchResultSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={className}>
        <ErrorState error={error} />
      </div>
    );
  }

  // No response yet
  if (!response) {
    return (
      <div className={`text-center py-12 text-gray-500 ${className}`}>
        検索キーワードを入力してください
      </div>
    );
  }

  // Empty results
  if (response.results.length === 0) {
    return (
      <div className={className}>
        <EmptyState query={response.query} />
      </div>
    );
  }

  return (
    <div className={`flex gap-6 ${className}`}>
      {/* Facets sidebar */}
      {response.facets && response.facets.byType.length > 1 && (
        <aside className="w-48 flex-shrink-0 hidden lg:block">
          <FacetsSidebar facets={response.facets} onFacetClick={onFacetClick} />
        </aside>
      )}

      {/* Results */}
      <div className="flex-1 min-w-0">
        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            {response.total}件の結果（{response.executionTimeMs.toFixed(0)}ms）
          </p>
        </div>

        {/* Results list */}
        <div className="space-y-3">
          {response.results.map((result) => (
            <SearchResultCard
              key={`${result.type}-${result.id}`}
              result={result}
              onClick={onResultClick}
            />
          ))}
        </div>

        {/* Pagination */}
        {response.totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={response.page}
              totalPages={response.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export const SearchResultList = memo(SearchResultListInner);
