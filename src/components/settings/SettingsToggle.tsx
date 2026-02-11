'use client';

/**
 * Settings toggle switch component
 * @module components/settings/SettingsToggle
 */

import { useCallback, useId } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * SettingsToggle component props
 */
export interface SettingsToggleProps {
  /** Label text for the toggle */
  readonly label: string;
  /** Optional description text displayed below the label */
  readonly description?: string | undefined;
  /** Whether the toggle is checked */
  readonly checked: boolean;
  /** Callback when the toggle state changes */
  readonly onChange: (checked: boolean) => void;
  /** Whether the toggle is disabled */
  readonly disabled?: boolean | undefined;
}

// ============================================================================
// Component
// ============================================================================

/**
 * SettingsToggle Component
 *
 * @description A toggle switch component for boolean settings.
 * Includes a label and optional description text.
 * Follows accessibility best practices with proper ARIA attributes.
 *
 * @example
 * ```tsx
 * <SettingsToggle
 *   label="議事録完了通知"
 *   description="議事録の生成が完了した際に通知を受け取ります"
 *   checked={true}
 *   onChange={(checked) => console.log(checked)}
 * />
 * ```
 */
export function SettingsToggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: SettingsToggleProps): JSX.Element {
  const id = useId();
  const descriptionId = `${id}-description`;

  const handleClick = useCallback((): void => {
    if (!disabled) {
      onChange(!checked);
    }
  }, [checked, disabled, onChange]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>): void => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!disabled) {
          onChange(!checked);
        }
      }
    },
    [checked, disabled, onChange]
  );

  return (
    <div className="flex items-center justify-between gap-4 py-3">
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
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description !== undefined ? descriptionId : undefined}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
          border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          dark:focus:ring-offset-slate-800
          ${checked
            ? 'bg-blue-600 dark:bg-blue-500'
            : 'bg-slate-200 dark:bg-slate-600'}
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full
            bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}
