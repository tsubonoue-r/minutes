'use client';

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import type {
  ActionItemSortOptions,
  ActionItemSortField,
  SortDirection,
} from './types';
import { SORT_FIELD_LABELS } from './types';

/**
 * Props for ActionItemSort component
 */
export interface ActionItemSortProps {
  /** Current sort options */
  readonly sortOptions: ActionItemSortOptions;
  /** Callback when sort options change */
  readonly onChange: (options: ActionItemSortOptions) => void;
  /** Disabled state */
  readonly disabled?: boolean | undefined;
  /** Additional CSS classes */
  readonly className?: string | undefined;
}

/**
 * Sort option with direction
 */
interface SortOptionItem {
  readonly field: ActionItemSortField;
  readonly direction: SortDirection;
  readonly label: string;
}

/**
 * Available sort options
 */
const SORT_OPTIONS: readonly SortOptionItem[] = [
  { field: 'dueDate', direction: 'asc', label: 'Due Date (Earliest)' },
  { field: 'dueDate', direction: 'desc', label: 'Due Date (Latest)' },
  { field: 'priority', direction: 'asc', label: 'Priority (High to Low)' },
  { field: 'priority', direction: 'desc', label: 'Priority (Low to High)' },
  { field: 'createdAt', direction: 'desc', label: 'Created (Newest)' },
  { field: 'createdAt', direction: 'asc', label: 'Created (Oldest)' },
  { field: 'meetingDate', direction: 'desc', label: 'Meeting Date (Recent)' },
  { field: 'meetingDate', direction: 'asc', label: 'Meeting Date (Oldest)' },
];

/**
 * Get current sort option key
 */
function getSortKey(options: ActionItemSortOptions): string {
  return `${options.field}-${options.direction}`;
}

/**
 * Get current sort label
 */
function getCurrentSortLabel(options: ActionItemSortOptions): string {
  const option = SORT_OPTIONS.find(
    (o) => o.field === options.field && o.direction === options.direction
  );
  return option?.label ?? SORT_FIELD_LABELS[options.field];
}

/**
 * ActionItemSort component
 *
 * @description Sort dropdown for action items with field and direction options
 * @example
 * ```tsx
 * <ActionItemSort
 *   sortOptions={sortOptions}
 *   onChange={setSortOptions}
 * />
 * ```
 */
function ActionItemSortInner({
  sortOptions,
  onChange,
  disabled = false,
  className = '',
}: ActionItemSortProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        containerRef.current !== null &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return (): void => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  const handleOptionSelect = useCallback(
    (field: ActionItemSortField, direction: SortDirection) => {
      onChange({ field, direction });
      setIsOpen(false);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggle();
      } else if (event.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [handleToggle]
  );

  const currentKey = getSortKey(sortOptions);
  const currentLabel = getCurrentSortLabel(sortOptions);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          flex items-center justify-between gap-2 px-3 py-2 text-sm
          border border-lark-border rounded-lg
          bg-white text-lark-text
          transition-colors duration-150
          ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'hover:border-lark-primary cursor-pointer'}
          ${isOpen ? 'ring-2 ring-lark-primary border-transparent' : ''}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {/* Sort icon */}
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
          />
        </svg>
        <span>{currentLabel}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
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

      {/* Dropdown menu */}
      {isOpen && (
        <ul
          className="absolute z-50 mt-1 w-56 bg-white border border-lark-border rounded-lg shadow-lg py-1 max-h-72 overflow-auto"
          role="listbox"
          aria-activedescendant={`sort-option-${currentKey}`}
        >
          {SORT_OPTIONS.map((option) => {
            const key = `${option.field}-${option.direction}`;
            const isSelected = key === currentKey;

            return (
              <li
                key={key}
                id={`sort-option-${key}`}
                role="option"
                aria-selected={isSelected}
                className={`
                  px-3 py-2 text-sm cursor-pointer
                  transition-colors duration-150
                  ${isSelected ? 'bg-lark-primary/10 text-lark-primary font-medium' : 'text-lark-text hover:bg-lark-background'}
                `}
                onClick={() => handleOptionSelect(option.field, option.direction)}
              >
                <div className="flex items-center justify-between">
                  <span>{option.label}</span>
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-lark-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export const ActionItemSort = memo(ActionItemSortInner);
