'use client';

/**
 * useKeyboardShortcuts - Global keyboard shortcut registration hook
 * @module hooks/use-keyboard-shortcuts
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Modifier key types supported by the shortcut system
 */
type ModifierKey = 'ctrl' | 'meta' | 'shift' | 'alt';

/**
 * Configuration for a single keyboard shortcut
 */
export interface ShortcutConfig {
  /** The key to listen for (e.g. 'k', 'Enter', 'Escape') */
  readonly key: string;
  /** Modifier keys required (ctrl, meta, shift, alt) */
  readonly modifiers?: readonly ModifierKey[] | undefined;
  /** Handler function to execute when the shortcut is triggered */
  readonly handler: () => void;
  /** Human-readable description of the shortcut */
  readonly description: string;
  /** Category for grouping in help dialog */
  readonly category: string;
  /** Optional condition that must be true for the shortcut to fire */
  readonly when?: (() => boolean) | undefined;
}

/**
 * Sequence shortcut configuration for multi-key sequences (e.g. G then M)
 */
export interface SequenceShortcutConfig {
  /** The sequence of keys (e.g. ['g', 'm']) */
  readonly keys: readonly string[];
  /** Handler function to execute when the sequence is completed */
  readonly handler: () => void;
  /** Human-readable description of the shortcut */
  readonly description: string;
  /** Category for grouping in help dialog */
  readonly category: string;
  /** Optional condition that must be true for the shortcut to fire */
  readonly when?: (() => boolean) | undefined;
}

/**
 * Check if the currently focused element is an input-like element
 * where keyboard shortcuts should not be intercepted.
 */
