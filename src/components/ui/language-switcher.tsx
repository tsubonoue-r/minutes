'use client';

/**
 * Language Switcher UI component
 * Provides a dropdown for switching between supported locales.
 * @module components/ui/language-switcher
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { SUPPORTED_LOCALES } from '@/lib/i18n/types';
import type { Locale } from '@/lib/i18n/types';

/**
 * Props for the LanguageSwitcher component
 */
interface LanguageSwitcherProps {
  /** Additional CSS classes for the container */
  readonly className?: string;
}

/**
 * LanguageSwitcher - Dropdown component for locale selection.
 *
 * Displays the current locale with a flag icon and provides
 * a dropdown to switch between available locales.
 *
 * Features:
 * - Accessible keyboard navigation
 * - Click-outside-to-close behavior
 * - Current locale indicator
 * - Flag + label display
 *
 * @example
 * ```tsx
 * // In a header component
 * import { LanguageSwitcher } from '@/components/ui/language-switcher';
 *
 * function Header() {
 *   return (
 *     <header>
 *       <LanguageSwitcher className="ml-auto" />
 *     </header>
 *   );
 * }
 * ```
 */
export function LanguageSwitcher({ className = '' }: LanguageSwitcherProps): React.ReactElement {
  const { locale, setLocale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLocaleConfig = SUPPORTED_LOCALES.find((l) => l.code === locale);

  // Close dropdown on outside click
  useEffect((): (() => void) | undefined => {
    function handleClickOutside(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return (): void => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return undefined;
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect((): (() => void) | undefined => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return (): void => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
    return undefined;
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (newLocale: Locale) => {
      setLocale(newLocale);
      setIsOpen(false);
    },
    [setLocale]
  );

  const handleKeySelect = useCallback(
    (event: React.KeyboardEvent, newLocale: Locale) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelect(newLocale);
      }
    },
    [handleSelect]
  );

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t('common.language')}
        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        <span aria-hidden="true">{currentLocaleConfig?.flag}</span>
        <span>{currentLocaleConfig?.label}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label={t('common.language')}
          className="absolute right-0 z-50 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
        >
          {SUPPORTED_LOCALES.map((localeConfig) => (
            <li
              key={localeConfig.code}
              role="option"
              aria-selected={localeConfig.code === locale}
              tabIndex={0}
              onClick={() => handleSelect(localeConfig.code)}
              onKeyDown={(e) => handleKeySelect(e, localeConfig.code)}
              className={`flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                localeConfig.code === locale
                  ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              <span aria-hidden="true">{localeConfig.flag}</span>
              <span>{localeConfig.label}</span>
              {localeConfig.code === locale && (
                <svg
                  className="ml-auto h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
