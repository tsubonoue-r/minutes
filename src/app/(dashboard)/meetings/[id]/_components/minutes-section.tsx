/**
 * Minutes Section Component
 * Fetches and displays meeting minutes with generation capability
 * Includes export to Lark Docs functionality
 * @module app/(dashboard)/meetings/[id]/_components/minutes-section
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  MinutesViewer,
  GenerateMinutesCard,
  type GenerationState,
  type GenerationStatus,
} from '@/components/minutes';
import { ExportButton } from '@/components/export';
import type { Minutes } from '@/types/minutes';
import type { ExportResult } from '@/types/export';

// =============================================================================
// Types
// =============================================================================

/**
 * API response type for minutes fetch
 */
interface MinutesApiResponse {
  readonly success: boolean;
  readonly data?: Minutes | undefined;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  } | undefined;
}

/**
 * API response type for minutes generation
 */
interface GenerateMinutesApiResponse {
  readonly success: boolean;
  readonly data?: {
    readonly minutes: Minutes;
    readonly processingTimeMs: number;
    readonly usage: {
      readonly inputTokens: number;
      readonly outputTokens: number;
    };
  } | undefined;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  } | undefined;
}

/**
 * Props for MinutesSection component
 */
export interface MinutesSectionProps {
  /** Meeting ID to fetch/generate minutes for */
  readonly meetingId: string;
  /** Meeting title for display */
  readonly meetingTitle: string;
  /** Whether the meeting has a transcript */
  readonly hasTranscript: boolean;
  /** Additional CSS classes */
  readonly className?: string | undefined;
}

/**
 * Export state type
 */
type ExportStateStatus = 'idle' | 'exporting' | 'success' | 'error';

/**
 * Export state interface
 */
interface ExportState {
  readonly status: ExportStateStatus;
  readonly documentUrl?: string | undefined;
  readonly documentTitle?: string | undefined;
  readonly error?: string | undefined;
}

/**
 * Component state interface
 */
interface ComponentState {
  readonly minutes: Minutes | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly generationState: GenerationState;
  readonly exportState: ExportState;
}

/**
 * Initial export state
 */
const initialExportState: ExportState = {
  status: 'idle',
};

/**
 * Initial component state
 */
const initialState: ComponentState = {
  minutes: null,
  isLoading: true,
  error: null,
  generationState: { status: 'idle' },
  exportState: initialExportState,
};

// =============================================================================
// Subcomponents
// =============================================================================

/**
 * No transcript message component
 */
function NoTranscriptMessage({
  className = '',
}: {
  readonly className?: string | undefined;
}): JSX.Element {
  return (
    <div
      className={`
        p-8 text-center
        border border-dashed border-lark-border rounded-lg
        bg-gray-50 dark:bg-slate-800
        ${className}
      `}
    >
      <svg
        className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
        Transcript Required
      </h3>
      <p className="text-sm text-gray-500 dark:text-slate-400">
        To generate meeting minutes, a transcript is required.
        Please ensure the meeting has a transcript available.
      </p>
    </div>
  );
}

/**
 * Export success toast component
 */
function ExportSuccessToast({
  documentUrl,
  documentTitle,
  onClose,
}: {
  readonly documentUrl: string;
  readonly documentTitle: string;
  readonly onClose: () => void;
}): JSX.Element {
  return (
    <div
      className="
        fixed bottom-4 right-4 z-50
        bg-white dark:bg-slate-800
        border border-green-200 dark:border-green-700
        rounded-lg shadow-lg p-4
        max-w-sm animate-slide-in-up
      "
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-green-500"
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
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            Export Successful
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400 truncate mt-1">
            {documentTitle}
          </p>
          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center gap-1 mt-2
              text-sm text-blue-600 hover:text-blue-700
              dark:text-blue-400 dark:hover:text-blue-300
            "
          >
            Open in Lark Docs
            <svg
              className="w-4 h-4"
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
          </a>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="
            flex-shrink-0 p-1 rounded-md
            text-gray-400 hover:text-gray-500
            dark:text-slate-500 dark:hover:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-blue-500
          "
          aria-label="Close notification"
        >
          <svg
            className="w-5 h-5"
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
    </div>
  );
}

/**
 * Export error toast component
 */
