/**
 * Batch processing type definitions
 * @module types/batch
 *
 * Types and Zod schemas for batch minutes generation.
 * Supports creating batch jobs, tracking progress, and
 * collecting per-meeting results.
 */

import { z, type ZodSafeParseResult } from 'zod';

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Schema for individual meeting result within a batch job
 */
export const BatchResultItemSchema = z.object({
  /** Meeting identifier */
  meetingId: z.string(),
  /** Processing result status */
  status: z.enum(['success', 'failed', 'skipped']),
  /** Error message (only present when status is 'failed') */
  error: z.string().optional(),
});

/**
 * Schema for batch job progress tracking
 */
export const BatchProgressSchema = z.object({
  /** Total number of meetings in the batch */
  total: z.number().int().nonnegative(),
  /** Number of successfully completed meetings */
  completed: z.number().int().nonnegative(),
  /** Number of failed meetings */
  failed: z.number().int().nonnegative(),
  /** Meeting ID currently being processed */
  current: z.string().optional(),
});

/**
 * Schema for a batch generation job
 */
export const BatchJobSchema = z.object({
  /** Unique job identifier */
  id: z.string().min(1),
  /** Array of meeting IDs to process */
  meetingIds: z.array(z.string().min(1)),
  /** Current job status */
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  /** Progress tracking information */
  progress: BatchProgressSchema,
  /** Per-meeting processing results */
  results: z.array(BatchResultItemSchema),
  /** Job creation timestamp (ISO 8601) */
  createdAt: z.string().datetime({ offset: true }),
  /** Job completion timestamp (ISO 8601), present when finished */
  completedAt: z.string().datetime({ offset: true }).optional(),
});

/**
 * Schema for creating a new batch job
 */
export const CreateBatchJobSchema = z.object({
  /** Array of meeting IDs to process (1-50 items) */
  meetingIds: z.array(z.string().min(1)).min(1).max(50),
});

// =============================================================================
// Types
// =============================================================================

/** Individual meeting result within a batch job */
export type BatchResultItem = z.infer<typeof BatchResultItemSchema>;

/** Batch job progress tracking */
export type BatchProgress = z.infer<typeof BatchProgressSchema>;

/** Batch generation job */
export type BatchJob = z.infer<typeof BatchJobSchema>;

/** Input for creating a new batch job */
export type CreateBatchJobInput = z.infer<typeof CreateBatchJobSchema>;

/** Batch job status values */
export type BatchJobStatus = BatchJob['status'];

/** Batch result item status values */
export type BatchResultStatus = BatchResultItem['status'];

// =============================================================================
// Readonly Types
// =============================================================================

/** Readonly batch result item */
export type ReadonlyBatchResultItem = Readonly<BatchResultItem>;

/** Readonly batch progress */
export type ReadonlyBatchProgress = Readonly<BatchProgress>;

/** Readonly batch job */
export type ReadonlyBatchJob = Readonly<
  Omit<BatchJob, 'progress' | 'results'> & {
    readonly progress: ReadonlyBatchProgress;
    readonly results: readonly ReadonlyBatchResultItem[];
  }
>;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique batch job ID
 *
 * @returns A unique job identifier string
 */
export function generateBatchJobId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `batch_${timestamp}_${random}`;
}

/**
 * Create a new batch job with default values
 *
 * @param input - Validated input for creating the job
 * @returns A new BatchJob in pending state
 */
export function createBatchJob(input: CreateBatchJobInput): BatchJob {
  return {
    id: generateBatchJobId(),
    meetingIds: input.meetingIds,
    status: 'pending',
    progress: {
      total: input.meetingIds.length,
      completed: 0,
      failed: 0,
    },
    results: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Check if a batch job has finished (completed or failed)
 *
 * @param job - The batch job to check
 * @returns true if the job is in a terminal state
 */
export function isBatchJobFinished(job: BatchJob): boolean {
  return job.status === 'completed' || job.status === 'failed';
}

/**
 * Calculate the completion percentage of a batch job
 *
 * @param job - The batch job
 * @returns Percentage (0-100) of completion
 */
export function calculateBatchProgress(job: BatchJob): number {
  if (job.progress.total === 0) {
    return 0;
  }
  const processed = job.progress.completed + job.progress.failed;
  return Math.round((processed / job.progress.total) * 100);
}

/**
 * Get meeting IDs that failed in a batch job
 *
 * @param job - The batch job
 * @returns Array of meeting IDs that failed
 */
export function getFailedMeetingIds(job: BatchJob): readonly string[] {
  return job.results
    .filter((result) => result.status === 'failed')
    .map((result) => result.meetingId);
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate a batch job object
 *
 * @param data - Unknown data to validate
 * @returns Parsed BatchJob or validation error
 */
export function validateBatchJob(
  data: unknown
): ZodSafeParseResult<BatchJob> {
  return BatchJobSchema.safeParse(data);
}

/**
 * Validate create batch job input
 *
 * @param data - Unknown data to validate
 * @returns Parsed CreateBatchJobInput or validation error
 */
export function validateCreateBatchJobInput(
  data: unknown
): ZodSafeParseResult<CreateBatchJobInput> {
  return CreateBatchJobSchema.safeParse(data);
}
