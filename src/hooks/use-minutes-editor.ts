'use client';

/**
 * useMinutesEditor - Hook for managing inline minutes editing state
 * @module hooks/use-minutes-editor
 */

import { useState, useCallback } from 'react';
import type {
  Minutes,
  TopicSegment,
  DecisionItem,
  ActionItem,
  Priority,
  ActionItemStatus,
  Speaker,
} from '@/types/minutes';
import { generateId } from '@/types/minutes';

/**
 * Create a copy of an ActionItem with a specific key removed
 */
function omitActionItemKey<K extends keyof ActionItem>(
  item: ActionItem,
  key: K
): Omit<ActionItem, K> {
  const copy = { ...item };
  delete (copy as Record<string, unknown>)[key];
  return copy;
}

/**
 * Return type of the useMinutesEditor hook
 */
export interface UseMinutesEditorResult {
  /** Current draft of the minutes being edited */
  readonly draft: Minutes;
  /** Whether edit mode is active */
  readonly isEditing: boolean;
  /** Whether the draft has unsaved changes */
  readonly isDirty: boolean;
  /** Enter edit mode */
  readonly startEditing: () => void;
  /** Cancel editing and discard changes */
  readonly cancelEditing: () => void;
  /** Update a top-level field on the minutes */
  readonly updateField: <K extends keyof Minutes>(key: K, value: Minutes[K]) => void;
  /** Update a topic field */
  readonly updateTopic: (topicId: string, field: keyof TopicSegment, value: string) => void;
  /** Update a key point within a topic */
  readonly updateKeyPoint: (topicId: string, index: number, value: string) => void;
  /** Add a key point to a topic */
  readonly addKeyPoint: (topicId: string) => void;
  /** Remove a key point from a topic */
  readonly removeKeyPoint: (topicId: string, index: number) => void;
  /** Update a decision field */
  readonly updateDecision: (decisionId: string, field: keyof DecisionItem, value: string) => void;
  /** Update an action item field */
  readonly updateActionItem: (
    actionItemId: string,
    field: keyof ActionItem,
    value: string | Priority | ActionItemStatus | Speaker | undefined
  ) => void;
  /** Get the current draft for saving */
  readonly saveDraft: () => Minutes;
  /** Check if a specific field was modified */
  readonly isFieldModified: (path: string) => boolean;
}

/**
 * Deeply compare two values for equality
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => deepEqual(aObj[key], bObj[key]));
  }

  return false;
}

/**
 * Hook for managing minutes editing state
 *
 * @description Provides state management for inline editing of minutes content.
 *              Tracks modifications, supports undo via cancel, and provides
 *              granular update functions for each editable field.
 *
 * @param initialMinutes - The original minutes data to start editing from
 * @returns Editor state and control functions
 *
 * @example
 * ```tsx
 * const {
 *   draft,
 *   isEditing,
 *   isDirty,
 *   startEditing,
 *   cancelEditing,
 *   updateField,
 *   saveDraft,
 * } = useMinutesEditor(minutes);
 * ```
 */
