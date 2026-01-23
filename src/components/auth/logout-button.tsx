/**
 * Logout Button Component
 * @module components/auth/logout-button
 */

'use client';

import { useState, useCallback } from 'react';

/**
 * Loading spinner component
 */
function LoadingSpinner(): React.ReactElement {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Logout icon component
 */
function LogoutIcon({ className }: { readonly className?: string }): React.ReactElement {
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
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  );
}

/**
 * Logout button variant
 */
type LogoutVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Logout button props
 */
interface LogoutButtonProps {
  /** Button variant */
  readonly variant?: LogoutVariant | undefined;
  /** Optional redirect path after logout */
  readonly redirectTo?: string | undefined;
  /** Show icon only */
  readonly iconOnly?: boolean | undefined;
  /** Optional additional class names */
  readonly className?: string | undefined;
  /** Button text */
  readonly children?: React.ReactNode | undefined;
}

/**
 * Variant styles mapping
 */
const VARIANT_STYLES: Record<LogoutVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

/**
 * Logout Button Component
 *
 * Renders a button that logs out the user.
 * Calls the logout API and redirects to home page.
 */
export function LogoutButton({
  variant = 'ghost',
  redirectTo = '/',
  iconOnly = false,
  className = '',
  children,
}: LogoutButtonProps): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('[Logout] Failed:', response.status);
      }

      // Redirect using window.location for full page refresh
      window.location.href = redirectTo;
    } catch (error) {
      console.error('[Logout] Error:', error);
      // Still redirect on error
      window.location.href = redirectTo;
    }
  }, [redirectTo]);

  const buttonText = children ?? 'ログアウト';

  return (
    <button
      type="button"
      onClick={() => { void handleLogout(); }}
      disabled={isLoading}
      className={`${VARIANT_STYLES[variant]} ${className}`}
      aria-label={iconOnly ? 'ログアウト' : undefined}
      title={iconOnly ? 'ログアウト' : undefined}
    >
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <LogoutIcon className="w-4 h-4" />
      )}
      {!iconOnly && <span>{isLoading ? 'ログアウト中...' : buttonText}</span>}
    </button>
  );
}
