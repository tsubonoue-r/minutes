/**
 * Login Button Component
 * @module components/auth/login-button
 */

'use client';

import { useState, useCallback } from 'react';

/**
 * Lark logo SVG component
 */
function LarkLogo({ className }: { readonly className?: string }): React.ReactElement {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
    </svg>
  );
}

/**
 * Loading spinner component
 */
function LoadingSpinner(): React.ReactElement {
  return (
    <svg
      className="animate-spin h-5 w-5"
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
 * Login button props
 */
interface LoginButtonProps {
  /** Optional redirect path after login */
  readonly redirect?: string | undefined;
  /** Optional additional class names */
  readonly className?: string | undefined;
}

/**
 * Login Button Component
 *
 * Renders a button that initiates the Lark OAuth flow.
 * Shows loading state while redirecting.
 */
export function LoginButton({
  redirect,
  className = '',
}: LoginButtonProps): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = useCallback((): void => {
    setIsLoading(true);

    // Build auth URL with optional redirect
    let authUrl = '/api/auth/lark';
    if (redirect !== undefined) {
      authUrl += `?redirect=${encodeURIComponent(redirect)}`;
    }

    // Redirect to OAuth flow
    window.location.href = authUrl;
  }, [redirect]);

  return (
    <button
      type="button"
      onClick={handleLogin}
      disabled={isLoading}
      className={`w-full flex items-center justify-center gap-3 bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${className}`}
    >
      {isLoading ? (
        <>
          <LoadingSpinner />
          <span>Connecting to Lark...</span>
        </>
      ) : (
        <>
          <LarkLogo className="w-5 h-5" />
          <span>Sign in with Lark</span>
        </>
      )}
    </button>
  );
}
