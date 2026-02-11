/**
 * Tests for settings type definitions
 * @module types/__tests__/settings.test
 */

import { describe, it, expect } from 'vitest';
import {
  UserSettingsSchema,
  NotificationSettingsSchema,
  AISettingsSchema,
  DisplaySettingsSchema,
  createDefaultSettings,
  validateUserSettings,
  validateNotificationSettings,
  validateAISettings,
  validateDisplaySettings,
  SUPPORTED_LANGUAGES,
  DASHBOARD_PERIODS,
  LANGUAGE_LABELS,
  DASHBOARD_PERIOD_LABELS,
} from '../settings';

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  it('SUPPORTED_LANGUAGES contains expected values', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['ja', 'en']);
  });

  it('DASHBOARD_PERIODS contains expected values', () => {
    expect(DASHBOARD_PERIODS).toEqual(['week', 'month', 'quarter']);
  });

  it('LANGUAGE_LABELS has labels for all supported languages', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(LANGUAGE_LABELS[lang]).toBeDefined();
      expect(typeof LANGUAGE_LABELS[lang]).toBe('string');
    }
  });

  it('DASHBOARD_PERIOD_LABELS has labels for all periods', () => {
    for (const period of DASHBOARD_PERIODS) {
      expect(DASHBOARD_PERIOD_LABELS[period]).toBeDefined();
      expect(typeof DASHBOARD_PERIOD_LABELS[period]).toBe('string');
    }
  });
});

// ============================================================================
// Schema Tests
// ============================================================================

describe('NotificationSettingsSchema', () => {
  it('accepts valid notification settings', () => {
    const data = {
      minutesCompleted: true,
      reminderAlerts: false,
      approvalRequests: true,
    };

    const result = NotificationSettingsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects missing fields', () => {
    const data = {
      minutesCompleted: true,
    };

    const result = NotificationSettingsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean values', () => {
    const data = {
      minutesCompleted: 'yes',
      reminderAlerts: false,
      approvalRequests: true,
    };

    const result = NotificationSettingsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('AISettingsSchema', () => {
  it('accepts valid AI settings with language only', () => {
    const data = {
      defaultLanguage: 'ja',
    };

    const result = AISettingsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts valid AI settings with template ID', () => {
    const data = {
      defaultLanguage: 'en',
      defaultTemplateId: 'tpl_abc123',
    };

    const result = AISettingsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects invalid language', () => {
    const data = {
      defaultLanguage: 'fr',
    };

    const result = AISettingsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('DisplaySettingsSchema', () => {
  it('accepts valid display settings', () => {
    const data = {
      language: 'ja',
      dashboardPeriod: 'month',
    };

    const result = DisplaySettingsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts all valid period values', () => {
    for (const period of DASHBOARD_PERIODS) {
      const data = {
        language: 'ja',
        dashboardPeriod: period,
      };

      const result = DisplaySettingsSchema.safeParse(data);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid dashboard period', () => {
    const data = {
      language: 'ja',
      dashboardPeriod: 'year',
    };

    const result = DisplaySettingsSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('UserSettingsSchema', () => {
  it('accepts valid complete settings', () => {
    const data = {
      notifications: {
        minutesCompleted: true,
        reminderAlerts: true,
        approvalRequests: false,
      },
      ai: {
        defaultLanguage: 'ja',
        defaultTemplateId: 'tpl_test',
      },
      display: {
        language: 'en',
        dashboardPeriod: 'week',
      },
    };

    const result = UserSettingsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts settings without optional fields', () => {
    const data = {
      notifications: {
        minutesCompleted: true,
        reminderAlerts: true,
        approvalRequests: true,
      },
      ai: {
        defaultLanguage: 'ja',
      },
      display: {
        language: 'ja',
        dashboardPeriod: 'month',
      },
    };

    const result = UserSettingsSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects empty object', () => {
    const result = UserSettingsSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects null', () => {
    const result = UserSettingsSchema.safeParse(null);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('createDefaultSettings', () => {
  it('returns valid settings', () => {
    const settings = createDefaultSettings();
    const result = UserSettingsSchema.safeParse(settings);
    expect(result.success).toBe(true);
  });

  it('returns Japanese as default language', () => {
    const settings = createDefaultSettings();
    expect(settings.ai.defaultLanguage).toBe('ja');
    expect(settings.display.language).toBe('ja');
  });

  it('returns all notifications enabled by default', () => {
    const settings = createDefaultSettings();
    expect(settings.notifications.minutesCompleted).toBe(true);
    expect(settings.notifications.reminderAlerts).toBe(true);
    expect(settings.notifications.approvalRequests).toBe(true);
  });

  it('returns month as default dashboard period', () => {
    const settings = createDefaultSettings();
    expect(settings.display.dashboardPeriod).toBe('month');
  });

  it('returns undefined for optional template ID', () => {
    const settings = createDefaultSettings();
    expect(settings.ai.defaultTemplateId).toBeUndefined();
  });

  it('returns a new object each time', () => {
    const a = createDefaultSettings();
    const b = createDefaultSettings();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

// ============================================================================
// Validation Function Tests
// ============================================================================

describe('validateUserSettings', () => {
  it('returns success for valid data', () => {
    const result = validateUserSettings(createDefaultSettings());
    expect(result.success).toBe(true);
  });

  it('returns error for invalid data', () => {
    const result = validateUserSettings({ notifications: {} });
    expect(result.success).toBe(false);
  });
});

describe('validateNotificationSettings', () => {
  it('returns success for valid data', () => {
    const result = validateNotificationSettings({
      minutesCompleted: true,
      reminderAlerts: false,
      approvalRequests: true,
    });
    expect(result.success).toBe(true);
  });

  it('returns error for invalid data', () => {
    const result = validateNotificationSettings({});
    expect(result.success).toBe(false);
  });
});

describe('validateAISettings', () => {
  it('returns success for valid data', () => {
    const result = validateAISettings({ defaultLanguage: 'en' });
    expect(result.success).toBe(true);
  });

  it('returns error for invalid language', () => {
    const result = validateAISettings({ defaultLanguage: 'de' });
    expect(result.success).toBe(false);
  });
});

describe('validateDisplaySettings', () => {
  it('returns success for valid data', () => {
    const result = validateDisplaySettings({
      language: 'ja',
      dashboardPeriod: 'quarter',
    });
    expect(result.success).toBe(true);
  });

  it('returns error for missing period', () => {
    const result = validateDisplaySettings({ language: 'ja' });
    expect(result.success).toBe(false);
  });
});
