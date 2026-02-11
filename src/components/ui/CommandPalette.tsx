'use client';

/**
 * CommandPalette - Cmd+K command palette for quick navigation and actions
 * @module components/ui/CommandPalette
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

/**
 * A single command entry in the palette
 */
interface Command {
  /** Unique identifier */
  readonly id: string;
  /** Display label */
  readonly label: string;
  /** Group category */
  readonly group: string;
  /** Keyboard shortcut hint text */
  readonly shortcut: string;
  /** Handler when command is selected */
  readonly handler: () => void;
  /** SVG icon path data */
  readonly iconPath: string;
}

/**
 * CommandPalette component props
 */
export interface CommandPaletteProps {
  /** Whether the palette is open */
  readonly isOpen: boolean;
  /** Callback to close the palette */
  readonly onClose: () => void;
}

/**
 * Navigation icon SVG path (arrow pointing right)
 */
const NAV_ICON_PATH =
  'M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3';

/**
 * All available commands in the palette
 */
const COMMANDS: readonly Command[] = [
  {
    id: 'nav-dashboard',
    label: 'ダッシュボードへ移動',
    group: 'ナビゲーション',
    shortcut: 'G D',
    handler: (): void => {
      window.location.href = '/dashboard';
    },
    iconPath: NAV_ICON_PATH,
  },
  {
    id: 'nav-meetings',
    label: '会議一覧へ移動',
    group: 'ナビゲーション',
    shortcut: 'G M',
    handler: (): void => {
      window.location.href = '/meetings';
    },
    iconPath: NAV_ICON_PATH,
  },
  {
    id: 'nav-action-items',
    label: 'アクションアイテムへ移動',
    group: 'ナビゲーション',
    shortcut: 'G A',
    handler: (): void => {
      window.location.href = '/action-items';
    },
    iconPath: NAV_ICON_PATH,
  },
  {
    id: 'nav-templates',
    label: 'テンプレートへ移動',
    group: 'ナビゲーション',
    shortcut: 'G T',
    handler: (): void => {
      window.location.href = '/templates';
    },
    iconPath: NAV_ICON_PATH,
  },
  {
    id: 'nav-settings',
    label: '設定へ移動',
    group: 'ナビゲーション',
    shortcut: 'G S',
    handler: (): void => {
      window.location.href = '/settings';
    },
    iconPath: NAV_ICON_PATH,
  },
  {
    id: 'nav-analytics',
    label: '分析へ移動',
    group: 'ナビゲーション',
    shortcut: 'G N',
    handler: (): void => {
      window.location.href = '/analytics';
    },
    iconPath: NAV_ICON_PATH,
  },
] as const;

/**
 * Simple fuzzy match: checks if all characters in the query appear in order
 * within the target string (case-insensitive).
 */
function fuzzyMatch(target: string, query: string): boolean {
  const lowerTarget = target.toLowerCase();
  const lowerQuery = query.toLowerCase();

  let targetIndex = 0;
  for (let queryIndex = 0; queryIndex < lowerQuery.length; queryIndex++) {
    const char = lowerQuery[queryIndex];
    if (char === undefined) {
      continue;
    }

    const found = lowerTarget.indexOf(char, targetIndex);
    if (found === -1) {
      return false;
    }
    targetIndex = found + 1;
  }

  return true;
}

/**
 * Group commands by their group property
 */
function groupCommands(
  commands: readonly Command[]
): ReadonlyMap<string, readonly Command[]> {
  const groups = new Map<string, Command[]>();

  for (const command of commands) {
    const existing = groups.get(command.group);
    if (existing !== undefined) {
      existing.push(command);
    } else {
      groups.set(command.group, [command]);
    }
  }

  return groups;
}

/**
 * CommandPalette Component
 *
 * @description A modal command palette (triggered by Cmd+K) that provides
 * quick access to navigation and actions. Supports fuzzy search, keyboard
 * navigation with arrow keys, and grouped command display.
 *
 * @example
 * ```tsx
 * <CommandPalette
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 * />
 * ```
 */
export function CommandPalette({
  isOpen,
  onClose,
}: CommandPaletteProps): JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return <CommandPaletteInner onClose={onClose} />;
}

/**
 * Inner component that mounts fresh each time the palette opens,
 * ensuring clean state without needing manual resets.
 */
