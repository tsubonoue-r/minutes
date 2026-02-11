'use client';

/**
 * KeyboardShortcutProvider - Context provider for keyboard shortcuts
 * @module components/ui/KeyboardShortcutProvider
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useGlobalShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { CommandPalette } from './CommandPalette';
import { ShortcutsHelp } from './ShortcutsHelp';

/**
 * Context value for keyboard shortcut state management
 */
export interface KeyboardShortcutContextValue {
  /** Whether the command palette is currently open */
  readonly isCommandPaletteOpen: boolean;
  /** Open the command palette */
  readonly openCommandPalette: () => void;
  /** Close the command palette */
  readonly closeCommandPalette: () => void;
  /** Whether the shortcuts help dialog is currently open */
  readonly isShortcutsHelpOpen: boolean;
  /** Open the shortcuts help dialog */
  readonly openShortcutsHelp: () => void;
  /** Close the shortcuts help dialog */
  readonly closeShortcutsHelp: () => void;
}

/**
 * KeyboardShortcutProvider props
 */
export interface KeyboardShortcutProviderProps {
  /** Child components to wrap */
  readonly children: React.ReactNode;
}

/**
 * React Context for keyboard shortcut state
 *
 * @description Provides command palette and shortcuts help state to the
 * component tree. Access via `useKeyboardShortcutContext()`.
 */
export const KeyboardShortcutContext =
  createContext<KeyboardShortcutContextValue | null>(null);

/**
 * Hook to access the keyboard shortcut context.
 *
 * @description Must be used within a `KeyboardShortcutProvider`.
 *
 * @throws {Error} If used outside of KeyboardShortcutProvider
 * @returns The keyboard shortcut context value
 *
 * @example
 * ```tsx
 * const { openCommandPalette } = useKeyboardShortcutContext();
 * ```
 */
export function useKeyboardShortcutContext(): KeyboardShortcutContextValue {
  const context = useContext(KeyboardShortcutContext);

  if (context === null) {
    throw new Error(
      'useKeyboardShortcutContext must be used within a KeyboardShortcutProvider. ' +
        'Wrap your application with <KeyboardShortcutProvider> in your layout.'
    );
  }

  return context;
}

/**
 * KeyboardShortcutProvider Component
 *
 * @description Wraps the application to provide global keyboard shortcut
 * functionality. Manages state for the command palette (Cmd+K) and
 * shortcuts help dialog (?). Registers all global shortcuts.
 *
 * Place this provider high in the component tree, typically in the
 * dashboard layout.
 *
 * @example
 * ```tsx
 * export function DashboardLayoutClient({ children }) {
 *   return (
 *     <KeyboardShortcutProvider>
 *       <Header />
 *       <main>{children}</main>
 *     </KeyboardShortcutProvider>
 *   );
 * }
 * ```
 */
export function KeyboardShortcutProvider({
  children,
}: KeyboardShortcutProviderProps): JSX.Element {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] =
    useState<boolean>(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] =
    useState<boolean>(false);

  const openCommandPalette = useCallback(() => {
    setIsShortcutsHelpOpen(false);
    setIsCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  const openShortcutsHelp = useCallback(() => {
    setIsCommandPaletteOpen(false);
    setIsShortcutsHelpOpen(true);
  }, []);

  const closeShortcutsHelp = useCallback(() => {
    setIsShortcutsHelpOpen(false);
  }, []);

  // Register global shortcuts
  useGlobalShortcuts(openCommandPalette, openShortcutsHelp);

  const contextValue = useMemo<KeyboardShortcutContextValue>(
    () => ({
      isCommandPaletteOpen,
      openCommandPalette,
      closeCommandPalette,
      isShortcutsHelpOpen,
      openShortcutsHelp,
      closeShortcutsHelp,
    }),
    [
      isCommandPaletteOpen,
      openCommandPalette,
      closeCommandPalette,
      isShortcutsHelpOpen,
      openShortcutsHelp,
      closeShortcutsHelp,
    ]
  );

  return (
    <KeyboardShortcutContext.Provider value={contextValue}>
      {children}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
      />
      <ShortcutsHelp
        isOpen={isShortcutsHelpOpen}
        onClose={closeShortcutsHelp}
      />
    </KeyboardShortcutContext.Provider>
  );
}
