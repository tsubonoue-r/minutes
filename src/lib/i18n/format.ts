/**
 * i18n formatting utilities - Date, number, and relative time formatting
 * @module lib/i18n/format
 */

import type { Locale } from './types';

/** Mapping from our locale codes to Intl locale identifiers */
const INTL_LOCALES: Record<Locale, string> = {
  ja: 'ja-JP',
  en: 'en-US',
};

/**
 * Formats a date according to the specified locale.
 *
 * @param date - The date to format (Date object or ISO string)
 * @param locale - The target locale
 * @param options - Optional Intl.DateTimeFormatOptions override
 * @returns Locale-formatted date string
 *
 * @example
 * ```typescript
 * formatDate(new Date('2025-01-15'), 'ja'); // '2025/1/15'
 * formatDate(new Date('2025-01-15'), 'en'); // '1/15/2025'
 * ```
 */
export function formatDate(
  date: Date | string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  };

  return new Intl.DateTimeFormat(
    INTL_LOCALES[locale],
    options ?? defaultOptions
  ).format(dateObj);
}

/**
 * Formats a date with time according to the specified locale.
 *
 * @param date - The date to format (Date object or ISO string)
 * @param locale - The target locale
 * @returns Locale-formatted date and time string
 *
 * @example
 * ```typescript
 * formatDateTime(new Date('2025-01-15T14:30:00'), 'ja');
 * // '2025/1/15 14:30'
 * ```
 */
export function formatDateTime(date: Date | string, locale: Locale): string {
  return formatDate(date, locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats a number according to the specified locale.
 *
 * @param num - The number to format
 * @param locale - The target locale
 * @param options - Optional Intl.NumberFormatOptions override
 * @returns Locale-formatted number string
 *
 * @example
 * ```typescript
 * formatNumber(1234567, 'ja'); // '1,234,567'
 * formatNumber(1234567, 'en'); // '1,234,567'
 * formatNumber(0.85, 'ja', { style: 'percent' }); // '85%'
 * ```
 */
export function formatNumber(
  num: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(INTL_LOCALES[locale], options).format(num);
}

/** Relative time unit thresholds in milliseconds */
const TIME_UNITS: readonly { readonly unit: Intl.RelativeTimeFormatUnit; readonly ms: number }[] = [
  { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: 'day', ms: 24 * 60 * 60 * 1000 },
  { unit: 'hour', ms: 60 * 60 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
  { unit: 'second', ms: 1000 },
];

/**
 * Formats a date as a relative time string (e.g., "3 minutes ago", "3\u5206\u524D").
 *
 * @param date - The date to express relative to now (Date object or ISO string)
 * @param locale - The target locale
 * @param now - Optional reference time (defaults to current time, useful for testing)
 * @returns Locale-formatted relative time string
 *
 * @example
 * ```typescript
 * // Assuming current time is 2025-01-15T14:33:00
 * formatRelativeTime(new Date('2025-01-15T14:30:00'), 'ja'); // '3\u5206\u524D'
 * formatRelativeTime(new Date('2025-01-15T14:30:00'), 'en'); // '3 minutes ago'
 * formatRelativeTime(new Date('2025-01-16T14:30:00'), 'ja'); // '1\u65E5\u5F8C'
 * ```
 */
export function formatRelativeTime(
  date: Date | string,
  locale: Locale,
  now?: Date
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const reference = now ?? new Date();

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const diffMs = dateObj.getTime() - reference.getTime();
  const absDiff = Math.abs(diffMs);

  // Find the appropriate time unit
  for (const { unit, ms } of TIME_UNITS) {
    if (absDiff >= ms) {
      const value = Math.round(diffMs / ms);
      const formatter = new Intl.RelativeTimeFormat(INTL_LOCALES[locale], {
        numeric: 'auto',
      });
      return formatter.format(value, unit);
    }
  }

  // Less than 1 second difference
  const formatter = new Intl.RelativeTimeFormat(INTL_LOCALES[locale], {
    numeric: 'auto',
  });
  return formatter.format(0, 'second');
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 *
 * @param durationMs - Duration in milliseconds
 * @param locale - The target locale
 * @returns Formatted duration string
 *
 * @example
 * ```typescript
 * formatDuration(3600000, 'ja'); // '1\u6642\u9593'
 * formatDuration(5400000, 'en'); // '1 hr, 30 min'
 * ```
 */
export function formatDuration(durationMs: number, locale: Locale): string {
  const hours = Math.floor(durationMs / (60 * 60 * 1000));
  const minutes = Math.floor((durationMs % (60 * 60 * 1000)) / (60 * 1000));

  if (locale === 'ja') {
    if (hours > 0 && minutes > 0) {
      return `${hours}\u6642\u9593${minutes}\u5206`;
    }
    if (hours > 0) {
      return `${hours}\u6642\u9593`;
    }
    return `${minutes}\u5206`;
  }

  // English
  if (hours > 0 && minutes > 0) {
    return `${hours} hr, ${minutes} min`;
  }
  if (hours > 0) {
    return `${hours} hr`;
  }
  return `${minutes} min`;
}
