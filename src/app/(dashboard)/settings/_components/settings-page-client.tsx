'use client';

/**
 * Settings Page Client Component
 * @module app/(dashboard)/settings/_components/settings-page-client
 */

import { useState, useCallback, useMemo } from 'react';
import type { LarkUser } from '@/types/auth';
import type { UserSettings } from '@/types/settings';
import {
  LANGUAGE_LABELS,
  DASHBOARD_PERIOD_LABELS,
} from '@/types/settings';
import { useSettings } from '@/hooks/use-settings';
import { SettingsToggle } from '@/components/settings/SettingsToggle';
import { SettingsSelect } from '@/components/settings/SettingsSelect';
import type { SelectOption } from '@/components/settings/SettingsSelect';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for SettingsPageClient component
 */
export interface SettingsPageClientProps {
  /** Authenticated user */
  readonly user: LarkUser;
}

/**
 * Settings section identifier
 */
type SettingsSection = 'notifications' | 'ai' | 'display' | 'lark';

/**
 * Navigation item definition
 */
interface NavItem {
  readonly id: SettingsSection;
  readonly label: string;
  readonly icon: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Navigation items for the settings sidebar
 */
const NAV_ITEMS: readonly NavItem[] = [
  { id: 'notifications', label: '通知設定', icon: 'bell' },
  { id: 'ai', label: 'AI設定', icon: 'cpu' },
  { id: 'display', label: '表示設定', icon: 'monitor' },
  { id: 'lark', label: 'Lark連携', icon: 'link' },
];

/**
 * Language options for selects
 */
const LANGUAGE_OPTIONS: readonly SelectOption[] = [
  { value: 'ja', label: LANGUAGE_LABELS.ja },
  { value: 'en', label: LANGUAGE_LABELS.en },
];

/**
 * Dashboard period options for select
 */
const DASHBOARD_PERIOD_OPTIONS: readonly SelectOption[] = [
  { value: 'week', label: DASHBOARD_PERIOD_LABELS.week },
  { value: 'month', label: DASHBOARD_PERIOD_LABELS.month },
  { value: 'quarter', label: DASHBOARD_PERIOD_LABELS.quarter },
];

// ============================================================================
// Icon Components
// ============================================================================

/**
 * SVG icon for bell (notifications)
 */
function BellIcon({ className }: { readonly className?: string | undefined }): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/**
 * SVG icon for cpu (AI)
 */
function CpuIcon({ className }: { readonly className?: string | undefined }): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  );
}

/**
 * SVG icon for monitor (display)
 */
function MonitorIcon({ className }: { readonly className?: string | undefined }): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

/**
 * SVG icon for link (Lark integration)
 */
function LinkIcon({ className }: { readonly className?: string | undefined }): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/**
 * SVG icon for check circle (success)
 */
function CheckCircleIcon({ className }: { readonly className?: string | undefined }): JSX.Element {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  );
}

/**
 * Map section id to icon component
 */
