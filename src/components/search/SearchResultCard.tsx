'use client';

import { memo, useCallback } from 'react';
import type {
  SearchResultItem,
  MeetingSearchResult,
  MinutesSearchResult,
  TranscriptSearchResult,
  ActionItemSearchResult,
} from '@/types/search';
import { getResultTypeLabel } from '@/types/search';
import { SearchResultHighlight } from './SearchResultHighlight';
import { Badge } from '@/components/ui';

/**
 * Props for SearchResultCard component
 */
export interface SearchResultCardProps {
  /** Search result item */
  readonly result: SearchResultItem;
  /** Click handler */
  readonly onClick: ((result: SearchResultItem) => void) | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * Format timestamp to display time
 */
function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number): string => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Get badge variant based on result type
 */
function getTypeBadgeVariant(
  type: SearchResultItem['type']
): 'default' | 'success' | 'warning' | 'error' {
  switch (type) {
    case 'meeting':
      return 'default';
    case 'minutes':
      return 'success';
    case 'transcript':
      return 'warning';
    case 'action_item':
      return 'error';
  }
}

/**
 * Get priority badge variant
 */
function getPriorityBadgeVariant(
  priority: 'high' | 'medium' | 'low'
): 'error' | 'warning' | 'default' {
  switch (priority) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'default';
  }
}

/**
 * Meeting result content
 */
function MeetingResultContent({
  result,
}: {
  readonly result: MeetingSearchResult;
}): JSX.Element {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-medium text-lark-text truncate">{result.title}</h3>
        {result.hasMinutes && (
          <Badge variant="success" className="text-xs">
            議事録あり
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
        <span>{formatDate(result.date)}</span>
        <span>ホスト: {result.hostName}</span>
        <span>参加者: {result.participantCount}名</span>
      </div>
    </>
  );
}

/**
 * Minutes result content
 */
function MinutesResultContent({
  result,
}: {
  readonly result: MinutesSearchResult;
}): JSX.Element {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-medium text-lark-text truncate">{result.title}</h3>
      </div>
      <div className="text-xs text-gray-500 mb-2">{formatDate(result.date)}</div>
      {result.summarySnippet && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
          {result.summarySnippet}
        </p>
      )}
    </>
  );
}

/**
 * Transcript result content
 */
function TranscriptResultContent({
  result,
}: {
  readonly result: TranscriptSearchResult;
}): JSX.Element {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-medium text-lark-text truncate">
          {result.meetingTitle}
        </h3>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
        <span>{formatTimestamp(result.timestamp)}</span>
        <span>発言者: {result.speakerName}</span>
      </div>
    </>
  );
}

/**
 * Action item result content
 */
function ActionItemResultContent({
  result,
}: {
  readonly result: ActionItemSearchResult;
}): JSX.Element {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-medium text-lark-text truncate">{result.content}</h3>
        <Badge variant={getPriorityBadgeVariant(result.priority)} className="text-xs">
          {result.priority === 'high' ? '高' : result.priority === 'medium' ? '中' : '低'}
        </Badge>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
        <span>会議: {result.meetingTitle}</span>
        {result.assigneeName !== undefined && <span>担当: {result.assigneeName}</span>}
        {result.dueDate !== undefined && <span>期限: {result.dueDate}</span>}
        <Badge
          variant={
            result.status === 'completed'
              ? 'success'
              : result.status === 'in_progress'
                ? 'warning'
                : 'default'
          }
          className="text-xs"
        >
          {result.status === 'completed'
            ? '完了'
            : result.status === 'in_progress'
              ? '進行中'
              : '未着手'}
        </Badge>
      </div>
    </>
  );
}

/**
 * Render result content based on type
 */
function ResultContent({
  result,
}: {
  readonly result: SearchResultItem;
}): JSX.Element {
  switch (result.type) {
    case 'meeting':
      return <MeetingResultContent result={result} />;
    case 'minutes':
      return <MinutesResultContent result={result} />;
    case 'transcript':
      return <TranscriptResultContent result={result} />;
    case 'action_item':
      return <ActionItemResultContent result={result} />;
  }
}

/**
 * SearchResultCard component
 *
 * @description Displays a single search result with type badge, content, and highlighted matches
 * @example
 * ```tsx
 * <SearchResultCard
 *   result={searchResult}
 *   onClick={(result) => navigateToResult(result)}
 * />
 * ```
 */
function SearchResultCardInner({
  result,
  onClick,
  className = '',
}: SearchResultCardProps): JSX.Element {
  const handleClick = useCallback(() => {
    if (onClick !== undefined) {
      onClick(result);
    }
  }, [onClick, result]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (onClick !== undefined) {
          onClick(result);
        }
      }
    },
    [onClick, result]
  );

  return (
    <div
      className={`
        p-4 bg-white border border-lark-border rounded-lg
        hover:border-lark-primary hover:shadow-sm
        transition-all duration-150
        cursor-pointer
        ${className}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`検索結果: ${result.type === 'meeting' || result.type === 'minutes' ? result.title : result.type === 'transcript' ? result.meetingTitle : result.content}`}
    >
      {/* Type badge and score */}
      <div className="flex items-center justify-between mb-2">
        <Badge variant={getTypeBadgeVariant(result.type)} className="text-xs">
          {getResultTypeLabel(result.type)}
        </Badge>
        <span className="text-xs text-gray-400">
          スコア: {(result.score * 100).toFixed(0)}%
        </span>
      </div>

      {/* Result content */}
      <ResultContent result={result} />

      {/* Match contexts */}
      {result.contexts.length > 0 && (
        <div className="mt-3 space-y-1">
          {result.contexts.slice(0, 2).map((context, index) => (
            <div key={index} className="pl-3 border-l-2 border-yellow-300">
              <SearchResultHighlight context={context} />
              <span className="ml-2 text-xs text-gray-400">
                ({context.field})
              </span>
            </div>
          ))}
          {result.contexts.length > 2 && (
            <span className="text-xs text-gray-400 pl-3">
              他 {result.contexts.length - 2} 件のマッチ
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export const SearchResultCard = memo(SearchResultCardInner);