export function useMinutesEditor(initialMinutes: Minutes): UseMinutesEditorResult {
  const [original, setOriginal] = useState<Minutes>(initialMinutes);
  const [draft, setDraft] = useState<Minutes>(initialMinutes);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  /**
   * Whether the draft differs from the original (flag-based for performance)
   */
  const isDirty = hasChanges;

  /**
   * Enter edit mode, snapshotting the current minutes as the baseline
   */
  const startEditing = useCallback(() => {
    setOriginal(initialMinutes);
    setDraft(initialMinutes);
    setIsEditing(true);
    setHasChanges(false);
  }, [initialMinutes]);

  /**
   * Cancel editing, discarding all changes
   */
  const cancelEditing = useCallback(() => {
    setDraft(original);
    setIsEditing(false);
    setHasChanges(false);
  }, [original]);

  /**
   * Update a top-level field on the draft
   */
  const updateField = useCallback(
    <K extends keyof Minutes>(key: K, value: Minutes[K]) => {
      setDraft((prev) => ({ ...prev, [key]: value }));
      setHasChanges(true);
    },
    []
  );

  /**
   * Update a field on a specific topic
   */
  const updateTopic = useCallback(
    (topicId: string, field: keyof TopicSegment, value: string) => {
      setDraft((prev) => ({
        ...prev,
        topics: prev.topics.map((topic) =>
          topic.id === topicId ? { ...topic, [field]: value } : topic
        ),
      }));
      setHasChanges(true);
    },
    []
  );

  /**
   * Update a specific key point within a topic
   */
  const updateKeyPoint = useCallback(
    (topicId: string, index: number, value: string) => {
      setDraft((prev) => ({
        ...prev,
        topics: prev.topics.map((topic) => {
          if (topic.id !== topicId) return topic;
          const newKeyPoints = [...topic.keyPoints];
          newKeyPoints[index] = value;
          return { ...topic, keyPoints: newKeyPoints };
        }),
      }));
      setHasChanges(true);
    },
    []
  );

  /**
   * Add a new empty key point to a topic
   */
  const addKeyPoint = useCallback((topicId: string) => {
    setDraft((prev) => ({
      ...prev,
      topics: prev.topics.map((topic) => {
        if (topic.id !== topicId) return topic;
        return { ...topic, keyPoints: [...topic.keyPoints, ''] };
      }),
    }));
    setHasChanges(true);
  }, []);

  /**
   * Remove a key point from a topic by index
   */
  const removeKeyPoint = useCallback((topicId: string, index: number) => {
    setDraft((prev) => ({
      ...prev,
      topics: prev.topics.map((topic) => {
        if (topic.id !== topicId) return topic;
        const newKeyPoints = topic.keyPoints.filter((_, i) => i !== index);
        return { ...topic, keyPoints: newKeyPoints };
      }),
    }));
    setHasChanges(true);
  }, []);

  /**
   * Update a field on a specific decision
   */
  const updateDecision = useCallback(
    (decisionId: string, field: keyof DecisionItem, value: string) => {
      setDraft((prev) => ({
        ...prev,
        decisions: prev.decisions.map((decision) =>
          decision.id === decisionId ? { ...decision, [field]: value } : decision
        ),
      }));
      setHasChanges(true);
    },
    []
  );

  /**
   * Update a field on a specific action item
   */
  const updateActionItem = useCallback(
    (
      actionItemId: string,
      field: keyof ActionItem,
      value: string | Priority | ActionItemStatus | Speaker | undefined
    ) => {
      setDraft((prev) => ({
        ...prev,
        actionItems: prev.actionItems.map((item) => {
          if (item.id !== actionItemId) return item;

          // Handle assignee update: create or update Speaker object
          if (field === 'assignee') {
            if (typeof value === 'string') {
              // When value is a string, update the assignee name
              const existingAssignee = item.assignee;
              if (value.trim() === '') {
                // Remove assignee if empty
                return omitActionItemKey(item, 'assignee') as ActionItem;
              }
              return {
                ...item,
                assignee: {
                  id: existingAssignee?.id ?? generateId('speaker'),
                  name: value,
                },
              };
            }
            // When value is a Speaker or undefined
            if (value === undefined) {
              return omitActionItemKey(item, 'assignee') as ActionItem;
            }
            return { ...item, assignee: value as Speaker };
          }

          // Handle dueDate: remove if empty
          if (field === 'dueDate') {
            if (typeof value === 'string' && value.trim() === '') {
              return omitActionItemKey(item, 'dueDate') as ActionItem;
            }
          }

          return { ...item, [field]: value };
        }),
      }));
      setHasChanges(true);
    },
    []
  );

  /**
   * Return the current draft for saving
   */
  const saveDraft = useCallback((): Minutes => {
    return draft;
  }, [draft]);

  /**
   * Check if a specific field path was modified
   *
   * @param path - Dot-separated path like "title", "topics.0.title", "decisions.1.content"
   */
  const isFieldModified = useCallback(
    (path: string): boolean => {
      const parts = path.split('.');
      let currentDraft: unknown = draft;
      let currentOriginal: unknown = original;

      for (const part of parts) {
        if (currentDraft === null || currentDraft === undefined) return false;
        if (currentOriginal === null || currentOriginal === undefined) return true;

        const index = Number(part);
        if (!isNaN(index)) {
          currentDraft = (currentDraft as unknown[])[index];
          currentOriginal = (currentOriginal as unknown[])[index];
        } else {
          currentDraft = (currentDraft as Record<string, unknown>)[part];
          currentOriginal = (currentOriginal as Record<string, unknown>)[part];
        }
      }

      return !deepEqual(currentDraft, currentOriginal);
    },
    [draft, original]
  );

  return {
    draft,
    isEditing,
    isDirty,
    startEditing,
    cancelEditing,
    updateField,
    updateTopic,
    updateKeyPoint,
    addKeyPoint,
    removeKeyPoint,
    updateDecision,
    updateActionItem,
    saveDraft,
    isFieldModified,
  };
}
