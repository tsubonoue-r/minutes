/**
 * Transcript Section Component
 * Fetches and displays meeting transcript with loading/error states
 * @module app/(dashboard)/meetings/[id]/_components/transcript-section
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { TranscriptViewer } from '@/components/transcript';
import type { Transcript, TranscriptSegment } from '@/types/transcript';

/**
 * API response type for transcript
 */
interface TranscriptApiResponse {
  readonly data: Transcript;
}

/**
 * API error response type
 */
interface ApiErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Props for TranscriptSection component
 */
export interface TranscriptSectionProps {
  /** Meeting ID to fetch transcript for */
  readonly meetingId: string;
  /** Meeting title for display */
  readonly meetingTitle?: string | undefined;
  /** Callback when a segment is clicked */
  readonly onSegmentClick?: (segment: TranscriptSegment) => void;
  /** Additional CSS classes */
  readonly className?: string | undefined;
}

/**
 * Component state interface
 */
interface ComponentState {
  readonly transcript: Transcript | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

/**
 * Initial component state
 */
const initialState: ComponentState = {
  transcript: null,
  isLoading: true,
  error: null,
};

/**
 * Error display component
 */
function TranscriptError({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}): JSX.Element {
  return (
    <div className="bg-white rounded-lg border border-lark-border p-8">
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
          Failed to load transcript
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

/**
 * TranscriptSection Component
 *
 * @description Fetches and displays meeting transcript with proper loading,
 *              error, and empty states. Uses TranscriptViewer for display.
 *
 * @example
 * ```tsx
 * <TranscriptSection
 *   meetingId="meeting-123"
 *   meetingTitle="Weekly Standup"
 *   onSegmentClick={handleSegmentClick}
 * />
 * ```
 */
export function TranscriptSection({
  meetingId,
  meetingTitle,
  onSegmentClick,
  className = '',
}: TranscriptSectionProps): JSX.Element {
  const [state, setState] = useState<ComponentState>(initialState);

  /**
   * Fetch transcript data from API
   */
  const fetchTranscript = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/meetings/${meetingId}/transcript`);

      if (response.status === 404) {
        // Transcript not found is not an error - meeting may not have transcript
        setState({
          transcript: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      if (!response.ok) {
        const errorData = (await response.json()) as ApiErrorResponse;
        throw new Error(errorData.error.message ?? 'Failed to fetch transcript');
      }

      const data = (await response.json()) as TranscriptApiResponse;
      setState({
        transcript: data.data,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      setState({
        transcript: null,
        isLoading: false,
        error: message,
      });
    }
  }, [meetingId]);

  /**
   * Handle retry action
   */
  const handleRetry = useCallback((): void => {
    void fetchTranscript();
  }, [fetchTranscript]);

  // Fetch transcript on mount and when meetingId changes
  useEffect(() => {
    void fetchTranscript();
  }, [fetchTranscript]);

  // Show error state
  if (state.error !== null) {
    return (
      <section className={className} aria-label="Transcript section">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Transcript
        </h2>
        <TranscriptError message={state.error} onRetry={handleRetry} />
      </section>
    );
  }

  // Build props conditionally for exactOptionalPropertyTypes compliance
  const viewerProps = {
    transcript: state.transcript ?? undefined,
    isLoading: state.isLoading,
    meetingTitle,
    virtualScrollThreshold: 50,
    ...(onSegmentClick !== undefined && { onSegmentClick }),
  };

  return (
    <section className={className} aria-label="Transcript section">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Transcript
      </h2>
      <TranscriptViewer {...viewerProps} />
    </section>
  );
}
