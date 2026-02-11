'use client';

/**
 * BatchGenerateButton - Button for starting batch minutes generation
 * @module components/meetings/BatchGenerateButton
 */

import { memo, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * BatchGenerateButton component props
 */
export interface BatchGenerateButtonProps {
  /** Array of selected meeting IDs */
  readonly selectedMeetingIds: readonly string[];
  /** Callback when the batch generation is started */
  readonly onStart: () => void;
  /** Whether the button is disabled */
  readonly disabled?: boolean | undefined;
  /** Additional CSS classes */
  readonly className?: string | undefined;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Button that triggers batch minutes generation for selected meetings.
 *
 * Displays the count of selected meetings and becomes visible
 * when at least one meeting is selected. Disabled when no meetings
 * are selected or when explicitly disabled (e.g., during processing).
 *
 * @example
 * ```tsx
 * <BatchGenerateButton
 *   selectedMeetingIds={selectedIdsArray}
 *   onStart={() => startBatch(selectedIdsArray)}
 *   disabled={isRunning}
 * />
 * ```
 */
function BatchGenerateButtonInner({
  selectedMeetingIds,
  onStart,
  disabled = false,
  className = '',
}: BatchGenerateButtonProps): JSX.Element {
  const count = selectedMeetingIds.length;
  const isDisabled = disabled || count === 0;

  const handleClick = useCallback((): void => {
    if (!isDisabled) {
      onStart();
    }
  }, [isDisabled, onStart]);

  // When no meetings are selected, show a compact hint
  if (count === 0) {
    return (
      <div
        className={`
          inline-flex items-center gap-2 px-4 py-2
          text-sm text-gray-400
          border border-dashed border-lark-border rounded-lg
          ${className}
        `}
        aria-hidden="true"
      >
        <DocumentStackIcon className="w-4 h-4" />
        <span>会議を選択して一括生成</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        inline-flex items-center gap-2 px-4 py-2.5
        text-sm font-medium text-white
        bg-lark-primary rounded-lg
        hover:bg-blue-600 transition-colors
        focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-lark-primary
        ${className}
      `}
      aria-label={`${count}件の会議の議事録を一括生成`}
    >
      <DocumentStackIcon className="w-4 h-4" />
      <span>一括生成 ({count}件)</span>
    </button>
  );
}

export const BatchGenerateButton = memo(BatchGenerateButtonInner);

// =============================================================================
// Icons
// =============================================================================

/**
 * Document stack icon for the batch generate button
 */
function DocumentStackIcon({
  className = '',
}: {
  readonly className?: string;
}): JSX.Element {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 2v5a2 2 0 002 2h5"
        opacity={0.5}
      />
    </svg>
  );
}
