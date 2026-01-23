'use client';

/**
 * Meeting Actions Component
 * Action buttons for meeting detail page
 * @module app/(dashboard)/meetings/[id]/_components/meeting-actions
 */

import type { MinutesStatus } from '@/types/meeting';

/**
 * Navigate to a URL using window.location
 * This avoids Next.js strict route type checking issues
 */
function navigateTo(url: string): void {
  window.location.href = url;
}

/**
 * Props for MeetingActions component
 */
export interface MeetingActionsProps {
  /** Meeting ID */
  readonly meetingId: string;
  /** Minutes status for the meeting */
  readonly minutesStatus: MinutesStatus;
  /** Whether the meeting has recordings */
  readonly hasRecording: boolean;
  /** Callback when generate minutes is clicked */
  readonly onGenerateMinutes?: () => void;
  /** Whether generating minutes is in progress */
  readonly isGenerating?: boolean;
}

/**
 * Get button text based on minutes status
 */
function getMinutesButtonText(status: MinutesStatus): string {
  const texts: Record<MinutesStatus, string> = {
    not_created: '議事録を生成',
    draft: '下書きを編集',
    pending_approval: '議事録をレビュー',
    approved: '議事録を表示',
  };
  return texts[status];
}

/**
 * Check if minutes generation is available
 */
function canGenerateMinutes(
  status: MinutesStatus,
  hasRecording: boolean
): boolean {
  // Can only generate if status is not_created and there's a recording
  return status === 'not_created' && hasRecording;
}

/**
 * Meeting Actions Component
 *
 * @description Provides action buttons for the meeting detail page,
 * including generating minutes and navigation.
 *
 * @example
 * ```tsx
 * <MeetingActions
 *   meetingId="mtg-123"
 *   minutesStatus="not_created"
 *   hasRecording={true}
 *   onGenerateMinutes={() => console.log('Generate')}
 * />
 * ```
 */
export function MeetingActions({
  meetingId,
  minutesStatus,
  hasRecording,
  onGenerateMinutes,
  isGenerating = false,
}: MeetingActionsProps): JSX.Element {
  const canGenerate = canGenerateMinutes(minutesStatus, hasRecording);
  const buttonText = getMinutesButtonText(minutesStatus);

  const handleGenerateClick = (): void => {
    if (canGenerate && onGenerateMinutes !== undefined) {
      onGenerateMinutes();
    }
  };

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        アクション
      </h2>

      <div className="space-y-3">
        {/* Generate Minutes Button */}
        <button
          type="button"
          onClick={handleGenerateClick}
          disabled={!canGenerate || isGenerating}
          className="btn-primary w-full justify-center"
          aria-describedby={!hasRecording ? 'no-recording-hint' : undefined}
        >
          {isGenerating ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              生成中...
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {buttonText}
            </>
          )}
        </button>

        {/* Hint text when recording is unavailable */}
        {!hasRecording && minutesStatus === 'not_created' && (
          <p
            id="no-recording-hint"
            className="text-xs text-slate-500 dark:text-slate-400 text-center"
          >
            議事録の生成には録画が必要です
          </p>
        )}

        {/* View Existing Minutes Link (if not not_created) */}
        {minutesStatus !== 'not_created' && (
          <button
            type="button"
            onClick={() => navigateTo(`/meetings/${meetingId}/minutes`)}
            className="btn-secondary w-full justify-center"
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
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            {buttonText}
          </button>
        )}

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
        </div>

        {/* Back to List Link */}
        <button
          type="button"
          onClick={() => navigateTo('/meetings')}
          className="btn-ghost w-full justify-center"
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
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          会議一覧に戻る
        </button>
      </div>
    </div>
  );
}