function SectionIcon({
  section,
  className,
}: {
  readonly section: SettingsSection;
  readonly className?: string | undefined;
}): JSX.Element {
  switch (section) {
    case 'notifications':
      return <BellIcon className={className} />;
    case 'ai':
      return <CpuIcon className={className} />;
    case 'display':
      return <MonitorIcon className={className} />;
    case 'lark':
      return <LinkIcon className={className} />;
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Settings card wrapper component
 */
function SettingsCard({
  id,
  title,
  description,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly children: React.ReactNode;
}): JSX.Element {
  return (
    <section
      id={id}
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="mb-4 border-b border-slate-100 pb-4 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {children}
      </div>
    </section>
  );
}

/**
 * Notification settings section
 */
function NotificationSection({
  settings,
  disabled,
  onUpdate,
}: {
  readonly settings: UserSettings;
  readonly disabled: boolean;
  readonly onUpdate: (updates: Partial<UserSettings>) => Promise<void>;
}): JSX.Element {
  const handleToggle = useCallback(
    (field: keyof UserSettings['notifications']) =>
      (checked: boolean): void => {
        void onUpdate({
          notifications: {
            ...settings.notifications,
            [field]: checked,
          },
        });
      },
    [settings.notifications, onUpdate]
  );

  return (
    <SettingsCard
      id="section-notifications"
      title="通知設定"
      description="各種通知の受信設定を管理します"
    >
      <SettingsToggle
        label="議事録完了通知"
        description="議事録の生成が完了した際に通知を受け取ります"
        checked={settings.notifications.minutesCompleted}
        onChange={handleToggle('minutesCompleted')}
        disabled={disabled}
      />
      <SettingsToggle
        label="リマインダー通知"
        description="アクションアイテムの期限リマインダーを受け取ります"
        checked={settings.notifications.reminderAlerts}
        onChange={handleToggle('reminderAlerts')}
        disabled={disabled}
      />
      <SettingsToggle
        label="承認リクエスト通知"
        description="議事録の承認リクエストが届いた際に通知を受け取ります"
        checked={settings.notifications.approvalRequests}
        onChange={handleToggle('approvalRequests')}
        disabled={disabled}
      />
    </SettingsCard>
  );
}

/**
 * AI settings section
 */
function AISection({
  settings,
  disabled,
  onUpdate,
}: {
  readonly settings: UserSettings;
  readonly disabled: boolean;
  readonly onUpdate: (updates: Partial<UserSettings>) => Promise<void>;
}): JSX.Element {
  const handleLanguageChange = useCallback(
    (value: string): void => {
      void onUpdate({
        ai: {
          ...settings.ai,
          defaultLanguage: value as 'ja' | 'en',
        },
      });
    },
    [settings.ai, onUpdate]
  );

  return (
    <SettingsCard
      id="section-ai"
      title="AI設定"
      description="AIによるコンテンツ生成の動作を設定します"
    >
      <SettingsSelect
        label="デフォルト言語"
        description="AIが生成する議事録やサマリーの言語を設定します"
        value={settings.ai.defaultLanguage}
        options={LANGUAGE_OPTIONS}
        onChange={handleLanguageChange}
        disabled={disabled}
      />
    </SettingsCard>
  );
}

/**
 * Display settings section
 */
function DisplaySection({
  settings,
  disabled,
  onUpdate,
}: {
  readonly settings: UserSettings;
  readonly disabled: boolean;
  readonly onUpdate: (updates: Partial<UserSettings>) => Promise<void>;
}): JSX.Element {
  const handleLanguageChange = useCallback(
    (value: string): void => {
      void onUpdate({
        display: {
          ...settings.display,
          language: value as 'ja' | 'en',
        },
      });
    },
    [settings.display, onUpdate]
  );

  const handlePeriodChange = useCallback(
    (value: string): void => {
      void onUpdate({
        display: {
          ...settings.display,
          dashboardPeriod: value as 'week' | 'month' | 'quarter',
        },
      });
    },
    [settings.display, onUpdate]
  );

  return (
    <SettingsCard
      id="section-display"
      title="表示設定"
      description="画面の表示に関する設定を管理します"
    >
      <SettingsSelect
        label="表示言語"
        description="アプリケーション全体の表示言語を設定します"
        value={settings.display.language}
        options={LANGUAGE_OPTIONS}
        onChange={handleLanguageChange}
        disabled={disabled}
      />
      <SettingsSelect
        label="ダッシュボード表示期間"
        description="ダッシュボードの統計情報のデフォルト表示期間を設定します"
        value={settings.display.dashboardPeriod}
        options={DASHBOARD_PERIOD_OPTIONS}
        onChange={handlePeriodChange}
        disabled={disabled}
      />
    </SettingsCard>
  );
}

/**
 * Lark integration section
 */
function LarkSection({
  user,
}: {
  readonly user: LarkUser;
}): JSX.Element {
  const handleReauth = useCallback((): void => {
    window.location.href = '/api/auth/lark';
  }, []);

  return (
    <SettingsCard
      id="section-lark"
      title="Lark連携"
      description="Larkとの連携状態を確認・管理します"
    >
      {/* Connection Status */}
      <div className="py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              接続状態
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Larkアカウントとの連携状態
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              接続済み
            </span>
          </div>
        </div>
      </div>

      {/* Connected Account */}
      <div className="py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              接続アカウント
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {user.name}
              {user.email !== undefined && user.email !== '' && ` (${user.email})`}
            </p>
          </div>
        </div>
      </div>

      {/* Re-authentication button */}
      <div className="py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              再認証
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              認証トークンを更新して再接続します
            </p>
          </div>
          <button
            type="button"
            onClick={handleReauth}
            className="
              rounded-lg border border-slate-300 bg-white px-3 py-1.5
              text-sm font-medium text-slate-700 shadow-sm
              transition-colors duration-150
              hover:bg-slate-50
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200
              dark:hover:bg-slate-600 dark:focus:ring-offset-slate-800
            "
          >
            再認証する
          </button>
        </div>
      </div>
    </SettingsCard>
  );
}

/**
 * Sidebar navigation component
 */
function SettingsSidebar({
  activeSection,
  onSectionChange,
}: {
  readonly activeSection: SettingsSection;
  readonly onSectionChange: (section: SettingsSection) => void;
}): JSX.Element {
  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const isActive = activeSection === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            className={`
              flex w-full items-center gap-3 rounded-lg px-3 py-2
              text-sm font-medium transition-colors duration-150
              ${isActive
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}
            `}
          >
            <SectionIcon
              section={item.id}
              className={`h-4 w-4 shrink-0 ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Loading skeleton for settings content
 */
function SettingsSkeleton(): JSX.Element {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="mb-4 border-b border-slate-100 pb-4 dark:border-slate-700">
            <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-2 h-3 w-48 rounded bg-slate-100 dark:bg-slate-700" />
          </div>
          <div className="space-y-4">
            {[1, 2].map((j) => (
              <div key={j} className="flex items-center justify-between py-3">
                <div>
                  <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="mt-1 h-3 w-40 rounded bg-slate-100 dark:bg-slate-700" />
                </div>
                <div className="h-6 w-11 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Save status indicator component
 */
function SaveStatus({
  isSaving,
  error,
}: {
  readonly isSaving: boolean;
  readonly error: string | null;
}): JSX.Element {
  if (error !== null) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
        {error}
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        保存中...
      </div>
    );
  }

  return <></>;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * SettingsPageClient Component
 *
 * @description Main client component for the settings page.
 * Uses a sidebar layout on desktop (left nav + right content)
 * and a flat list layout on mobile.
 *
 * Sections:
 * 1. 通知設定 (Notification Settings)
 * 2. AI設定 (AI Settings)
 * 3. 表示設定 (Display Settings)
 * 4. Lark連携 (Lark Integration)
 */
export function SettingsPageClient({
  user,
}: SettingsPageClientProps): JSX.Element {
  const { settings, isLoading, error, updateSettings, isSaving } = useSettings();
  const [activeSection, setActiveSection] = useState<SettingsSection>('notifications');

  /**
   * Handle section change from sidebar navigation
   */
  const handleSectionChange = useCallback((section: SettingsSection): void => {
    setActiveSection(section);

    // Scroll to the section on mobile
    const element = document.getElementById(`section-${section}`);
    if (element !== null) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  /**
   * Memoized update handler that doesn't throw to the UI
   */
  const handleUpdate = useCallback(
    async (updates: Partial<UserSettings>): Promise<void> => {
      try {
        await updateSettings(updates);
      } catch {
        // Error is already handled by the hook and displayed via SaveStatus
      }
    },
    [updateSettings]
  );

  /**
   * Whether form controls should be disabled
   */
  const isDisabled = useMemo(
    () => isLoading || isSaving,
    [isLoading, isSaving]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          設定
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          アプリケーションの動作や表示をカスタマイズします
        </p>
      </div>

      {/* Save Status */}
      <SaveStatus isSaving={isSaving} error={error} />

      {/* Desktop: Sidebar + Content Layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar - Desktop only */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <SettingsSidebar
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
            />
          </div>
        </aside>

        {/* Mobile: Section tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 lg:hidden">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSectionChange(item.id)}
                className={`
                  flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5
                  text-sm font-medium transition-colors duration-150
                  ${isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}
                `}
              >
                <SectionIcon section={item.id} className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <SettingsSkeleton />
          ) : (
            <div className="space-y-6">
              <NotificationSection
                settings={settings}
                disabled={isDisabled}
                onUpdate={handleUpdate}
              />
              <AISection
                settings={settings}
                disabled={isDisabled}
                onUpdate={handleUpdate}
              />
              <DisplaySection
                settings={settings}
                disabled={isDisabled}
                onUpdate={handleUpdate}
              />
              <LarkSection user={user} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
