'use client';

/**
 * ShortcutsHelp - Dialog showing all available keyboard shortcuts
 * @module components/ui/ShortcutsHelp
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * A single shortcut entry for display
 */
interface ShortcutEntry {
  /** Human-readable description */
  readonly label: string;
  /** Array of key segments to display as badges */
  readonly keys: readonly string[];
}

/**
 * A category of shortcuts
 */
interface ShortcutCategory {
  /** Category display name */
  readonly name: string;
  /** Shortcuts in this category */
  readonly shortcuts: readonly ShortcutEntry[];
}

/**
 * ShortcutsHelp component props
 */
export interface ShortcutsHelpProps {
  /** Whether the dialog is open */
  readonly isOpen: boolean;
  /** Callback to close the dialog */
  readonly onClose: () => void;
}

/**
 * All shortcut categories and their entries
 */
const SHORTCUT_CATEGORIES: readonly ShortcutCategory[] = [
  {
    name: '一般',
    shortcuts: [
      { label: 'コマンドパレットを開く', keys: ['\u2318', 'K'] },
      { label: 'ショートカット一覧を表示', keys: ['?'] },
    ],
  },
  {
    name: 'ナビゲーション',
    shortcuts: [
      { label: 'ダッシュボードへ移動', keys: ['G', 'D'] },
      { label: '会議一覧へ移動', keys: ['G', 'M'] },
      { label: 'アクションアイテムへ移動', keys: ['G', 'A'] },
      { label: 'テンプレートへ移動', keys: ['G', 'T'] },
      { label: '設定へ移動', keys: ['G', 'S'] },
      { label: '分析へ移動', keys: ['G', 'N'] },
    ],
  },
] as const;

/**
 * ShortcutsHelp Component
 *
 * @description A modal dialog that displays all available keyboard shortcuts,
 * organized by category. Each shortcut is shown with visual key badges.
 * Closable via Escape key or clicking outside.
 *
 * @example
 * ```tsx
 * <ShortcutsHelp
 *   isOpen={showHelp}
 *   onClose={() => setShowHelp(false)}
 * />
 * ```
 */
export function ShortcutsHelp({
  isOpen,
  onClose,
}: ShortcutsHelpProps): JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Focus trap: focus the dialog container on open
  useEffect(() => {
    if (isOpen && dialogRef.current !== null) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="キーボードショートカット"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      {/* Dialog container */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="
          relative z-10 w-full max-w-md
          bg-white dark:bg-slate-900
          border border-slate-200 dark:border-slate-700
          rounded-xl shadow-2xl
          overflow-hidden
          animate-fade-in
          outline-none
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            キーボードショートカット
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="
              flex items-center justify-center w-8 h-8 rounded-lg
              text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
              hover:bg-slate-100 dark:hover:bg-slate-800
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-lark-primary
            "
            aria-label="閉じる"
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
        </div>

        {/* Shortcut categories */}
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto space-y-5">
          {SHORTCUT_CATEGORIES.map((category) => (
            <div key={category.name}>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                {category.name}
              </h3>
              <div className="space-y-1">
                {category.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.label}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {shortcut.label}
                    </span>
                    <span className="flex items-center gap-1 shrink-0 ml-4">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={`${shortcut.label}-key-${String(keyIndex)}`} className="flex items-center gap-1">
                          {keyIndex > 0 && (
                            <span className="text-slate-300 dark:text-slate-600 text-xs">
                              +
                            </span>
                          )}
                          <kbd
                            className="
                              inline-flex items-center justify-center
                              min-w-[1.75rem] px-1.5 py-1
                              text-xs font-medium
                              bg-slate-100 dark:bg-slate-800
                              text-slate-600 dark:text-slate-300
                              border border-slate-200 dark:border-slate-600
                              rounded-md shadow-sm
                            "
                          >
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            入力フィールドにフォーカス中はショートカットが無効になります
          </p>
        </div>
      </div>
    </div>
  );
}
