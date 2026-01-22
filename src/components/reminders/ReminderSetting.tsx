'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  ReminderType,
  ReminderTiming,
  ReminderRecurrence,
  CreateReminderInput,
  ReminderRecipient,
} from '@/types/reminder';
import {
  REMINDER_TYPE,
  REMINDER_TIMING,
  REMINDER_RECURRENCE,
  getTimingLabel,
  getRecurrenceLabel,
} from '@/types/reminder';

/**
 * Props for ReminderSetting component
 */
export interface ReminderSettingProps {
  /** Reminder type to configure */
  readonly type: ReminderType;
  /** Reference data for the reminder (action item or minutes) */
  readonly referenceData?: {
    readonly actionItemId?: string;
    readonly actionItemContent?: string;
    readonly minutesId?: string;
    readonly meetingId: string;
    readonly meetingTitle: string;
    readonly meetingDate?: string;
    readonly dueDate?: string;
    readonly documentUrl?: string;
  };
  /** Default recipient */
  readonly defaultRecipient?: ReminderRecipient;
  /** Callback when reminder is configured */
  readonly onSubmit: (input: CreateReminderInput) => void;
  /** Callback when cancelled */
  readonly onCancel?: () => void;
  /** Whether the form is disabled */
  readonly disabled?: boolean;
  /** Display language */
  readonly language?: 'ja' | 'en';
  /** Class name for custom styling */
  readonly className?: string;
}

/**
 * Labels for UI display
 */
const labels = {
  ja: {
    title: 'リマインダー設定',
    reminderTitle: 'タイトル',
    reminderTitlePlaceholder: 'リマインダーのタイトル',
    message: 'メッセージ',
    messagePlaceholder: 'オプションのメッセージ',
    timing: 'タイミング',
    customTime: '日時指定',
    recurrence: '繰り返し',
    recipient: '通知先',
    recipientName: '名前',
    recipientEmail: 'メールアドレス',
    submit: 'リマインダーを作成',
    cancel: 'キャンセル',
    actionItemReminder: 'アクションアイテムリマインダー',
    minutesReviewReminder: '議事録確認リマインダー',
    forActionItem: '対象アクションアイテム',
    forMinutes: '対象議事録',
    dueDate: '期限',
  },
  en: {
    title: 'Reminder Settings',
    reminderTitle: 'Title',
    reminderTitlePlaceholder: 'Reminder title',
    message: 'Message',
    messagePlaceholder: 'Optional message',
    timing: 'Timing',
    customTime: 'Specific Time',
    recurrence: 'Recurrence',
    recipient: 'Recipient',
    recipientName: 'Name',
    recipientEmail: 'Email',
    submit: 'Create Reminder',
    cancel: 'Cancel',
    actionItemReminder: 'Action Item Reminder',
    minutesReviewReminder: 'Minutes Review Reminder',
    forActionItem: 'For Action Item',
    forMinutes: 'For Minutes',
    dueDate: 'Due Date',
  },
};

/**
 * ReminderSetting Component
 *
 * Provides a UI for configuring reminder settings.
 *
 * @example
 * ```tsx
 * <ReminderSetting
 *   type="action_item_due"
 *   referenceData={{
 *     actionItemId: 'ai_123',
 *     actionItemContent: 'Review document',
 *     meetingId: 'meet_456',
 *     meetingTitle: 'Weekly Sync',
 *     dueDate: '2024-01-20',
 *   }}
 *   defaultRecipient={{ id: 'user123', type: 'user', name: 'John Doe' }}
 *   onSubmit={(input) => createReminder(input)}
 *   language="ja"
 * />
 * ```
 */
