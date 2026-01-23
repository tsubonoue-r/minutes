'use client';

import { memo, useState, useCallback } from 'react';
import { AvatarGroup } from '@/components/ui';
import type { TopicSegment } from '@/types/minutes';

/**
 * Format time range from start to end time
 *
 * @param startTime - Start time in milliseconds
 * @param endTime - End time in milliseconds
 * @returns Formatted time range string (e.g., "05:30 - 10:45")
 */
function formatTimeRange(startTime: number, endTime: number): string {
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number): string => n.toString().padStart(2, '0');

    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

/**
 * Props for TopicSection component
 */
export interface TopicSectionProps {
  /** Topic data to display */
  readonly topic: TopicSegment;
  /** Whether the section is initially expanded */
  readonly initialExpanded?: boolean | undefined;
  /** Callback when topic is clicked */
  readonly onTopicClick?: ((topic: TopicSegment) => void) | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * TopicSection component
 *
 * @description Displays a single topic/segment from the meeting with
 *              title, time range, summary, key points, and speakers.
 * @example
 * ```tsx
 * <TopicSection
 *   topic={{
 *     id: '1',
 *     title: 'Q4 Planning',
 *     startTime: 0,
 *     endTime: 600000,
 *     summary: 'Discussed Q4 goals and priorities.',
 *     keyPoints: ['Budget review', 'Timeline discussion'],
 *     speakers: [{ id: '1', name: 'John' }],
 *   }}
 * />
 * ```
 */
function TopicSectionInner({
  topic,
  initialExpanded = true,
  onTopicClick,
  className = '',
}: TopicSectionProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleClick = useCallback(() => {
    onTopicClick?.(topic);
  }, [onTopicClick, topic]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  const timeRange = formatTimeRange(topic.startTime, topic.endTime);
  const isClickable = onTopicClick !== undefined;

  return (
    <article
      className={`
        border border-lark-border rounded-lg bg-white
        transition-shadow duration-200
        hover:shadow-sm
        ${className}
      `}
      aria-labelledby={`topic-title-${topic.id}`}
    >
      {/* Header */}
      <header
        className={`
          flex items-center justify-between gap-4 p-4
          ${isExpanded ? 'border-b border-gray-100' : ''}
          cursor-pointer select-none
        `}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={`topic-content-${topic.id}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Expand/Collapse icon */}
          <button
            type="button"
            className="flex-shrink-0 p-1 rounded hover:bg-gray-100 transition-colors"
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            tabIndex={-1}
          >
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                isExpanded ? 'rotate-90' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Title */}
          <h3
            id={`topic-title-${topic.id}`}
            className="text-base font-medium text-lark-text truncate"
          >
            {topic.title}
          </h3>
        </div>

        {/* Time range */}
        <time
          className="flex-shrink-0 text-sm text-gray-500 font-mono"
          aria-label={`Time range: ${timeRange}`}
        >
          {timeRange}
        </time>
      </header>

      {/* Content */}
      {isExpanded && (
        <div
          id={`topic-content-${topic.id}`}
          className="p-4"
          role="region"
          aria-labelledby={`topic-title-${topic.id}`}
        >
          {/* Summary */}
          <div className="mb-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              {topic.summary}
            </p>
          </div>

          {/* Key Points */}
          {topic.keyPoints.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Key Points
              </h4>
              <ul
                className="space-y-1.5 text-sm text-gray-700"
                aria-label="Key points"
              >
                {topic.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span
                      className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-lark-primary mt-2"
                      aria-hidden="true"
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Speakers */}
          {topic.speakers.length > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <AvatarGroup
                  avatars={topic.speakers.map((speaker) => ({
                    name: speaker.name,
                  }))}
                  max={5}
                  size="sm"
                />
                <span className="text-xs text-gray-500">
                  {topic.speakers.length}
                  {topic.speakers.length === 1 ? ' speaker' : ' speakers'}
                </span>
              </div>
            </div>
          )}

          {/* Click to navigate (optional) */}
          {isClickable && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleClick}
                className="
                  text-sm text-lark-primary hover:text-blue-700
                  flex items-center gap-1
                  focus:outline-none focus:underline
                "
              >
                <span>トランスクリプトで表示</span>
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
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export const TopicSection = memo(TopicSectionInner);

/**
 * Props for TopicList component
 */
export interface TopicListProps {
  /** List of topics to display */
  readonly topics: readonly TopicSegment[];
  /** Callback when a topic is clicked */
  readonly onTopicClick?: ((topic: TopicSegment) => void) | undefined;
  /** Whether topics are initially expanded */
  readonly initialExpanded?: boolean | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * TopicList component
 *
 * @description Displays a list of topics from the meeting
 * @example
 * ```tsx
 * <TopicList topics={minutes.topics} onTopicClick={handleTopicClick} />
 * ```
 */
export function TopicList({
  topics,
  onTopicClick,
  initialExpanded = true,
  className = '',
}: TopicListProps): JSX.Element {
  if (topics.length === 0) {
    return (
      <div
        className={`
          p-8 text-center text-gray-500
          border border-dashed border-lark-border rounded-lg
          ${className}
        `}
      >
        <svg
          className="w-12 h-12 mx-auto mb-3 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-sm">トピックが見つかりません</p>
      </div>
    );
  }

  return (
    <div
      className={`space-y-4 ${className}`}
      role="list"
      aria-label="Meeting topics"
    >
      {topics.map((topic) => (
        <div key={topic.id} role="listitem">
          <TopicSection
            topic={topic}
            onTopicClick={onTopicClick}
            initialExpanded={initialExpanded}
          />
        </div>
      ))}
    </div>
  );
}
