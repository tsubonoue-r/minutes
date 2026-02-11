'use client';

/**
 * MeetingCheckbox - Checkbox component for meeting selection in lists
 * @module components/meetings/MeetingCheckbox
 */

import { memo, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * MeetingCheckbox component props
 */
export interface MeetingCheckboxProps {
  /** Meeting ID this checkbox represents */
  readonly meetingId: string;
  /** Whether the meeting is currently selected */
  readonly isSelected: boolean;
  /** Callback when the checkbox is toggled */
  readonly onToggle: (meetingId: string) => void;
  /** Whether the checkbox is disabled */
  readonly disabled?: boolean | undefined;
  /** Additional CSS classes */
  readonly className?: string | undefined;
  /** Accessible label (defaults to meeting ID) */
  readonly label?: string | undefined;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Checkbox component for selecting meetings in a list.
 *
 * Renders a styled checkbox input with proper accessibility attributes.
 * Uses memo to prevent unnecessary re-renders in long lists.
 *
 * @example
 * ```tsx
 * <MeetingCheckbox
 *   meetingId="meeting-123"
 *   isSelected={isSelected('meeting-123')}
 *   onToggle={toggle}
 *   label="Weekly Standup 2024-01-15"
 * />
 * ```
 */
function MeetingCheckboxInner({
  meetingId,
  isSelected,
  onToggle,
  disabled = false,
  className = '',
  label,
}: MeetingCheckboxProps): JSX.Element {
  const handleChange = useCallback((): void => {
    onToggle(meetingId);
  }, [meetingId, onToggle]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === 'Enter') {
        event.preventDefault();
        onToggle(meetingId);
      }
    },
    [meetingId, onToggle]
  );

  const ariaLabel = label ?? `Select meeting ${meetingId}`;

  return (
    <div className={`flex items-center ${className}`}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={ariaLabel}
        className="
          h-4 w-4 rounded
          border-lark-border
          text-lark-primary
          focus:ring-2 focus:ring-lark-primary focus:ring-offset-1
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer transition-colors
        "
      />
    </div>
  );
}

export const MeetingCheckbox = memo(MeetingCheckboxInner);
