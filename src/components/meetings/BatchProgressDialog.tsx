'use client';

/**
 * BatchProgressDialog - Dialog showing batch job progress
 * @module components/meetings/BatchProgressDialog
 *
 * Displays a modal dialog with progress bar, current meeting
 * being processed, and per-meeting status list.
 */

import { memo, useCallback, useEffect, useRef } from 'react';
import type { BatchJob, BatchResultItem } from '@/types/batch';
import { calculateBatchProgress, isBatchJobFinished } from '@/types/batch';

// =============================================================================
// Types
// =============================================================================

/**
 * BatchProgressDialog component props
 */
export interface BatchProgressDialogProps {
  /** Whether the dialog is open */
  readonly isOpen: boolean;
  /** The current batch job (null if no active job) */
  readonly job: BatchJob | null;
  /** Progress percentage (0-100) */
  readonly progress: number;
  /** Error message if the batch failed to start */
  readonly error: string | null;
  /** Whether the batch is currently running */
  readonly isRunning: boolean;
  /** Callback to close the dialog */
  readonly onClose: () => void;
  /** Callback to retry failed meetings */
  readonly onRetryFailed: () => void;
  /** Callback to reset and start over */
  readonly onReset: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Dialog showing batch minutes generation progress.
 *
 * Features:
 * - Overall progress bar (completed + failed / total)
 * - Current meeting being processed
 * - Per-meeting status list with icons
 * - Retry failed button when applicable
 * - Close button when the job is complete
 *
 * @example
 * ```tsx
 * <BatchProgressDialog
 *   isOpen={showDialog}
 *   job={job}
 *   progress={progress}
 *   error={error}
 *   isRunning={isRunning}
 *   onClose={handleClose}
 *   onRetryFailed={retryFailed}
 *   onReset={reset}
 * />
 * ```
 */
function BatchProgressDialogInner({
  isOpen,
  job,
  progress,
  error,
  isRunning,
  onClose,
  onRetryFailed,
  onReset,
}: BatchProgressDialogProps): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Control the dialog open/close state
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Handle Escape key (native dialog behavior)
  const handleDialogClose = useCallback((): void => {
    if (!isRunning) {
      onClose();
    }
  }, [isRunning, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>): void => {
      if (event.target === dialogRef.current && !isRunning) {
        onClose();
      }
    },
    [isRunning, onClose]
  );

  const isFinished = job !== null && isBatchJobFinished(job);
  const hasFailures = job !== null && job.progress.failed > 0;
  const computedProgress = job !== null ? calculateBatchProgress(job) : progress;

