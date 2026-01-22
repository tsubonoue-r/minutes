'use client';

import { memo, useState, useCallback } from 'react';
import type { DecisionItem, TopicSegment } from '@/types/minutes';

/**
 * Format timestamp in milliseconds to MM:SS or HH:MM:SS format
 */
function formatTimestamp(ms: number): string {
  if (ms < 0) {
    return '00:00';
  }

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
 * Props for DecisionItemCard component
 */
export interface DecisionItemCardProps {
  /** Decision data to display */
  readonly decision: DecisionItem;
  /** Related topic (optional) */
  readonly relatedTopic?: TopicSegment | undefined;
  /** Callback when related topic link is clicked */
  readonly onTopicLinkClick?: ((topicId: string) => void) | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * DecisionItemCard component
 *
 * @description Displays a single decision with expandable context
 * @example
 * ```tsx
 * <DecisionItemCard
 *   decision={{
 *     id: '1',
 *     content: 'Approved Q4 budget',
 *     context: 'After reviewing projections and growth plans.',
 *     decidedAt: 300000,
 *   }}
 * />
 * ```
 */
function DecisionItemCardInner({
  decision,
  relatedTopic,
  onTopicLinkClick,
  className = '',
}: DecisionItemCardProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasContext = decision.context.length > 0;

  const handleToggle = useCallback(() => {
    if (hasContext) {
      setIsExpanded((prev) => !prev);
    }
  }, [hasContext]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if ((event.key === 'Enter' || event.key === ' ') && hasContext) {
        event.preventDefault();
        handleToggle();
      }
    },
    [hasContext, handleToggle]
  );

  const handleTopicLinkClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (decision.relatedTopicId !== undefined) {
        onTopicLinkClick?.(decision.relatedTopicId);
      }
    },
    [decision.relatedTopicId, onTopicLinkClick]
  );

  return (
    <article
      className={`
        border-l-4 border-lark-primary bg-blue-50 rounded-r-lg
        transition-all duration-200
        ${hasContext ? 'cursor-pointer hover:bg-blue-100' : ''}
        ${className}
      `}
      onClick={hasContext ? handleToggle : undefined}
      onKeyDown={hasContext ? handleKeyDown : undefined}
      tabIndex={hasContext ? 0 : undefined}
      role={hasContext ? 'button' : 'article'}
      aria-expanded={hasContext ? isExpanded : undefined}
      aria-controls={hasContext ? `decision-details-${decision.id}` : undefined}
      aria-labelledby={`decision-content-${decision.id}`}
    >
      {/* Main content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Decision content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              {/* Check icon */}
              <svg
                className="w-5 h-5 text-lark-primary flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p
                  id={`decision-content-${decision.id}`}
                  className="text-sm font-medium text-lark-text"
                >
                  {decision.content}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Decided at {formatTimestamp(decision.decidedAt)}
                </p>
              </div>
            </div>

            {/* Related topic link */}
            {relatedTopic !== undefined && onTopicLinkClick !== undefined && (
              <button
                type="button"
                onClick={handleTopicLinkClick}
                className="
                  mt-2 ml-7 text-xs text-lark-primary hover:underline
                  flex items-center gap-1
                  focus:outline-none focus:underline
                "
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                <span>{relatedTopic.title}</span>
              </button>
            )}
          </div>

          {/* Expand indicator */}
          {hasContext && (
            <svg
              className={`
                w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200
                ${isExpanded ? 'rotate-180' : ''}
              `}
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
          )}
        </div>
      </div>

      {/* Expandable context */}
      {hasContext && isExpanded && (
        <div
          id={`decision-details-${decision.id}`}
          className="px-4 pb-4 ml-7"
          role="region"
          aria-label="Decision context"
        >
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Context
            </h4>
            <p className="text-sm text-gray-700">{decision.context}</p>
          </div>
        </div>
      )}
    </article>
  );
}

export const DecisionItemCard = memo(DecisionItemCardInner);

/**
 * Props for DecisionList component
 */
export interface DecisionListProps {
  /** List of decisions to display */
  readonly decisions: readonly DecisionItem[];
  /** Map of topics by ID for linking */
  readonly topicsMap?: ReadonlyMap<string, TopicSegment> | undefined;
  /** Callback when a topic link is clicked */
  readonly onTopicLinkClick?: ((topicId: string) => void) | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * DecisionList component
 *
 * @description Displays a list of decisions made during the meeting
 * @example
 * ```tsx
 * <DecisionList
 *   decisions={minutes.decisions}
 *   topicsMap={topicsMap}
 *   onTopicLinkClick={handleTopicClick}
 * />
 * ```
 */
export function DecisionList({
  decisions,
  topicsMap,
  onTopicLinkClick,
  className = '',
}: DecisionListProps): JSX.Element {
  if (decisions.length === 0) {
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
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm">No decisions recorded</p>
      </div>
    );
  }

  return (
    <div
      className={`space-y-3 ${className}`}
      role="list"
      aria-label="Meeting decisions"
    >
      {decisions.map((decision) => {
        const relatedTopic =
          decision.relatedTopicId !== undefined && topicsMap !== undefined
            ? topicsMap.get(decision.relatedTopicId)
            : undefined;

        return (
          <div key={decision.id} role="listitem">
            <DecisionItemCard
              decision={decision}
              relatedTopic={relatedTopic}
              onTopicLinkClick={onTopicLinkClick}
            />
          </div>
        );
      })}
    </div>
  );
}
