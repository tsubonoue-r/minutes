/**
 * Batch Minutes Generation API endpoint
 * @module app/api/meetings/batch/generate/route
 *
 * POST endpoint that creates and starts a batch generation job.
 * Returns the job ID immediately so the client can poll or
 * subscribe via SSE for progress updates.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { CreateBatchJobSchema } from '@/types/batch';
import {
  getBatchGenerationService,
  BatchGenerationError,
} from '@/services/batch-generation.service';

// =============================================================================
// Types
// =============================================================================

/**
 * Success response for batch job creation
 */
interface CreateBatchJobSuccessResponse {
  readonly success: true;
  readonly data: {
    readonly jobId: string;
    readonly meetingCount: number;
    readonly status: string;
  };
}

/**
 * Error response
 */
interface CreateBatchJobErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create success response
 */
function createSuccessResponse(
  jobId: string,
  meetingCount: number,
  status: string
): NextResponse<CreateBatchJobSuccessResponse> {
  return NextResponse.json({
    success: true,
    data: {
      jobId,
      meetingCount,
      status,
    },
  });
}

/**
 * Create error response
 */
function createErrorResponse(
  code: string,
  message: string,
  statusCode: number,
  details?: unknown
): NextResponse<CreateBatchJobErrorResponse> {
  const response: CreateBatchJobErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };

  return NextResponse.json(response, { status: statusCode });
}

// =============================================================================
// Route Handler
// =============================================================================

/**
 * POST /api/meetings/batch/generate
 *
 * Create and start a batch minutes generation job.
 *
 * Request Body:
 * {
 *   "meetingIds": ["meeting-1", "meeting-2", ...]
 * }
 *
 * Response:
 * - 200: Job created with jobId for tracking
 * - 400: Invalid request body
 * - 401: Unauthorized
 * - 500: Internal error
 *
 * @example
 * ```typescript
 * // Request
 * POST /api/meetings/batch/generate
 * Content-Type: application/json
 * { "meetingIds": ["m1", "m2", "m3"] }
 *
 * // Success response
 * {
 *   "success": true,
 *   "data": {
 *     "jobId": "batch_abc123",
 *     "meetingCount": 3,
 *     "status": "pending"
 *   }
 * }
 * ```
 */
export async function POST(request: Request): Promise<Response> {
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

    // 2. Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Invalid JSON in request body',
        400
      );
    }

    const validation = CreateBatchJobSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(
        'INVALID_PARAMS',
        'Invalid request body',
        400,
        { validationErrors: validation.error.issues }
      );
    }

    // 3. Create the batch job
    const service = getBatchGenerationService();
    const job = service.createJob(validation.data);

    // 4. Start processing in the background (non-blocking)
    void service.processJob(job.id, (updatedJob) => {
      console.log(
        `[POST /api/meetings/batch/generate] Job ${updatedJob.id} progress:`,
        `${updatedJob.progress.completed + updatedJob.progress.failed}/${updatedJob.progress.total}`
      );
    });

    // 5. Return job ID immediately
    return createSuccessResponse(job.id, job.meetingIds.length, job.status);
  } catch (error) {
    console.error('[POST /api/meetings/batch/generate] Error:', error);

    if (error instanceof BatchGenerationError) {
      return createErrorResponse(
        error.code,
        error.message,
        400,
        error.details
      );
    }

    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
}
