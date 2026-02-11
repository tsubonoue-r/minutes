'use client';

/**
 * Settings data fetching and mutation hook
 * @module hooks/use-settings
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { UserSettings } from '@/types/settings';
import { createDefaultSettings } from '@/types/settings';

// ============================================================================
// Types
// ============================================================================

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * useSettings hook return value
 */
export interface UseSettingsResult {
  /** Current user settings */
  readonly settings: UserSettings;
  /** Whether settings are being loaded */
  readonly isLoading: boolean;
  /** Error message if loading or saving failed */
  readonly error: string | null;
  /** Update settings (partial or full) */
  readonly updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  /** Whether settings are currently being saved */
  readonly isSaving: boolean;
  /** Refetch settings from the server */
  readonly refetch: () => Promise<void>;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch user settings from the API
 */
async function fetchSettings(signal: AbortSignal): Promise<UserSettings> {
  const response = await fetch('/api/settings', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal,
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as ApiResponse<never>;
    throw new Error(
      errorData.error?.message ?? `設定の取得に失敗しました (${response.status})`
    );
  }

  const result = (await response.json()) as ApiResponse<UserSettings>;

  if (!result.success || result.data === undefined) {
    throw new Error(result.error?.message ?? '設定の取得に失敗しました');
  }

  return result.data;
}

/**
 * Save user settings via the API
 */
async function saveSettings(settings: UserSettings): Promise<UserSettings> {
  const response = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as ApiResponse<never>;
    throw new Error(
      errorData.error?.message ?? `設定の保存に失敗しました (${response.status})`
    );
  }

  const result = (await response.json()) as ApiResponse<UserSettings>;

  if (!result.success || result.data === undefined) {
    throw new Error(result.error?.message ?? '設定の保存に失敗しました');
  }

  return result.data;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Deep merge user settings with partial updates
 */
function mergeSettings(
  current: UserSettings,
  updates: Partial<UserSettings>
): UserSettings {
  return {
    notifications: {
      ...current.notifications,
      ...(updates.notifications !== undefined ? updates.notifications : {}),
    },
    ai: {
      ...current.ai,
      ...(updates.ai !== undefined ? updates.ai : {}),
    },
    display: {
      ...current.display,
      ...(updates.display !== undefined ? updates.display : {}),
    },
  };
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for loading and saving user settings
 *
 * Provides the current settings, loading/saving states, and an update function.
 * Settings are loaded on mount and can be partially updated.
 *
 * @returns UseSettingsResult with settings data and mutation functions
 *
 * @example
 * ```tsx
 * const { settings, isLoading, error, updateSettings, isSaving } = useSettings();
 *
 * // Update a single section
 * await updateSettings({
 *   notifications: { ...settings.notifications, minutesCompleted: false },
 * });
 * ```
 */
export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<UserSettings>(createDefaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch settings from the server
   */
  const refetch = useCallback(async (): Promise<void> => {
    // Cancel any in-flight request
    if (abortControllerRef.current !== null) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchSettings(abortControllerRef.current.signal);
      setSettings(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const message = err instanceof Error ? err.message : '設定の取得に失敗しました';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update settings with partial data
   */
  const updateSettings = useCallback(
    async (updates: Partial<UserSettings>): Promise<void> => {
      setIsSaving(true);
      setError(null);

      const merged = mergeSettings(settings, updates);

      // Optimistic update
      setSettings(merged);

      try {
        const saved = await saveSettings(merged);
        setSettings(saved);
      } catch (err) {
        // Revert optimistic update on failure
        setSettings(settings);
        const message = err instanceof Error ? err.message : '設定の保存に失敗しました';
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [settings]
  );

  // Load settings on mount
  useEffect(() => {
    void refetch();

    return (): void => {
      if (abortControllerRef.current !== null) {
        abortControllerRef.current.abort();
      }
    };
  }, [refetch]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    isSaving,
    refetch,
  };
}