function isInputElement(target: EventTarget | null): boolean {
  if (target === null || !(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  return false;
}

/**
 * Check if the required modifier keys match the event
 */
function modifiersMatch(
  event: KeyboardEvent,
  modifiers: readonly ModifierKey[] | undefined
): boolean {
  const required = modifiers ?? [];
  const ctrlRequired = required.includes('ctrl');
  const metaRequired = required.includes('meta');
  const shiftRequired = required.includes('shift');
  const altRequired = required.includes('alt');

  return (
    event.ctrlKey === ctrlRequired &&
    event.metaKey === metaRequired &&
    event.shiftKey === shiftRequired &&
    event.altKey === altRequired
  );
}

/**
 * Custom hook for registering keyboard shortcuts.
 *
 * @description Registers global keydown event listeners for the provided shortcut
 * configurations. Automatically ignores events when focused on input/textarea/contenteditable
 * elements. Cleans up listeners on unmount.
 *
 * @param shortcuts - Array of shortcut configurations to register
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     key: 'k',
 *     modifiers: ['meta'],
 *     handler: () => openCommandPalette(),
 *     description: 'コマンドパレットを開く',
 *     category: 'General',
 *   },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: readonly ShortcutConfig[]
): void {
  const shortcutsRef = useRef<readonly ShortcutConfig[]>(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Skip if target is an input element (unless shortcut uses modifiers)
      const current = shortcutsRef.current;

      for (const shortcut of current) {
        const hasModifiers =
          shortcut.modifiers !== undefined && shortcut.modifiers.length > 0;

        // Skip input elements only for shortcuts without modifiers
        if (!hasModifiers && isInputElement(event.target)) {
          continue;
        }

        // For shortcuts with modifiers, allow them even in inputs
        if (hasModifiers && isInputElement(event.target)) {
          // Still allow modifier-based shortcuts in inputs
        }

        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          modifiersMatch(event, shortcut.modifiers)
        ) {
          // Check condition
          if (shortcut.when !== undefined && !shortcut.when()) {
            continue;
          }

          event.preventDefault();
          event.stopPropagation();
          shortcut.handler();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}

/**
 * Custom hook for registering sequence-based keyboard shortcuts.
 *
 * @description Supports multi-key sequences like "G then M" for navigation.
 * Resets the sequence after a timeout (default 1500ms) or when an invalid
 * key is pressed.
 *
 * @param sequences - Array of sequence shortcut configurations
 * @param timeoutMs - Time in milliseconds before the sequence resets (default: 1500)
 *
 * @example
 * ```tsx
 * useSequenceShortcuts([
 *   {
 *     keys: ['g', 'm'],
 *     handler: () => router.push('/meetings'),
 *     description: '会議一覧へ移動',
 *     category: 'ナビゲーション',
 *   },
 * ]);
 * ```
 */
export function useSequenceShortcuts(
  sequences: readonly SequenceShortcutConfig[],
  timeoutMs: number = 1500
): void {
  const sequencesRef = useRef<readonly SequenceShortcutConfig[]>(sequences);

  useEffect(() => {
    sequencesRef.current = sequences;
  }, [sequences]);

  const bufferRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetBuffer = useCallback((): void => {
    bufferRef.current = [];
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Don't capture when modifiers are held (except shift for uppercase)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      // Don't capture when focused on input elements
      if (isInputElement(event.target)) {
        resetBuffer();
        return;
      }

      const key = event.key.toLowerCase();

      // Ignore modifier-only keypresses
      if (
        key === 'shift' ||
        key === 'control' ||
        key === 'alt' ||
        key === 'meta'
      ) {
        return;
      }

      // Reset timeout
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }

      // Add to buffer
      bufferRef.current = [...bufferRef.current, key];

      // Set reset timeout
      timerRef.current = setTimeout(resetBuffer, timeoutMs);

      // Check for matches
      const currentSequences = sequencesRef.current;
      const buffer = bufferRef.current;

      for (const sequence of currentSequences) {
        const sequenceKeys = sequence.keys.map((k) => k.toLowerCase());

        // Check for exact match
        if (
          buffer.length === sequenceKeys.length &&
          buffer.every((k, i) => k === sequenceKeys[i])
        ) {
          // Check condition
          if (sequence.when !== undefined && !sequence.when()) {
            continue;
          }

          event.preventDefault();
          resetBuffer();
          sequence.handler();
          return;
        }

        // Check if buffer is a valid partial match
        const isPartialMatch =
          buffer.length < sequenceKeys.length &&
          buffer.every((k, i) => k === sequenceKeys[i]);

        if (isPartialMatch) {
          // Valid partial sequence, prevent default for navigation keys
          event.preventDefault();
          return;
        }
      }

      // No match and no partial match, check if first key matches any sequence
      if (buffer.length === 1) {
        const firstKeyMatches = currentSequences.some(
          (seq) =>
            seq.keys.length > 0 && seq.keys[0]?.toLowerCase() === buffer[0]
        );

        if (!firstKeyMatches) {
          resetBuffer();
        }
      } else {
        // Buffer has multiple keys but no match found
        const hasPartial = currentSequences.some((seq) => {
          const seqKeys = seq.keys.map((k) => k.toLowerCase());
          return (
            buffer.length <= seqKeys.length &&
            buffer.every((k, i) => k === seqKeys[i])
          );
        });

        if (!hasPartial) {
          resetBuffer();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [resetBuffer, timeoutMs]);
}

/**
 * Predefined global shortcut sets for the application.
 *
 * @description Registers commonly used navigation and UI shortcuts:
 * - Cmd/Ctrl+K: Open command palette
 * - ?: Show shortcuts help
 * - G then D: Go to dashboard
 * - G then M: Go to meetings
 * - G then A: Go to action items
 * - G then T: Go to templates
 * - G then S: Go to settings
 * - G then N: Go to analytics
 *
 * @param openCommandPalette - Callback to open the command palette
 * @param openShortcutsHelp - Callback to open the shortcuts help dialog
 */
export function useGlobalShortcuts(
  openCommandPalette: () => void,
  openShortcutsHelp: () => void
): void {
  // Modifier-based shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      modifiers: ['meta'],
      handler: openCommandPalette,
      description: 'コマンドパレットを開く',
      category: '一般',
    },
    {
      key: 'k',
      modifiers: ['ctrl'],
      handler: openCommandPalette,
      description: 'コマンドパレットを開く',
      category: '一般',
    },
    {
      key: '/',
      handler: openShortcutsHelp,
      description: 'ショートカット一覧を表示',
      category: '一般',
      when: (): boolean => {
        // Only trigger when shift is held (to type "?")
        // This is handled via the "?" character check below
        return false;
      },
    },
  ]);

  // Sequence-based shortcuts for navigation
  useSequenceShortcuts([
    {
      keys: ['g', 'd'],
      handler: (): void => {
        window.location.href = '/dashboard';
      },
      description: 'ダッシュボードへ移動',
      category: 'ナビゲーション',
    },
    {
      keys: ['g', 'm'],
      handler: (): void => {
        window.location.href = '/meetings';
      },
      description: '会議一覧へ移動',
      category: 'ナビゲーション',
    },
    {
      keys: ['g', 'a'],
      handler: (): void => {
        window.location.href = '/action-items';
      },
      description: 'アクションアイテムへ移動',
      category: 'ナビゲーション',
    },
    {
      keys: ['g', 't'],
      handler: (): void => {
        window.location.href = '/templates';
      },
      description: 'テンプレートへ移動',
      category: 'ナビゲーション',
    },
    {
      keys: ['g', 's'],
      handler: (): void => {
        window.location.href = '/settings';
      },
      description: '設定へ移動',
      category: 'ナビゲーション',
    },
    {
      keys: ['g', 'n'],
      handler: (): void => {
        window.location.href = '/analytics';
      },
      description: '分析へ移動',
      category: 'ナビゲーション',
    },
  ]);

  // "?" shortcut (Shift+/ on most keyboards) - handled separately
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (isInputElement(event.target)) {
        return;
      }

      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        openShortcutsHelp();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openShortcutsHelp]);
}
