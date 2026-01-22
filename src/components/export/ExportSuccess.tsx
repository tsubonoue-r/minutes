'use client';

import { memo, useCallback, useState } from 'react';

/**
 * Props for ExportSuccess component
 */
export interface ExportSuccessProps {
  /** URL of the created Lark document */
  readonly documentUrl: string;
  /** Title of the created document */
  readonly documentTitle: string;
  /** Callback when close button is clicked */
  readonly onClose: () => void;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * Check icon component
 */
function CheckCircleIcon({ className = '' }: { readonly className?: string }): JSX.Element {
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
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

/**
 * External link icon component
 */
function ExternalLinkIcon({ className = '' }: { readonly className?: string }): JSX.Element {
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
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

/**
 * Copy icon component
 */
function CopyIcon({ className = '' }: { readonly className?: string }): JSX.Element {
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
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

/**
 * Check icon for copy confirmation
 */
function CheckIcon({ className = '' }: { readonly className?: string }): JSX.Element {
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
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

/**
 * Lark Docs icon component
 */
function LarkDocsIcon({ className = '' }: { readonly className?: string }): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="4" fill="#3370FF" />
      <path
        d="M7 8h10M7 12h10M7 16h6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * ExportSuccess component
 *
 * @description Displays success message with document URL and copy functionality
 *
 * @example
 * ```tsx
 * <ExportSuccess
 *   documentUrl="https://larksuite.com/docs/xxx"
 *   documentTitle="Meeting Minutes - 2024-01-15"
 *   onClose={() => setShowSuccess(false)}
 * />
 * ```
 */
function ExportSuccessInner({
  documentUrl,
  documentTitle,
  onClose,
  className = '',
}: ExportSuccessProps): JSX.Element {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(documentUrl);
      setIsCopied(true);
      // Reset after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      console.error('Failed to copy URL:', error);
    }
  }, [documentUrl]);

  const handleOpenDocument = useCallback(() => {
    window.open(documentUrl, '_blank', 'noopener,noreferrer');
  }, [documentUrl]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Success header */}
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircleIcon className="w-10 h-10 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold text-lark-text">
          Export Successful!
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Your minutes have been exported to Lark Docs
        </p>
      </div>

      {/* Document info card */}
      <div className="bg-gray-50 rounded-lg p-4 border border-lark-border">
        <div className="flex items-start gap-3">
          <LarkDocsIcon className="w-10 h-10 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-lark-text truncate">
              {documentTitle}
            </h4>
            <p className="text-xs text-gray-500 mt-1 truncate">
              {documentUrl}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {/* Open document button */}
        <button
          type="button"
          onClick={handleOpenDocument}
          className="
            flex-1 flex items-center justify-center gap-2
            px-4 py-2.5 rounded-lg
            bg-lark-primary text-white
            hover:bg-blue-600 transition-colors
            focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
          "
          aria-label="Open document in new tab"
        >
          <ExternalLinkIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Open Document</span>
        </button>

        {/* Copy URL button */}
        <button
          type="button"
          onClick={(): void => { void handleCopyUrl(); }}
          className={`
            flex items-center justify-center gap-2
            px-4 py-2.5 rounded-lg
            border transition-colors
            focus:outline-none focus:ring-2 focus:ring-lark-primary focus:ring-offset-2
            ${
              isCopied
                ? 'border-green-500 text-green-600 bg-green-50'
                : 'border-lark-border text-gray-700 hover:bg-gray-50'
            }
          `}
          aria-label={isCopied ? 'URL copied' : 'Copy URL to clipboard'}
        >
          {isCopied ? (
            <>
              <CheckIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Copied!</span>
            </>
          ) : (
            <>
              <CopyIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Copy URL</span>
            </>
          )}
        </button>
      </div>

      {/* Close button */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onClose}
          className="
            text-sm text-gray-500 hover:text-gray-700
            focus:outline-none focus:underline
          "
        >
          Close
        </button>
      </div>
    </div>
  );
}

export const ExportSuccess = memo(ExportSuccessInner);
