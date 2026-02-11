'use client';

/**
 * Batch Generation Hook
 * @module hooks/use-batch-generation
 *
 * React hook for managing batch minutes generation state.
 * Uses EventSource (SSE) for real-time progress updates
 * with automatic fallback to polling.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { BatchJob } from '@/types/batch';
import { calculateBatchProgress, getFailedMeetingIds } from '@/types/batch';

// =============================================================================
// Types
// =============================================================================

/**
 * Batch generation state
 */
export type BatchGenerationStatus = 'idle' | 'starting' | 'running' | 'completed' | 'failed';

/**
 * Return value of the useBatchGeneration hook
 */
export interface UseBatchGenerationResult {
  /** Start a new batch generation */
  readonly startBatch: (meetingIds: readonly string[]) => Promise<void>;
  /** Retry failed meetings from the last batch */
  readonly retryFailed: () => Promise<void>;
  /** Reset state to idle */
  readonly reset: () => void;
  /** Current batch job (null if no active job) */
  readonly job: BatchJob | null;
  /** Current batch status */
  readonly status: BatchGenerationStatus;
  /** Whether a batch is currently running */
  readonly isRunning: boolean;
  /** Progress percentage (0-100) */
  readonly progress: number;
  /** Error message if the batch failed to start */
  readonly error: string | null;
  /** Meeting IDs that failed in the last batch */
  readonly failedMeetingIds: readonly string[];
}

// =============================================================================
// Types for API Response
// =============================================================================

/**
 * API response for batch job creation
 */
interface CreateBatchJobApiResponse {
  readonly success: boolean;
  readonly data?: {
    readonly jobId: string;
    readonly meetingCount: number;
    readonly status: string;
  };
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing batch minutes generation
 *
 * Handles the full lifecycle: starting a batch, subscribing to
 * progress via SSE, and tracking results.
 *
 * @returns Batch generation state and control methods
 *
 * @example
 * ```tsx
 * function BatchPanel({ selectedIds }: { selectedIds: string[] }) {
 *   const {
 *     startBatch,
 *     job,
 *     status,
 *     isRunning,
 *     progress,
 *     retryFailed,
 *     failedMeetingIds,
 *   } = useBatchGeneration();
 *
 *   return (
 *     <div>
 *       <button onClick={() => startBatch(selectedIds)} disabled={isRunning}>
 *         Start Batch
 *       </button>
 *       {isRunning && <ProgressBar value={progress} />}
 *       {failedMeetingIds.length > 0 && (
 *         <button onClick={retryFailed}>Retry Failed</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useBatchGeneration(): UseBatchGenerationResult {
  const [job, setJob] = useState<BatchJob | null>(null);
  const [status, setStatus] = useState<BatchGenerationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Close the current EventSource connection
   */
  const closeEventSource = useCallback((): void => {
    if (eventSourceRef.current !== null) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  /**
   * Poll job status once as a fallback
   */
  const pollJobStatus = useCallback(async (jobId: string): Promise<void> => {
    try {
      const response = await fetch(
        `/api/meetings/batch/${encodeURIComponent(jobId)}`
      );

      if (response.ok) {
        const result = (await response.json()) as {
          success: boolean;
          data: BatchJob;
        };

        if (result.success) {
          setJob(result.data);

          if (
            result.data.status === 'completed' ||
            result.data.status === 'failed'
          ) {
            if (
              result.data.progress.failed > 0 &&
              result.data.progress.completed === 0
            ) {
              setStatus('failed');
            } else {
              setStatus('completed');
            }
          }
        }
      }
    } catch {
      // Polling failed, state is already set
    }
  }, []);

  /**
   * Subscribe to job progress via SSE
   */
  const subscribeToProgress = useCallback(
    (jobId: string): void => {
      closeEventSource();

      const url = `/api/meetings/batch/${encodeURIComponent(jobId)}`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('batch:progress', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as BatchJob;
          setJob(data);

          if (data.status === 'running') {
            setStatus('running');
          }
        } catch {
          // Invalid JSON, ignore
        }
      });

      eventSource.addEventListener('batch:completed', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as BatchJob;
          setJob(data);

          if (data.progress.failed > 0 && data.progress.completed === 0) {
            setStatus('failed');
          } else {
            setStatus('completed');
          }
        } catch {
          setStatus('completed');
        }

        closeEventSource();
      });

      eventSource.addEventListener('batch:error', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as {
            code: string;
            message: string;
          };
          setError(data.message);
          setStatus('failed');
        } catch {
          setError('Connection error');
          setStatus('failed');
        }
        closeEventSource();
      });

      eventSource.addEventListener('batch:timeout', () => {
        // On timeout, fall back to polling the final state
        closeEventSource();
        void pollJobStatus(jobId);
      });

      eventSource.onerror = (): void => {
        // On error, try polling as fallback
        closeEventSource();
        void pollJobStatus(jobId);
      };
    },
    [closeEventSource, pollJobStatus]
  );

  /**
   * Start a new batch generation
   */
  const startBatch = useCallback(
    async (meetingIds: readonly string[]): Promise<void> => {
      // Cancel any existing operations
      if (abortControllerRef.current !== null) {
        abortControllerRef.current.abort();
      }
      closeEventSource();

      // Reset state
      setJob(null);
      setError(null);
      setStatus('starting');

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await fetch('/api/meetings/batch/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingIds }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({
            error: { message: `HTTP ${response.status}` },
          }))) as CreateBatchJobApiResponse;

          const errorMessage =
            errorData.error?.message ?? `Request failed with status ${response.status}`;
          setError(errorMessage);
          setStatus('failed');
          return;
        }

        const result = (await response.json()) as CreateBatchJobApiResponse;

        if (!result.success || result.data === undefined) {
          setError(result.error?.message ?? 'Failed to create batch job');
          setStatus('failed');
          return;
        }

        // Subscribe to progress via SSE
        setStatus('running');
        subscribeToProgress(result.data.jobId);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setStatus('failed');
      }
    },
    [closeEventSource, subscribeToProgress]
  );

  /**
   * Retry failed meetings from the last batch
   */
  const retryFailed = useCallback(async (): Promise<void> => {
    if (job === null) {
      return;
    }

    const failedIds = getFailedMeetingIds(job);
    if (failedIds.length === 0) {
      return;
    }

    await startBatch(failedIds);
  }, [job, startBatch]);

  /**
   * Reset to idle state
   */
  const reset = useCallback((): void => {
    closeEventSource();
    if (abortControllerRef.current !== null) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setJob(null);
    setStatus('idle');
    setError(null);
  }, [closeEventSource]);

  // Cleanup on unmount
  useEffect(() => {
    return (): void => {
      closeEventSource();
      if (abortControllerRef.current !== null) {
        abortControllerRef.current.abort();
      }
    };
  }, [closeEventSource]);

  // Derived state
  const isRunning = status === 'starting' || status === 'running';
  const progress = job !== null ? calculateBatchProgress(job) : 0;
  const failedMeetingIds = job !== null ? getFailedMeetingIds(job) : [];

  return {
    startBatch,
    retryFailed,
    reset,
    job,
    status,
    isRunning,
    progress,
    error,
    failedMeetingIds,
  };
}
