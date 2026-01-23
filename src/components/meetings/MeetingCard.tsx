'use client';

/**
 * MeetingCard - Mobile-optimized meeting card component
 * @module components/meetings/MeetingCard
 */

import { Avatar, Badge } from '@/components/ui';
import type { MeetingData } from '@/hooks/use-meetings';
import type { MeetingStatus } from '@/types/meeting';

/**
 * MeetingCard component props
 */
export interface MeetingCardProps {
  /** Meeting data to display */
  readonly meeting: MeetingData;
  /** Additional CSS classes */
  readonly className?: string | undefined;
}

/**
 * Format date for compact display (MM/DD HH:mm)
 */
function formatDateCompact(date: Date): string {
  return date.toLocaleString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date for full display
 */
function formatDateFull(date: Date): string {
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
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
 * Get status display config
 */
function getStatusConfig(
  status: MeetingStatus
): { label: string; variant: 'default' | 'success' | 'warning' | 'error' } {
  const config: Record<
    MeetingStatus,
    { label: string; variant: 'default' | 'success' | 'warning' | 'error' }
  > = {
    scheduled: { label: '予定', variant: 'default' },
    in_progress: { label: '進行中', variant: 'warning' },
    ended: { label: '終了', variant: 'success' },
    cancelled: { label: 'キャンセル', variant: 'error' },
  };
  return config[status];
}

/**
 * MeetingCard Component
 *
 * @description Mobile-optimized card layout for meeting items. Displays meeting
 * information in a vertically stacked card format suitable for mobile screens,
 * with compact date/participant display and touch-friendly tap areas.
 *
 * On mobile: Full vertical card layout with stacked info rows.
 * On tablet+: Horizontal layout with inline metadata.
 *
 * @example
 * ```tsx
 * <MeetingCard meeting={meetingData} />
 * ```
 */
export function MeetingCard({
  meeting,
  className = '',
}: MeetingCardProps): JSX.Element {
  const statusConfig = getStatusConfig(meeting.status);

  return (
    <a
      href={`/meetings/${meeting.id}`}
      className={`
        block rounded-lg border border-slate-200 dark:border-slate-700
        bg-white dark:bg-slate-800
        hover:border-lark-primary/50 hover:shadow-md
        transition-all duration-200
        min-h-[44px]
        ${className}
      `}
      aria-label={`${meeting.title} - ${statusConfig.label}`}
    >
      <div className="p-3 sm:p-4">
        {/* Top Row: Title + Status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white truncate">
              {meeting.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              #{meeting.meetingNo}
            </p>
          </div>
          <Badge variant={statusConfig.variant} className="flex-shrink-0">
            {statusConfig.label}
          </Badge>
        </div>

        {/* Meta Row: Date, Duration, Participants - stacks vertically on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          {/* Date/Time */}
          <div className="flex items-center gap-1.5">
            <svg
              className="w-3.5 h-3.5 flex-shrink-0 text-slate-400"
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
            {/* Compact date on mobile, full on desktop */}
            <span className="sm:hidden">{formatDateCompact(meeting.startTime)}</span>
            <span className="hidden sm:inline">{formatDateFull(meeting.startTime)}</span>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-1.5">
            <svg
              className="w-3.5 h-3.5 flex-shrink-0 text-slate-400"
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
            <span>{formatDuration(meeting.durationMinutes)}</span>
          </div>

          {/* Participants */}
          <div className="flex items-center gap-1.5">
            <svg
              className="w-3.5 h-3.5 flex-shrink-0 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197v1"
              />
            </svg>
            <span>{meeting.participantCount}人</span>
          </div>

          {/* Recording indicator */}
          {meeting.hasRecording && (
            <div className="flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 flex-shrink-0 text-green-500"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
              <span className="text-green-600 dark:text-green-400">録画あり</span>
            </div>
          )}
        </div>

        {/* Host Row - shown below on mobile */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <Avatar
            src={meeting.host.avatarUrl}
            name={meeting.host.name}
            size="sm"
          />
          <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">
            {meeting.host.name}
          </span>
        </div>
      </div>
    </a>
  );
}
