'use client';

import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  memo,
} from 'react';
import { SearchInput } from '@/components/ui';
import type {
  Transcript,
  TranscriptSegment,
  TranscriptSearchMatch,
  TranscriptSearchResult,
} from '@/types/transcript';
import { filterSegments, createEmptySearchResult } from '@/types/transcript';
import { SpeakerSegment } from './SpeakerSegment';
import { TranscriptSearch } from './TranscriptSearch';
import { TranscriptSkeleton } from './TranscriptSkeleton';

/**
 * Props for TranscriptViewer component
 */
export interface TranscriptViewerProps {
  /** Transcript data to display */
  readonly transcript?: Transcript | undefined;
  /** Loading state */
  readonly isLoading?: boolean | undefined;
  /** Meeting title for header */
  readonly meetingTitle?: string | undefined;
  /** Callback when a segment is clicked */
  readonly onSegmentClick?: (segment: TranscriptSegment) => void;
  /** Initial search query */
  readonly initialSearchQuery?: string | undefined;
  /** Number of visible items for virtual scrolling (set 0 for all) */
  readonly virtualScrollThreshold?: number | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * Find all search matches in segments
 */
function findSearchMatches(
  segments: readonly TranscriptSegment[],
  query: string
): TranscriptSearchResult {
  if (!query || query.trim() === '') {
    return createEmptySearchResult();
  }

  const trimmedQuery = query.trim().toLowerCase();
  const matches: TranscriptSearchMatch[] = [];

  segments.forEach((segment) => {
    const lowerText = segment.text.toLowerCase();
    let startIndex = 0;

    while (true) {
      const index = lowerText.indexOf(trimmedQuery, startIndex);
      if (index === -1) break;

      matches.push({
        segmentId: segment.id,
        startIndex: index,
        endIndex: index + trimmedQuery.length,
      });

      startIndex = index + 1;
    }
  });

  return {
    query,
    totalMatches: matches.length,
    matches,
    currentMatchIndex: matches.length > 0 ? 0 : -1,
  };
}

/**
 * Get matches for a specific segment
 */
function getSegmentMatches(
  segmentId: string,
  searchResult: TranscriptSearchResult
): readonly TranscriptSearchMatch[] {
  return searchResult.matches.filter((m) => m.segmentId === segmentId);
}

/**
 * TranscriptViewer component
 *
 * @description Main component for displaying meeting transcripts with search,
 *              filtering, and virtual scroll support
 * @example
 * ```tsx
 * <TranscriptViewer
 *   transcript={transcriptData}
 *   isLoading={false}
 *   meetingTitle="週次定例会議"
 *   onSegmentClick={handleSegmentClick}
 * />
 * ```
 */
function TranscriptViewerInner({
  transcript,
  isLoading = false,
  meetingTitle,
  onSegmentClick,
  initialSearchQuery = '',
  virtualScrollThreshold = 100,
  className = '',
}: TranscriptViewerProps): JSX.Element {
  // State
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [isExpanded, setIsExpanded] = useState(true);
  const [visibleCount, setVisibleCount] = useState(virtualScrollThreshold);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Filter segments based on search
  const filteredSegments = useMemo(() => {
    if (!transcript) return [];

    return filterSegments(transcript.segments, {
      searchQuery: searchQuery || undefined,
    });
  }, [transcript, searchQuery]);

  // Search results for highlighting
  const searchResult = useMemo(() => {
    if (!transcript) return createEmptySearchResult();
    return findSearchMatches(transcript.segments, searchQuery);
  }, [transcript, searchQuery]);

  // Track current match state
  const [currentMatchIndex, setCurrentMatchIndex] = useState(
    searchResult.currentMatchIndex
  );

  // Update current match when search changes
  useEffect(() => {
    setCurrentMatchIndex(searchResult.totalMatches > 0 ? 0 : -1);
  }, [searchResult.totalMatches]);

  // Visible segments (with virtual scrolling)
  const visibleSegments = useMemo(() => {
    if (virtualScrollThreshold === 0 || !isExpanded) {
      return filteredSegments;
    }
    return filteredSegments.slice(0, visibleCount);
  }, [filteredSegments, visibleCount, virtualScrollThreshold, isExpanded]);

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setVisibleCount(virtualScrollThreshold || 100);
  }, [virtualScrollThreshold]);

  // Scroll to segment
  const scrollToSegment = useCallback((segmentId: string) => {
    const element = segmentRefs.current.get(segmentId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
    }
  }, []);

  // Navigate to match
  const navigateToMatch = useCallback(
    (index: number) => {
      const match = searchResult.matches[index];
      if (match) {
        setCurrentMatchIndex(index);
        scrollToSegment(match.segmentId);
      }
    },
    [searchResult.matches, scrollToSegment]
  );

  // Handle previous/next navigation
  const handlePrevious = useCallback(() => {
    if (searchResult.totalMatches === 0) return;

    const newIndex =
      currentMatchIndex <= 0
        ? searchResult.totalMatches - 1
        : currentMatchIndex - 1;
    navigateToMatch(newIndex);
  }, [currentMatchIndex, searchResult.totalMatches, navigateToMatch]);

  const handleNext = useCallback(() => {
    if (searchResult.totalMatches === 0) return;

    const newIndex =
      currentMatchIndex >= searchResult.totalMatches - 1
        ? 0
        : currentMatchIndex + 1;
    navigateToMatch(newIndex);
  }, [currentMatchIndex, searchResult.totalMatches, navigateToMatch]);

  // Toggle expand/collapse
  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Load more segments (infinite scroll)
  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + (virtualScrollThreshold || 100));
  }, [virtualScrollThreshold]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (
      virtualScrollThreshold === 0 ||
      visibleCount >= filteredSegments.length
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry !== undefined && entry.isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById('transcript-load-more-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return (): void => {
      observer.disconnect();
    };
  }, [virtualScrollThreshold, visibleCount, filteredSegments.length, handleLoadMore]);

  // Register segment ref
  const registerSegmentRef = useCallback(
    (segmentId: string, element: HTMLElement | null) => {
      if (element) {
        segmentRefs.current.set(segmentId, element);
      } else {
        segmentRefs.current.delete(segmentId);
      }
    },
    []
  );

  // Show loading state
  if (isLoading) {
    return <TranscriptSkeleton className={className} />;
  }

  // Show empty state
  if (!transcript || transcript.segments.length === 0) {
    return (
      <div
        className={`
          bg-white rounded-lg border border-lark-border p-8
          flex flex-col items-center justify-center text-center
          ${className}
        `}
      >
        <svg
          className="w-12 h-12 text-gray-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-gray-500 text-sm">文字起こしはありません</p>
      </div>
    );
  }

  const displayTitle = meetingTitle ?? '文字起こし';
  const hasMoreSegments = visibleCount < filteredSegments.length;
  const showSearchNav =
    searchQuery.length > 0 && searchResult.totalMatches >= 0;

  // Get focused match info for highlighting
  const focusedMatch =
    currentMatchIndex >= 0 ? searchResult.matches[currentMatchIndex] : null;

  return (
    <div
      ref={containerRef}
      className={`bg-white rounded-lg border border-lark-border ${className}`}
      role="region"
      aria-label={displayTitle}
    >
      {/* Header */}
      <header className="p-4 border-b border-lark-border">
        <div className="flex items-center justify-between gap-4">
          {/* Title */}
          <div className="flex items-center gap-2 min-w-0">
            <svg
              className="w-5 h-5 text-gray-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h2 className="text-lg font-medium text-lark-text truncate">
              {displayTitle}
            </h2>
            <span className="text-sm text-gray-500 flex-shrink-0">
              ({filteredSegments.length}件)
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search input */}
            <SearchInput
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="文字起こしを検索..."
              className="w-48"
            />

            {/* Expand/Collapse toggle */}
            <button
              type="button"
              onClick={toggleExpanded}
              className={`
                flex items-center gap-1 px-3 py-2
                text-sm text-gray-600
                border border-lark-border rounded-lg
                hover:bg-gray-50 transition-colors
                focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
              `}
              aria-expanded={isExpanded}
              aria-controls="transcript-segments"
            >
              {isExpanded ? '折りたたむ' : '展開'}
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
            </button>
          </div>
        </div>

        {/* Search navigation */}
        {showSearchNav && (
          <div className="mt-3">
            <TranscriptSearch
              searchResult={{ ...searchResult, currentMatchIndex }}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />
          </div>
        )}
      </header>

      {/* Segments list */}
      {isExpanded && (
        <div
          id="transcript-segments"
          className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto"
          role="list"
          aria-label="文字起こしセグメント一覧"
        >
          {visibleSegments.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              {searchQuery
                ? `「${searchQuery}」に一致する結果がありません`
                : '表示するセグメントがありません'}
            </div>
          ) : (
            <>
              {visibleSegments.map((segment) => {
                const segmentMatches = getSegmentMatches(
                  segment.id,
                  searchResult
                );
                const isFocusedSegment = focusedMatch?.segmentId === segment.id;

                // Find focused match index within this segment
                let focusedMatchIndexInSegment: number | undefined;
                if (isFocusedSegment && focusedMatch !== null && focusedMatch !== undefined) {
                  focusedMatchIndexInSegment = segmentMatches.findIndex(
                    (m) =>
                      m.startIndex === focusedMatch.startIndex &&
                      m.endIndex === focusedMatch.endIndex
                  );
                  if (focusedMatchIndexInSegment === -1) {
                    focusedMatchIndexInSegment = undefined;
                  }
                }

                return (
                  <div
                    key={segment.id}
                    ref={(el): void => {
                      registerSegmentRef(segment.id, el);
                    }}
                    role="listitem"
                  >
                    <SpeakerSegment
                      segment={segment}
                      searchMatches={segmentMatches}
                      focusedMatchIndex={focusedMatchIndexInSegment}
                      onSegmentClick={onSegmentClick}
                      className={isFocusedSegment ? 'bg-yellow-50' : ''}
                    />
                  </div>
                );
              })}

              {/* Load more sentinel for infinite scroll */}
              {hasMoreSegments && (
                <div
                  id="transcript-load-more-sentinel"
                  className="p-4 text-center"
                >
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    className="text-sm text-lark-primary hover:underline focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2 rounded"
                  >
                    さらに読み込む ({filteredSegments.length - visibleCount}件)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export const TranscriptViewer = memo(TranscriptViewerInner);
