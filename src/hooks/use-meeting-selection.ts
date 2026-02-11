'use client';

/**
 * Meeting Selection Hook
 * @module hooks/use-meeting-selection
 *
 * React hook for managing checkbox selection state across
 * a list of meetings. Supports toggling individual items,
 * select all, and deselect all operations.
 */

import { useState, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Return value of the useMeetingSelection hook
 */
export interface UseMeetingSelectionResult {
  /** Set of currently selected meeting IDs */
  readonly selectedIds: ReadonlySet<string>;
  /** Array of currently selected meeting IDs (for serialization) */
  readonly selectedIdsArray: readonly string[];
  /** Number of selected meetings */
  readonly selectedCount: number;
  /** Toggle selection of a single meeting */
  readonly toggle: (meetingId: string) => void;
  /** Select all provided meeting IDs */
  readonly selectAll: (meetingIds: readonly string[]) => void;
  /** Deselect all meetings */
  readonly deselectAll: () => void;
  /** Check if a specific meeting is selected */
  readonly isSelected: (meetingId: string) => boolean;
  /** Check if all provided meetings are selected */
  readonly isAllSelected: (meetingIds: readonly string[]) => boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing meeting checkbox selection state
 *
 * @param initialIds - Optional initial set of selected meeting IDs
 * @returns Selection state and control methods
 *
 * @example
 * ```tsx
 * function MeetingsList({ meetings }: { meetings: Meeting[] }) {
 *   const {
 *     selectedIds,
 *     toggle,
 *     selectAll,
 *     deselectAll,
 *     isSelected,
 *     selectedCount,
 *   } = useMeetingSelection();
 *
 *   return (
 *     <div>
 *       <button onClick={() => selectAll(meetings.map(m => m.id))}>
 *         Select All
 *       </button>
 *       {meetings.map(m => (
 *         <MeetingCheckbox
 *           key={m.id}
 *           meetingId={m.id}
 *           isSelected={isSelected(m.id)}
 *           onToggle={toggle}
 *         />
 *       ))}
 *       <BatchGenerateButton
 *         selectedMeetingIds={Array.from(selectedIds)}
 *         onStart={() => {}}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useMeetingSelection(
  initialIds?: readonly string[]
): UseMeetingSelectionResult {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialIds ?? [])
  );

  /**
   * Toggle selection of a single meeting
   */
  const toggle = useCallback((meetingId: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(meetingId)) {
        next.delete(meetingId);
      } else {
        next.add(meetingId);
      }
      return next;
    });
  }, []);

  /**
   * Select all provided meeting IDs
   */
  const selectAll = useCallback((meetingIds: readonly string[]): void => {
    setSelectedIds(new Set(meetingIds));
  }, []);

  /**
   * Deselect all meetings
   */
  const deselectAll = useCallback((): void => {
    setSelectedIds(new Set());
  }, []);

  /**
   * Check if a specific meeting is selected
   */
  const isSelected = useCallback(
    (meetingId: string): boolean => {
      return selectedIds.has(meetingId);
    },
    [selectedIds]
  );

  /**
   * Check if all provided meetings are selected
   */
  const isAllSelected = useCallback(
    (meetingIds: readonly string[]): boolean => {
      if (meetingIds.length === 0) {
        return false;
      }
      return meetingIds.every((id) => selectedIds.has(id));
    },
    [selectedIds]
  );

  /**
   * Array version of selected IDs for serialization / API calls
   */
  const selectedIdsArray = useMemo(
    () => Array.from(selectedIds),
    [selectedIds]
  );

  /**
   * Number of selected items
   */
  const selectedCount = selectedIds.size;

  return {
    selectedIds,
    selectedIdsArray,
    selectedCount,
    toggle,
    selectAll,
    deselectAll,
    isSelected,
    isAllSelected,
  };
}
