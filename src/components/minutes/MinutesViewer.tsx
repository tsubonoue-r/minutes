'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import type {
  Minutes,
  ActionItemStatus,
  TopicSegment,
} from '@/types/minutes';
import { minutesToMarkdown } from '@/types/minutes';
import { TopicList } from './TopicSection';
import { DecisionList } from './DecisionList';
import { ActionItemList } from './ActionItemList';
import { MinutesSkeleton } from './MinutesSkeleton';
import {
  GenerateButton,
  GenerateMinutesCard,
  type GenerationState,
} from './GenerateButton';

/**
 * Tab type for MinutesViewer
 */
export type MinutesTab = 'topics' | 'decisions' | 'actions';

/**
 * Props for MinutesViewer component
 */
export interface MinutesViewerProps {
  /** Minutes data to display */
  readonly minutes?: Minutes | undefined;
  /** Loading state */
  readonly isLoading?: boolean | undefined;
  /** Generation state */
  readonly generationState?: GenerationState | undefined;
  /** Callback to generate minutes */
  readonly onGenerate?: (() => void) | undefined;
  /** Callback to regenerate minutes */
  readonly onRegenerate?: (() => void) | undefined;
  /** Callback when a topic is clicked */
  readonly onTopicClick?: ((topic: TopicSegment) => void) | undefined;
  /** Callback when action item status changes */
  readonly onActionStatusChange?: ((id: string, status: ActionItemStatus) => void) | undefined;
  /** Whether to sync action item status changes with API */
  readonly enableApiSync?: boolean | undefined;
  /** Initial active tab */
  readonly initialTab?: MinutesTab | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * Tab button component
 */
function TabButton({
  label,
  count,
  isActive,
  onClick,
}: {
  readonly label: string;
  readonly count: number;
  readonly isActive: boolean;
  readonly onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-4 py-3 text-sm font-medium border-b-2 transition-colors
        focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-inset
        ${
          isActive
            ? 'text-lark-primary border-lark-primary'
            : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
        }
      `}
      role="tab"
      aria-selected={isActive}
    >
      {label}
      <span
        className={`
          ml-2 px-2 py-0.5 text-xs rounded-full
          ${isActive ? 'bg-lark-primary text-white' : 'bg-gray-100 text-gray-600'}
        `}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * Format duration in milliseconds to human-readable format
 */
function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${minutes}m`;
}

/**
 * MinutesViewer component
 *
 * @description Main component for displaying AI-generated meeting minutes
 * @example
 * ```tsx
 * <MinutesViewer
 *   minutes={minutesData}
 *   isLoading={false}
 *   onTopicClick={handleTopicClick}
 *   onActionStatusChange={handleStatusChange}
 * />
 * ```
 */
function MinutesViewerInner({
  minutes,
  isLoading = false,
  generationState,
  onGenerate,
  onRegenerate,
  onTopicClick,
  onActionStatusChange,
  enableApiSync = false,
  initialTab = 'topics',
  className = '',
}: MinutesViewerProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<MinutesTab>(initialTab);
  const [isCopied, setIsCopied] = useState(false);

  // Create topics map for linking
  const topicsMap = useMemo(() => {
    if (minutes === undefined) return new Map<string, TopicSegment>();
    const map = new Map<string, TopicSegment>();
    for (const topic of minutes.topics) {
      map.set(topic.id, topic);
    }
    return map;
  }, [minutes]);

  // Handle topic link click from decisions
  const handleTopicLinkClick = useCallback(
    (topicId: string) => {
      const topic = topicsMap.get(topicId);
      if (topic !== undefined) {
        setActiveTab('topics');
        onTopicClick?.(topic);
      }
    },
    [topicsMap, onTopicClick]
  );

  // Handle copy to clipboard
  const handleCopy = useCallback(() => {
    if (minutes === undefined) return;

    const markdown = minutesToMarkdown(minutes);
    navigator.clipboard.writeText(markdown).then(
      () => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      },
      (error) => {
        console.error('Failed to copy:', error);
      }
    );
  }, [minutes]);

  // Show loading skeleton
  if (isLoading) {
    return <MinutesSkeleton className={className} />;
  }

  // Show generate card if no minutes and generation handler provided
  if (minutes === undefined && onGenerate !== undefined) {
    return (
      <GenerateMinutesCard
        state={generationState ?? { status: 'idle' }}
        onGenerate={onGenerate}
        className={className}
      />
    );
  }

  // Show empty state if no minutes
  if (minutes === undefined) {
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-sm">議事録はありません</p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg border border-lark-border ${className}`}
      role="region"
      aria-label="会議議事録"
    >
      {/* Header */}
      <header className="p-4 border-b border-lark-border">
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Title and meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <svg
                className="w-5 h-5 text-lark-primary flex-shrink-0"
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
              <h2 className="text-lg font-semibold text-lark-text truncate">
                {minutes.title}
              </h2>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{minutes.date}</span>
              <span>{formatDuration(minutes.duration)}</span>
              <span>{minutes.attendees.length} attendees</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              className="
                flex items-center gap-2 px-3 py-2
                text-sm text-gray-600
                border border-lark-border rounded-lg
                hover:bg-gray-50 transition-colors
                focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
              "
              aria-label="マークダウンとしてコピー"
            >
              {isCopied ? (
                <>
                  <svg
                    className="w-4 h-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>コピーしました!</span>
                </>
              ) : (
                <>
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
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span>コピー</span>
                </>
              )}
            </button>

            {/* Generate/Regenerate button */}
            {onGenerate !== undefined && (
              <GenerateButton
                state={generationState ?? { status: 'completed' }}
                onGenerate={onGenerate}
                onRegenerate={onRegenerate}
                hasExistingMinutes={true}
              />
            )}
          </div>
        </div>

        {/* Overall summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Summary
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            {minutes.summary}
          </p>
        </div>
      </header>

      {/* Tabs */}
      <nav
        className="border-b border-lark-border"
        role="tablist"
        aria-label="議事録セクション"
      >
        <div className="flex gap-4 px-4">
          <TabButton
            label="トピック"
            count={minutes.topics.length}
            isActive={activeTab === 'topics'}
            onClick={() => setActiveTab('topics')}
          />
          <TabButton
            label="決定事項"
            count={minutes.decisions.length}
            isActive={activeTab === 'decisions'}
            onClick={() => setActiveTab('decisions')}
          />
          <TabButton
            label="アクションアイテム"
            count={minutes.actionItems.length}
            isActive={activeTab === 'actions'}
            onClick={() => setActiveTab('actions')}
          />
        </div>
      </nav>

      {/* Tab content */}
      <div className="p-4" role="tabpanel" aria-label={`${activeTab} content`}>
        {activeTab === 'topics' && (
          <TopicList
            topics={minutes.topics}
            onTopicClick={onTopicClick}
            initialExpanded={true}
          />
        )}

        {activeTab === 'decisions' && (
          <DecisionList
            decisions={minutes.decisions}
            topicsMap={topicsMap}
            onTopicLinkClick={handleTopicLinkClick}
          />
        )}

        {activeTab === 'actions' && (
          <>
            <ActionItemList
              actionItems={minutes.actionItems}
              showFilters={true}
              onStatusChange={onActionStatusChange}
              enableApiSync={enableApiSync}
            />
            {/* Link to all action items page */}
            <div className="mt-4 pt-4 border-t border-lark-border">
              <a
                href="/action-items"
                className="
                  inline-flex items-center gap-2
                  text-sm text-lark-primary hover:text-lark-primary-dark
                  transition-colors
                "
              >
                View all action items
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
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </a>
            </div>
          </>
        )}
      </div>

      {/* Footer with metadata */}
      <footer className="px-4 py-3 border-t border-lark-border bg-gray-50 text-xs text-gray-400">
        <div className="flex items-center justify-between">
          <span>
            Generated: {new Date(minutes.metadata.generatedAt).toLocaleString()}
          </span>
          <span>
            Model: {minutes.metadata.model} | Confidence:{' '}
            {(minutes.metadata.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </footer>
    </div>
  );
}

export const MinutesViewer = memo(MinutesViewerInner);
