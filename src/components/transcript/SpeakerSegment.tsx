'use client';

import { memo, useMemo } from 'react';
import { Avatar } from '@/components/ui';
import type { TranscriptSegment, TranscriptSearchMatch } from '@/types/transcript';
import { formatTimestamp } from '@/types/transcript';

/**
 * Props for SpeakerSegment component
 */
export interface SpeakerSegmentProps {
  /** Transcript segment data */
  readonly segment: TranscriptSegment;
  /** Search matches within this segment for highlighting */
  readonly searchMatches?: readonly TranscriptSearchMatch[] | undefined;
  /** Currently focused match index for this segment */
  readonly focusedMatchIndex?: number | undefined;
  /** Callback when segment is clicked */
  readonly onSegmentClick?: ((segment: TranscriptSegment) => void) | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * Render text with search highlights
 */
function renderHighlightedText(
  text: string,
  matches: readonly TranscriptSearchMatch[],
  focusedMatchIndex: number | undefined
): JSX.Element {
  if (matches.length === 0) {
    return <>{text}</>;
  }

  // Sort matches by start index
  const sortedMatches = [...matches].sort((a, b) => a.startIndex - b.startIndex);

  const parts: JSX.Element[] = [];
  let lastIndex = 0;

  sortedMatches.forEach((match, index) => {
    // Add text before the match
    if (match.startIndex > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.slice(lastIndex, match.startIndex)}
        </span>
      );
    }

    // Add highlighted match
    const isFocused = focusedMatchIndex === index;
    parts.push(
      <mark
        key={`match-${match.startIndex}`}
        className={`
          rounded px-0.5
          ${isFocused ? 'bg-yellow-400 ring-2 ring-yellow-500' : 'bg-yellow-200'}
        `}
        data-match-index={index}
      >
        {text.slice(match.startIndex, match.endIndex)}
      </mark>
    );

    lastIndex = match.endIndex;
  });

  // Add remaining text after the last match
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

/**
 * SpeakerSegment component
 *
 * @description Displays a single speaker's utterance with timestamp and avatar
 * @example
 * ```tsx
 * <SpeakerSegment
 *   segment={{
 *     id: '1',
 *     speaker: { id: 'user-1', name: '田中太郎' },
 *     startTime: 0,
 *     endTime: 15000,
 *     text: 'それでは週次定例を始めます。',
 *     confidence: 0.95,
 *   }}
 * />
 * ```
 */
function SpeakerSegmentInner({
  segment,
  searchMatches = [],
  focusedMatchIndex,
  onSegmentClick,
  className = '',
}: SpeakerSegmentProps): JSX.Element {
  const formattedTime = useMemo(
    () => formatTimestamp(segment.startTime),
    [segment.startTime]
  );

  const handleClick = (): void => {
    onSegmentClick?.(segment);
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSegmentClick?.(segment);
    }
  };

  const isClickable = onSegmentClick !== undefined;

  return (
    <article
      id={`segment-${segment.id}`}
      className={`
        flex gap-3 p-3 rounded-lg
        transition-colors duration-150
        ${isClickable ? 'cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2' : ''}
        ${className}
      `}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? 'button' : 'article'}
      aria-label={`${segment.speaker.name}の発言 ${formattedTime}`}
    >
      {/* Timestamp */}
      <div className="flex-shrink-0 w-12">
        <time
          dateTime={`PT${Math.floor(segment.startTime / 1000)}S`}
          className="text-xs text-gray-500 font-mono"
          aria-label={`開始時刻 ${formattedTime}`}
        >
          {formattedTime}
        </time>
      </div>

      {/* Avatar */}
      <div className="flex-shrink-0">
        <Avatar
          src={segment.speaker.avatarUrl}
          name={segment.speaker.name}
          size="sm"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Speaker name */}
        <div className="text-sm font-medium text-lark-text mb-1">
          {segment.speaker.name}
        </div>

        {/* Transcribed text */}
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
          {renderHighlightedText(segment.text, searchMatches, focusedMatchIndex)}
        </div>

        {/* Confidence indicator (optional) */}
        {segment.confidence < 0.7 && (
          <div
            className="mt-1 text-xs text-gray-400"
            title={`認識精度: ${Math.round(segment.confidence * 100)}%`}
          >
            <span className="sr-only">低認識精度</span>
            <svg
              className="inline-block w-3 h-3 mr-1"
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
            認識精度が低い可能性があります
          </div>
        )}
      </div>
    </article>
  );
}

export const SpeakerSegment = memo(SpeakerSegmentInner);
