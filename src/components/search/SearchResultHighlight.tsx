'use client';

import { memo } from 'react';
import type { SearchResultContext } from '@/types/search';

/**
 * Props for SearchResultHighlight component
 */
export interface SearchResultHighlightProps {
  /** Search result context to display */
  readonly context: SearchResultContext;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * SearchResultHighlight component
 *
 * @description Displays a search result context with highlighted match
 * @example
 * ```tsx
 * <SearchResultHighlight
 *   context={{
 *     before: "This is a ",
 *     match: "meeting",
 *     after: " about project updates",
 *     field: "title"
 *   }}
 * />
 * ```
 */
function SearchResultHighlightInner({
  context,
  className = '',
}: SearchResultHighlightProps): JSX.Element {
  const { before, match, after } = context;

  return (
    <span className={`text-sm text-gray-600 ${className}`}>
      <span className="text-gray-500">{before}</span>
      <mark className="bg-yellow-200 dark:bg-yellow-800 text-gray-900 dark:text-gray-100 rounded px-0.5 font-medium">
        {match}
      </mark>
      <span className="text-gray-500">{after}</span>
    </span>
  );
}

export const SearchResultHighlight = memo(SearchResultHighlightInner);