  return (
    <dialog
      ref={dialogRef}
      onClose={handleDialogClose}
      onClick={handleBackdropClick}
      className="
        fixed inset-0 z-50
        w-full max-w-lg m-auto p-0
        bg-transparent backdrop:bg-black/50
        open:flex open:items-center open:justify-center
      "
      aria-labelledby="batch-progress-title"
    >
      <div
        className="
          w-full bg-white rounded-xl shadow-xl
          border border-lark-border
          overflow-hidden
        "
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-lark-border">
          <h2
            id="batch-progress-title"
            className="text-lg font-semibold text-gray-900"
          >
            一括議事録生成
          </h2>
          {!isRunning && (
            <button
              type="button"
              onClick={onClose}
              className="
                p-1 rounded-md text-gray-400
                hover:text-gray-600 hover:bg-gray-100
                focus:outline-none focus:ring-2 focus:ring-lark-primary
                transition-colors
              "
              aria-label="閉じる"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Error state (failed to start) */}
          {error !== null && job === null && (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <ErrorIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  バッチ処理の開始に失敗しました
                </p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Progress section */}
          {job !== null && (
            <>
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {isRunning ? '処理中...' : isFinished ? '完了' : '待機中'}
                  </span>
                  <span className="font-medium text-gray-900">
                    {job.progress.completed + job.progress.failed} / {job.progress.total}
                  </span>
                </div>
                <div
                  className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={computedProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="バッチ処理の進捗"
                >
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out bg-lark-primary"
                    style={{ width: `${computedProgress}%` }}
                  />
                </div>
              </div>

              {/* Current meeting indicator */}
              {job.progress.current !== undefined && isRunning && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <SpinnerIcon className="w-4 h-4 animate-spin text-lark-primary" />
                  <span>
                    処理中: <span className="font-mono text-xs">{job.progress.current}</span>
                  </span>
                </div>
              )}

              {/* Summary stats */}
              {isFinished && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <SuccessIcon className="w-4 h-4 text-green-500" />
                    <span className="text-gray-700">
                      成功: {job.progress.completed}件
                    </span>
                  </div>
                  {job.progress.failed > 0 && (
                    <div className="flex items-center gap-1.5">
                      <ErrorIcon className="w-4 h-4 text-red-500" />
                      <span className="text-gray-700">
                        失敗: {job.progress.failed}件
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Per-meeting results list */}
              {job.results.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-sm font-medium text-gray-700">
                    処理結果
                  </h3>
                  <ul className="space-y-1 max-h-48 overflow-y-auto" role="list">
                    {job.results.map((result) => (
                      <ResultItem key={result.meetingId} result={result} />
                    ))}
                    {/* Pending items */}
                    {job.meetingIds
                      .filter(
                        (id) =>
                          !job.results.some((r) => r.meetingId === id) &&
                          id !== job.progress.current
                      )
                      .map((id) => (
                        <li
                          key={id}
                          className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-400 rounded"
                        >
                          <PendingIcon className="w-4 h-4" />
                          <span className="font-mono text-xs truncate">
                            {id}
                          </span>
                          <span className="ml-auto text-xs">待機中</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-lark-border bg-gray-50">
          {/* Retry failed button */}
          {isFinished && hasFailures && (
            <button
              type="button"
              onClick={onRetryFailed}
              className="
                inline-flex items-center gap-2 px-4 py-2
                text-sm font-medium text-lark-primary
                border border-lark-primary rounded-lg
                hover:bg-blue-50 transition-colors
                focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
              "
            >
              <RetryIcon className="w-4 h-4" />
              <span>失敗した会議を再試行</span>
            </button>
          )}

          {/* Close / Reset button */}
          {!isRunning && (
            <button
              type="button"
              onClick={() => {
                onReset();
                onClose();
              }}
              className="
                inline-flex items-center px-4 py-2
                text-sm font-medium text-white
                bg-lark-primary rounded-lg
                hover:bg-blue-600 transition-colors
                focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
              "
            >
              閉じる
            </button>
          )}

          {/* Running indicator */}
          {isRunning && (
            <span className="text-sm text-gray-500">
              処理完了までお待ちください...
            </span>
          )}
        </div>
      </div>
    </dialog>
  );
}

export const BatchProgressDialog = memo(BatchProgressDialogInner);

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Individual result item in the results list
 */
function ResultItem({
  result,
}: {
  readonly result: BatchResultItem;
}): JSX.Element {
  const isSuccess = result.status === 'success';
  const isFailed = result.status === 'failed';
  const isSkipped = result.status === 'skipped';

  return (
    <li
      className={`
        flex items-center gap-2.5 px-3 py-1.5 text-sm rounded
        ${isSuccess ? 'bg-green-50 text-green-800' : ''}
        ${isFailed ? 'bg-red-50 text-red-800' : ''}
        ${isSkipped ? 'bg-yellow-50 text-yellow-800' : ''}
      `}
      role="listitem"
    >
      {isSuccess && <SuccessIcon className="w-4 h-4 text-green-500 flex-shrink-0" />}
      {isFailed && <ErrorIcon className="w-4 h-4 text-red-500 flex-shrink-0" />}
      {isSkipped && <SkipIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />}

      <span className="font-mono text-xs truncate">{result.meetingId}</span>

      <span className="ml-auto text-xs flex-shrink-0">
        {isSuccess && '成功'}
        {isFailed && '失敗'}
        {isSkipped && 'スキップ'}
      </span>

      {isFailed && result.error !== undefined && (
        <span
          className="text-xs text-red-600 truncate max-w-[120px]"
          title={result.error}
        >
          {result.error}
        </span>
      )}
    </li>
  );
}

// =============================================================================
// Icons
// =============================================================================

function CloseIcon({ className = '' }: { readonly className?: string }): JSX.Element {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SpinnerIcon({ className = '' }: { readonly className?: string }): JSX.Element {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function SuccessIcon({ className = '' }: { readonly className?: string }): JSX.Element {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ErrorIcon({ className = '' }: { readonly className?: string }): JSX.Element {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PendingIcon({ className = '' }: { readonly className?: string }): JSX.Element {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SkipIcon({ className = '' }: { readonly className?: string }): JSX.Element {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  );
}

function RetryIcon({ className = '' }: { readonly className?: string }): JSX.Element {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}
