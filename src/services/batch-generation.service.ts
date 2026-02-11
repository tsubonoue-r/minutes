/**
 * Batch Minutes Generation Service
 * @module services/batch-generation.service
 *
 * Manages batch jobs for generating minutes across multiple meetings.
 * Processes meetings sequentially, tracking progress and reporting
 * results per meeting. Uses an in-memory store for job state.
 */

import type {
  BatchJob,
  BatchResultItem,
  CreateBatchJobInput,
} from '@/types/batch';
import {
  createBatchJob,
  CreateBatchJobSchema,
} from '@/types/batch';

// =============================================================================
// Constants
// =============================================================================

/** Log prefix for batch generation operations */
const LOG_PREFIX = '[BatchGenerationService]';

/** Maximum concurrent processing (sequential for now) */
const PROCESS_DELAY_MS = 500;

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown by the batch generation service
 */
export class BatchGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'BatchGenerationError';
  }
}

// =============================================================================
// Types
// =============================================================================

/**
 * Progress callback invoked after each meeting is processed
 */
export type BatchProgressCallback = (job: BatchJob) => void;

/**
 * Function that generates minutes for a single meeting.
 * Provided externally so the service remains testable.
 */
export type SingleMeetingGenerator = (
  meetingId: string
) => Promise<{ readonly success: boolean; readonly error?: string }>;

// =============================================================================
// Service Implementation
// =============================================================================

/**
 * Batch Generation Service
 *
 * Manages the lifecycle of batch minutes generation jobs.
 * Jobs are stored in memory and processed sequentially.
 *
 * @example
 * ```typescript
 * const service = new BatchGenerationService();
 * const job = service.createJob({ meetingIds: ['m1', 'm2', 'm3'] });
 *
 * await service.processJob(job.id, (updated) => {
 *   console.log(`Progress: ${updated.progress.completed}/${updated.progress.total}`);
 * });
 * ```
 */
export class BatchGenerationService {
  /** In-memory job store */
  private readonly jobs: Map<string, BatchJob> = new Map();

  /**
   * Create a new batch job
   *
   * @param input - Meeting IDs to process
   * @returns The created batch job in pending state
   * @throws BatchGenerationError if input validation fails
   */
  createJob(input: CreateBatchJobInput): BatchJob {
    const validation = CreateBatchJobSchema.safeParse(input);

    if (!validation.success) {
      throw new BatchGenerationError(
        'Invalid batch job input',
        'INVALID_INPUT',
        validation.error.issues
      );
    }

    const job = createBatchJob(validation.data);
    this.jobs.set(job.id, job);

    console.log(`${LOG_PREFIX} Job created: ${job.id}`, {
      meetingCount: job.meetingIds.length,
    });

    return { ...job };
  }

  /**
   * Get a batch job by ID
   *
   * @param jobId - The job identifier
   * @returns The batch job, or undefined if not found
   */
  getJob(jobId: string): BatchJob | undefined {
    const job = this.jobs.get(jobId);
    if (job === undefined) {
      return undefined;
    }
    return { ...job };
  }

  /**
   * List all batch jobs
   *
   * @returns Array of all batch jobs
   */
  listJobs(): readonly BatchJob[] {
    return Array.from(this.jobs.values()).map((job) => ({ ...job }));
  }

