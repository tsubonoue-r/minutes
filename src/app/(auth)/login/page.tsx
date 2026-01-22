/**
 * Login Page - Lark OAuth authentication
 * @module app/(auth)/login/page
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginButton } from '@/components/auth/login-button';

/**
 * Page metadata
 */
export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Minutes with your Lark account',
};

/**
 * Error message mapping
 */
const ERROR_MESSAGES: Record<string, string> = {
  oauth_init_failed: 'Failed to start authentication. Please try again.',
  oauth_denied: 'Authentication was denied. Please try again.',
  invalid_callback: 'Invalid authentication response. Please try again.',
  invalid_state: 'Security validation failed. Please try again.',
  token_exchange_failed: 'Failed to complete authentication. Please try again.',
  callback_failed: 'Authentication failed. Please try again.',
  session_expired: 'Your session has expired. Please sign in again.',
};

/**
 * Login page props
 */
interface LoginPageProps {
  readonly searchParams: Promise<{
    error?: string;
    redirect?: string;
  }>;
}

/**
 * Login Page Component
 *
 * Displays login form with Lark OAuth authentication.
 */
export default async function LoginPage({
  searchParams,
}: LoginPageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const error = params.error;
  const redirect = params.redirect;
  const errorMessage = error !== undefined ? ERROR_MESSAGES[error] ?? 'An error occurred. Please try again.' : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Login card */}
      <div className="relative w-full max-w-md">
        <div className="card animate-fade-in">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <span className="text-3xl font-bold text-gradient">Minutes</span>
            </Link>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Sign in to access your meeting notes
            </p>
          </div>

          {/* Error message */}
          {errorMessage !== null && (
            <div className="error-message mb-6" role="alert">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Login button */}
          <LoginButton redirect={redirect} />

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">
                Secure authentication
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            <p className="mb-2">
              By signing in, you agree to our{' '}
              <a href="#" className="link">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="link">
                Privacy Policy
              </a>
              .
            </p>
            <p>
              We use Lark OAuth to securely authenticate you without storing
              your password.
            </p>
          </div>
        </div>

        {/* Back to home */}
        <p className="text-center mt-6 text-slate-500 dark:text-slate-400 text-sm">
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            &larr; Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
