/**
 * Batch types unit tests
 * @module types/__tests__/batch.test
 */

import { describe, it, expect } from 'vitest';
import {
  BatchJobSchema,
  CreateBatchJobSchema,
  BatchProgressSchema,
  BatchResultItemSchema,
  createBatchJob,
  generateBatchJobId,
  isBatchJobFinished,
  calculateBatchProgress,
  getFailedMeetingIds,
  validateBatchJob,
  validateCreateBatchJobInput,
  type BatchJob,
  type CreateBatchJobInput,
} from '../batch';

describe('Batch Type Schemas', () => {
  describe('BatchResultItemSchema', () => {
    it('should validate a success result', () => {
      const result = BatchResultItemSchema.safeParse({
        meetingId: 'meeting-1',
        status: 'success',
      });
      expect(result.success).toBe(true);
    });

    it('should validate a failed result with error', () => {
      const result = BatchResultItemSchema.safeParse({
        meetingId: 'meeting-2',
        status: 'failed',
        error: 'Transcript not found',
      });
      expect(result.success).toBe(true);
    });

    it('should validate a skipped result', () => {
      const result = BatchResultItemSchema.safeParse({
        meetingId: 'meeting-3',
        status: 'skipped',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = BatchResultItemSchema.safeParse({
        meetingId: 'meeting-1',
        status: 'unknown',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('BatchProgressSchema', () => {
    it('should validate valid progress', () => {
      const result = BatchProgressSchema.safeParse({
        total: 10,
        completed: 5,
        failed: 1,
        current: 'meeting-6',
      });
      expect(result.success).toBe(true);
    });

    it('should validate progress without current', () => {
      const result = BatchProgressSchema.safeParse({
        total: 3,
        completed: 3,
        failed: 0,
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative numbers', () => {
      const result = BatchProgressSchema.safeParse({
        total: -1,
        completed: 0,
        failed: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('BatchJobSchema', () => {
    it('should validate a complete batch job', () => {
      const validJob = {
        id: 'batch_abc123',
        meetingIds: ['m1', 'm2', 'm3'],
        status: 'running',
        progress: {
          total: 3,
          completed: 1,
          failed: 0,
          current: 'm2',
        },
        results: [
          { meetingId: 'm1', status: 'success' },
        ],
        createdAt: '2024-01-15T10:00:00.000Z',
      };

      const result = BatchJobSchema.safeParse(validJob);
      expect(result.success).toBe(true);
    });

    it('should validate a completed job with completedAt', () => {
      const completedJob = {
        id: 'batch_xyz789',
        meetingIds: ['m1'],
        status: 'completed',
        progress: {
          total: 1,
          completed: 1,
          failed: 0,
        },
        results: [
          { meetingId: 'm1', status: 'success' },
        ],
        createdAt: '2024-01-15T10:00:00.000Z',
        completedAt: '2024-01-15T10:05:00.000Z',
      };

      const result = BatchJobSchema.safeParse(completedJob);
      expect(result.success).toBe(true);
    });

    it('should reject empty id', () => {
      const invalidJob = {
        id: '',
        meetingIds: ['m1'],
        status: 'pending',
        progress: { total: 1, completed: 0, failed: 0 },
        results: [],
        createdAt: '2024-01-15T10:00:00.000Z',
      };

      const result = BatchJobSchema.safeParse(invalidJob);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const invalidJob = {
        id: 'batch_1',
        meetingIds: ['m1'],
        status: 'paused',
        progress: { total: 1, completed: 0, failed: 0 },
        results: [],
        createdAt: '2024-01-15T10:00:00.000Z',
      };

      const result = BatchJobSchema.safeParse(invalidJob);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateBatchJobSchema', () => {
    it('should validate valid input', () => {
      const result = CreateBatchJobSchema.safeParse({
        meetingIds: ['m1', 'm2', 'm3'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty meetingIds array', () => {
      const result = CreateBatchJobSchema.safeParse({
        meetingIds: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject more than 50 meeting IDs', () => {
      const meetingIds = Array.from({ length: 51 }, (_, i) => `m${i}`);
      const result = CreateBatchJobSchema.safeParse({ meetingIds });
      expect(result.success).toBe(false);
    });

    it('should accept exactly 50 meeting IDs', () => {
      const meetingIds = Array.from({ length: 50 }, (_, i) => `m${i}`);
      const result = CreateBatchJobSchema.safeParse({ meetingIds });
      expect(result.success).toBe(true);
    });

    it('should reject empty string meeting IDs', () => {
      const result = CreateBatchJobSchema.safeParse({
        meetingIds: ['m1', ''],
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Utility Functions', () => {
  describe('generateBatchJobId', () => {
    it('should generate a unique ID starting with batch_', () => {
      const id = generateBatchJobId();
      expect(id).toMatch(/^batch_/);
    });

    it('should generate different IDs on each call', () => {
      const id1 = generateBatchJobId();
      const id2 = generateBatchJobId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('createBatchJob', () => {
    it('should create a pending job with correct defaults', () => {
      const input: CreateBatchJobInput = {
        meetingIds: ['m1', 'm2', 'm3'],
      };

      const job = createBatchJob(input);

      expect(job.id).toMatch(/^batch_/);
      expect(job.meetingIds).toEqual(['m1', 'm2', 'm3']);
      expect(job.status).toBe('pending');
      expect(job.progress.total).toBe(3);
      expect(job.progress.completed).toBe(0);
      expect(job.progress.failed).toBe(0);
      expect(job.results).toEqual([]);
      expect(job.createdAt).toBeDefined();
      expect(job.completedAt).toBeUndefined();
    });
  });

  describe('isBatchJobFinished', () => {
    it('should return true for completed job', () => {
      const job: BatchJob = createBatchJob({ meetingIds: ['m1'] });
      job.status = 'completed';
      expect(isBatchJobFinished(job)).toBe(true);
    });

    it('should return true for failed job', () => {
      const job: BatchJob = createBatchJob({ meetingIds: ['m1'] });
      job.status = 'failed';
      expect(isBatchJobFinished(job)).toBe(true);
    });

    it('should return false for pending job', () => {
      const job: BatchJob = createBatchJob({ meetingIds: ['m1'] });
      expect(isBatchJobFinished(job)).toBe(false);
    });

    it('should return false for running job', () => {
      const job: BatchJob = createBatchJob({ meetingIds: ['m1'] });
      job.status = 'running';
      expect(isBatchJobFinished(job)).toBe(false);
    });
  });

  describe('calculateBatchProgress', () => {
    it('should return 0 for empty job', () => {
      const job: BatchJob = createBatchJob({ meetingIds: ['m1'] });
      job.progress = { total: 0, completed: 0, failed: 0 };
      expect(calculateBatchProgress(job)).toBe(0);
    });

    it('should return correct percentage', () => {
      const job: BatchJob = createBatchJob({ meetingIds: ['m1', 'm2', 'm3', 'm4'] });
      job.progress = { total: 4, completed: 2, failed: 1 };
      expect(calculateBatchProgress(job)).toBe(75);
    });

    it('should return 100 for fully completed job', () => {
      const job: BatchJob = createBatchJob({ meetingIds: ['m1', 'm2'] });
      job.progress = { total: 2, completed: 2, failed: 0 };
      expect(calculateBatchProgress(job)).toBe(100);
    });

    it('should count failures in progress', () => {
      const job: BatchJob = createBatchJob({ meetingIds: ['m1', 'm2'] });
      job.progress = { total: 2, completed: 0, failed: 2 };
      expect(calculateBatchProgress(job)).toBe(100);
    });
  });

  describe('getFailedMeetingIds', () => {
    it('should return empty array when no failures', () => {
      const job: BatchJob = createBatchJob({ meetingIds: ['m1'] });
      job.results = [{ meetingId: 'm1', status: 'success' }];
      expect(getFailedMeetingIds(job)).toEqual([]);
    });

    it('should return failed meeting IDs', () => {
      const job: BatchJob = createBatchJob({ meetingIds: ['m1', 'm2', 'm3'] });
      job.results = [
        { meetingId: 'm1', status: 'success' },
        { meetingId: 'm2', status: 'failed', error: 'Error' },
        { meetingId: 'm3', status: 'failed', error: 'Timeout' },
      ];
      expect(getFailedMeetingIds(job)).toEqual(['m2', 'm3']);
    });

    it('should ignore skipped meetings', () => {
      const job: BatchJob = createBatchJob({ meetingIds: ['m1', 'm2'] });
      job.results = [
        { meetingId: 'm1', status: 'skipped' },
        { meetingId: 'm2', status: 'failed', error: 'Error' },
      ];
      expect(getFailedMeetingIds(job)).toEqual(['m2']);
    });
  });
});

describe('Validation Functions', () => {
  describe('validateBatchJob', () => {
    it('should validate a correct batch job', () => {
      const job = {
        id: 'batch_1',
        meetingIds: ['m1'],
        status: 'pending',
        progress: { total: 1, completed: 0, failed: 0 },
        results: [],
        createdAt: '2024-01-15T10:00:00.000Z',
      };

      const result = validateBatchJob(job);
      expect(result.success).toBe(true);
    });

    it('should reject invalid data', () => {
      const result = validateBatchJob({ invalid: true });
      expect(result.success).toBe(false);
    });
  });

  describe('validateCreateBatchJobInput', () => {
    it('should validate correct input', () => {
      const result = validateCreateBatchJobInput({
        meetingIds: ['m1', 'm2'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing meetingIds', () => {
      const result = validateCreateBatchJobInput({});
      expect(result.success).toBe(false);
    });
  });
});
