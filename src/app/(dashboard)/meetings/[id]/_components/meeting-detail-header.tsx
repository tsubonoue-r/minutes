'use client';

/**
 * Meeting Detail Header Component
 * Displays meeting title, number, status, time, and host information
 * @module app/(dashboard)/meetings/[id]/_components/meeting-detail-header
 */

import { Avatar } from '@/components/ui/avatar';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import type { MeetingStatus, MeetingUser } from '@/types/meeting';

/**
 * Props for MeetingDetailHeader component
 */
export interface MeetingDetailHeaderProps {
  /** Meeting title */
  readonly title: string;
  /** Meeting number for display/reference */
  readonly meetingNo: string;
  /** Meeting status */
  readonly status: MeetingStatus;
  /** Meeting start time (ISO string) */
  readonly startTime: string;
  /** Meeting end time (ISO string) */
  readonly endTime: string;
  /** Meeting duration in minutes */
  readonly durationMinutes: number;
  /** Host information */
  readonly host: MeetingUser;
  /** Number of participants */
  readonly participantCount: number;
}

/**
 * Get badge variant based on meeting status
 */
function getStatusVariant(status: MeetingStatus): BadgeVariant {
  const variants: Record<MeetingStatus, BadgeVariant> = {
    scheduled: 'default',
    in_progress: 'warning',
    ended: 'success',
    cancelled: 'error',
  };
  return variants[status];
}

/**
 * Get status display label
 */
function getStatusLabel(status: MeetingStatus): string {
  const labels: Record<MeetingStatus, string> = {
    scheduled: '予定',
    in_progress: '進行中',
    ended: '終了',
    cancelled: 'キャンセル',
  };
  return labels[status];
}

/**
 * Format date/time for display
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format time only for display
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format duration for display
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}時間`;
  }
  return `${hours}時間${remainingMinutes}分`;
}

/**
 * Meeting Detail Header Component
 *
 * @description Displays comprehensive meeting header with title, status,
 * time information, and host details.
 *
 * @example
 * ```tsx
 * <MeetingDetailHeader
 *   title="Weekly Team Sync"
 *   meetingNo="MTG-12345"
 *   status="ended"
 *   startTime="2024-01-15T10:00:00Z"
 *   endTime="2024-01-15T11:00:00Z"
 *   durationMinutes={60}
 *   host={{ id: '1', name: 'John Doe', avatarUrl: '/avatar.jpg' }}
 *   participantCount={5}
 * />
 * ```
 */
export function MeetingDetailHeader({
  title,
  meetingNo,
  status,
  startTime,
  endTime,
  durationMinutes,
  host,
  participantCount,
}: MeetingDetailHeaderProps): JSX.Element {
  return (
    <div className="card">
      {/* Title and Status Row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
            {title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            会議 #{meetingNo}
          </p>
        </div>
        <div className="flex-shrink-0">
          <Badge variant={getStatusVariant(status)}>
            {getStatusLabel(status)}
          </Badge>
        </div>
      </div>

      {/* Time Information */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"
            aria-hidden="true"
          >
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">開始時間</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {formatDateTime(startTime)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
            aria-hidden="true"
          >
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
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
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">終了時間</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {formatTime(endTime)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center"
            aria-hidden="true"
          >
            <svg
              className="w-5 h-5 text-purple-600 dark:text-purple-400"
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
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">所要時間</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {formatDuration(durationMinutes)}
            </p>
          </div>
        </div>
      </div>

      {/* Host Information */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              src={host.avatarUrl}
              name={host.name}
              size="md"
            />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">ホスト</p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {host.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span>{participantCount}人の参加者</span>
          </div>
        </div>
      </div>
    </div>
  );
}
