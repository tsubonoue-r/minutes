'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { ExportOptions, ExportPermission, ExportStatus } from '@/types/export';
import type { Speaker } from '@/types/minutes';
import { ExportProgress } from './ExportProgress';
import { ExportSuccess } from './ExportSuccess';

/**
 * Props for ExportDialog component
 */
export interface ExportDialogProps {
  /** Whether the dialog is open */
  readonly isOpen: boolean;
  /** Callback when dialog should close */
  readonly onClose: () => void;
  /** Minutes ID being exported */
  readonly minutesId: string;
  /** Title of the minutes */
  readonly minutesTitle: string;
  /** Meeting attendees */
  readonly attendees: readonly Speaker[];
  /** Callback when export is initiated */
  readonly onExport: (options: ExportOptions) => Promise<void>;
  /** Current export status (optional, for controlling progress externally) */
  readonly exportStatus?: ExportStatus | undefined;
  /** Current export progress (0-100) */
  readonly exportProgress?: number | undefined;
  /** Export result URL when completed */
  readonly exportResultUrl?: string | undefined;
  /** Export error message */
  readonly exportError?: string | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * Close icon component
 */
function CloseIcon({ className = '' }: { readonly className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

/**
 * Lark Docs icon component
 */
function LarkDocsIcon({ className = '' }: { readonly className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="4" fill="#3370FF" />
      <path
        d="M7 8h10M7 12h10M7 16h6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * ExportDialog component
 *
 * @description Modal dialog for configuring and executing export to Lark Docs
 *
 * @example
 * ```tsx
 * <ExportDialog
 *   isOpen={isDialogOpen}
 *   onClose={() => setDialogOpen(false)}
 *   minutesId="min_123"
 *   minutesTitle="Weekly Standup"
 *   attendees={meeting.attendees}
 *   onExport={handleExport}
 * />
 * ```
 */
function ExportDialogInner({
  isOpen,
  onClose,
  minutesId: _minutesId,
  minutesTitle,
  attendees,
  onExport,
  exportStatus = 'idle',
  exportProgress = 0,
  exportResultUrl,
  exportError,
  className = '',
}: ExportDialogProps): JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Note: _minutesId is available for future use (e.g., API calls)
  void _minutesId;

  // Form state
  const [title, setTitle] = useState(minutesTitle);
  const [shareWithAttendees, setShareWithAttendees] = useState(false);
  const [permission, setPermission] = useState<ExportPermission>('view');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTitle(minutesTitle);
      setShareWithAttendees(false);
      setPermission('view');
      setIsSubmitting(false);
    }
  }, [isOpen, minutesTitle]);

  // Focus title input when dialog opens
  useEffect((): (() => void) | undefined => {
    if (isOpen && exportStatus === 'idle') {
      // Small delay to ensure dialog is rendered
      const timer = setTimeout((): void => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 100);
      return (): void => { clearTimeout(timer); };
    }
    return undefined;
  }, [isOpen, exportStatus]);

  // Handle escape key
  useEffect((): (() => void) => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return (): void => { document.removeEventListener('keydown', handleKeyDown); };
  }, [isOpen, onClose]);

  // Handle click outside dialog
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle export submission
  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (isSubmitting) return;

      setIsSubmitting(true);

      const options: ExportOptions = {
        title: title.trim() || minutesTitle,
        shareWithAttendees,
        permission,
      };

