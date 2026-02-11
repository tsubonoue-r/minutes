/**
 * User settings type definitions
 * @module types/settings
 */

import { z, type ZodSafeParseResult } from 'zod';

// ============================================================================
// Constants
// ============================================================================

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = ['ja', 'en'] as const;

/**
 * Dashboard period options
 */
export const DASHBOARD_PERIODS = ['week', 'month', 'quarter'] as const;

/**
 * Language labels (Japanese)
 */
export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  ja: '日本語',
  en: 'English',
};

/**
 * Dashboard period labels (Japanese)
 */
export const DASHBOARD_PERIOD_LABELS: Record<DashboardPeriod, string> = {
  week: '週',
  month: '月',
  quarter: '四半期',
};

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Notification settings schema
 */
export const NotificationSettingsSchema = z.object({
  /** Notify when minutes generation is completed */
  minutesCompleted: z.boolean(),
  /** Notify reminder alerts */
  reminderAlerts: z.boolean(),
  /** Notify approval requests */
  approvalRequests: z.boolean(),
});

/**
 * AI settings schema
 */
export const AISettingsSchema = z.object({
  /** Default language for AI-generated content */
  defaultLanguage: z.enum(SUPPORTED_LANGUAGES),
  /** Default template ID for minutes generation */
  defaultTemplateId: z.string().optional(),
});

/**
 * Display settings schema
 */
export const DisplaySettingsSchema = z.object({
  /** UI display language */
  language: z.enum(SUPPORTED_LANGUAGES),
  /** Default dashboard statistics period */
  dashboardPeriod: z.enum(DASHBOARD_PERIODS),
});

/**
 * User settings schema
 */
export const UserSettingsSchema = z.object({
  /** Notification preferences */
  notifications: NotificationSettingsSchema,
  /** AI behavior settings */
  ai: AISettingsSchema,
  /** Display preferences */
  display: DisplaySettingsSchema,
});

// ============================================================================
// Types (inferred from Zod schemas)
// ============================================================================

/**
 * Supported language type
 */
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Dashboard period type
 */
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

/**
 * Notification settings
 */
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;

/**
 * AI settings
 */
export type AISettings = z.infer<typeof AISettingsSchema>;

/**
 * Display settings
 */
export type DisplaySettings = z.infer<typeof DisplaySettingsSchema>;

/**
 * User settings
 */
export type UserSettings = z.infer<typeof UserSettingsSchema>;

// ============================================================================
// Read-only Types
// ============================================================================

/**
 * Read-only notification settings
 */
export interface ReadonlyNotificationSettings {
  readonly minutesCompleted: boolean;
  readonly reminderAlerts: boolean;
  readonly approvalRequests: boolean;
}

/**
 * Read-only AI settings
 */
export interface ReadonlyAISettings {
  readonly defaultLanguage: SupportedLanguage;
  readonly defaultTemplateId?: string | undefined;
}

/**
 * Read-only display settings
 */
export interface ReadonlyDisplaySettings {
  readonly language: SupportedLanguage;
  readonly dashboardPeriod: DashboardPeriod;
}

/**
 * Read-only user settings
 */
export interface ReadonlyUserSettings {
  readonly notifications: ReadonlyNotificationSettings;
  readonly ai: ReadonlyAISettings;
  readonly display: ReadonlyDisplaySettings;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create default user settings
 *
 * @returns Default UserSettings object
 */
export function createDefaultSettings(): UserSettings {
  return {
    notifications: {
      minutesCompleted: true,
      reminderAlerts: true,
      approvalRequests: true,
    },
    ai: {
      defaultLanguage: 'ja',
      defaultTemplateId: undefined,
    },
    display: {
      language: 'ja',
      dashboardPeriod: 'month',
    },
  };
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate user settings data
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateUserSettings(
  data: unknown
): ZodSafeParseResult<UserSettings> {
  return UserSettingsSchema.safeParse(data);
}

/**
 * Validate notification settings data
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateNotificationSettings(
  data: unknown
): ZodSafeParseResult<NotificationSettings> {
  return NotificationSettingsSchema.safeParse(data);
}

/**
 * Validate AI settings data
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateAISettings(
  data: unknown
): ZodSafeParseResult<AISettings> {
  return AISettingsSchema.safeParse(data);
}

/**
 * Validate display settings data
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateDisplaySettings(
  data: unknown
): ZodSafeParseResult<DisplaySettings> {
  return DisplaySettingsSchema.safeParse(data);
}
