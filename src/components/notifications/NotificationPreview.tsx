'use client';

import { useMemo } from 'react';
import type { Minutes, ActionItem } from '@/types/minutes';

/**
 * Preview type for notification
 */
export type NotificationPreviewType =
  | 'minutes_completed'
  | 'minutes_draft'
  | 'action_item_assigned';

/**
 * Props for NotificationPreview component
 */
export interface NotificationPreviewProps {
  /** Type of notification to preview */
  readonly type: NotificationPreviewType;
  /** Minutes data (for minutes notifications) */
  readonly minutes?: Minutes | undefined;
  /** Action item data (for action item notifications) */
  readonly actionItem?: ActionItem | undefined;
  /** Meeting title (for action item notifications) */
  readonly meetingTitle?: string | undefined;
  /** Meeting date (for action item notifications) */
  readonly meetingDate?: string | undefined;
  /** Document URL (placeholder for preview) */
  readonly documentUrl?: string | undefined;
  /** Language for preview */
  readonly language?: 'ja' | 'en';
  /** Class name for custom styling */
  readonly className?: string;
}

/**
 * Labels for preview content
 */
const previewLabels = {
  ja: {
    minutesCompleted: {
      title: '議事録が作成されました',
      meetingTitle: '会議名',
      date: '日付',
      duration: '時間',
      attendees: '参加者',
      actionItems: 'アクションアイテム',
      viewButton: '議事録を確認',
    },
    minutesDraft: {
      title: '議事録の確認依頼',
      description: '以下の会議の議事録が作成されました。内容をご確認ください。',
      meetingTitle: '会議名',
      date: '日付',
      previewButton: '下書きを確認',
      approveButton: '承認する',
    },
    actionItemAssigned: {
      title: 'アクションアイテムが割り当てられました',
      task: 'タスク',
      meeting: '会議',
      dueDate: '期限',
      priority: '優先度',
      noDueDate: '未設定',
      viewButton: '議事録を確認',
    },
    priority: {
      high: '!!! 高',
      medium: '!! 中',
      low: '! 低',
    },
  },
  en: {
    minutesCompleted: {
      title: 'Minutes Created',
      meetingTitle: 'Meeting',
      date: 'Date',
      duration: 'Duration',
      attendees: 'Attendees',
      actionItems: 'Action Items',
      viewButton: 'View Minutes',
    },
    minutesDraft: {
      title: 'Minutes Review Request',
      description:
        'Minutes have been created for the following meeting. Please review the content.',
      meetingTitle: 'Meeting',
      date: 'Date',
      previewButton: 'Preview Draft',
      approveButton: 'Approve',
    },
    actionItemAssigned: {
      title: 'Action Item Assigned',
      task: 'Task',
      meeting: 'Meeting',
      dueDate: 'Due Date',
      priority: 'Priority',
      noDueDate: 'Not set',
      viewButton: 'View Minutes',
    },
    priority: {
      high: '!!! High',
      medium: '!! Medium',
      low: '! Low',
    },
  },
};

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number, language: 'ja' | 'en'): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (language === 'ja') {
    if (hours > 0 && minutes > 0) {
      return `${hours}時間${minutes}分`;
    } else if (hours > 0) {
      return `${hours}時間`;
    }
    return `${minutes}分`;
  } else {
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    }
    return `${minutes}m`;
  }
}

/**
 * Format date string
 */
