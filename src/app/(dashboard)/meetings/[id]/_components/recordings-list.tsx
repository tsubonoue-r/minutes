'use client';

/**
 * Recordings List Component
 * Displays meeting recordings with playback options
 * @module app/(dashboard)/meetings/[id]/_components/recordings-list
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

/**
 * Recording status type
 */
export type RecordingStatus = 'ready' | 'processing' | 'failed';

/**
 * Recording data structure from API
 */
export interface RecordingData {
  /** Unique recording ID */
  readonly id: string;
  /** Recording URL */
  readonly url: string;
  /** Recording duration in seconds */
  readonly duration: number;
  /** File size in bytes (optional) */
  readonly fileSize?: number;
  /** Recording format (optional) */
  readonly format?: string;
  /** Creation timestamp (ISO string) */
  readonly createdAt: string;
  /** Recording status */
  readonly status: RecordingStatus;
}

/**
 * Props for RecordingsList component
 */
export interface RecordingsListProps {
  /** List of recordings */
  readonly recordings: readonly RecordingData[];
  /** Whether data is loading */
  readonly isLoading?: boolean;
  /** Error message if fetch failed */
  readonly error?: string | null;
}

/**
 * Format duration from seconds to human-readable string
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    if (remainingSeconds === 0) {
      return `${minutes}分`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format file size to human-readable string
 */
function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined) {
    return '--';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format date for display
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get status badge variant
 */
function getStatusVariant(
  status: RecordingStatus
): 'success' | 'warning' | 'error' {
  const variants: Record<RecordingStatus, 'success' | 'warning' | 'error'> = {
    ready: 'success',
    processing: 'warning',
    failed: 'error',
  };
  return variants[status];
}

/**
 * Get status label
 */
function getStatusLabel(status: RecordingStatus): string {
  const labels: Record<RecordingStatus, string> = {
    ready: '準備完了',
    processing: '処理中',
    failed: '失敗',
  };
  return labels[status];
}

/**
 * Single recording item component
 */
function RecordingItem({
  recording,
}: {
  readonly recording: RecordingData;
}): JSX.Element {
  const isReady = recording.status === 'ready';

  return (
    <div
      className="flex items-center justify-between py-4 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      role="listitem"
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Recording icon */}
        <div
          className="flex-shrink-0 w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
          aria-hidden="true"
        >
          <svg
            className="w-6 h-6 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Recording details */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              録画
            </p>
            <Badge variant={getStatusVariant(recording.status)}>
              {getStatusLabel(recording.status)}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {formatDuration(recording.duration)}
            </span>
            {recording.fileSize !== undefined && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                {formatFileSize(recording.fileSize)}
              </span>
            )}
            <span className="hidden sm:inline">{formatDate(recording.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Action button */}
      <div className="flex-shrink-0 ml-4">
        {isReady ? (
          <a
            href={recording.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm"
            aria-label="録画を再生"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            再生
          </a>
        ) : (
          <span className="text-sm text-slate-400 dark:text-slate-500">
            {recording.status === 'processing' ? '処理中...' : '利用不可'}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for recordings list
 */
function RecordingsListSkeleton(): JSX.Element {
  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {Array.from({ length: 2 }, (_, i) => (
        <div
          key={i}
          className="flex items-center justify-between py-4 px-4"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state component for no recordings
 */
function EmptyState(): JSX.Element {
  return (
    <div className="py-8 text-center">
      <svg
        className="mx-auto h-12 w-12 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
        録画なし
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        この会議には録画がありません。
      </p>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ message }: { readonly message: string }): JSX.Element {
  return (
    <div className="py-8 text-center">
      <svg
        className="mx-auto h-12 w-12 text-red-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
        {message}
      </p>
    </div>
  );
}

/**
 * Recordings List Component
 *
 * @description Displays a list of meeting recordings with playback options.
 * Shows empty state when no recordings exist, loading state during fetch,
 * and error state on failure.
 *
 * @example
 * ```tsx
 * <RecordingsList
 *   recordings={[
 *     { id: '1', url: 'https://...', duration: 3600, status: 'ready', createdAt: '...' },
 *   ]}
 *   isLoading={false}
 * />
 * ```
 */
export function RecordingsList({
  recordings,
  isLoading = false,
  error = null,
}: RecordingsListProps): JSX.Element {
  return (
    <section
      className="card p-0 overflow-hidden"
      aria-labelledby="recordings-heading"
    >
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h2
          id="recordings-heading"
          className="text-lg font-semibold text-slate-900 dark:text-white"
        >
          録画
          {!isLoading && error === null && recordings.length > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
              ({recordings.length})
            </span>
          )}
        </h2>
      </div>

      {isLoading ? (
        <RecordingsListSkeleton />
      ) : error !== null ? (
        <ErrorState message={error} />
      ) : recordings.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          className="divide-y divide-slate-200 dark:divide-slate-700"
          role="list"
          aria-label="会議の録画"
        >
          {recordings.map((recording) => (
            <RecordingItem
              key={recording.id}
              recording={recording}
            />
          ))}
        </div>
      )}
    </section>
  );
}
