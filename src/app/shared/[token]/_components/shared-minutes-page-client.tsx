/**
 * Shared Minutes Page Client - Client component handling password and data fetching
 * @module app/shared/[token]/_components/shared-minutes-page-client
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Minutes } from '@/types/minutes';
import { SharedMinutesView, PasswordForm } from './shared-minutes-view';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for SharedMinutesPageClient
 */
interface SharedMinutesPageClientProps {
  /** Share token */
  readonly token: string;
  /** Meeting ID associated with this share */
  readonly meetingId: string;
  /** Whether the link requires password authentication */
  readonly requiresPassword: boolean;
}

/**
 * Page state
 */
type PageState =
  | { readonly status: 'loading' }
  | { readonly status: 'password_required' }
  | { readonly status: 'loaded'; readonly minutes: Minutes }
  | { readonly status: 'error'; readonly message: string };

/**
 * API response type
 */
interface SharedApiResponse {
  readonly data?: {
    readonly minutes: Minutes;
  } | undefined;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  } | undefined;
}

// =============================================================================
// Component
// =============================================================================

/**
 * SharedMinutesPageClient Component
 *
 * Handles the client-side logic for shared minutes pages:
 * - If password is required, shows the password form
 * - If no password, fetches and displays the minutes directly
 * - Handles loading and error states
 */
export function SharedMinutesPageClient({
  token,
  meetingId: _meetingId,
  requiresPassword,
}: SharedMinutesPageClientProps): JSX.Element {
  const [state, setState] = useState<PageState>(
    requiresPassword ? { status: 'password_required' } : { status: 'loading' }
  );

  /**
   * Fetch shared minutes (no password)
   */
  const fetchMinutes = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/shared/${token}`);

      if (!response.ok) {
        const data = (await response.json()) as SharedApiResponse;
        throw new Error(data.error?.message ?? '議事録の取得に失敗しました');
      }

      const data = (await response.json()) as SharedApiResponse;
      if (data.data?.minutes !== undefined) {
        setState({ status: 'loaded', minutes: data.data.minutes });
      } else {
        throw new Error('議事録データが見つかりませんでした');
      }
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'エラーが発生しました',
      });
    }
  }, [token]);

  /**
   * Handle successful password authentication
   */
  const handleAuthenticated = useCallback((minutes: Minutes): void => {
    setState({ status: 'loaded', minutes });
  }, []);

  // Fetch minutes on mount if no password is required
  useEffect(() => {
    if (!requiresPassword) {
      void fetchMinutes();
    }
  }, [requiresPassword, fetchMinutes]);

  // Render based on state
  switch (state.status) {
    case 'loading':
      return <LoadingView />;

    case 'password_required':
      return (
        <PasswordForm
          token={token}
          onAuthenticated={handleAuthenticated}
        />
      );

    case 'loaded':
      return <SharedMinutesView minutes={state.minutes} />;

    case 'error':
      return <ErrorView message={state.message} onRetry={() => void fetchMinutes()} />;
  }
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Loading view component
 */
function LoadingView(): JSX.Element {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-lark-border dark:border-slate-700 p-6">
        <div className="h-8 w-2/3 bg-gray-200 dark:bg-slate-700 rounded mb-3" />
        <div className="flex gap-4">
          <div className="h-4 w-24 bg-gray-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-20 bg-gray-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded" />
        </div>
      </div>

      {/* Summary skeleton */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-lark-border dark:border-slate-700 p-6">
        <div className="h-6 w-16 bg-gray-200 dark:bg-slate-700 rounded mb-3" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-4/6 bg-gray-200 dark:bg-slate-700 rounded" />
        </div>
      </div>

      {/* Topics skeleton */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-lark-border dark:border-slate-700 p-6">
        <div className="h-6 w-12 bg-gray-200 dark:bg-slate-700 rounded mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-l-2 border-gray-200 dark:border-slate-700 pl-4">
              <div className="h-5 w-1/3 bg-gray-200 dark:bg-slate-700 rounded mb-2" />
              <div className="h-4 w-full bg-gray-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Error view component
 */
function ErrorView({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}): JSX.Element {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <svg
          className="w-16 h-16 mx-auto mb-4 text-red-300 dark:text-red-700"
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
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          読み込みエラー
        </h2>
        <p className="text-gray-500 dark:text-slate-400 mb-4">
          {message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="btn-primary"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