function formatDate(dateStr: string, language: 'ja' | 'en'): string {
  const date = new Date(dateStr);
  if (language === 'ja') {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Header color classes based on type
 */
const headerColors: Record<NotificationPreviewType, string> = {
  minutes_completed: 'bg-blue-500',
  minutes_draft: 'bg-yellow-500',
  action_item_assigned: 'bg-green-500',
};

/**
 * NotificationPreview Component
 *
 * Renders a preview of what a notification card will look like.
 *
 * @example
 * ```tsx
 * <NotificationPreview
 *   type="minutes_completed"
 *   minutes={minutesData}
 *   documentUrl="https://example.com/doc"
 *   language="ja"
 * />
 * ```
 */
export function NotificationPreview({
  type,
  minutes,
  actionItem,
  meetingTitle,
  meetingDate,
  documentUrl = '#',
  language = 'ja',
  className = '',
}: NotificationPreviewProps): JSX.Element {
  const l = previewLabels[language];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const content = useMemo(() => {
    switch (type) {
      case 'minutes_completed':
        return renderMinutesCompletedPreview();
      case 'minutes_draft':
        return renderMinutesDraftPreview();
      case 'action_item_assigned':
        return renderActionItemPreview();
      default:
        return null;
    }
  }, [type, minutes, actionItem, meetingTitle, meetingDate, documentUrl, language, l]);

  function renderMinutesCompletedPreview(): JSX.Element {
    const labels = l.minutesCompleted;
    const title = minutes?.title ?? 'Sample Meeting';
    const date = minutes?.date ?? '2024-01-15';
    const duration = minutes?.duration ?? 3600000;
    const attendeeCount = minutes?.attendees.length ?? 5;
    const actionItemCount = minutes?.actionItems.length ?? 3;

    return (
      <>
        <div className={`px-4 py-3 text-white font-medium ${headerColors[type]}`}>
          {labels.title}
        </div>
        <div className="p-4 space-y-3">
          <div className="text-sm">
            <span className="font-medium">{labels.meetingTitle}:</span> {title}
          </div>
          <div className="text-sm">
            <span className="font-medium">{labels.date}:</span>{' '}
            {formatDate(date, language)}
          </div>
          <div className="text-sm">
            <span className="font-medium">{labels.duration}:</span>{' '}
            {formatDuration(duration, language)}
          </div>
          <div className="text-sm">
            <span className="font-medium">{labels.attendees}:</span>{' '}
            {language === 'ja' ? `${attendeeCount}名` : `${attendeeCount} people`}
          </div>
          <div className="text-sm">
            <span className="font-medium">{labels.actionItems}:</span>{' '}
            {language === 'ja' ? `${actionItemCount}件` : `${actionItemCount} items`}
          </div>
          <hr className="border-gray-200" />
          <a
            href={documentUrl}
            className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            {labels.viewButton}
          </a>
        </div>
      </>
    );
  }

  function renderMinutesDraftPreview(): JSX.Element {
    const labels = l.minutesDraft;
    const title = minutes?.title ?? 'Sample Meeting';
    const date = minutes?.date ?? '2024-01-15';

    return (
      <>
        <div className={`px-4 py-3 text-white font-medium ${headerColors[type]}`}>
          {labels.title}
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600">{labels.description}</p>
          <hr className="border-gray-200" />
          <div className="text-sm">
            <span className="font-medium">{labels.meetingTitle}:</span> {title}
          </div>
          <div className="text-sm">
            <span className="font-medium">{labels.date}:</span>{' '}
            {formatDate(date, language)}
          </div>
          <hr className="border-gray-200" />
          <div className="flex gap-2">
            <a
              href={documentUrl}
              className="inline-block px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
            >
              {labels.previewButton}
            </a>
            <a
              href={documentUrl}
              className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              {labels.approveButton}
            </a>
          </div>
        </div>
      </>
    );
  }

  function renderActionItemPreview(): JSX.Element {
    const labels = l.actionItemAssigned;
    const task = actionItem?.content ?? 'Complete the quarterly report';
    const meeting = meetingTitle ?? minutes?.title ?? 'Weekly Sync';
    const mDate = meetingDate ?? minutes?.date ?? '2024-01-15';
    const dueDate = actionItem?.dueDate;
    const priority = actionItem?.priority ?? 'medium';

    return (
      <>
        <div className={`px-4 py-3 text-white font-medium ${headerColors[type]}`}>
          {labels.title}
        </div>
        <div className="p-4 space-y-3">
          <div className="text-sm">
            <span className="font-medium">{labels.task}:</span> {task}
          </div>
          <div className="text-sm">
            <span className="font-medium">{labels.meeting}:</span> {meeting} (
            {formatDate(mDate, language)})
          </div>
          <div className="text-sm">
            <span className="font-medium">{labels.dueDate}:</span>{' '}
            {dueDate !== undefined ? formatDate(dueDate, language) : labels.noDueDate}
          </div>
          <div className="text-sm">
            <span className="font-medium">{labels.priority}:</span>{' '}
            {l.priority[priority]}
          </div>
          {documentUrl !== '#' && (
            <>
              <hr className="border-gray-200" />
              <a
                href={documentUrl}
                className="inline-block px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
              >
                {labels.viewButton}
              </a>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg border border-gray-300 shadow-sm overflow-hidden max-w-md ${className}`}
    >
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs text-gray-500">
        {language === 'ja' ? 'プレビュー' : 'Preview'}
      </div>
      {content}
    </div>
  );
}
