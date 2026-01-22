'use client';

import { memo, useCallback } from 'react';
import type { TranscriptSearchResult } from '@/types/transcript';

/**
 * Props for TranscriptSearch component
 */
export interface TranscriptSearchProps {
  /** Search result data */
  readonly searchResult: TranscriptSearchResult;
  /** Callback when navigating to previous match */
  readonly onPrevious: () => void;
  /** Callback when navigating to next match */
  readonly onNext: () => void;
  /** Whether navigation is disabled */
  readonly disabled?: boolean | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * TranscriptSearch component
 *
 * @description Navigation controls for search results with match count display
 * @example
 * ```tsx
 * <TranscriptSearch
 *   searchResult={{
 *     query: '進捗',
 *     totalMatches: 5,
 *     matches: [...],
 *     currentMatchIndex: 2,
 *   }}
 *   onPrevious={handlePrevious}
 *   onNext={handleNext}
 * />
 * ```
 */
function TranscriptSearchInner({
  searchResult,
  onPrevious,
  onNext,
  disabled = false,
  className = '',
}: TranscriptSearchProps): JSX.Element | null {
  const { totalMatches, currentMatchIndex, query } = searchResult;

  const handlePrevious = useCallback(() => {
    if (!disabled && totalMatches > 0) {
      onPrevious();
    }
  }, [disabled, totalMatches, onPrevious]);

  const handleNext = useCallback(() => {
    if (!disabled && totalMatches > 0) {
      onNext();
    }
  }, [disabled, totalMatches, onNext]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowUp' || (event.key === 'Enter' && event.shiftKey)) {
        event.preventDefault();
        handlePrevious();
      } else if (event.key === 'ArrowDown' || (event.key === 'Enter' && !event.shiftKey)) {
        event.preventDefault();
        handleNext();
      }
    },
    [handlePrevious, handleNext]
  );

  // Don't render if no query
  if (!query || query.length === 0) {
    return null;
  }

  const isNavigationDisabled = disabled || totalMatches === 0;
  const currentDisplay = totalMatches > 0 ? currentMatchIndex + 1 : 0;

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2
        bg-gray-50 border border-lark-border rounded-lg
        ${className}
      `}
      role="navigation"
      aria-label="検索結果ナビゲーション"
      onKeyDown={handleKeyDown}
    >
      {/* Match count display */}
      <div className="flex-1 text-sm text-gray-600" aria-live="polite">
        {totalMatches > 0 ? (
          <span>
            <span className="font-medium">{currentDisplay}</span>
            <span className="mx-1">/</span>
            <span>{totalMatches}</span>
            <span className="ml-1">件</span>
          </span>
        ) : (
          <span className="text-gray-400">一致なし</span>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        {/* Previous button */}
        <button
          type="button"
          onClick={handlePrevious}
          disabled={isNavigationDisabled}
          className={`
            p-1.5 rounded
            transition-colors duration-150
            ${
              isNavigationDisabled
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:text-lark-primary hover:bg-gray-100'
            }
          `}
          aria-label="前の検索結果"
          title="前へ (Shift+Enter)"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>

        {/* Next button */}
        <button
          type="button"
          onClick={handleNext}
          disabled={isNavigationDisabled}
          className={`
            p-1.5 rounded
            transition-colors duration-150
            ${
              isNavigationDisabled
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:text-lark-primary hover:bg-gray-100'
            }
          `}
          aria-label="次の検索結果"
          title="次へ (Enter)"
        >
          <svg
            className="w-4 h-4"
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
        </button>
      </div>
    </div>
  );
}

export const TranscriptSearch = memo(TranscriptSearchInner);