export function ReminderSetting({
  type,
  referenceData,
  defaultRecipient,
  onSubmit,
  onCancel,
  disabled = false,
  language = 'ja',
  className = '',
}: ReminderSettingProps): JSX.Element {
  const l = labels[language];

  // Form state
  const [title, setTitle] = useState(() => {
    if (type === REMINDER_TYPE.ACTION_ITEM_DUE) {
      return language === 'ja'
        ? `アクションアイテム期限: ${referenceData?.actionItemContent ?? ''}`
        : `Action Item Due: ${referenceData?.actionItemContent ?? ''}`;
    }
    if (type === REMINDER_TYPE.MINUTES_REVIEW) {
      return language === 'ja'
        ? `議事録確認: ${referenceData?.meetingTitle ?? ''}`
        : `Review Minutes: ${referenceData?.meetingTitle ?? ''}`;
    }
    return '';
  });
  const [message, setMessage] = useState('');
  const [timing, setTiming] = useState<ReminderTiming>(REMINDER_TIMING.ONE_DAY_BEFORE);
  const [customTime, setCustomTime] = useState('');
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>(REMINDER_RECURRENCE.NONE);
  const [recipientId, setRecipientId] = useState(defaultRecipient?.id ?? '');
  const [recipientName, setRecipientName] = useState(defaultRecipient?.name ?? '');
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipient?.email ?? '');

  // Calculate reference date for relative timing
  const referenceDate = useMemo(() => {
    if (type === REMINDER_TYPE.ACTION_ITEM_DUE && referenceData?.dueDate !== undefined) {
      return new Date(referenceData.dueDate).toISOString();
    }
    if (type === REMINDER_TYPE.MINUTES_REVIEW && referenceData?.meetingDate !== undefined) {
      // For minutes review, default to the day after the meeting
      const meetingDate = new Date(referenceData.meetingDate);
      meetingDate.setDate(meetingDate.getDate() + 1);
      return meetingDate.toISOString();
    }
    return undefined;
  }, [type, referenceData]);

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const recipient: ReminderRecipient = {
        id: recipientId,
        name: recipientName || undefined,
        type: 'user',
        email: recipientEmail || undefined,
      };

      const input: CreateReminderInput = {
        type,
        title,
        message: message || undefined,
        schedule: {
          timing,
          scheduledAt: timing === REMINDER_TIMING.SPECIFIC_TIME ? customTime : undefined,
          referenceDate,
          recurrence,
          timezone: 'Asia/Tokyo',
        },
        recipient,
        language,
      };

      // Add type-specific references
      if (type === REMINDER_TYPE.ACTION_ITEM_DUE && referenceData !== undefined) {
        input.actionItemRef = {
          actionItemId: referenceData.actionItemId ?? '',
          content: referenceData.actionItemContent ?? '',
          meetingId: referenceData.meetingId,
          meetingTitle: referenceData.meetingTitle,
          dueDate: referenceData.dueDate,
        };
      }

      if (type === REMINDER_TYPE.MINUTES_REVIEW && referenceData !== undefined) {
        input.minutesRef = {
          minutesId: referenceData.minutesId ?? '',
          meetingId: referenceData.meetingId,
          meetingTitle: referenceData.meetingTitle,
          meetingDate: referenceData.meetingDate ?? new Date().toISOString().split('T')[0] ?? '1970-01-01',
          documentUrl: referenceData.documentUrl,
        };
      }

      onSubmit(input);
    },
    [
      type,
      title,
      message,
      timing,
      customTime,
      recurrence,
      recipientId,
      recipientName,
      recipientEmail,
      referenceDate,
      referenceData,
      language,
      onSubmit,
    ]
  );

  // Available timing options
  const timingOptions: ReminderTiming[] = [
    REMINDER_TIMING.IMMEDIATE,
    REMINDER_TIMING.ONE_HOUR_BEFORE,
    REMINDER_TIMING.ONE_DAY_BEFORE,
    REMINDER_TIMING.THREE_DAYS_BEFORE,
    REMINDER_TIMING.ONE_WEEK_BEFORE,
    REMINDER_TIMING.SPECIFIC_TIME,
  ];

  // Available recurrence options
  const recurrenceOptions: ReminderRecurrence[] = [
    REMINDER_RECURRENCE.NONE,
    REMINDER_RECURRENCE.DAILY,
    REMINDER_RECURRENCE.WEEKLY,
    REMINDER_RECURRENCE.MONTHLY,
  ];

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {l.title}
      </h3>

      {/* Reference information */}
      {referenceData !== undefined && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">
            {type === REMINDER_TYPE.ACTION_ITEM_DUE && (
              <>
                <span className="font-medium">{l.forActionItem}: </span>
                {referenceData.actionItemContent}
                {referenceData.dueDate !== undefined && (
                  <span className="ml-2 text-gray-500">
                    ({l.dueDate}: {referenceData.dueDate})
                  </span>
                )}
              </>
            )}
            {type === REMINDER_TYPE.MINUTES_REVIEW && (
              <>
                <span className="font-medium">{l.forMinutes}: </span>
                {referenceData.meetingTitle}
                {referenceData.meetingDate !== undefined && (
                  <span className="ml-2 text-gray-500">
                    ({referenceData.meetingDate})
                  </span>
                )}
              </>
            )}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label
            htmlFor="reminder-title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {l.reminderTitle}
          </label>
          <input
            id="reminder-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={l.reminderTitlePlaceholder}
            disabled={disabled}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          />
        </div>

        {/* Message */}
        <div>
          <label
            htmlFor="reminder-message"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {l.message}
          </label>
          <textarea
            id="reminder-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={l.messagePlaceholder}
            disabled={disabled}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          />
        </div>

        {/* Timing */}
        <div>
          <label
            htmlFor="reminder-timing"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {l.timing}
          </label>
          <select
            id="reminder-timing"
            value={timing}
            onChange={(e) => setTiming(e.target.value as ReminderTiming)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            {timingOptions.map((opt) => (
              <option key={opt} value={opt}>
                {getTimingLabel(opt, language)}
              </option>
            ))}
          </select>
        </div>

        {/* Custom time input */}
        {timing === REMINDER_TIMING.SPECIFIC_TIME && (
          <div>
            <label
              htmlFor="custom-time"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {l.customTime}
            </label>
            <input
              id="custom-time"
              type="datetime-local"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              disabled={disabled}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
          </div>
        )}

        {/* Recurrence */}
        <div>
          <label
            htmlFor="reminder-recurrence"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {l.recurrence}
          </label>
          <select
            id="reminder-recurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as ReminderRecurrence)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            {recurrenceOptions.map((opt) => (
              <option key={opt} value={opt}>
                {getRecurrenceLabel(opt, language)}
              </option>
            ))}
          </select>
        </div>

        {/* Recipient */}
        <fieldset className="border border-gray-200 rounded-md p-4">
          <legend className="text-sm font-medium text-gray-700 px-2">
            {l.recipient}
          </legend>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="recipient-name"
                className="block text-sm text-gray-600 mb-1"
              >
                {l.recipientName}
              </label>
              <input
                id="recipient-name"
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
            <div>
              <label
                htmlFor="recipient-email"
                className="block text-sm text-gray-600 mb-1"
              >
                {l.recipientEmail}
              </label>
              <input
                id="recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(e) => {
                  setRecipientEmail(e.target.value);
                  // Use email as ID if no specific ID provided
                  if (recipientId === '' || recipientId === defaultRecipient?.id) {
                    setRecipientId(e.target.value);
                  }
                }}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>
        </fieldset>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4">
          {onCancel !== undefined && (
            <button
              type="button"
              onClick={onCancel}
              disabled={disabled}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {l.cancel}
            </button>
          )}
          <button
            type="submit"
            disabled={disabled || title.trim() === '' || recipientId === ''}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {l.submit}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ReminderSetting;
