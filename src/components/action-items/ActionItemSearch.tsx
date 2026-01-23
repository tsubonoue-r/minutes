'use client';

import { memo, useState, useCallback, useEffect, useRef } from 'react';

/**
 * Props for ActionItemSearch component
 */
export interface ActionItemSearchProps {
  /** Current search value */
  readonly value: string;
  /** Callback when search value changes (debounced) */
  readonly onChange: (value: string) => void;
  /** Placeholder text */
  readonly placeholder?: string | undefined;
  /** Debounce delay in milliseconds */
  readonly debounceMs?: number | undefined;
  /** Disabled state */
  readonly disabled?: boolean | undefined;
  /** Additional CSS classes */
  readonly className?: string | undefined;
}

/**
 * ActionItemSearch component
 *
 * @description Search input with debounce for action item filtering
 * @example
 * ```tsx
 * <ActionItemSearch
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   placeholder="Search action items..."
 * />
 * ```
 */
function ActionItemSearchInner({
  value,
  onChange,
  placeholder = 'アクションアイテムを検索...',
  debounceMs = 300,
  disabled = false,
  className = '',
}: ActionItemSearchProps): JSX.Element {
  const [internalValue, setInternalValue] = useState(value);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync internal value with external value
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Debounced onChange
  const debouncedOnChange = useCallback(
    (newValue: string) => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return (): void => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setInternalValue(newValue);
      debouncedOnChange(newValue);
    },
    [debouncedOnChange]
  );

  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange('');
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }
  }, [onChange]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        handleClear();
      }
    },
    [handleClear]
  );

  return (
    <div className={`relative ${className}`}>
      {/* Search icon */}
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Input field */}
      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full pl-10 pr-10 py-2 text-sm
          border border-lark-border rounded-lg
          bg-white text-lark-text
          placeholder-gray-400
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
        `}
        aria-label={placeholder}
      />

      {/* Clear button */}
      {internalValue.length > 0 && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="
            absolute inset-y-0 right-0 flex items-center pr-3
            text-gray-400 hover:text-gray-600
            transition-colors duration-150
          "
          aria-label="検索をクリア"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export const ActionItemSearch = memo(ActionItemSearchInner);
