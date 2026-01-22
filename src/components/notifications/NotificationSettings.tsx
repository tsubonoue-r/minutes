'use client';

import { useState, useCallback } from 'react';

/**
 * Notification recipient type
 */
export type RecipientType = 'participants' | 'organizer' | 'assignees' | 'custom';

/**
 * Notification timing options
 */
export type NotificationTiming =
  | 'on_draft_complete'
  | 'on_minutes_finalized'
  | 'on_action_item_assigned';

/**
 * Notification settings configuration
 */
export interface NotificationConfig {
  /** Whether notifications are enabled */
  readonly enabled: boolean;
  /** Who to notify */
  readonly recipientType: RecipientType;
  /** Custom recipient IDs (when recipientType is 'custom') */
  readonly customRecipients: readonly string[];
  /** When to send notifications */
  readonly timing: NotificationTiming;
  /** Notification language */
  readonly language: 'ja' | 'en';
  /** Include minutes link */
  readonly includeMinutesLink: boolean;
  /** Include action items summary */
  readonly includeActionItemsSummary: boolean;
}

/**
 * Props for NotificationSettings component
 */
export interface NotificationSettingsProps {
  /** Current notification configuration */
  readonly config: NotificationConfig;
  /** Callback when configuration changes */
  readonly onConfigChange: (config: NotificationConfig) => void;
  /** Whether the settings are disabled */
  readonly disabled?: boolean;
  /** Class name for custom styling */
  readonly className?: string;
}

/**
 * Default notification configuration
 */
export const defaultNotificationConfig: NotificationConfig = {
  enabled: true,
  recipientType: 'participants',
  customRecipients: [],
  timing: 'on_minutes_finalized',
  language: 'ja',
  includeMinutesLink: true,
  includeActionItemsSummary: true,
};

/**
 * Labels for UI display
 */
const labels = {
  ja: {
    title: '通知設定',
    enabled: '通知を有効にする',
    recipientType: '通知先',
    recipients: {
      participants: '参加者全員',
      organizer: '主催者のみ',
      assignees: 'アクションアイテム担当者',
      custom: 'カスタム',
    },
    timing: '通知タイミング',
    timings: {
      on_draft_complete: '下書き完成時',
      on_minutes_finalized: '議事録確定時',
      on_action_item_assigned: 'アクションアイテム割り当て時',
    },
    language: '通知言語',
    languages: {
      ja: '日本語',
      en: '英語',
    },
    options: 'オプション',
    includeMinutesLink: '議事録リンクを含める',
    includeActionItemsSummary: 'アクションアイテム概要を含める',
    customRecipientsPlaceholder: 'メールアドレスを入力...',
  },
  en: {
    title: 'Notification Settings',
    enabled: 'Enable notifications',
    recipientType: 'Recipients',
    recipients: {
      participants: 'All participants',
      organizer: 'Organizer only',
      assignees: 'Action item assignees',
      custom: 'Custom',
    },
    timing: 'Notification Timing',
    timings: {
      on_draft_complete: 'On draft complete',
      on_minutes_finalized: 'On minutes finalized',
      on_action_item_assigned: 'On action item assigned',
    },
    language: 'Notification Language',
    languages: {
      ja: 'Japanese',
      en: 'English',
    },
    options: 'Options',
    includeMinutesLink: 'Include minutes link',
    includeActionItemsSummary: 'Include action items summary',
    customRecipientsPlaceholder: 'Enter email address...',
  },
};

/**
 * NotificationSettings Component
 *
 * Provides a UI for configuring notification preferences.
 *
 * @example
 * ```tsx
 * <NotificationSettings
 *   config={config}
 *   onConfigChange={setConfig}
 * />
 * ```
 */
