'use client';

import { memo, useCallback, useState } from 'react';
import type { ExportOptions, ExportResult, ExportStatus } from '@/types/export';
import type { Speaker } from '@/types/minutes';
import { ExportDialog } from './ExportDialog';

/**
 * Props for ExportButton component
 */
export interface ExportButtonProps {
  /** Minutes ID to export */
  readonly minutesId: string;
  /** Title of the minutes (for dialog) */
  readonly minutesTitle?: string | undefined;
  /** Meeting attendees (for sharing options) */
  readonly attendees?: readonly Speaker[] | undefined;
  /** Whether the button is disabled */
  readonly disabled?: boolean | undefined;
  /** Callback when export starts */
  readonly onExportStart?: (() => void) | undefined;
  /** Callback when export completes successfully */
  readonly onExportComplete?: ((result: ExportResult) => void) | undefined;
  /** Callback when export fails */
  readonly onExportError?: ((error: Error) => void) | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
  /** Button variant */
  readonly variant?: 'primary' | 'secondary' | undefined;
  /** Button size */
  readonly size?: 'sm' | 'md' | 'lg' | undefined;
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
      <rect width="24" height="24" rx="4" fill="currentColor" fillOpacity="0" />
      <path
        d="M7 8h10M7 12h10M7 16h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Get button size classes
 */
function getSizeClasses(size: 'sm' | 'md' | 'lg'): string {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };
  return sizeClasses[size];
}

/**
 * Get button variant classes
 */
function getVariantClasses(variant: 'primary' | 'secondary', disabled: boolean): string {
  if (disabled) {
    return variant === 'primary'
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
      : 'border border-gray-200 text-gray-400 cursor-not-allowed';
  }

  const variantClasses = {
    primary: `
      bg-lark-primary text-white
      hover:bg-blue-600
      focus:ring-lark-primary
    `,
    secondary: `
      border border-lark-border text-lark-text
      hover:bg-gray-50
      focus:ring-lark-primary
    `,
  };
  return variantClasses[variant];
}

/**
 * Get icon size based on button size
 */
function getIconSize(size: 'sm' | 'md' | 'lg'): string {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-5 h-5',
  };
  return iconSizes[size];
}

/**
 * ExportButton component
 *
 * @description Button to trigger export to Lark Docs with integrated dialog
 *
 * @example
 * ```tsx
 * <ExportButton
 *   minutesId="min_123"
 *   minutesTitle="Weekly Standup"
 *   attendees={meeting.attendees}
 *   onExportComplete={(result) => console.log('Exported:', result.documentUrl)}
 * />
 * ```
 */
function ExportButtonInner({
  minutesId,
  minutesTitle = 'Meeting Minutes',
  attendees = [],
  disabled = false,
  onExportStart,
  onExportComplete,
  onExportError,
  className = '',
  variant = 'primary',
  size = 'md',
}: ExportButtonProps): JSX.Element {
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Export state (managed internally for demo, but can be controlled externally)
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportResultUrl, setExportResultUrl] = useState<string | undefined>(undefined);
  const [exportError, setExportError] = useState<string | undefined>(undefined);

  // Handle button click
  const handleClick = useCallback(() => {
    if (disabled) return;
    setIsDialogOpen(true);
  }, [disabled]);

  // Handle dialog close
  const handleClose = useCallback(() => {
    // Reset state when closing
    setIsDialogOpen(false);
    setExportStatus('idle');
    setExportProgress(0);
    setExportResultUrl(undefined);
    setExportError(undefined);
  }, []);

  // Handle export
  const handleExport = useCallback(
    async (options: ExportOptions) => {
      onExportStart?.();

      try {
        // Simulate export process with progress updates
        // In production, this would call the actual export API

        // Step 1: Uploading
        setExportStatus('uploading');
        setExportProgress(25);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Step 2: Processing
        setExportStatus('processing');
        setExportProgress(50);
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Step 3: Setting permissions
        if (options.shareWithAttendees) {
          setExportStatus('setting_permissions');
          setExportProgress(75);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Step 4: Completed
        setExportStatus('completed');
        setExportProgress(100);

        // Simulated result
        const result: ExportResult = {
          documentUrl: `https://larksuite.com/docs/${minutesId}`,
          documentId: `doc_${minutesId}`,
          documentTitle: options.title ?? minutesTitle,
          exportedAt: new Date().toISOString(),
          sharedWith: options.shareWithAttendees
            ? attendees.map((a) => a.name)
            : [],
        };

        setExportResultUrl(result.documentUrl);
        onExportComplete?.(result);
      } catch (error) {
        setExportStatus('error');
        setExportProgress(0);

        const errorMessage = error instanceof Error ? error.message : 'Export failed';
        setExportError(errorMessage);

        onExportError?.(error instanceof Error ? error : new Error(errorMessage));
      }
    },
    [minutesId, minutesTitle, attendees, onExportStart, onExportComplete, onExportError]
  );

  const sizeClasses = getSizeClasses(size);
  const variantClasses = getVariantClasses(variant, disabled);
  const iconSize = getIconSize(size);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center
          font-medium rounded-lg
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${sizeClasses}
          ${variantClasses}
          ${className}
        `}
        aria-label="Lark Docsにエクスポート"
        aria-haspopup="dialog"
        aria-expanded={isDialogOpen}
      >
        <LarkDocsIcon className={iconSize} />
        <span>Larkにエクスポート</span>
      </button>

      <ExportDialog
        isOpen={isDialogOpen}
        onClose={handleClose}
        minutesId={minutesId}
        minutesTitle={minutesTitle}
        attendees={attendees}
        onExport={handleExport}
        exportStatus={exportStatus}
        exportProgress={exportProgress}
        exportResultUrl={exportResultUrl}
        exportError={exportError}
      />
    </>
  );
}

export const ExportButton = memo(ExportButtonInner);
