'use client';

/**
 * MobileNav - Slide-in mobile navigation component
 * @module components/layout/mobile-nav
 */

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Navigation item configuration
 */
interface NavItem {
  /** Route path */
  readonly href: string;
  /** Display label */
  readonly label: string;
  /** Icon SVG path */
  readonly icon: string;
}

/**
 * MobileNav component props
 */
export interface MobileNavProps {
  /** Currently active path for highlighting */
  readonly currentPath?: string | undefined;
  /** Additional CSS classes for the trigger button */
  readonly className?: string | undefined;
}

/**
 * Navigation items configuration
 */
const NAV_ITEMS: readonly NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    href: '/meetings',
    label: 'Meetings',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    href: '/action-items',
    label: 'Action Items',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  },
] as const;

/**
 * MobileNav Component
 *
 * @description Renders a hamburger menu button (visible on screens below md breakpoint)
 * that opens a slide-in sidebar navigation from the left. Includes an overlay backdrop
 * that closes the menu when tapped.
 *
 * @example
 * ```tsx
 * <MobileNav currentPath="/meetings" />
 * ```
 */
export function MobileNav({
  currentPath = '',
  className = '',
}: MobileNavProps): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Return focus to trigger button after close
    triggerRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return (): void => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Trap focus within sidebar when open
  useEffect(() => {
    if (!isOpen || sidebarRef.current === null) return;

    const firstFocusable = sidebarRef.current.querySelector<HTMLElement>(
      'button, a, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }, [isOpen]);

  /**
   * Check if a nav item is the currently active page
   */
  const isActive = (href: string): boolean => {
    if (href === '/dashboard') {
      return currentPath === '/dashboard' || currentPath === '/';
    }
    return currentPath.startsWith(href);
  };

  return (
    <>
      {/* Hamburger Menu Button - visible only on mobile (below md) */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`
          md:hidden inline-flex items-center justify-center
          min-h-[44px] min-w-[44px] p-2
          text-slate-600 dark:text-slate-400
          hover:text-slate-900 dark:hover:text-white
          hover:bg-slate-100 dark:hover:bg-slate-800
          rounded-lg transition-colors
          focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
          ${className}
        `}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        aria-controls="mobile-nav-sidebar"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Overlay + Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Slide-in sidebar */}
          <div
            ref={sidebarRef}
            id="mobile-nav-sidebar"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="
              absolute inset-y-0 left-0 w-72 max-w-[80vw]
              bg-white dark:bg-slate-900
              shadow-2xl
              transform transition-transform duration-300 ease-out
              animate-slide-in-left
              flex flex-col
            "
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200 dark:border-slate-800">
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Minutes
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="
                  min-h-[44px] min-w-[44px] p-2
                  inline-flex items-center justify-center
                  text-slate-500 hover:text-slate-900
                  dark:text-slate-400 dark:hover:text-white
                  rounded-lg transition-colors
                  focus:outline-none focus:ring-2 focus:ring-lark-primary
                "
                aria-label="Close navigation menu"
              >
                <svg
                  className="w-6 h-6"
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

            {/* Navigation Links */}
            <nav
              className="flex-1 overflow-y-auto px-3 py-4"
              aria-label="Mobile navigation"
            >
              <ul className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        className={`
                          flex items-center gap-3 px-3 py-3
                          min-h-[44px] rounded-lg
                          text-sm font-medium
                          transition-colors duration-150
                          ${
                            active
                              ? 'bg-lark-primary/10 text-lark-primary'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }
                        `}
                        aria-current={active ? 'page' : undefined}
                        onClick={handleClose}
                      >
                        <svg
                          className="w-5 h-5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={item.icon}
                          />
                        </svg>
                        <span>{item.label}</span>
                        {active && (
                          <span
                            className="ml-auto w-1.5 h-1.5 rounded-full bg-lark-primary"
                            aria-hidden="true"
                          />
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Sidebar Footer */}
            <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Minutes v0.1.0
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