  /**
   * Process a batch job, generating minutes for each meeting
   *
   * Processes meetings sequentially. For each meeting, calls the
   * provided generator function (or the built-in HTTP-based generator).
   * Reports progress via the onProgress callback after each meeting.
   *
   * @param jobId - The job to process
   * @param onProgress - Callback invoked after each meeting is processed
   * @param generator - Optional custom generator function for testing
   * @returns The completed batch job
   * @throws BatchGenerationError if the job is not found or already running
   */
  async processJob(
    jobId: string,
    onProgress: BatchProgressCallback,
    generator?: SingleMeetingGenerator
  ): Promise<BatchJob> {
    const job = this.jobs.get(jobId);

    if (job === undefined) {
      throw new BatchGenerationError(
        `Job not found: ${jobId}`,
        'JOB_NOT_FOUND'
      );
    }

    if (job.status === 'running') {
      throw new BatchGenerationError(
        `Job is already running: ${jobId}`,
        'JOB_ALREADY_RUNNING'
      );
    }

    if (job.status === 'completed' || job.status === 'failed') {
      throw new BatchGenerationError(
        `Job has already finished: ${jobId}`,
        'JOB_ALREADY_FINISHED'
      );
    }

    // Mark as running
    job.status = 'running';
    job.results = [];
    job.progress = {
      total: job.meetingIds.length,
      completed: 0,
      failed: 0,
    };
    this.jobs.set(jobId, job);
    onProgress({ ...job });

    console.log(`${LOG_PREFIX} Job started: ${jobId}`);

    const generateForMeeting = generator ?? this.defaultGenerator;

    // Process each meeting sequentially
    for (const meetingId of job.meetingIds) {
      // Update current meeting
      job.progress = {
        ...job.progress,
        current: meetingId,
      };
      this.jobs.set(jobId, job);
      onProgress({ ...job });

      let result: BatchResultItem;

      try {
        const generationResult = await generateForMeeting(meetingId);

        if (generationResult.success) {
          result = { meetingId, status: 'success' };
          job.progress = {
            ...job.progress,
            completed: job.progress.completed + 1,
          };
        } else {
          result = {
            meetingId,
            status: 'failed',
            error: generationResult.error ?? 'Generation failed',
          };
          job.progress = {
            ...job.progress,
            failed: job.progress.failed + 1,
          };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        result = {
          meetingId,
          status: 'failed',
          error: errorMessage,
        };
        job.progress = {
          ...job.progress,
          failed: job.progress.failed + 1,
        };
      }

      job.results = [...job.results, result];
      this.jobs.set(jobId, job);
      onProgress({ ...job });

      // Small delay between meetings to avoid overwhelming the API
      await this.delay(PROCESS_DELAY_MS);
    }

    // Mark as completed
    job.progress = {
      ...job.progress,
      current: undefined,
    };
    job.status = job.progress.failed > 0 && job.progress.completed === 0
      ? 'failed'
      : 'completed';
    job.completedAt = new Date().toISOString();
    this.jobs.set(jobId, job);
    onProgress({ ...job });

    console.log(`${LOG_PREFIX} Job finished: ${jobId}`, {
      status: job.status,
      completed: job.progress.completed,
      failed: job.progress.failed,
    });

    return { ...job };
  }

  /**
   * Delete a batch job from the store
   *
   * @param jobId - The job to delete
   * @returns true if the job was found and deleted
   */
  deleteJob(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  /**
   * Clear all jobs from the store
   */
  clearJobs(): void {
    this.jobs.clear();
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Default generator that calls the single-meeting generation API
   */
  private readonly defaultGenerator: SingleMeetingGenerator = async (
    meetingId: string
  ) => {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/api/meetings/${encodeURIComponent(meetingId)}/minutes/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ language: 'ja' }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
        const errorObj = errorData['error'] as Record<string, unknown> | undefined;
        const message = typeof errorObj?.['message'] === 'string'
          ? errorObj['message']
          : `HTTP ${response.status}`;
        return { success: false, error: message };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error';
      return { success: false, error: message };
    }
  };

  /**
   * Get the base URL for internal API calls
   */
  private getBaseUrl(): string {
    if (typeof process !== 'undefined' && process.env['NEXT_PUBLIC_BASE_URL'] !== undefined) {
      return process.env['NEXT_PUBLIC_BASE_URL'];
    }
    return 'http://localhost:3000';
  }

  /**
   * Promise-based delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

/** Singleton instance of the batch generation service */
let instance: BatchGenerationService | null = null;

/**
 * Get the singleton batch generation service instance
 *
 * @returns The shared BatchGenerationService instance
 */
export function getBatchGenerationService(): BatchGenerationService {
  if (instance === null) {
    instance = new BatchGenerationService();
  }
  return instance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetBatchGenerationService(): void {
  if (instance !== null) {
    instance.clearJobs();
    instance = null;
  }
}
