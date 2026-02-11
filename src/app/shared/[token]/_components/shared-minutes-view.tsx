/**
 * Shared Minutes View - Client component for viewing shared minutes
 * @module app/shared/[token]/_components/shared-minutes-view
 */

'use client';

import { useState, useCallback } from 'react';
import type { Minutes } from '@/types/minutes';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for SharedMinutesView component
 */
export interface SharedMinutesViewProps {
  /** The minutes data to display */
  readonly minutes: Minutes;
}

/**
 * Props for PasswordForm component
 */
export interface PasswordFormProps {
  /** Share token for authentication */
  readonly token: string;
  /** Callback when authentication succeeds */
  readonly onAuthenticated: (minutes: Minutes) => void;
}

/**
 * API response type for shared minutes
 */
interface SharedMinutesApiResponse {
  readonly data?: {
    readonly minutes: Minutes;
  } | undefined;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  } | undefined;
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Format duration from milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${String(hours)}時間${String(minutes)}分`;
  } else if (hours > 0) {
    return `${String(hours)}時間`;
  } else if (minutes > 0) {
    return `${String(minutes)}分`;
  }
  return '0分';
}

/**
 * Format timestamp in milliseconds to MM:SS format
 */
function formatTimestamp(ms: number): string {
  if (ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${String(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Priority badge component
 */
function PriorityBadge({
  priority,
}: {
  readonly priority: string;
}): JSX.Element {
  const styles: Record<string, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  };

  const labels: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[priority] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {labels[priority] ?? priority}
    </span>
  );
}

/**
 * Status badge component
 */
function StatusBadge({
  status,
}: {
  readonly status: string;
}): JSX.Element {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  };

  const labels: Record<string, string> = {
    pending: '未着手',
    in_progress: '進行中',
    completed: '完了',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

// =============================================================================
// Password Form Component
// =============================================================================

/**
 * Password form for accessing password-protected shared minutes
 */
export function PasswordForm({
  token,
  onAuthenticated,
}: PasswordFormProps): JSX.Element {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();
      setError(null);
      setIsLoading(true);

      try {
        const response = await fetch(`/api/shared/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });

        if (!response.ok) {
          const data = (await response.json()) as SharedMinutesApiResponse;
          throw new Error(data.error?.message ?? 'パスワードが正しくありません');
        }

        const data = (await response.json()) as SharedMinutesApiResponse;
        if (data.data?.minutes !== undefined) {
          onAuthenticated(data.data.minutes);
        } else {
          throw new Error('議事録データが見つかりませんでした');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    },
    [token, password, onAuthenticated]
  );

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-lg border border-lark-border dark:border-slate-700 p-8 shadow-sm">
        <div className="text-center mb-6">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            パスワードが必要です
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            この議事録はパスワードで保護されています
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="mb-4">
            <label
              htmlFor="share-password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              パスワード
            </label>
            <input
              id="share-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="パスワードを入力"
              required
              minLength={4}
              autoFocus
            />
          </div>

          {error !== null && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || password.length < 4}
            className="btn-primary w-full"
          >
            {isLoading ? (
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
                確認中...
              </span>
            ) : (
              '議事録を表示'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * SharedMinutesView Component
 *
 * Renders a read-only view of meeting minutes in a shared context.
 * No editing capabilities are provided.
 *
 * @example
 * ```tsx
 * <SharedMinutesView minutes={minutesData} />
 * ```
 */
export function SharedMinutesView({
  minutes,
}: SharedMinutesViewProps): JSX.Element {
  return (
    <article className="space-y-8">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 rounded-lg border border-lark-border dark:border-slate-700 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          {minutes.title}
        </h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {minutes.date}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatDuration(minutes.duration)}
          </span>
          {minutes.attendees.length > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              参加者: {minutes.attendees.map((a) => a.name).join(', ')}
            </span>
          )}
        </div>
      </header>

      {/* Summary */}
      {minutes.summary !== '' && (
        <section className="bg-white dark:bg-slate-800 rounded-lg border border-lark-border dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
            概要
          </h2>
          <p className="text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {minutes.summary}
          </p>
        </section>
      )}

      {/* Topics */}
      {minutes.topics.length > 0 && (
        <section className="bg-white dark:bg-slate-800 rounded-lg border border-lark-border dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            議題
          </h2>
          <div className="space-y-6">
            {minutes.topics.map((topic) => (
              <div
                key={topic.id}
                className="border-l-2 border-blue-400 dark:border-blue-500 pl-4"
              >
                <h3 className="font-medium text-slate-900 dark:text-white">
                  {topic.title}
                </h3>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  {formatTimestamp(topic.startTime)} - {formatTimestamp(topic.endTime)}
                </p>
                {topic.summary !== '' && (
                  <p className="text-sm text-gray-600 dark:text-slate-400 mt-2 whitespace-pre-wrap">
                    {topic.summary}
                  </p>
                )}
                {topic.keyPoints.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {topic.keyPoints.map((point, index) => (
                      <li
                        key={index}
                        className="text-sm text-gray-600 dark:text-slate-400 flex items-start gap-2"
                      >
                        <span className="text-blue-400 mt-1 shrink-0">&#8226;</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                )}
                {topic.speakers.length > 0 && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                    発言者: {topic.speakers.map((s) => s.name).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Decisions */}
      {minutes.decisions.length > 0 && (
        <section className="bg-white dark:bg-slate-800 rounded-lg border border-lark-border dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            決定事項
          </h2>
          <div className="space-y-4">
            {minutes.decisions.map((decision) => (
              <div
                key={decision.id}
                className="bg-green-50 dark:bg-green-900/10 rounded-lg p-4 border border-green-200 dark:border-green-800"
              >
                <p className="font-medium text-slate-900 dark:text-white">
                  {decision.content}
                </p>
                {decision.context !== '' && (
                  <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                    背景: {decision.context}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Action Items */}
      {minutes.actionItems.length > 0 && (
        <section className="bg-white dark:bg-slate-800 rounded-lg border border-lark-border dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            アクションアイテム
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-slate-400">
                    タスク
                  </th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-slate-400">
                    担当者
                  </th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-slate-400">
                    優先度
                  </th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-slate-400">
                    期限
                  </th>
                  <th className="text-left py-2 font-medium text-gray-500 dark:text-slate-400">
                    状態
                  </th>
                </tr>
              </thead>
              <tbody>
                {minutes.actionItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 dark:border-slate-700/50"
                  >
                    <td className="py-3 pr-4 text-slate-900 dark:text-white">
                      {item.content}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-slate-400">
                      {item.assignee?.name ?? '未割当'}
                    </td>
                    <td className="py-3 pr-4">
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-slate-400">
                      {item.dueDate ?? '-'}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Metadata footer */}
      <footer className="text-center text-xs text-gray-400 dark:text-slate-500 py-4">
        <p>
          生成日時: {new Date(minutes.metadata.generatedAt).toLocaleString('ja-JP')}
          {' | '}
          信頼度: {(minutes.metadata.confidence * 100).toFixed(1)}%
        </p>
      </footer>
    </article>
  );
}
