'use client';

/**
 * ApprovalActions Component
 *
 * Action buttons for approvers to approve or reject a request.
 *
 * @module components/approval/ApprovalActions
 */

import { useState } from 'react';
import type { ApprovalRequest, ApprovalAction } from '@/types/approval';
import { APPROVAL_ACTION, canUserApprove, canUserWithdraw } from '@/types/approval';

/**
 * Props for ApprovalActions component
 */
export interface ApprovalActionsProps {
  /** Approval request to act on */
  request: ApprovalRequest;
  /** Current user ID */
  currentUserId: string;
  /** Callback when approval action is taken */
  onApprove: (comment?: string) => Promise<void>;
  /** Callback when rejection action is taken */
  onReject: (comment?: string) => Promise<void>;
  /** Callback when withdraw action is taken */
  onWithdraw?: (comment?: string) => Promise<void>;
  /** Display language */
  language?: 'ja' | 'en';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Labels by language
 */
const LABELS = {
  approve: { ja: '承認', en: 'Approve' },
  reject: { ja: '却下', en: 'Reject' },
  withdraw: { ja: '取り下げ', en: 'Withdraw' },
  approving: { ja: '承認中...', en: 'Approving...' },
  rejecting: { ja: '却下中...', en: 'Rejecting...' },
  withdrawing: { ja: '取り下げ中...', en: 'Withdrawing...' },
  commentPlaceholder: { ja: 'コメント（任意）', en: 'Comment (optional)' },
  confirmApprove: { ja: 'この議事録を承認しますか？', en: 'Approve these minutes?' },
  confirmReject: { ja: 'この議事録を却下しますか？', en: 'Reject these minutes?' },
  confirmWithdraw: { ja: '承認依頼を取り下げますか？', en: 'Withdraw approval request?' },
  cancel: { ja: 'キャンセル', en: 'Cancel' },
  confirm: { ja: '確認', en: 'Confirm' },
  rejectReason: { ja: '却下理由', en: 'Reason for rejection' },
} as const;

/**
 * ApprovalActions Component
 *
 * Displays approve/reject/withdraw buttons based on user permissions.
 *
 * @example
 * ```tsx
 * <ApprovalActions
 *   request={approvalRequest}
 *   currentUserId="user_1"
 *   onApprove={async (comment) => {
 *     await api.approve(request.id, comment);
 *   }}
 *   onReject={async (comment) => {
 *     await api.reject(request.id, comment);
 *   }}
 *   onWithdraw={async (comment) => {
 *     await api.withdraw(request.id, comment);
 *   }}
 * />
 * ```
 */
export function ApprovalActions({
  request,
  currentUserId,
  onApprove,
  onReject,
  onWithdraw,
  language = 'ja',
  className = '',
}: ApprovalActionsProps): JSX.Element | null {
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'withdraw' | null>(null);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labels = LABELS;

  // Check permissions
  const canApprove = canUserApprove(request, currentUserId);
  const canWithdrawRequest = canUserWithdraw(request, currentUserId) && onWithdraw !== undefined;

  // If no actions are available, don't render
  if (!canApprove && !canWithdrawRequest) {
    return null;
  }

  /**
   * Open confirmation dialog
   */
  const openConfirmation = (type: 'approve' | 'reject' | 'withdraw'): void => {
    setActionType(type);
    setComment('');
    setError(null);
  };

  /**
   * Close confirmation dialog
   */
  const closeConfirmation = (): void => {
    setActionType(null);
    setComment('');
    setError(null);
  };

  /**
   * Handle action confirmation
   */
  const handleConfirm = (): void => {
    if (actionType === null) return;

    setIsLoading(true);
    setError(null);

    const performAction = async (): Promise<void> => {
      switch (actionType) {
        case 'approve':
          await onApprove(comment || undefined);
          break;
        case 'reject':
          await onReject(comment || undefined);
          break;
        case 'withdraw':
          if (onWithdraw !== undefined) {
            await onWithdraw(comment || undefined);
          }
          break;
      }
    };

    performAction()
      .then(() => {
        closeConfirmation();
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  /**
   * Get confirmation message
   */
  const getConfirmMessage = (): string => {
    switch (actionType) {
      case 'approve':
        return labels.confirmApprove[language];
      case 'reject':
        return labels.confirmReject[language];
      case 'withdraw':
        return labels.confirmWithdraw[language];
      default:
        return '';
    }
  };

  /**
   * Get loading label
   */
  const getLoadingLabel = (): string => {
    switch (actionType) {
      case 'approve':
        return labels.approving[language];
      case 'reject':
        return labels.rejecting[language];
      case 'withdraw':
        return labels.withdrawing[language];
      default:
        return '';
    }
  };

  /**
   * Check if comment is required (for rejection)
   */
  const isCommentRequired = actionType === 'reject';

  return (
    <>
      {/* Action Buttons */}
      <div className={`flex items-center gap-3 ${className}`}>
        {canApprove && (
          <>
            <button
              type="button"
              onClick={() => openConfirmation('approve')}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              <svg
                className="w-4 h-4 mr-2"
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
              {labels.approve[language]}
            </button>
            <button
              type="button"
              onClick={() => openConfirmation('reject')}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              <svg
                className="w-4 h-4 mr-2"
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
              {labels.reject[language]}
            </button>
          </>
        )}

        {canWithdrawRequest && (
          <button
            type="button"
            onClick={() => openConfirmation('withdraw')}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
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
            {labels.withdraw[language]}
          </button>
        )}
      </div>

      {/* Confirmation Dialog */}
      {actionType !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="action-dialog-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            {/* Dialog Header */}
            <h2 id="action-dialog-title" className="text-lg font-semibold text-gray-900 mb-4">
              {getConfirmMessage()}
            </h2>

            {/* Error Message */}
            {error !== null && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Comment Input */}
            <div className="mb-4">
              <label htmlFor="action-comment" className="block text-sm font-medium text-gray-700 mb-1">
                {isCommentRequired ? labels.rejectReason[language] : labels.commentPlaceholder[language]}
                {isCommentRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
              <textarea
                id="action-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
                required={isCommentRequired}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={
                  isCommentRequired
                    ? language === 'ja'
                      ? '却下の理由を入力してください...'
                      : 'Please enter reason for rejection...'
                    : language === 'ja'
                    ? 'コメントを入力...'
                    : 'Enter comment...'
                }
              />
            </div>

            {/* Dialog Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirmation}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {labels.cancel[language]}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isLoading || (isCommentRequired && comment.trim() === '')}
                className={`
                  px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50
                  ${actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : actionType === 'reject'
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
                  }
                `}
              >
                {isLoading ? getLoadingLabel() : labels.confirm[language]}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Compact approval actions for inline use
 */
export interface CompactApprovalActionsProps {
  /** Approval request to act on */
  request: ApprovalRequest;
  /** Current user ID */
  currentUserId: string;
  /** Callback when action is taken */
  onAction: (action: ApprovalAction, comment?: string) => Promise<void>;
  /** Display language */
  language?: 'ja' | 'en';
}

/**
 * CompactApprovalActions Component
 *
 * Smaller action buttons for use in tables or lists.
 *
 * @example
 * ```tsx
 * <CompactApprovalActions
 *   request={approvalRequest}
 *   currentUserId="user_1"
 *   onAction={async (action, comment) => {
 *     await api.handleAction(request.id, action, comment);
 *   }}
 * />
 * ```
 */
export function CompactApprovalActions({
  request,
  currentUserId,
  onAction,
  language = 'ja',
}: CompactApprovalActionsProps): JSX.Element | null {
  const [isLoading, setIsLoading] = useState(false);

  const canApprove = canUserApprove(request, currentUserId);
  const canWithdrawRequest = canUserWithdraw(request, currentUserId);

  if (!canApprove && !canWithdrawRequest) {
    return null;
  }

  const handleAction = (action: ApprovalAction): void => {
    setIsLoading(true);
    onAction(action)
      .catch((err: unknown) => {
        console.error('Action failed:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className="flex items-center gap-1">
      {canApprove && (
        <>
          <button
            type="button"
            onClick={() => { handleAction(APPROVAL_ACTION.APPROVE); }}
            disabled={isLoading}
            className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors disabled:opacity-50"
            title={LABELS.approve[language]}
            aria-label={LABELS.approve[language]}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => { handleAction(APPROVAL_ACTION.REJECT); }}
            disabled={isLoading}
            className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"
            title={LABELS.reject[language]}
            aria-label={LABELS.reject[language]}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      )}
      {canWithdrawRequest && (
        <button
          type="button"
          onClick={() => { handleAction(APPROVAL_ACTION.WITHDRAW); }}
          disabled={isLoading}
          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
          title={LABELS.withdraw[language]}
          aria-label={LABELS.withdraw[language]}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      )}
    </div>
  );
}
