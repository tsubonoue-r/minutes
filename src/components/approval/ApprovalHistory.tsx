'use client';

/**
 * ApprovalHistory Component
 *
 * Displays the history of approval actions for a request.
 *
 * @module components/approval/ApprovalHistory
 */

import type { ApprovalHistoryEntry, ApprovalAction } from '@/types/approval';
import { APPROVAL_ACTION, getActionLabel } from '@/types/approval';

/**
 * Props for ApprovalHistory component
 */
export interface ApprovalHistoryProps {
  /** List of history entries */
  history: readonly ApprovalHistoryEntry[];
  /** Display language */
  language?: 'ja' | 'en';
  /** Additional CSS classes */
  className?: string;
  /** Maximum entries to show (0 for all) */
  maxEntries?: number;
}

/**
 * Labels by language
 */
const LABELS = {
  noHistory: { ja: '履歴はありません', en: 'No history available' },
  showMore: { ja: 'もっと見る', en: 'Show more' },
  by: { ja: 'by', en: 'by' },
} as const;

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string, language: 'ja' | 'en'): string {
  const date = new Date(isoString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return date.toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', options);
}

/**
 * Get action icon
 */
function getActionIcon(action: ApprovalAction): JSX.Element {
  switch (action) {
    case APPROVAL_ACTION.SUBMIT:
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      );
    case APPROVAL_ACTION.APPROVE:
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case APPROVAL_ACTION.REJECT:
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case APPROVAL_ACTION.WITHDRAW:
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

/**
 * Get action color classes
 */
function getActionColorClasses(action: ApprovalAction): string {
  switch (action) {
    case APPROVAL_ACTION.SUBMIT:
      return 'bg-blue-100 text-blue-600';
    case APPROVAL_ACTION.APPROVE:
      return 'bg-green-100 text-green-600';
    case APPROVAL_ACTION.REJECT:
      return 'bg-red-100 text-red-600';
    case APPROVAL_ACTION.WITHDRAW:
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

/**
 * ApprovalHistory Component
 *
 * Displays a timeline of approval actions.
 *
 * @example
 * ```tsx
 * <ApprovalHistory
 *   history={[
 *     {
 *       id: 'hist_1',
 *       approvalRequestId: 'apr_123',
 *       action: 'submit',
 *       actorId: 'user_1',
 *       actorName: 'Suzuki',
 *       previousStatus: 'draft',
 *       newStatus: 'pending_approval',
 *       timestamp: '2024-01-15T10:00:00Z',
 *     },
 *     {
 *       id: 'hist_2',
 *       approvalRequestId: 'apr_123',
 *       action: 'approve',
 *       actorId: 'user_2',
 *       actorName: 'Tanaka',
 *       previousStatus: 'pending_approval',
 *       newStatus: 'approved',
 *       comment: 'Looks good!',
 *       timestamp: '2024-01-15T11:30:00Z',
 *     },
 *   ]}
 * />
 * ```
 */
export function ApprovalHistory({
  history,
  language = 'ja',
  className = '',
  maxEntries = 0,
}: ApprovalHistoryProps): JSX.Element {
  const labels = LABELS;

  if (history.length === 0) {
    return (
      <div className={`text-gray-500 text-sm ${className}`}>
        {labels.noHistory[language]}
      </div>
    );
  }

  // Sort by timestamp descending (most recent first)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Apply max entries limit
  const displayHistory = maxEntries > 0 ? sortedHistory.slice(0, maxEntries) : sortedHistory;
  const hasMore = maxEntries > 0 && sortedHistory.length > maxEntries;

  return (
    <div className={`${className}`}>
      <div className="flow-root">
        <ul role="list" className="-mb-8">
          {displayHistory.map((entry, index) => {
            const isLast = index === displayHistory.length - 1;

            return (
              <li key={entry.id}>
                <div className="relative pb-8">
                  {/* Timeline connector */}
                  {!isLast && (
                    <span
                      className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}

                  <div className="relative flex items-start space-x-3">
                    {/* Action Icon */}
                    <div className="relative">
                      <span
                        className={`
                          flex h-10 w-10 items-center justify-center rounded-full ring-8 ring-white
                          ${getActionColorClasses(entry.action)}
                        `}
                      >
                        {getActionIcon(entry.action)}
                      </span>
                    </div>

                    {/* Entry Content */}
                    <div className="min-w-0 flex-1">
                      <div>
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">
                            {entry.actorName}
                          </span>
                          {' '}
                          <span className="text-gray-500">
                            {getActionLabel(entry.action, language)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {formatTimestamp(entry.timestamp, language)}
                        </p>
                      </div>

                      {/* Comment */}
                      {entry.comment !== undefined && entry.comment !== '' && (
                        <div className="mt-2 text-sm text-gray-700 bg-gray-50 rounded-md p-3">
                          {entry.comment}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Show more indicator */}
      {hasMore && (
        <div className="text-center mt-4">
          <span className="text-sm text-gray-500">
            + {sortedHistory.length - maxEntries} {labels.showMore[language]}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact history entry for inline display
 */
export interface ApprovalHistoryEntryCardProps {
  /** History entry */
  entry: ApprovalHistoryEntry;
  /** Display language */
  language?: 'ja' | 'en';
}

/**
 * ApprovalHistoryEntryCard Component
 *
 * A single history entry displayed as a card.
 *
 * @example
 * ```tsx
 * <ApprovalHistoryEntryCard entry={historyEntry} />
 * ```
 */
export function ApprovalHistoryEntryCard({
  entry,
  language = 'ja',
}: ApprovalHistoryEntryCardProps): JSX.Element {
  return (
    <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-md">
      {/* Icon */}
      <span
        className={`
          flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0
          ${getActionColorClasses(entry.action)}
        `}
      >
        {getActionIcon(entry.action)}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {getActionLabel(entry.action, language)}
        </p>
        <p className="text-xs text-gray-500">
          {entry.actorName} - {formatTimestamp(entry.timestamp, language)}
        </p>
        {entry.comment !== undefined && entry.comment !== '' && (
          <p className="mt-1 text-sm text-gray-600">{entry.comment}</p>
        )}
      </div>
    </div>
  );
}
