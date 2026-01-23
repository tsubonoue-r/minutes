'use client';

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import type { Speaker } from '@/types/minutes';
import type {
  ActionItemFilters as FilterState,
  MeetingReference,
  ActionItemStatus,
  Priority,
} from './types';
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  hasActiveFilters,
  createDefaultFilters,
} from './types';

/**
 * Props for ActionItemFilters component
 */
export interface ActionItemFiltersProps {
  /** Current filter state */
  readonly filters: FilterState;
  /** Callback when filters change */
  readonly onChange: (filters: FilterState) => void;
  /** Available assignees for filter dropdown */
  readonly assignees?: readonly Speaker[] | undefined;
  /** Available meetings for filter dropdown */
  readonly meetings?: readonly MeetingReference[] | undefined;
  /** Additional CSS classes */
  readonly className?: string | undefined;
}

/**
 * Multi-select dropdown component for status/priority filters
 */
interface MultiSelectDropdownProps<T extends string> {
  readonly label: string;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly selected: readonly T[];
  readonly onChange: (selected: readonly T[]) => void;
  readonly className?: string | undefined;
}

function MultiSelectDropdown<T extends string>({
  label,
  options,
  selected,
  onChange,
  className = '',
}: MultiSelectDropdownProps<T>): JSX.Element {
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
    setIsOpen((prev) => !prev);
  }, []);

  const handleOptionClick = useCallback(
    (value: T) => {
      if (selected.includes(value)) {
        onChange(selected.filter((v) => v !== value));
      } else {
        onChange([...selected, value]);
      }
    },
    [selected, onChange]
  );

  const displayText =
    selected.length === 0
      ? label
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label ?? label
        : `${selected.length}件選択`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className={`
          flex items-center justify-between gap-2 px-3 py-2 text-sm
          border border-lark-border rounded-lg
          bg-white text-lark-text
          transition-colors duration-150
          hover:border-lark-primary cursor-pointer
          ${isOpen ? 'ring-2 ring-lark-primary border-transparent' : ''}
          ${selected.length > 0 ? 'bg-lark-primary/5' : ''}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selected.length === 0 ? 'text-gray-500' : ''}>
          {displayText}
        </span>
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

      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-48 bg-white border border-lark-border rounded-lg shadow-lg py-1"
          role="listbox"
          aria-multiselectable="true"
        >
          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleOptionClick(option.value)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                  transition-colors duration-150
                  ${isSelected ? 'bg-lark-primary/10 text-lark-primary' : 'text-lark-text hover:bg-lark-background'}
                `}
              >
                <span
                  className={`
                    w-4 h-4 border rounded flex items-center justify-center flex-shrink-0
                    ${isSelected ? 'border-lark-primary bg-lark-primary' : 'border-gray-300'}
                  `}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Single-select dropdown for assignee/meeting filters
 */
interface SingleSelectDropdownProps {
  readonly label: string;
  readonly options: readonly { readonly value: string; readonly label: string }[];
  readonly selected: string | undefined;
  readonly onChange: (value: string | undefined) => void;
  readonly className?: string | undefined;
}