function CommandPaletteInner({
  onClose,
}: {
  readonly onClose: () => void;
}): JSX.Element {
  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands based on search query
  const filteredCommands = useMemo<readonly Command[]>(() => {
    if (query.trim() === '') {
      return COMMANDS;
    }
    return COMMANDS.filter((cmd) => fuzzyMatch(cmd.label, query));
  }, [query]);

  // Grouped filtered commands for display
  const groupedCommands = useMemo(
    () => groupCommands(filteredCommands),
    [filteredCommands]
  );

  // Flat list for keyboard navigation indexing
  const flatFilteredCommands = useMemo<readonly Command[]>(
    () => filteredCommands,
    [filteredCommands]
  );

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return (): void => {
      clearTimeout(timer);
    };
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current === null) {
      return;
    }

    const selectedElement = listRef.current.querySelector(
      '[data-selected="true"]'
    );
    if (selectedElement instanceof HTMLElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const executeCommand = useCallback(
    (command: Command) => {
      onClose();
      // Execute after closing to avoid event conflicts
      setTimeout(() => {
        command.handler();
      }, 100);
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < flatFilteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : flatFilteredCommands.length - 1
          );
          break;
        }
        case 'Enter': {
          event.preventDefault();
          const selected = flatFilteredCommands[selectedIndex];
          if (selected !== undefined) {
            executeCommand(selected);
          }
          break;
        }
        case 'Escape': {
          event.preventDefault();
          onClose();
          break;
        }
        default:
          break;
      }
    },
    [flatFilteredCommands, selectedIndex, executeCommand, onClose]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
      setSelectedIndex(0);
    },
    []
  );

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Build a running flat index for mapping group items to their flat position
  let runningIndex = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="コマンドパレット"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      {/* Palette container */}
      <div
        className="
          relative z-10 w-full max-w-lg mx-4
          bg-white dark:bg-slate-900
          border border-slate-200 dark:border-slate-700
          rounded-xl shadow-2xl
          overflow-hidden
          animate-fade-in
        "
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-slate-200 dark:border-slate-700">
          <svg
            className="w-5 h-5 text-slate-400 shrink-0"
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
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="コマンドを検索..."
            className="
              flex-1 py-3.5 text-sm
              bg-transparent
              text-slate-900 dark:text-white
              placeholder-slate-400 dark:placeholder-slate-500
              border-0 outline-none focus:ring-0
            "
            aria-label="コマンド検索"
            aria-autocomplete="list"
            aria-controls="command-list"
            aria-activedescendant={
              flatFilteredCommands[selectedIndex] !== undefined
                ? `command-${flatFilteredCommands[selectedIndex]?.id ?? ''}`
                : undefined
            }
            role="combobox"
            aria-expanded="true"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 rounded">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div
          ref={listRef}
          id="command-list"
          role="listbox"
          aria-label="コマンド一覧"
          className="max-h-[320px] overflow-y-auto py-2"
        >
          {flatFilteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              該当するコマンドがありません
            </div>
          ) : (
            Array.from(groupedCommands.entries()).map(([group, commands]) => {
              const groupStartIndex = runningIndex;
              const groupElement = (
                <div key={group} role="group" aria-label={group}>
                  <div className="px-4 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {group}
                  </div>
                  {commands.map((command, idx) => {
                    const flatIndex = groupStartIndex + idx;
                    const isSelected = flatIndex === selectedIndex;

                    return (
                      <button
                        key={command.id}
                        id={`command-${command.id}`}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        data-selected={isSelected ? 'true' : 'false'}
                        onClick={() => {
                          executeCommand(command);
                        }}
                        onMouseEnter={() => {
                          setSelectedIndex(flatIndex);
                        }}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm
                          transition-colors duration-75
                          ${
                            isSelected
                              ? 'bg-lark-primary/10 text-lark-primary'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }
                        `}
                      >
                        {/* Icon */}
                        <svg
                          className={`w-4 h-4 shrink-0 ${isSelected ? 'text-lark-primary' : 'text-slate-400'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={command.iconPath}
                          />
                        </svg>

                        {/* Label */}
                        <span className="flex-1 truncate">{command.label}</span>

                        {/* Shortcut hint */}
                        <span className="flex items-center gap-1 shrink-0">
                          {command.shortcut.split(' ').map((key) => (
                            <kbd
                              key={key}
                              className={`
                                inline-flex items-center justify-center
                                min-w-[1.5rem] px-1.5 py-0.5
                                text-xs font-medium rounded
                                ${
                                  isSelected
                                    ? 'bg-lark-primary/20 text-lark-primary'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                }
                              `}
                            >
                              {key}
                            </kbd>
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );

              runningIndex += commands.length;
              return groupElement;
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
              ↑
            </kbd>
            <kbd className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
              ↓
            </kbd>
            移動
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center px-1.5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
              Enter
            </kbd>
            選択
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center px-1.5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
              ESC
            </kbd>
            閉じる
          </span>
        </div>
      </div>
    </div>
  );
}
