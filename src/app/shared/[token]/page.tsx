/**
 * Shared Minutes Page - Public page for viewing shared minutes
 * @module app/shared/[token]/page
 *
 * This is a server component. No authentication is required.
 * Validates the share token, checks expiry, and renders the minutes
 * in read-only mode. Password-protected links show a password form.
 */

import type { Metadata } from 'next';
import { createShareService } from '@/services/share.service';
import { isShareLinkExpired } from '@/types/share';
import { SharedMinutesPageClient } from './_components/shared-minutes-page-client';

// =============================================================================
// Types
// =============================================================================

/**
 * Route params
 */
interface SharedPageParams {
  readonly params: Promise<{
    readonly token: string;
  }>;
}

// =============================================================================
// Metadata
// =============================================================================

/**
 * Dynamic metadata for the shared page
 */
export const metadata: Metadata = {
  title: '共有議事録',
  description: '共有された議事録を表示します',
  robots: {
    index: false,
    follow: false,
  },
};

// =============================================================================
// Page Component
// =============================================================================

/**
 * SharedMinutesPage
 *
 * Server component that validates the share token and renders
 * the appropriate view:
 * - Invalid/expired: Error message
 * - Password-protected: Password form
 * - Valid: Read-only minutes view
 */
export default async function SharedMinutesPage({
  params,
}: SharedPageParams): Promise<React.ReactElement> {
  const { token } = await params;

  // Validate token
  if (token === undefined || token.trim() === '') {
    return <InvalidTokenView message="無効なリンクです" />;
  }

  // Look up share link
  const service = createShareService();
  const shareLink = await service.getShareLink(token);

  if (shareLink === null) {
    return <InvalidTokenView message="共有リンクが見つかりません" />;
  }

  if (!shareLink.isActive) {
    return <InvalidTokenView message="この共有リンクは無効化されています" />;
  }

  if (isShareLinkExpired(shareLink)) {
    return <InvalidTokenView message="この共有リンクの有効期限が切れています" />;
  }

  // Check if password-protected
  const requiresPassword = shareLink.password !== undefined;

  return (
    <SharedMinutesPageClient
      token={token}
      meetingId={shareLink.meetingId}
      requiresPassword={requiresPassword}
    />
  );
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Invalid token view component
 */
function InvalidTokenView({
  message,
}: {
  readonly message: string;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <svg
          className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          アクセスできません
        </h2>
        <p className="text-gray-500 dark:text-slate-400">
          {message}
        </p>
      </div>
    </div>
  );
}