function ExportErrorToast({
  message,
  onClose,
}: {
  readonly message: string;
  readonly onClose: () => void;
}): JSX.Element {
  return (
    <div
      className="
        fixed bottom-4 right-4 z-50
        bg-white dark:bg-slate-800
        border border-red-200 dark:border-red-700
        rounded-lg shadow-lg p-4
        max-w-sm animate-slide-in-up
      "
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            Export Failed
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {message}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="
            flex-shrink-0 p-1 rounded-md
            text-gray-400 hover:text-gray-500
            dark:text-slate-500 dark:hover:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-red-500
          "
          aria-label="Close notification"
        >
          <svg
            className="w-5 h-5"
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
    </div>
  );
}

/**
 * Error display component
 */
function MinutesError({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}): JSX.Element {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-lark-border p-8">
      <div className="text-center">
        <svg
          className="mx-auto h-12 w-12 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">
          Failed to load minutes
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Retry
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * MinutesSection Component
 *
 * @description Fetches and displays meeting minutes with generation capability.
 *              Handles loading, error, empty states, and generation progress.
 *
 * @example
 * ```tsx
 * <MinutesSection
 *   meetingId="meeting-123"
 *   meetingTitle="Weekly Standup"
 *   hasTranscript={true}
 * />
 * ```
 */
export function MinutesSection({
  meetingId,
  meetingTitle: _meetingTitle,
  hasTranscript,
  className = '',
}: MinutesSectionProps): JSX.Element {
  // Note: meetingTitle is available for future use (e.g., displaying meeting context)
  void _meetingTitle;
  const [state, setState] = useState<ComponentState>(initialState);

  /**
   * Fetch existing minutes from API
   */
  const fetchMinutes = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/meetings/${meetingId}/minutes`);

      // 404 means minutes don't exist yet - not an error
      if (response.status === 404) {
        setState({
          minutes: null,
          isLoading: false,
          error: null,
          generationState: { status: 'idle' },
          exportState: initialExportState,
        });
        return;
      }

      if (!response.ok) {
        const errorData = (await response.json()) as MinutesApiResponse;
        throw new Error(errorData.error?.message ?? 'Failed to fetch minutes');
      }

      const data = (await response.json()) as MinutesApiResponse;
      setState({
        minutes: data.data ?? null,
        isLoading: false,
        error: null,
        generationState: { status: data.data !== undefined ? 'completed' : 'idle' },
        exportState: initialExportState,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      setState({
        minutes: null,
        isLoading: false,
        error: message,
        generationState: { status: 'error', error: message },
        exportState: initialExportState,
      });
    }
  }, [meetingId]);

  /**
   * Generate minutes from transcript
   */
  const generateMinutes = useCallback(async (): Promise<void> => {
    // Update state to generating
    setState((prev) => ({
      ...prev,
      error: null,
      generationState: {
        status: 'generating' as GenerationStatus,
        progress: 0,
        currentStep: 'Initializing...',
      },
    }));

    // Simulate progress updates
    const progressIntervals = [
      { progress: 10, step: 'Fetching transcript...', delay: 500 },
      { progress: 30, step: 'Analyzing content...', delay: 1500 },
      { progress: 50, step: 'Generating summary...', delay: 2000 },
      { progress: 70, step: 'Extracting action items...', delay: 1500 },
      { progress: 90, step: 'Finalizing minutes...', delay: 1000 },
    ];

    // Start progress simulation (in background)
    let isCancelled = false;
    const runProgressSimulation = async (): Promise<void> => {
      for (const interval of progressIntervals) {
        if (isCancelled) break;
        await new Promise<void>((resolve) => setTimeout(resolve, interval.delay));
        if (isCancelled) break;
        setState((prev) => ({
          ...prev,
          generationState: {
            status: 'generating' as GenerationStatus,
            progress: interval.progress,
            currentStep: interval.step,
          },
        }));
      }
    };

    // Run progress simulation without awaiting (fire and forget)
    void runProgressSimulation();

    try {
      const response = await fetch(`/api/meetings/${meetingId}/minutes/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language: 'ja' }),
      });

      isCancelled = true; // Stop progress simulation

      if (!response.ok) {
        const errorData = (await response.json()) as GenerateMinutesApiResponse;
        throw new Error(errorData.error?.message ?? 'Failed to generate minutes');
      }

      const data = (await response.json()) as GenerateMinutesApiResponse;

      if (data.data?.minutes === undefined) {
        throw new Error('Invalid response: minutes data is missing');
      }

      setState({
        minutes: data.data.minutes,
        isLoading: false,
        error: null,
        generationState: { status: 'completed' },
        exportState: initialExportState,
      });
    } catch (error) {
      isCancelled = true; // Stop progress simulation
      const message =
        error instanceof Error ? error.message : 'Failed to generate minutes';
      setState((prev) => ({
        ...prev,
        error: message,
        generationState: {
          status: 'error',
          error: message,
        },
      }));
    }
  }, [meetingId]);

  /**
   * Handle retry action
   */
  const handleRetry = useCallback((): void => {
    if (state.generationState.status === 'error') {
      // If generation failed, retry generation
      void generateMinutes();
    } else {
      // Otherwise, retry fetching
      void fetchMinutes();
    }
  }, [state.generationState.status, fetchMinutes, generateMinutes]);

  /**
   * Handle generate action
   */
  const handleGenerate = useCallback((): void => {
    void generateMinutes();
  }, [generateMinutes]);

  /**
   * Handle regenerate action
   */
  const handleRegenerate = useCallback((): void => {
    void generateMinutes();
  }, [generateMinutes]);

  /**
   * Handle export complete
   */
  const handleExportComplete = useCallback((result: ExportResult): void => {
    setState((prev) => ({
      ...prev,
      exportState: {
        status: 'success',
        documentUrl: result.documentUrl,
        documentTitle: result.documentTitle,
      },
    }));

    // Auto-hide success toast after 10 seconds
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        exportState: initialExportState,
      }));
    }, 10000);
  }, []);

  /**
   * Handle export error
   */
  const handleExportError = useCallback((error: Error): void => {
    setState((prev) => ({
      ...prev,
      exportState: {
        status: 'error',
        error: error.message,
      },
    }));

    // Auto-hide error toast after 8 seconds
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        exportState: initialExportState,
      }));
    }, 8000);
  }, []);

  /**
   * Handle export toast close
   */
  const handleExportToastClose = useCallback((): void => {
    setState((prev) => ({
      ...prev,
      exportState: initialExportState,
    }));
  }, []);

  // Fetch minutes on mount and when meetingId changes
  useEffect(() => {
    void fetchMinutes();
  }, [fetchMinutes]);

  // Don't show section if no transcript available
  if (!hasTranscript) {
    return (
      <section className={className} aria-label="Minutes section">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Minutes
        </h2>
        <NoTranscriptMessage />
      </section>
    );
  }

  // Show error state (not generation error - those are handled by GenerateMinutesCard)
  if (state.error !== null && state.generationState.status !== 'error') {
    return (
      <section className={className} aria-label="Minutes section">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Minutes
        </h2>
        <MinutesError message={state.error} onRetry={handleRetry} />
      </section>
    );
  }

  // Show generation card if no minutes exist
  if (state.minutes === null && !state.isLoading) {
    return (
      <section className={className} aria-label="Minutes section">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Minutes
        </h2>
        <GenerateMinutesCard
          state={state.generationState}
          onGenerate={handleGenerate}
        />
      </section>
    );
  }

  // Build props conditionally for exactOptionalPropertyTypes compliance
  const viewerProps = {
    minutes: state.minutes ?? undefined,
    isLoading: state.isLoading,
    generationState: state.generationState,
    onGenerate: handleGenerate,
    onRegenerate: handleRegenerate,
  };

  // Determine if export button should be shown
  const showExportButton = state.minutes !== null && !state.isLoading;

  return (
    <section className={className} aria-label="Minutes section">
      {/* Header with title and export button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Minutes
        </h2>
        {showExportButton && state.minutes !== null && (
          <ExportButton
            minutesId={state.minutes.id}
            minutesTitle={state.minutes.title}
            attendees={state.minutes.attendees}
            onExportComplete={handleExportComplete}
            onExportError={handleExportError}
            variant="secondary"
            size="sm"
          />
        )}
      </div>

      {/* Minutes viewer */}
      <MinutesViewer {...viewerProps} />

      {/* Export success toast */}
      {state.exportState.status === 'success' &&
        state.exportState.documentUrl !== undefined &&
        state.exportState.documentTitle !== undefined && (
          <ExportSuccessToast
            documentUrl={state.exportState.documentUrl}
            documentTitle={state.exportState.documentTitle}
            onClose={handleExportToastClose}
          />
        )}

      {/* Export error toast */}
      {state.exportState.status === 'error' &&
        state.exportState.error !== undefined && (
          <ExportErrorToast
            message={state.exportState.error}
            onClose={handleExportToastClose}
          />
        )}
    </section>
  );
}
