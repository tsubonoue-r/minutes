'use client';

/**
 * Meeting List Component - Table display for meetings
 * @module components/meetings/meeting-list
 */

import type { MeetingData } from '@/hooks/use-meetings';
import type { MeetingStatus } from '@/types/meeting';
import { Avatar, Badge, TableSkeleton } from '@/components/ui';
import { MeetingCard } from './MeetingCard';

/**
 * Format date for display
 */
function formatDateTime(date: Date): string {
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
 * Meeting list props
 */
export interface MeetingListProps {
  /** List of meetings to display */
  readonly meetings: readonly MeetingData[];
  /** Loading state */
  readonly isLoading?: boolean;
  /** Error state */
  readonly error?: Error | null;
  /** Custom class name */
  readonly className?: string;
}

/**
 * Meeting row component
 */
function MeetingRow({
  meeting,
}: {
  readonly meeting: MeetingData;
}): JSX.Element {
  const statusConfig = getStatusConfig(meeting.status);

  return (
    <tr className="border-b border-lark-border hover:bg-lark-background/50 transition-colors">
      {/* Title */}
      <td className="px-4 py-3">
        <a
          href={`/meetings/${meeting.id}`}
          className="group flex flex-col"
        >
          <span className="text-sm font-medium text-lark-text group-hover:text-lark-primary transition-colors">
            {meeting.title}
          </span>
          <span className="text-xs text-gray-500 mt-0.5">
            #{meeting.meetingNo}
          </span>
        </a>
      </td>

      {/* Start Time */}
      <td className="px-4 py-3">
        <span className="text-sm text-lark-text">
          {formatDateTime(meeting.startTime)}
        </span>
      </td>

      {/* Duration */}
      <td className="px-4 py-3">
        <span className="text-sm text-lark-text">
          {formatDuration(meeting.durationMinutes)}
        </span>
      </td>

      {/* Participants */}
      <td className="px-4 py-3">
        <span className="text-sm text-lark-text">
          {meeting.participantCount}人
        </span>
      </td>

      {/* Host */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar
            src={meeting.host.avatarUrl}
            name={meeting.host.name}
            size="sm"
          />
          <span className="text-sm text-lark-text truncate max-w-[120px]">
            {meeting.host.name}
          </span>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </td>

      {/* Recording */}
      <td className="px-4 py-3">
        {meeting.hasRecording ? (
          <Badge variant="success">録画あり</Badge>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <a
          href={`/meetings/${meeting.id}`}
          className="text-sm text-lark-primary hover:underline"
          aria-label={`${meeting.title}の詳細を表示`}
        >
          詳細
        </a>
      </td>
    </tr>
  );
}

/**
 * Empty state component
 */
function EmptyState(): JSX.Element {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">📋</div>
      <h3 className="text-lg font-medium text-lark-text mb-2">
        会議が見つかりません
      </h3>
      <p className="text-sm text-gray-500">
        フィルター条件を変更するか、新しい会議を作成してください。
      </p>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({
  error,
  onRetry,
}: {
  readonly error: Error;
  readonly onRetry?: () => void;
}): JSX.Element {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">⚠️</div>
      <h3 className="text-lg font-medium text-red-600 mb-2">
        エラーが発生しました
      </h3>
      <p className="text-sm text-gray-500 mb-4">{error.message}</p>
      {onRetry !== undefined && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 text-sm font-medium text-white bg-lark-primary rounded-lg hover:bg-lark-primary/90 transition-colors"
        >
          再試行
        </button>
      )}
    </div>
  );
}

/**
 * Meeting List Component
 *
 * @description Displays meetings in a table format with sorting and filtering support
 * @example
 * ```tsx
 * <MeetingList
 *   meetings={meetings}
 *   isLoading={isLoading}
 *   error={error}
 * />
 * ```
 */
export function MeetingList({
  meetings,
  isLoading = false,
  error = null,
  className = '',
}: MeetingListProps): JSX.Element {
  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-lark-border p-4 ${className}`}>
        <TableSkeleton rows={5} columns={8} />
      </div>
    );
  }

  // Error state
  if (error !== null) {
    return (
      <div className={`bg-white rounded-lg border border-lark-border p-4 ${className}`}>
        <ErrorState error={error} />
      </div>
    );
  }

  // Empty state
  if (meetings.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-lark-border p-4 ${className}`}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Mobile: Card layout (below md breakpoint) */}
      <div className="md:hidden space-y-3" role="list" aria-label="会議一覧">
        {meetings.map((meeting) => (
          <MeetingCard key={meeting.id} meeting={meeting} />
        ))}
      </div>

      {/* Desktop: Table layout (md breakpoint and above) */}
      <div
        className="hidden md:block bg-white rounded-lg border border-lark-border overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full" role="grid" aria-label="会議一覧">
            <thead className="bg-lark-background">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-lark-text uppercase tracking-wider"
                >
                  会議名
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-lark-text uppercase tracking-wider"
                >
                  開始日時
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-lark-text uppercase tracking-wider"
                >
                  所要時間
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-lark-text uppercase tracking-wider"
                >
                  参加者
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-lark-text uppercase tracking-wider"
                >
                  ホスト
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-lark-text uppercase tracking-wider"
                >
                  ステータス
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-lark-text uppercase tracking-wider"
                >
                  録画
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-lark-text uppercase tracking-wider"
                >
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lark-border">
              {meetings.map((meeting) => (
                <MeetingRow key={meeting.id} meeting={meeting} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MeetingList;
