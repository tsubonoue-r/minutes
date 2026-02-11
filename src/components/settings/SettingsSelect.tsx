'use client';

/**
 * Settings select dropdown component
 * @module components/settings/SettingsSelect
 */

import { useCallback, useId } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Option definition for the select component
 */
export interface SelectOption {
  /** Option value */
  readonly value: string;
  /** Display label */
  readonly label: string;
}

/**
 * SettingsSelect component props
 */
export interface SettingsSelectProps {
  /** Label text for the select */
  readonly label: string;
  /** Optional description text displayed below the label */
  readonly description?: string | undefined;
  /** Currently selected value */
  readonly value: string;
  /** Available options */
  readonly options: readonly SelectOption[];
  /** Callback when the selected value changes */
  readonly onChange: (value: string) => void;
  /** Whether the select is disabled */
  readonly disabled?: boolean | undefined;
}

// ============================================================================
// Component
// ============================================================================

/**
 * SettingsSelect Component
 *
 * @description A select dropdown component for settings with predefined options.
 * Includes a label and optional description text.
 *
 * @example
 * ```tsx
 * <SettingsSelect
 *   label="言語"
 *   description="AIが生成するコンテンツの言語を選択します"
 *   value="ja"
 *   options={[
 *     { value: 'ja', label: '日本語' },
 *     { value: 'en', label: 'English' },
 *   ]}
 *   onChange={(value) => console.log(value)}
 * />
 * ```
 */
export function SettingsSelect({
  label,
  description,
  value,
  options,
  onChange,
  disabled = false,
}: SettingsSelectProps): JSX.Element {
  const id = useId();
  const descriptionId = `${id}-description`;

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      onChange(event.target.value);
    },
    [onChange]
  );

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <label
            htmlFor={id}
            className={`text-sm font-medium ${
              disabled
                ? 'text-slate-400 dark:text-slate-500'
                : 'text-slate-900 dark:text-white'
            }`}
          >
            {label}
          </label>
          {description !== undefined && (
            <p
              id={descriptionId}
              className="mt-0.5 text-xs text-slate-500 dark:text-slate-400"
            >
              {description}
            </p>
          )}
        </div>
        <select
          id={id}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          aria-describedby={description !== undefined ? descriptionId : undefined}
          className={`
            rounded-lg border border-slate-300 bg-white px-3 py-1.5
            text-sm text-slate-900 shadow-sm
            transition-colors duration-150
            focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
            dark:border-slate-600 dark:bg-slate-700 dark:text-white
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          `}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
