/**
 * Batch Job Status API endpoint
 * @module app/api/meetings/batch/[jobId]/route
 *
 * GET endpoint that returns batch job status.
 * Supports both JSON polling and SSE streaming:
 * - JSON: Returns current job status snapshot
 * - SSE: Streams real-time progress updates (Accept: text/event-stream)
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { getBatchGenerationService } from '@/services/batch-generation.service';
import type { BatchJob } from '@/types/batch';
import { isBatchJobFinished } from '@/types/batch';

// =============================================================================
// Types
// =============================================================================

/**
 * Success response for job status
 */
interface JobStatusSuccessResponse {
  readonly success: true;
  readonly data: BatchJob;
}

/**
 * Error response
 */
interface JobStatusErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Route context with params
 */
interface RouteContext {
  readonly params: Promise<{
    readonly jobId: string;
  }>;
}

// =============================================================================
// Constants
// =============================================================================

/** SSE poll interval in milliseconds */
const SSE_POLL_INTERVAL_MS = 1000;

/** SSE heartbeat interval in milliseconds */
const SSE_HEARTBEAT_INTERVAL_MS = 15_000;

/** Maximum SSE connection time in milliseconds (5 minutes) */
const SSE_MAX_CONNECTION_MS = 300_000;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create error response
 */
function createErrorResponse(
  code: string,
  message: string,
  statusCode: number
): NextResponse<JobStatusErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status: statusCode }
  );
}

/**
 * Format SSE message
 */
function formatSSEMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// =============================================================================
// Route Handler
// =============================================================================

/**
 * GET /api/meetings/batch/[jobId]
 *
 * Get batch job status. Supports two modes:
 *
 * 1. JSON mode (default): Returns current job status as JSON
 * 2. SSE mode: Streams real-time progress updates
 *    (send Accept: text/event-stream header)
 *
 * Path Parameters:
 * - jobId: string - Batch job identifier
 *
 * Response (JSON mode):
 * - 200: Job status
 * - 401: Unauthorized
 * - 404: Job not found
 *
 * Response (SSE mode):
 * - 200: text/event-stream with progress events
 *
 * SSE Events:
 * - batch:progress - Job progress update
 * - batch:completed - Job finished
 * - heartbeat - Keep-alive signal
 *
 * @example
 * ```typescript
 * // JSON polling
 * const response = await fetch('/api/meetings/batch/batch_abc123');
 * const { data } = await response.json();
 * console.log(data.progress);
 *
 * // SSE streaming
 * const es = new EventSource('/api/meetings/batch/batch_abc123');
 * es.addEventListener('batch:progress', (e) => {
 *   const job = JSON.parse(e.data);
 *   console.log(job.progress);
 * });
 * ```
 */
export async function GET(
  request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    // 1. Authentication check
    const session = await getSession();

    if (session === null || !session.isAuthenticated) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'Authentication required',
        401
      );
    }

    // 2. Get job ID from path params
    const params = await context.params;
    const { jobId } = params;

    if (jobId === undefined || jobId.trim() === '') {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Job ID is required',
        400
      );
    }

    // 3. Get the job
    const service = getBatchGenerationService();
    const job = service.getJob(jobId);

    if (job === undefined) {
      return createErrorResponse(
        'JOB_NOT_FOUND',
        `Batch job not found: ${jobId}`,
        404
      );
    }

    // 4. Check if SSE is requested
    const acceptHeader = request.headers.get('accept') ?? '';
    const wantsSSE = acceptHeader.includes('text/event-stream');

    if (wantsSSE) {
      return createSSEResponse(jobId, service);
    }

    // 5. Return JSON response
    const response: JobStatusSuccessResponse = {
      success: true,
      data: job,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[GET /api/meetings/batch/[jobId]] Error:`, error);

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
}

// =============================================================================
// SSE Response
// =============================================================================

/**
 * Create an SSE response that streams job progress
 */
function createSSEResponse(
  jobId: string,
  service: ReturnType<typeof getBatchGenerationService>
): Response {
  const encoder = new TextEncoder();
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let maxConnectionTimer: ReturnType<typeof setTimeout> | null = null;
  let lastProgressHash = '';

  const stream = new ReadableStream<Uint8Array>({
    start(controller): void {
      // Send initial state
      const initialJob = service.getJob(jobId);
      if (initialJob !== undefined) {
        const message = formatSSEMessage('batch:progress', initialJob);
        controller.enqueue(encoder.encode(message));
        lastProgressHash = computeProgressHash(initialJob);
      }

      // Poll for updates
      pollTimer = setInterval(() => {
        const currentJob = service.getJob(jobId);

        if (currentJob === undefined) {
          const errorMessage = formatSSEMessage('batch:error', {
            code: 'JOB_NOT_FOUND',
            message: 'Job was deleted',
          });
          controller.enqueue(encoder.encode(errorMessage));
          cleanup(controller);
          return;
        }

        const currentHash = computeProgressHash(currentJob);

        // Only send if there is a change
        if (currentHash !== lastProgressHash) {
          lastProgressHash = currentHash;
          const message = formatSSEMessage('batch:progress', currentJob);
          controller.enqueue(encoder.encode(message));
        }

        // If job is finished, send completion event and close
        if (isBatchJobFinished(currentJob)) {
          const completedMessage = formatSSEMessage(
            'batch:completed',
            currentJob
          );
          controller.enqueue(encoder.encode(completedMessage));
          cleanup(controller);
        }
      }, SSE_POLL_INTERVAL_MS);

      // Heartbeat to keep the connection alive
      heartbeatTimer = setInterval(() => {
        try {
          const heartbeat = formatSSEMessage('heartbeat', {
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(encoder.encode(heartbeat));
        } catch {
          // Controller may be closed
          cleanup(null);
        }
      }, SSE_HEARTBEAT_INTERVAL_MS);

      // Maximum connection time
      maxConnectionTimer = setTimeout(() => {
        const timeoutMessage = formatSSEMessage('batch:timeout', {
          message: 'Connection timeout, please reconnect',
        });
        try {
          controller.enqueue(encoder.encode(timeoutMessage));
        } catch {
          // ignore
        }
        cleanup(controller);
      }, SSE_MAX_CONNECTION_MS);
    },

    cancel(): void {
      cleanup(null);
    },
  });

  /**
   * Cleanup timers and optionally close the controller
   */
  function cleanup(
    controller: ReadableStreamDefaultController<Uint8Array> | null
  ): void {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (maxConnectionTimer !== null) {
      clearTimeout(maxConnectionTimer);
      maxConnectionTimer = null;
    }
    if (controller !== null) {
      try {
        controller.close();
      } catch {
        // Already closed
      }
    }
  }

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * Compute a simple hash of the job progress state for change detection
 */
function computeProgressHash(job: BatchJob): string {
  return `${job.status}:${job.progress.completed}:${job.progress.failed}:${job.progress.current ?? ''}:${job.results.length}`;
}
