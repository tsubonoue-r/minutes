'use client';

/**
 * Header - Responsive application header with navigation
 * @module components/layout/header
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { MobileNav } from './mobile-nav';

/**
 * User information for display
 */
interface UserInfo {
  /** User display name */
  readonly name: string;
  /** User email address */
  readonly email?: string | undefined;
  /** Avatar image URL */
  readonly avatarUrl?: string | undefined;
}

/**
 * Navigation link configuration
 */
interface NavLink {
  /** Route path */
  readonly href: string;
  /** Display label */
  readonly label: string;
}

/**
 * Header component props
 */
export interface HeaderProps {
  /** User information to display */
  readonly user: UserInfo;
  /** Currently active path */
  readonly currentPath?: string | undefined;
  /** Navigation links to show on desktop */
  readonly navLinks?: readonly NavLink[] | undefined;
  /** Logout handler */
  readonly onLogout?: (() => void) | undefined;
  /** Additional CSS classes */
  readonly className?: string | undefined;
}

/**
 * Default navigation links
 */
const DEFAULT_NAV_LINKS: readonly NavLink[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/meetings', label: 'Meetings' },
  { href: '/action-items', label: 'Action Items' },
  { href: '/settings', label: 'Settings' },
] as const;

/**
 * Header Component
 *
 * @description Responsive application header that shows full navigation on desktop
 * and a hamburger menu + logo on mobile. Includes a user avatar with dropdown menu.
 *
 * @example
 * ```tsx
 * <Header
 *   user={{ name: 'John', email: 'john@example.com' }}
 *   currentPath="/meetings"
 *   onLogout={() => signOut()}
 * />
 * ```
 */
export function Header({
  user,
  currentPath = '',
  navLinks = DEFAULT_NAV_LINKS,
  onLogout,
  className = '',
}: HeaderProps): JSX.Element {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  const handleCloseDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent): void => {
      if (
        dropdownRef.current !== null &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        handleCloseDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return (): void => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, handleCloseDropdown]);

  /**
   * Check if a nav link is active
   */
  const isActive = (href: string): boolean => {
    if (href === '/dashboard') {
      return currentPath === '/dashboard' || currentPath === '/';
    }
    return currentPath.startsWith(href);
  };

  return (
    <header
      className={`
        sticky top-0 z-50 w-full
        border-b border-slate-200 dark:border-slate-800
        bg-white/80 dark:bg-slate-900/80 backdrop-blur-md
        ${className}
      `}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Left: Logo + Mobile Nav + Desktop Nav */}
        <div className="flex items-center gap-3 md:gap-6">
          {/* Mobile hamburger menu */}
          <MobileNav currentPath={currentPath} />

          {/* Logo */}
          <a href="/dashboard" className="flex items-center">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Minutes
            </span>
          </a>

          {/* Desktop navigation - hidden on mobile */}
          <nav
            className="hidden md:flex items-center gap-1"
            aria-label="Main navigation"
          >
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium
                    transition-colors duration-150
                    ${
                      active
                        ? 'text-lark-primary bg-lark-primary/10'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                  `}
                  aria-current={active ? 'page' : undefined}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Right: User Avatar and Dropdown */}
        <div ref={dropdownRef} className="relative flex items-center">
          <button
            type="button"
            onClick={handleToggleDropdown}
            className="
              flex items-center gap-2 p-1.5 rounded-lg
              min-h-[44px]
              hover:bg-slate-100 dark:hover:bg-slate-800
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
            "
            aria-label="User menu"
            aria-expanded={isDropdownOpen}
            aria-haspopup="menu"
          >
            <Avatar
              src={user.avatarUrl}
              name={user.name}
              size="sm"
            />
            {/* Show name only on larger screens */}
            <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
              {user.name}
            </span>
            <svg
              className={`
                hidden sm:block w-4 h-4 text-slate-400
                transition-transform duration-150
                ${isDropdownOpen ? 'rotate-180' : ''}
              `}
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

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div
              className="
                absolute right-0 top-full mt-2
                w-56 py-2
                bg-white dark:bg-slate-900
                border border-slate-200 dark:border-slate-700
                rounded-lg shadow-lg
                z-50
              "
              role="menu"
              aria-label="User menu options"
            >
              {/* User Info */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {user.name}
                </p>
                {user.email !== undefined && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {user.email}
                  </p>
                )}
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <a
                  href="/settings"
                  className="
                    block px-4 py-2 text-sm min-h-[44px] flex items-center
                    text-slate-700 dark:text-slate-300
                    hover:bg-slate-100 dark:hover:bg-slate-800
                    transition-colors
                  "
                  role="menuitem"
                  onClick={handleCloseDropdown}
                >
                  Settings
                </a>
              </div>

              {/* Logout */}
              {onLogout !== undefined && (
                <div className="py-1 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseDropdown();
                      onLogout();
                    }}
                    className="
                      w-full text-left px-4 py-2 text-sm min-h-[44px] flex items-center
                      text-red-600 dark:text-red-400
                      hover:bg-red-50 dark:hover:bg-red-900/20
                      transition-colors
                    "
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