export function NotificationSettings({
  config,
  onConfigChange,
  disabled = false,
  className = '',
}: NotificationSettingsProps): JSX.Element {
  const [customInput, setCustomInput] = useState('');
  const l = labels[config.language];

  const handleEnabledChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onConfigChange({ ...config, enabled: e.target.checked });
    },
    [config, onConfigChange]
  );

  const handleRecipientTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onConfigChange({
        ...config,
        recipientType: e.target.value as RecipientType,
      });
    },
    [config, onConfigChange]
  );

  const handleTimingChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onConfigChange({
        ...config,
        timing: e.target.value as NotificationTiming,
      });
    },
    [config, onConfigChange]
  );

  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onConfigChange({
        ...config,
        language: e.target.value as 'ja' | 'en',
      });
    },
    [config, onConfigChange]
  );

  const handleIncludeMinutesLinkChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onConfigChange({ ...config, includeMinutesLink: e.target.checked });
    },
    [config, onConfigChange]
  );

  const handleIncludeActionItemsSummaryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onConfigChange({
        ...config,
        includeActionItemsSummary: e.target.checked,
      });
    },
    [config, onConfigChange]
  );

  const handleAddCustomRecipient = useCallback(() => {
    if (customInput.trim() !== '' && !config.customRecipients.includes(customInput.trim())) {
      onConfigChange({
        ...config,
        customRecipients: [...config.customRecipients, customInput.trim()],
      });
      setCustomInput('');
    }
  }, [config, customInput, onConfigChange]);

  const handleRemoveCustomRecipient = useCallback(
    (recipient: string) => {
      onConfigChange({
        ...config,
        customRecipients: config.customRecipients.filter((r) => r !== recipient),
      });
    },
    [config, onConfigChange]
  );

  const handleCustomInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddCustomRecipient();
      }
    },
    [handleAddCustomRecipient]
  );

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{l.title}</h3>

      {/* Enable toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={handleEnabledChange}
            disabled={disabled}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">{l.enabled}</span>
        </label>
      </div>

      {config.enabled && (
        <>
          {/* Recipient type */}
          <div className="mb-4">
            <label
              htmlFor="recipient-type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {l.recipientType}
            </label>
            <select
              id="recipient-type"
              value={config.recipientType}
              onChange={handleRecipientTypeChange}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              {(Object.keys(l.recipients) as RecipientType[]).map((key) => (
                <option key={key} value={key}>
                  {l.recipients[key]}
                </option>
              ))}
            </select>
          </div>

          {/* Custom recipients input */}
          {config.recipientType === 'custom' && (
            <div className="mb-4 ml-4">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={handleCustomInputKeyDown}
                  placeholder={l.customRecipientsPlaceholder}
                  disabled={disabled}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
                <button
                  type="button"
                  onClick={handleAddCustomRecipient}
                  disabled={disabled || customInput.trim() === ''}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
              {config.customRecipients.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {config.customRecipients.map((recipient) => (
                    <span
                      key={recipient}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm"
                    >
                      {recipient}
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomRecipient(recipient)}
                        disabled={disabled}
                        className="text-gray-500 hover:text-gray-700"
                        aria-label={`Remove ${recipient}`}
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Timing */}
          <div className="mb-4">
            <label
              htmlFor="timing"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {l.timing}
            </label>
            <select
              id="timing"
              value={config.timing}
              onChange={handleTimingChange}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              {(Object.keys(l.timings) as NotificationTiming[]).map((key) => (
                <option key={key} value={key}>
                  {l.timings[key]}
                </option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div className="mb-4">
            <label
              htmlFor="language"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {l.language}
            </label>
            <select
              id="language"
              value={config.language}
              onChange={handleLanguageChange}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="ja">{l.languages.ja}</option>
              <option value="en">{l.languages.en}</option>
            </select>
          </div>

          {/* Options */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">{l.options}</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeMinutesLink}
                  onChange={handleIncludeMinutesLinkChange}
                  disabled={disabled}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">{l.includeMinutesLink}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeActionItemsSummary}
                  onChange={handleIncludeActionItemsSummaryChange}
                  disabled={disabled}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  {l.includeActionItemsSummary}
                </span>
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
