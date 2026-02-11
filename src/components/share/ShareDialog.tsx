/**
 * ShareDialog Component - Dialog for creating and managing share links
 * @module components/share/ShareDialog
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ShareExpiryOption } from '@/types/share';
import { SHARE_EXPIRY_LABELS } from '@/types/share';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for ShareDialog component
 */
export interface ShareDialogProps {
  /** Meeting ID to share */
  readonly meetingId: string;
  /** Meeting title for display */
  readonly meetingTitle: string;
  /** Whether the dialog is open */
  readonly isOpen: boolean;
  /** Callback to close the dialog */
  readonly onClose: () => void;
}

/**
 * Share link item from API
 */
interface ShareLinkItem {
  readonly id: string;
  readonly token: string;
  readonly url: string;
  readonly expiresAt?: string | undefined;
  readonly hasPassword: boolean;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly accessCount: number;
}

/**
 * API response types
 */
interface CreateShareLinkResponse {
  readonly data?: ShareLinkItem | undefined;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  } | undefined;
}

interface GetShareLinksResponse {
  readonly data?: readonly ShareLinkItem[] | undefined;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  } | undefined;
}

/**
 * Form state
 */
interface FormState {
  readonly expiresIn: ShareExpiryOption;
  readonly password: string;
  readonly usePassword: boolean;
}

/**
 * Dialog state
 */
interface DialogState {
  readonly links: readonly ShareLinkItem[];
  readonly isLoading: boolean;
  readonly isCreating: boolean;
  readonly error: string | null;
  readonly copiedId: string | null;
  readonly currentTime: number;
}

// =============================================================================
// Constants
// =============================================================================

const EXPIRY_OPTIONS: readonly ShareExpiryOption[] = ['1d', '7d', '30d', 'never'];

const INITIAL_FORM_STATE: FormState = {
  expiresIn: '7d',
  password: '',
  usePassword: false,
};

const INITIAL_DIALOG_STATE: DialogState = {
  links: [],
  isLoading: false,
  isCreating: false,
  error: null,
  copiedId: null,
  currentTime: 0,
};

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Copy to clipboard icon
 */
function CopyIcon(): JSX.Element {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
  );
}

/**
 * Check icon for copy confirmation
 */
