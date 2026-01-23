/**
 * i18n type definitions
 * @module lib/i18n/types
 */

/** Supported locale identifiers */
export type Locale = 'ja' | 'en';

/** Nested translation dictionary structure */
export type TranslationDictionary = {
  [key: string]: string | TranslationDictionary;
};

/** Parameters for string interpolation */
export type TranslationParams = Record<string, string>;

/** i18n context value provided by I18nProvider */
export interface I18nContextValue {
  /** Translate a key to the current locale */
  readonly t: (key: string, params?: TranslationParams) => string;
  /** Current locale */
  readonly locale: Locale;
  /** Update the current locale */
  readonly setLocale: (locale: Locale) => void;
}

/** Supported locale configuration */
export interface LocaleConfig {
  readonly code: Locale;
  readonly label: string;
  readonly flag: string;
}

/** All supported locales with their display configuration */
export const SUPPORTED_LOCALES: readonly LocaleConfig[] = [
  { code: 'ja', label: '\u65E5\u672C\u8A9E', flag: '\uD83C\uDDEF\uD83C\uDDF5' },
  { code: 'en', label: 'English', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
] as const;

/** Default locale */
export const DEFAULT_LOCALE: Locale = 'ja';

/** LocalStorage key for persisting locale preference */
export const LOCALE_STORAGE_KEY = 'minutes-locale';
