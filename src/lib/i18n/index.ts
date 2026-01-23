/**
 * i18n core module - Lightweight internationalization without external dependencies
 * @module lib/i18n
 */

import type { Locale, TranslationDictionary, TranslationParams } from './types';
import ja from './locales/ja';
import en from './locales/en';

/** Translation dictionaries indexed by locale */
const dictionaries: Record<Locale, TranslationDictionary> = {
  ja,
  en,
};

/**
 * Resolves a dot-notation key against a translation dictionary.
 *
 * @param dictionary - The translation dictionary to search
 * @param key - Dot-notation key (e.g., "nav.dashboard")
 * @returns The resolved string value, or undefined if not found
 *
 * @example
 * ```typescript
 * resolveKey(ja, 'nav.dashboard'); // '\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9'
 * resolveKey(ja, 'nonexistent.key'); // undefined
 * ```
 */
function resolveKey(dictionary: TranslationDictionary, key: string): string | undefined {
  const parts = key.split('.');
  let current: TranslationDictionary | string = dictionary;

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    const next: string | TranslationDictionary | undefined = current[part];
    if (next === undefined) {
      return undefined;
    }
    current = next;
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * Interpolates parameters into a translation string.
 * Replaces `{{paramName}}` placeholders with corresponding values.
 *
 * @param template - The template string containing `{{key}}` placeholders
 * @param params - Key-value pairs for interpolation
 * @returns The interpolated string
 *
 * @example
 * ```typescript
 * interpolate('Hello, {{name}}!', { name: 'World' }); // 'Hello, World!'
 * ```
 */
function interpolate(template: string, params: TranslationParams): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, paramKey: string) => {
    const value = params[paramKey];
    return value !== undefined ? value : match;
  });
}

/**
 * Translates a key to the specified locale with optional parameter interpolation.
 *
 * Features:
 * - Dot-notation key access (e.g., "nav.dashboard")
 * - Parameter interpolation with `{{paramName}}` syntax
 * - Falls back to the key string if translation is not found
 *
 * @param key - The translation key in dot-notation
 * @param locale - The target locale
 * @param params - Optional parameters for interpolation
 * @returns The translated and interpolated string, or the key if not found
 *
 * @example
 * ```typescript
 * t('nav.dashboard', 'ja'); // '\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9'
 * t('dashboard.welcome', 'en', { name: 'John' }); // 'Welcome, John'
 * t('unknown.key', 'ja'); // 'unknown.key'
 * ```
 */
export function t(key: string, locale: Locale, params?: TranslationParams): string {
  const dictionary = dictionaries[locale];
  const value = resolveKey(dictionary, key);

  if (value === undefined) {
    return key;
  }

  if (params) {
    return interpolate(value, params);
  }

  return value;
}

/**
 * Checks if a translation key exists for the given locale.
 *
 * @param key - The translation key in dot-notation
 * @param locale - The locale to check
 * @returns True if the key exists in the locale's dictionary
 */
export function hasTranslation(key: string, locale: Locale): boolean {
  const dictionary = dictionaries[locale];
  return resolveKey(dictionary, key) !== undefined;
}

/**
 * Returns all top-level keys from a locale's translation dictionary.
 *
 * @param locale - The locale to inspect
 * @returns Array of top-level category keys
 */
export function getTranslationCategories(locale: Locale): string[] {
  return Object.keys(dictionaries[locale]);
}

/**
 * Retrieves all leaf keys (dot-notation paths) from a translation dictionary.
 * Useful for comparing completeness between locales.
 *
 * @param locale - The locale to extract keys from
 * @returns Array of all translation keys in dot-notation
 */
export function getAllTranslationKeys(locale: Locale): string[] {
  const keys: string[] = [];

  function walk(obj: TranslationDictionary, prefix: string): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') {
        keys.push(fullKey);
      } else {
        walk(value, fullKey);
      }
    }
  }

  walk(dictionaries[locale], '');
  return keys.sort();
}

export type { Locale, TranslationDictionary, TranslationParams, I18nContextValue } from './types';
export { DEFAULT_LOCALE, SUPPORTED_LOCALES, LOCALE_STORAGE_KEY } from './types';
