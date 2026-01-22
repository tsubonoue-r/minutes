'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  Reminder,
  ReminderStatus,
  ReminderType,
  ReminderFilters,
} from '@/types/reminder';
import {
  REMINDER_STATUS,
  REMINDER_TYPE,
  getStatusLabel,
  getTypeLabel,
  getTimingLabel,
  isReminderDue,
  isReminderDueSoon,
} from '@/types/reminder';

/**
 * Props for ReminderList component
 */
export interface ReminderListProps {
  /** List of reminders to display */
  readonly reminders: readonly Reminder[];
  /** Callback when a reminder is cancelled */
  readonly onCancel?: (id: string) => void;
  /** Callback when a reminder is deleted */
  readonly onDelete?: (id: string) => void;
  /** Callback when a reminder is edited */
  readonly onEdit?: (reminder: Reminder) => void;
  /** Callback when a reminder is sent manually */
  readonly onSendNow?: (id: string) => void;
  /** Whether actions are disabled */
  readonly disabled?: boolean;
  /** Display language */
  readonly language?: 'ja' | 'en';
  /** Class name for custom styling */
  readonly className?: string;
  /** Show filters */
  readonly showFilters?: boolean;
  /** Initial filter values */
  readonly initialFilters?: ReminderFilters;
  /** Callback when filters change */
  readonly onFiltersChange?: (filters: ReminderFilters) => void;
  /** Loading state */
  readonly loading?: boolean;
  /** Empty state message */
  readonly emptyMessage?: string;
}

/**
 * Labels for UI display
 */
const labels = {
  ja: {
    title: 'リマインダー一覧',
    noReminders: 'リマインダーがありません',
    scheduledAt: '予定',
    recipient: '通知先',
    status: 'ステータス',
    type: '種類',
    actions: 'アクション',
    cancel: 'キャンセル',
    delete: '削除',
    edit: '編集',
    sendNow: '今すぐ送信',
    dueSoon: 'まもなく送信',
    overdue: '期限超過',
    filters: {
      all: 'すべて',
      active: '有効',
      sent: '送信済み',
      cancelled: 'キャンセル',
      failed: '失敗',
    },
    typeFilters: {
      all: 'すべてのタイプ',
      actionItemDue: 'アクションアイテム',
      minutesReview: '議事録確認',
      custom: 'カスタム',
    },
    confirmCancel: 'このリマインダーをキャンセルしますか？',
    confirmDelete: 'このリマインダーを完全に削除しますか？',
    loading: '読み込み中...',
  },
  en: {
    title: 'Reminders',
    noReminders: 'No reminders',
    scheduledAt: 'Scheduled',
    recipient: 'Recipient',
    status: 'Status',
    type: 'Type',
    actions: 'Actions',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    sendNow: 'Send Now',
    dueSoon: 'Due Soon',
    overdue: 'Overdue',
    filters: {
      all: 'All',
      active: 'Active',
      sent: 'Sent',
      cancelled: 'Cancelled',
      failed: 'Failed',
    },
    typeFilters: {
      all: 'All Types',
      actionItemDue: 'Action Item',
      minutesReview: 'Minutes Review',
      custom: 'Custom',
    },
    confirmCancel: 'Are you sure you want to cancel this reminder?',
    confirmDelete: 'Are you sure you want to permanently delete this reminder?',
    loading: 'Loading...',
  },
};

/**
 * Status badge colors
 */
const statusColors: Record<ReminderStatus, string> = {
  [REMINDER_STATUS.ACTIVE]: 'bg-green-100 text-green-800',
  [REMINDER_STATUS.SENT]: 'bg-blue-100 text-blue-800',
  [REMINDER_STATUS.CANCELLED]: 'bg-gray-100 text-gray-800',
  [REMINDER_STATUS.FAILED]: 'bg-red-100 text-red-800',
};

/**
 * Type badge colors
 */
const typeColors: Record<ReminderType, string> = {
  [REMINDER_TYPE.ACTION_ITEM_DUE]: 'bg-purple-100 text-purple-800',
  [REMINDER_TYPE.MINUTES_REVIEW]: 'bg-indigo-100 text-indigo-800',
  [REMINDER_TYPE.CUSTOM]: 'bg-gray-100 text-gray-800',
};