function SingleSelectDropdown({
  label,
  options,
  selected,
  onChange,
  className = '',
}: SingleSelectDropdownProps): JSX.Element {
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
    setIsOpen((prev) => !prev);
  }, []);

  const handleOptionClick = useCallback(
    (value: string | undefined) => {
      onChange(value);
      setIsOpen(false);
    },
    [onChange]
  );

  const displayText =
    selected === undefined
      ? label
      : options.find((o) => o.value === selected)?.label ?? label;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className={`
          flex items-center justify-between gap-2 px-3 py-2 text-sm
          border border-lark-border rounded-lg
          bg-white text-lark-text
          transition-colors duration-150
          hover:border-lark-primary cursor-pointer
          ${isOpen ? 'ring-2 ring-lark-primary border-transparent' : ''}
          ${selected !== undefined ? 'bg-lark-primary/5' : ''}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selected === undefined ? 'text-gray-500' : ''}>
          {displayText}
        </span>
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

      {isOpen && (
        <ul
          className="absolute z-50 mt-1 w-48 bg-white border border-lark-border rounded-lg shadow-lg py-1 max-h-60 overflow-auto"
          role="listbox"
        >
          <li
            role="option"
            aria-selected={selected === undefined}
            className={`
              px-3 py-2 text-sm cursor-pointer
              transition-colors duration-150
              ${selected === undefined ? 'bg-lark-primary/10 text-lark-primary font-medium' : 'text-lark-text hover:bg-lark-background'}
            `}
            onClick={() => handleOptionClick(undefined)}
          >
            すべて
          </li>
          {options.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === selected}
              className={`
                px-3 py-2 text-sm cursor-pointer
                transition-colors duration-150
                ${option.value === selected ? 'bg-lark-primary/10 text-lark-primary font-medium' : 'text-lark-text hover:bg-lark-background'}
              `}
              onClick={() => handleOptionClick(option.value)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * ActionItemFilters component
 *
 * @description Filter panel for action items with multi-select status/priority,
 * assignee dropdown, overdue checkbox, and clear button
 * @example
 * ```tsx
 * <ActionItemFilters
 *   filters={filters}
 *   onChange={setFilters}
 *   assignees={speakers}
 *   meetings={meetingList}
 * />
 * ```
 */
function ActionItemFiltersInner({
  filters,
  onChange,
  assignees = [],
  meetings = [],
  className = '',
}: ActionItemFiltersProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const statusOptions: readonly { readonly value: ActionItemStatus; readonly label: string }[] = [
    { value: 'pending', label: STATUS_LABELS.pending },
    { value: 'in_progress', label: STATUS_LABELS.in_progress },
    { value: 'completed', label: STATUS_LABELS.completed },
  ];

  const priorityOptions: readonly { readonly value: Priority; readonly label: string }[] = [
    { value: 'high', label: PRIORITY_LABELS.high },
    { value: 'medium', label: PRIORITY_LABELS.medium },
    { value: 'low', label: PRIORITY_LABELS.low },
  ];

  const assigneeOptions = assignees.map((a) => ({
    value: a.id,
    label: a.name,
  }));

  const meetingOptions = meetings.map((m) => ({
    value: m.id,
    label: m.title,
  }));

  const handleStatusChange = useCallback(
    (statuses: readonly ActionItemStatus[]) => {
      onChange({ ...filters, statuses });
    },
    [filters, onChange]
  );

  const handlePriorityChange = useCallback(
    (priorities: readonly Priority[]) => {
      onChange({ ...filters, priorities });
    },
    [filters, onChange]
  );

  const handleAssigneeChange = useCallback(
    (assigneeId: string | undefined) => {
      onChange({ ...filters, assigneeId });
    },
    [filters, onChange]
  );

  const handleMeetingChange = useCallback(
    (meetingId: string | undefined) => {
      onChange({ ...filters, meetingId });
    },
    [filters, onChange]
  );

  const handleOverdueChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filters, overdueOnly: event.target.checked });
    },
    [filters, onChange]
  );

  const handleClearFilters = useCallback(() => {
    onChange(createDefaultFilters());
  }, [onChange]);

  const hasFilters = hasActiveFilters(filters);

  return (
    <div className={className}>
      {/* Mobile: Accordion-style filter toggle */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={handleToggleExpand}
          className="
            flex items-center justify-between w-full px-3 py-2.5
            min-h-[44px]
            text-sm font-medium text-lark-text
            bg-white border border-lark-border rounded-lg
            hover:bg-lark-background transition-colors
          "
          aria-expanded={isExpanded}
          aria-controls="mobile-filters-panel"
        >
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span>フィルター</span>
            {hasFilters && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-lark-primary rounded-full">
                !
              </span>
            )}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
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

        {/* Expandable filter panel */}
        {isExpanded && (
          <div
            id="mobile-filters-panel"
            className="mt-2 p-3 bg-white border border-lark-border rounded-lg space-y-3 animate-fade-in"
          >
            <div className="grid grid-cols-2 gap-2">
              <MultiSelectDropdown
                label="ステータス"
                options={statusOptions}
                selected={filters.statuses}
                onChange={handleStatusChange}
                className="w-full"
              />
              <MultiSelectDropdown
                label="優先度"
                options={priorityOptions}
                selected={filters.priorities}
                onChange={handlePriorityChange}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {assignees.length > 0 && (
                <SingleSelectDropdown
                  label="担当者"
                  options={assigneeOptions}
                  selected={filters.assigneeId}
                  onChange={handleAssigneeChange}
                  className="w-full"
                />
              )}
              {meetings.length > 0 && (
                <SingleSelectDropdown
                  label="会議"
                  options={meetingOptions}
                  selected={filters.meetingId}
                  onChange={handleMeetingChange}
                  className="w-full"
                />
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-lark-text cursor-pointer min-h-[44px]">
                <input
                  type="checkbox"
                  checked={filters.overdueOnly}
                  onChange={handleOverdueChange}
                  className="w-4 h-4 rounded border-gray-300 text-lark-primary focus:ring-lark-primary"
                />
                <span>期限切れのみ</span>
              </label>

              {hasFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="
                    flex items-center gap-1 px-3 py-2 text-sm min-h-[44px]
                    text-gray-500 hover:text-lark-text
                    transition-colors duration-150
                  "
                  aria-label="フィルターをすべてクリア"
                >
                  <svg
                    className="w-4 h-4"
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
                  <span>クリア</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Inline filter bar */}
      <div className="hidden md:flex flex-wrap items-center gap-3">
        {/* Status filter */}
        <MultiSelectDropdown
          label="ステータス"
          options={statusOptions}
          selected={filters.statuses}
          onChange={handleStatusChange}
        />

        {/* Priority filter */}
        <MultiSelectDropdown
          label="優先度"
          options={priorityOptions}
          selected={filters.priorities}
          onChange={handlePriorityChange}
        />

        {/* Assignee filter */}
        {assignees.length > 0 && (
          <SingleSelectDropdown
            label="担当者"
            options={assigneeOptions}
            selected={filters.assigneeId}
            onChange={handleAssigneeChange}
          />
        )}

        {/* Meeting filter */}
        {meetings.length > 0 && (
          <SingleSelectDropdown
            label="会議"
            options={meetingOptions}
            selected={filters.meetingId}
            onChange={handleMeetingChange}
          />
        )}

        {/* Overdue only checkbox */}
        <label className="flex items-center gap-2 text-sm text-lark-text cursor-pointer">
          <input
            type="checkbox"
            checked={filters.overdueOnly}
            onChange={handleOverdueChange}
            className="w-4 h-4 rounded border-gray-300 text-lark-primary focus:ring-lark-primary"
          />
          <span>期限切れのみ</span>
        </label>

        {/* Clear filters button */}
        {hasFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="
              flex items-center gap-1 px-3 py-2 text-sm
              text-gray-500 hover:text-lark-text
              transition-colors duration-150
            "
            aria-label="フィルターをすべてクリア"
          >
            <svg
              className="w-4 h-4"
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
            <span>クリア</span>
          </button>
        )}
      </div>
    </div>
  );
}

export const ActionItemFiltersComponent = memo(ActionItemFiltersInner);

// Named export for cleaner imports
export { ActionItemFiltersComponent as ActionItemFilters };
