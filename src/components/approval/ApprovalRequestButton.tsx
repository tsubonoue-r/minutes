'use client';

/**
 * ApprovalRequestButton Component
 *
 * Button to initiate an approval request for minutes.
 *
 * @module components/approval/ApprovalRequestButton
 */

import { useState, useCallback } from 'react';
import type { Approver, ApprovalStatus } from '@/types/approval';
import { APPROVAL_STATUS } from '@/types/approval';

/**
 * Props for ApprovalRequestButton component
 */
export interface ApprovalRequestButtonProps {
  /** Minutes ID to request approval for */
  minutesId: string;
  /** Meeting ID */
  meetingId: string;
  /** Title for the approval request */
  title: string;
  /** Current approval status (if exists) */
  currentStatus?: ApprovalStatus;
  /** Available approvers to select from */
  availableApprovers: readonly Approver[];
  /** Callback when approval is requested */
  onRequestApproval: (approvers: Approver[], comment?: string) => Promise<void>;
  /** Display language */
  language?: 'ja' | 'en';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Button labels by language
 */
const BUTTON_LABELS = {
  requestApproval: { ja: '承認を依頼', en: 'Request Approval' },
  resubmit: { ja: '再提出', en: 'Resubmit' },
  pending: { ja: '承認待ち', en: 'Pending' },
  approved: { ja: '承認済み', en: 'Approved' },
  selectApprovers: { ja: '承認者を選択', en: 'Select Approvers' },
  comment: { ja: 'コメント（任意）', en: 'Comment (optional)' },
  cancel: { ja: 'キャンセル', en: 'Cancel' },
  submit: { ja: '送信', en: 'Submit' },
  sending: { ja: '送信中...', en: 'Sending...' },
} as const;

/**
 * ApprovalRequestButton Component
 *
 * Provides a button to request approval for minutes with an approver selection dialog.
 *
 * @example
 * ```tsx
 * <ApprovalRequestButton
 *   minutesId="min_123"
 *   meetingId="meeting_456"
 *   title="Weekly Sync Minutes"
 *   availableApprovers={[
 *     { id: 'user_1', name: 'Tanaka' },
 *     { id: 'user_2', name: 'Suzuki' },
 *   ]}
 *   onRequestApproval={async (approvers, comment) => {
 *     await api.requestApproval({ minutesId, approvers, comment });
 *   }}
 * />
 * ```
 */
export function ApprovalRequestButton({
  minutesId: _minutesId,
  meetingId: _meetingId,
  title: _title,
  currentStatus,
  availableApprovers,
  onRequestApproval,
  language = 'ja',
  disabled = false,
  className = '',
}: ApprovalRequestButtonProps): JSX.Element {
  // These props are used for display/context but not directly in this component
  void _minutesId;
  void _meetingId;
  void _title;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedApprovers, setSelectedApprovers] = useState<Approver[]>([]);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labels = BUTTON_LABELS;

  /**
   * Determine button state based on current status
   */
  const getButtonState = (): {
    label: string;
    isDisabled: boolean;
    variant: 'primary' | 'secondary' | 'success';
  } => {
    if (currentStatus === APPROVAL_STATUS.PENDING_APPROVAL) {
      return {
        label: labels.pending[language],
        isDisabled: true,
        variant: 'secondary',
      };
    }
    if (currentStatus === APPROVAL_STATUS.APPROVED) {
      return {
        label: labels.approved[language],
        isDisabled: true,
        variant: 'success',
      };
    }
    if (currentStatus === APPROVAL_STATUS.REJECTED) {
      return {
        label: labels.resubmit[language],
        isDisabled: false,
        variant: 'primary',
      };
    }
    return {
      label: labels.requestApproval[language],
      isDisabled: false,
      variant: 'primary',
    };
  };

  const buttonState = getButtonState();

  /**
   * Handle opening the dialog
   */
  const handleOpenDialog = useCallback((): void => {
    setIsDialogOpen(true);
    setSelectedApprovers([]);
    setComment('');
    setError(null);
  }, []);

  /**
   * Handle closing the dialog
   */
  const handleCloseDialog = useCallback((): void => {
    setIsDialogOpen(false);
    setSelectedApprovers([]);
    setComment('');
    setError(null);
  }, []);

  /**
   * Handle approver selection toggle
   */
  const handleApproverToggle = useCallback((approver: Approver): void => {
    setSelectedApprovers((prev) => {
      const isSelected = prev.some((a) => a.id === approver.id);
      if (isSelected) {
        return prev.filter((a) => a.id !== approver.id);
      }
      return [...prev, approver];
    });
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((): void => {
    if (selectedApprovers.length === 0) {
      setError(language === 'ja' ? '承認者を選択してください' : 'Please select at least one approver');
      return;
    }

    setIsLoading(true);
    setError(null);

    onRequestApproval(selectedApprovers, comment || undefined)
      .then(() => {
        handleCloseDialog();
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedApprovers, comment, onRequestApproval, handleCloseDialog, language]);

  /**
   * Get button variant styles
   */
  const getButtonStyles = (variant: 'primary' | 'secondary' | 'success'): string => {
    const styles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-700 cursor-not-allowed',
      success: 'bg-green-600 text-white cursor-not-allowed',
    };
    return styles[variant];
  };

  return (
    <>
      {/* Main Button */}
      <button
        type="button"
        onClick={handleOpenDialog}
        disabled={disabled || buttonState.isDisabled}
        className={`
          inline-flex items-center px-4 py-2 rounded-md font-medium
          transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:opacity-50
          ${getButtonStyles(buttonState.variant)}
          ${className}
        `}
        aria-label={buttonState.label}
      >
        {buttonState.label}
      </button>

      {/* Approver Selection Dialog */}
      {isDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            {/* Dialog Header */}
            <h2 id="dialog-title" className="text-lg font-semibold text-gray-900 mb-4">
              {labels.selectApprovers[language]}
            </h2>

            {/* Error Message */}
            {error !== null && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Approvers List */}
            <div className="mb-4 max-h-60 overflow-y-auto">
              {availableApprovers.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  {language === 'ja' ? '利用可能な承認者がいません' : 'No approvers available'}
                </p>
              ) : (
                <div className="space-y-2">
                  {availableApprovers.map((approver) => {
                    const isSelected = selectedApprovers.some((a) => a.id === approver.id);
                    return (
                      <label
                        key={approver.id}
                        className={`
                          flex items-center p-3 rounded-md border cursor-pointer
                          transition-colors
                          ${isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleApproverToggle(approver)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-gray-900">{approver.name}</span>
                        {approver.email !== undefined && (
                          <span className="ml-2 text-gray-500 text-sm">({approver.email})</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comment Input */}
            <div className="mb-4">
              <label htmlFor="approval-comment" className="block text-sm font-medium text-gray-700 mb-1">
                {labels.comment[language]}
              </label>
              <textarea
                id="approval-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={language === 'ja' ? '承認者へのメッセージを入力...' : 'Enter message for approvers...'}
              />
            </div>

            {/* Dialog Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseDialog}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {labels.cancel[language]}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || selectedApprovers.length === 0}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? labels.sending[language] : labels.submit[language]}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
