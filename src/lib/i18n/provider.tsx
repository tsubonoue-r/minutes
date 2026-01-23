'use client';

/**
 * i18n React Context Provider
 * Provides translation function, locale state, and locale setter to the component tree.
 * @module lib/i18n/provider
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { t as translate } from './index';
import type { I18nContextValue, Locale, TranslationParams } from './types';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from './types';

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Props for the I18nProvider component
 */
interface I18nProviderProps {
  /** Child components that will have access to i18n context */
  readonly children: ReactNode;
  /** Initial locale override (defaults to stored preference or DEFAULT_LOCALE) */
  readonly initialLocale?: Locale;
}

/**
 * Safely reads the stored locale from localStorage.
 * Returns the default locale if storage is unavailable or value is invalid.
 */
function getStoredLocale(): Locale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'ja' || stored === 'en') {
      return stored;
    }
  } catch {
    // localStorage may be unavailable (private browsing, SSR, etc.)
  }

  return DEFAULT_LOCALE;
}

/**
 * Safely persists the locale preference to localStorage.
 */
function storeLocale(locale: Locale): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * I18nProvider - Provides internationalization context to the React component tree.
 *
 * Features:
 * - Persists locale preference in localStorage
 * - Provides `t` function for translations
 * - Provides `locale` and `setLocale` for locale management
 * - Updates document lang attribute on locale change
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * import { I18nProvider } from '@/lib/i18n/provider';
 *
 * export default function Layout({ children }) {
 *   return (
 *     <I18nProvider>
 *       {children}
 *     </I18nProvider>
 *   );
 * }
 * ```
 */
export function I18nProvider({ children, initialLocale }: I18nProviderProps): React.ReactElement {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate locale from localStorage after mount
  useEffect(() => {
    if (!initialLocale) {
      const stored = getStoredLocale();
      setLocaleState(stored);
    }
    setIsHydrated(true);
  }, [initialLocale]);

  // Update document lang attribute when locale changes
  useEffect(() => {
    if (isHydrated && typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale, isHydrated]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    storeLocale(newLocale);
  }, []);

  const t = useCallback(
    (key: string, params?: TranslationParams): string => {
      return translate(key, locale, params);
    },
    [locale]
  );

  const contextValue: I18nContextValue = {
    t,
    locale,
    setLocale,
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook to access the i18n context (translation function, locale, setLocale).
 *
 * Must be used within an I18nProvider.
 *
 * @returns The i18n context value containing t, locale, and setLocale
 * @throws Error if used outside of I18nProvider
 *
 * @example
 * ```tsx
 * 'use client';
 * import { useI18n } from '@/lib/i18n/provider';
 *
 * function MyComponent() {
 *   const { t, locale, setLocale } = useI18n();
 *   return <h1>{t('dashboard.title')}</h1>;
 * }
 * ```
 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (context === null) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