      try {
        await onExport(options);
      } catch (error) {
        console.error('Export failed:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, title, minutesTitle, shareWithAttendees, permission, onExport]
  );

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  const isExporting = exportStatus !== 'idle' && exportStatus !== 'completed' && exportStatus !== 'error';
  const isCompleted = exportStatus === 'completed' && exportResultUrl !== undefined;
  const isError = exportStatus === 'error';
  const showForm = !isExporting && !isCompleted;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
    >
      <div
        ref={dialogRef}
        className={`
          w-full max-w-md bg-white rounded-xl shadow-xl
          transform transition-all
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-lark-border">
          <div className="flex items-center gap-3">
            <LarkDocsIcon className="w-8 h-8" />
            <h2
              id="export-dialog-title"
              className="text-lg font-semibold text-lark-text"
            >
              Lark Docsにエクスポート
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="
              p-2 rounded-lg text-gray-400
              hover:text-gray-600 hover:bg-gray-100
              focus:outline-none focus:ring-2 focus:ring-lark-primary
              transition-colors
            "
            aria-label="ダイアログを閉じる"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Export progress view */}
          {isExporting && (
            <ExportProgress
              status={exportStatus}
              progress={exportProgress}
            />
          )}

          {/* Success view */}
          {isCompleted && (
            <ExportSuccess
              documentUrl={exportResultUrl}
              documentTitle={title || minutesTitle}
              onClose={onClose}
            />
          )}

          {/* Error message */}
          {isError && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg text-red-600">
                <svg
                  className="w-6 h-6 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-medium">エクスポート失敗</p>
                  <p className="text-sm text-red-500 mt-1">
                    {exportError ?? '予期しないエラーが発生しました。もう一度お試しください。'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="
                  w-full px-4 py-2.5 rounded-lg
                  text-sm font-medium text-gray-700
                  border border-lark-border
                  hover:bg-gray-50 transition-colors
                  focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
                "
              >
                閉じる
              </button>
            </div>
          )}

          {/* Export form */}
          {showForm && (
            <form
              onSubmit={(e): void => { void handleSubmit(e); }}
              className="space-y-5"
            >
              {/* Title input */}
              <div>
                <label
                  htmlFor="export-title"
                  className="block text-sm font-medium text-lark-text mb-1.5"
                >
                  ドキュメントタイトル
                </label>
                <input
                  ref={titleInputRef}
                  id="export-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={minutesTitle}
                  className="
                    w-full px-3 py-2.5 rounded-lg
                    border border-lark-border
                    text-sm text-lark-text
                    placeholder:text-gray-400
                    focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-transparent
                    transition-colors
                  "
                />
              </div>

              {/* Share with attendees */}
              {attendees.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      id="share-attendees"
                      type="checkbox"
                      checked={shareWithAttendees}
                      onChange={(e) => setShareWithAttendees(e.target.checked)}
                      className="
                        w-4 h-4 rounded
                        border-lark-border
                        text-lark-primary
                        focus:ring-lark-primary focus:ring-offset-0
                      "
                    />
                    <label
                      htmlFor="share-attendees"
                      className="text-sm text-lark-text"
                    >
                      会議参加者と共有 ({attendees.length}人)
                    </label>
                  </div>

                  {/* Permission select - only show when sharing is enabled */}
                  {shareWithAttendees && (
                    <div className="ml-7">
                      <label
                        htmlFor="permission-select"
                        className="block text-sm text-gray-500 mb-1.5"
                      >
                        権限
                      </label>
                      <select
                        id="permission-select"
                        value={permission}
                        onChange={(e) => setPermission(e.target.value as ExportPermission)}
                        className="
                          w-full px-3 py-2 rounded-lg
                          border border-lark-border
                          text-sm text-lark-text
                          bg-white
                          focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-transparent
                          transition-colors
                        "
                      >
                        <option value="view">閲覧可能</option>
                        <option value="edit">編集可能</option>
                      </select>
                    </div>
                  )}

                  {/* Attendee list preview */}
                  {shareWithAttendees && attendees.length > 0 && (
                    <div className="ml-7 mt-2">
                      <p className="text-xs text-gray-500 mb-2">共有先:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {attendees.slice(0, 5).map((attendee) => (
                          <span
                            key={attendee.id}
                            className="
                              inline-flex items-center px-2 py-0.5
                              text-xs text-gray-600
                              bg-gray-100 rounded-full
                            "
                          >
                            {attendee.name}
                          </span>
                        ))}
                        {attendees.length > 5 && (
                          <span className="text-xs text-gray-500">
                            他{attendees.length - 5}人
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Submit button */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="
                    flex-1 px-4 py-2.5 rounded-lg
                    text-sm font-medium text-gray-700
                    border border-lark-border
                    hover:bg-gray-50 transition-colors
                    focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
                  "
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="
                    flex-1 flex items-center justify-center gap-2
                    px-4 py-2.5 rounded-lg
                    text-sm font-medium text-white
                    bg-lark-primary
                    hover:bg-blue-600 transition-colors
                    focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin w-4 h-4"
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
                      <span>エクスポート中...</span>
                    </>
                  ) : (
                    <span>エクスポート</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export const ExportDialog = memo(ExportDialogInner);