/**
 * Format date for display
 */
function formatDate(dateString: string, language: 'ja' | 'en'): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return date.toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', options);
}

/**
 * Single reminder item component
 */
function ReminderItem({
  reminder,
  onCancel,
  onDelete,
  onEdit,
  onSendNow,
  disabled,
  language,
}: {
  reminder: Reminder;
  onCancel: ((id: string) => void) | undefined;
  onDelete: ((id: string) => void) | undefined;
  onEdit: ((reminder: Reminder) => void) | undefined;
  onSendNow: ((id: string) => void) | undefined;
  disabled: boolean | undefined;
  language: 'ja' | 'en';
}): JSX.Element {
  const l = labels[language];
  const isDue = isReminderDue(reminder);
  const isDueSoon = isReminderDueSoon(reminder);

  const handleCancel = useCallback(() => {
    if (window.confirm(l.confirmCancel)) {
      onCancel?.(reminder.id);
    }
  }, [reminder.id, onCancel, l.confirmCancel]);

  const handleDelete = useCallback(() => {
    if (window.confirm(l.confirmDelete)) {
      onDelete?.(reminder.id);
    }
  }, [reminder.id, onDelete, l.confirmDelete]);

  return (
    <div
      className={`p-4 border rounded-lg ${
        isDue
          ? 'border-red-300 bg-red-50'
          : isDueSoon
          ? 'border-yellow-300 bg-yellow-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Title and badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-medium text-gray-900">{reminder.title}</h4>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                statusColors[reminder.status]
              }`}
            >
              {getStatusLabel(reminder.status, language)}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                typeColors[reminder.type]
              }`}
            >
              {getTypeLabel(reminder.type, language)}
            </span>
            {isDue && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                {l.overdue}
              </span>
            )}
            {!isDue && isDueSoon && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                {l.dueSoon}
              </span>
            )}
          </div>

          {/* Message */}
          {reminder.message !== undefined && (
            <p className="mt-1 text-sm text-gray-600">{reminder.message}</p>
          )}

          {/* Metadata */}
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
            {reminder.schedule.scheduledAt !== undefined && (
              <span>
                {l.scheduledAt}: {formatDate(reminder.schedule.scheduledAt, language)}
              </span>
            )}
            <span>
              {l.recipient}: {reminder.recipient.name ?? reminder.recipient.id}
            </span>
            <span>
              {getTimingLabel(reminder.schedule.timing, language)}
            </span>
          </div>

          {/* Reference info */}
          {reminder.actionItemRef !== undefined && (
            <p className="mt-1 text-xs text-gray-500">
              {reminder.actionItemRef.content}
            </p>
          )}
          {reminder.minutesRef !== undefined && (
            <p className="mt-1 text-xs text-gray-500">
              {reminder.minutesRef.meetingTitle} ({reminder.minutesRef.meetingDate})
            </p>
          )}

          {/* Error message */}
          {reminder.status === REMINDER_STATUS.FAILED && reminder.errorMessage !== undefined && (
            <p className="mt-1 text-xs text-red-600">
              Error: {reminder.errorMessage}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {reminder.status === REMINDER_STATUS.ACTIVE && (
            <>
              {onSendNow !== undefined && (
                <button
                  onClick={() => onSendNow(reminder.id)}
                  disabled={disabled}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  {l.sendNow}
                </button>
              )}
              {onEdit !== undefined && (
                <button
                  onClick={() => onEdit(reminder)}
                  disabled={disabled}
                  className="text-xs text-gray-600 hover:text-gray-800 disabled:text-gray-400"
                >
                  {l.edit}
                </button>
              )}
              {onCancel !== undefined && (
                <button
                  onClick={handleCancel}
                  disabled={disabled}
                  className="text-xs text-orange-600 hover:text-orange-800 disabled:text-gray-400"
                >
                  {l.cancel}
                </button>
              )}
            </>
          )}
          {onDelete !== undefined && (
            <button
              onClick={handleDelete}
              disabled={disabled}
              className="text-xs text-red-600 hover:text-red-800 disabled:text-gray-400"
            >
              {l.delete}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ReminderList Component
 *
 * Displays a list of reminders with filtering and actions.
 *
 * @example
 * ```tsx
 * <ReminderList
 *   reminders={reminders}
 *   onCancel={(id) => cancelReminder(id)}
 *   onDelete={(id) => deleteReminder(id)}
 *   language="ja"
 * />
 * ```
 */
export function ReminderList({
  reminders,
  onCancel,
  onDelete,
  onEdit,
  onSendNow,
  disabled = false,
  language = 'ja',
  className = '',
  showFilters = true,
  initialFilters = {},
  onFiltersChange,
  loading = false,
  emptyMessage,
}: ReminderListProps): JSX.Element {
  const l = labels[language];

  // Filter state
  const [statusFilter, setStatusFilter] = useState<ReminderStatus | 'all'>(
    initialFilters.status ?? 'all'
  );
  const [typeFilter, setTypeFilter] = useState<ReminderType | 'all'>(
    initialFilters.type ?? 'all'
  );

  // Handle filter changes
  const handleStatusFilterChange = useCallback(
    (newStatus: ReminderStatus | 'all') => {
      setStatusFilter(newStatus);
      if (onFiltersChange !== undefined) {
        const newFilters: ReminderFilters = {
          ...initialFilters,
          status: newStatus === 'all' ? undefined : newStatus,
        };
        onFiltersChange(newFilters);
      }
    },
    [initialFilters, onFiltersChange]
  );

  const handleTypeFilterChange = useCallback(
    (newType: ReminderType | 'all') => {
      setTypeFilter(newType);
      if (onFiltersChange !== undefined) {
        const newFilters: ReminderFilters = {
          ...initialFilters,
          type: newType === 'all' ? undefined : newType,
        };
        onFiltersChange(newFilters);
      }
    },
    [initialFilters, onFiltersChange]
  );

  // Filter reminders locally if no onFiltersChange callback
  const filteredReminders = useMemo(() => {
    if (onFiltersChange !== undefined) {
      // Server-side filtering
      return reminders;
    }

    let result = [...reminders];

    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter((r) => r.type === typeFilter);
    }

    return result;
  }, [reminders, statusFilter, typeFilter, onFiltersChange]);

  // Sort reminders by scheduled time
  const sortedReminders = useMemo(() => {
    return [...filteredReminders].sort((a, b) => {
      const aTime = a.schedule.scheduledAt ?? a.createdAt;
      const bTime = b.schedule.scheduledAt ?? b.createdAt;
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });
  }, [filteredReminders]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-4 flex-wrap">
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="status-filter" className="text-sm text-gray-600">
              {l.status}:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) =>
                handleStatusFilterChange(e.target.value as ReminderStatus | 'all')
              }
              disabled={disabled}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="all">{l.filters.all}</option>
              <option value={REMINDER_STATUS.ACTIVE}>{l.filters.active}</option>
              <option value={REMINDER_STATUS.SENT}>{l.filters.sent}</option>
              <option value={REMINDER_STATUS.CANCELLED}>{l.filters.cancelled}</option>
              <option value={REMINDER_STATUS.FAILED}>{l.filters.failed}</option>
            </select>
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="type-filter" className="text-sm text-gray-600">
              {l.type}:
            </label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) =>
                handleTypeFilterChange(e.target.value as ReminderType | 'all')
              }
              disabled={disabled}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="all">{l.typeFilters.all}</option>
              <option value={REMINDER_TYPE.ACTION_ITEM_DUE}>
                {l.typeFilters.actionItemDue}
              </option>
              <option value={REMINDER_TYPE.MINUTES_REVIEW}>
                {l.typeFilters.minutesReview}
              </option>
              <option value={REMINDER_TYPE.CUSTOM}>{l.typeFilters.custom}</option>
            </select>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8 text-gray-500">
          {l.loading}
        </div>
      )}

      {/* Empty state */}
      {!loading && sortedReminders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {emptyMessage ?? l.noReminders}
        </div>
      )}

      {/* Reminder list */}
      {!loading && sortedReminders.length > 0 && (
        <div className="space-y-3">
          {sortedReminders.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              onCancel={onCancel}
              onDelete={onDelete}
              onEdit={onEdit}
              onSendNow={onSendNow}
              disabled={disabled}
              language={language}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ReminderList;