function CheckIcon(): JSX.Element {
  return (
    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * Close icon
 */
function CloseIcon(): JSX.Element {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Link icon
 */
function LinkIcon(): JSX.Element {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

/**
 * Lock icon
 */
function LockIcon(): JSX.Element {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

/**
 * Format relative time in Japanese
 */
function formatRelativeTime(dateStr: string, nowMs: number): string {
  const date = new Date(dateStr);
  const diffMs = nowMs - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'たった今';
  if (diffMinutes < 60) return `${String(diffMinutes)}分前`;
  if (diffHours < 24) return `${String(diffHours)}時間前`;
  if (diffDays < 30) return `${String(diffDays)}日前`;
  return date.toLocaleDateString('ja-JP');
}

/**
 * Format expiry label
 */
function formatExpiry(expiresAt: string | undefined, nowMs: number): string {
  if (expiresAt === undefined) return '無期限';
  const date = new Date(expiresAt);
  if (date.getTime() < nowMs) return '期限切れ';
  return `${date.toLocaleDateString('ja-JP')} まで`;
}

/**
 * Share link item row
 */
function ShareLinkRow({
  link,
  copiedId,
  isExpired,
  nowMs,
  onCopy,
  onDeactivate,
}: {
  readonly link: ShareLinkItem;
  readonly copiedId: string | null;
  readonly isExpired: boolean;
  readonly nowMs: number;
  readonly onCopy: (url: string, id: string) => void;
  readonly onDeactivate: (id: string) => void;
}): JSX.Element {
  const isInactive = !link.isActive || isExpired;

  return (
    <div
      className={`
        p-3 rounded-lg border transition-colors
        ${isInactive
          ? 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 opacity-60'
          : 'border-lark-border dark:border-slate-700 bg-white dark:bg-slate-800'
        }
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <LinkIcon />
          <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
            {link.url}
          </span>
          {link.hasPassword && (
            <span className="shrink-0 text-gray-400 dark:text-slate-500" title="パスワード保護">
              <LockIcon />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isInactive && (
            <button
              type="button"
              onClick={() => onCopy(link.url, link.id)}
              className="p-1.5 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="リンクをコピー"
            >
              {copiedId === link.id ? <CheckIcon /> : <CopyIcon />}
            </button>
          )}
          {link.isActive && (
            <button
              type="button"
              onClick={() => onDeactivate(link.id)}
              className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="リンクを無効化"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-slate-500">
        <span>{formatRelativeTime(link.createdAt, nowMs)}に作成</span>
        <span>{formatExpiry(link.expiresAt, nowMs)}</span>
        <span>アクセス: {link.accessCount}回</span>
        {!link.isActive && (
          <span className="text-red-500 dark:text-red-400 font-medium">無効</span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * ShareDialog Component
 *
 * A modal dialog for creating and managing share links for meetings.
 * Features:
 * - Create new share links with expiry and optional password
 * - View existing share links
 * - Copy share link to clipboard
 * - Deactivate share links
 *
 * @example
 * ```tsx
 * <ShareDialog
 *   meetingId="meeting-123"
 *   meetingTitle="Weekly Standup"
 *   isOpen={isShareOpen}
 *   onClose={() => setIsShareOpen(false)}
 * />
 * ```
 */
export function ShareDialog({
  meetingId,
  meetingTitle,
  isOpen,
  onClose,
}: ShareDialogProps): JSX.Element | null {
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [state, setState] = useState<DialogState>(INITIAL_DIALOG_STATE);

  /**
   * Fetch existing share links
   */
  const fetchLinks = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}/share`);

      if (!response.ok) {
        throw new Error('共有リンクの取得に失敗しました');
      }

      const data = (await response.json()) as GetShareLinksResponse;
      setState((prev) => ({
        ...prev,
        links: data.data ?? [],
        isLoading: false,
        currentTime: Date.now(),
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'エラーが発生しました',
      }));
    }
  }, [meetingId]);

  /**
   * Create a new share link
   */
  const handleCreate = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isCreating: true, error: null }));

    try {
      const body: Record<string, unknown> = {
        expiresIn: form.expiresIn,
      };

      if (form.usePassword && form.password.length >= 4) {
        body['password'] = form.password;
      }

      const response = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = (await response.json()) as CreateShareLinkResponse;
        throw new Error(data.error?.message ?? '共有リンクの作成に失敗しました');
      }

      // Reset form and refresh list
      setForm(INITIAL_FORM_STATE);
      await fetchLinks();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'エラーが発生しました',
      }));
    } finally {
      setState((prev) => ({ ...prev, isCreating: false }));
    }
  }, [meetingId, form, fetchLinks]);

  /**
   * Copy link to clipboard
   */
  const handleCopy = useCallback(async (url: string, id: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      setState((prev) => ({ ...prev, copiedId: id }));
      setTimeout(() => {
        setState((prev) => ({ ...prev, copiedId: null }));
      }, 2000);
    } catch {
      // Fallback: create a temporary input
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setState((prev) => ({ ...prev, copiedId: id }));
      setTimeout(() => {
        setState((prev) => ({ ...prev, copiedId: null }));
      }, 2000);
    }
  }, []);

  /**
   * Deactivate a share link
   */
  const handleDeactivate = useCallback(async (linkId: string): Promise<void> => {
    try {
      const response = await fetch(
        `/api/meetings/${encodeURIComponent(meetingId)}/share?linkId=${encodeURIComponent(linkId)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('共有リンクの無効化に失敗しました');
      }

      await fetchLinks();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'エラーが発生しました',
      }));
    }
  }, [meetingId, fetchLinks]);

  // Fetch links when dialog opens
  useEffect(() => {
    if (isOpen) {
      void fetchLinks();
    }
  }, [isOpen, fetchLinks]);

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-lark-border dark:border-slate-700">
          <h2
            id="share-dialog-title"
            className="text-lg font-semibold text-slate-900 dark:text-white"
          >
            議事録を共有
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-slate-300 transition-colors"
            aria-label="閉じる"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {/* Meeting title */}
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
            「{meetingTitle}」の共有リンクを作成します
          </p>

          {/* Create form */}
          <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">
              新しいリンクを作成
            </h3>

            {/* Expiry selector */}
            <div className="mb-3">
              <label
                htmlFor="share-expiry"
                className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1"
              >
                有効期限
              </label>
              <select
                id="share-expiry"
                value={form.expiresIn}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    expiresIn: e.target.value as ShareExpiryOption,
                  }))
                }
                className="input"
              >
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {SHARE_EXPIRY_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>

            {/* Password toggle */}
            <div className="mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.usePassword}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      usePassword: e.target.checked,
                      password: e.target.checked ? prev.password : '',
                    }))
                  }
                  className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  パスワードで保護する
                </span>
              </label>
            </div>

            {/* Password input */}
            {form.usePassword && (
              <div className="mb-3">
                <label
                  htmlFor="share-password"
                  className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1"
                >
                  パスワード（4文字以上）
                </label>
                <input
                  id="share-password"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="input"
                  placeholder="パスワードを設定"
                  minLength={4}
                />
              </div>
            )}

            {/* Create button */}
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={
                state.isCreating ||
                (form.usePassword && form.password.length < 4)
              }
              className="btn-primary w-full mt-2"
            >
              {state.isCreating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
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
                  作成中...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LinkIcon />
                  共有リンクを作成
                </span>
              )}
            </button>
          </div>

          {/* Error message */}
          {state.error !== null && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm text-red-700 dark:text-red-300">{state.error}</p>
            </div>
          )}

          {/* Existing links */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">
              既存のリンク
            </h3>

            {state.isLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : state.links.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
                共有リンクはありません
              </p>
            ) : (
              <div className="space-y-2">
                {state.links.map((link) => {
                  const expired = link.expiresAt !== undefined
                    && new Date(link.expiresAt).getTime() < state.currentTime;
                  return (
                    <ShareLinkRow
                      key={link.id}
                      link={link}
                      copiedId={state.copiedId}
                      isExpired={expired}
                      nowMs={state.currentTime}
                      onCopy={(url, id) => void handleCopy(url, id)}
                      onDeactivate={(id) => void handleDeactivate(id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-lark-border dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary w-full"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
