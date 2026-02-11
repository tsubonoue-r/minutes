/**
 * Batch Generation Service Tests
 * @module services/__tests__/batch-generation.service.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BatchGenerationService,
  BatchGenerationError,
  resetBatchGenerationService,
  getBatchGenerationService,
  type SingleMeetingGenerator,
} from '../batch-generation.service';
import type { BatchJob } from '@/types/batch';

describe('BatchGenerationService', () => {
  let service: BatchGenerationService;

  beforeEach(() => {
    resetBatchGenerationService();
    service = new BatchGenerationService();
  });

  describe('createJob', () => {
    it('should create a job in pending state', () => {
      const job = service.createJob({ meetingIds: ['m1', 'm2', 'm3'] });

      expect(job.id).toMatch(/^batch_/);
      expect(job.meetingIds).toEqual(['m1', 'm2', 'm3']);
      expect(job.status).toBe('pending');
      expect(job.progress.total).toBe(3);
      expect(job.progress.completed).toBe(0);
      expect(job.progress.failed).toBe(0);
      expect(job.results).toEqual([]);
    });

    it('should throw for empty meeting IDs', () => {
      expect(() => service.createJob({ meetingIds: [] })).toThrow(
        BatchGenerationError
      );
    });

    it('should throw for more than 50 meeting IDs', () => {
      const meetingIds = Array.from({ length: 51 }, (_, i) => `m${i}`);
      expect(() => service.createJob({ meetingIds })).toThrow(
        BatchGenerationError
      );
    });
  });

  describe('getJob', () => {
    it('should return the job by ID', () => {
      const created = service.createJob({ meetingIds: ['m1'] });
      const retrieved = service.getJob(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return undefined for non-existent job', () => {
      const result = service.getJob('non-existent');
      expect(result).toBeUndefined();
    });

    it('should return a copy (not reference)', () => {
      const created = service.createJob({ meetingIds: ['m1'] });
      const retrieved = service.getJob(created.id);

      expect(retrieved).not.toBe(created);
    });
  });

  describe('listJobs', () => {
    it('should return all jobs', () => {
      service.createJob({ meetingIds: ['m1'] });
      service.createJob({ meetingIds: ['m2'] });

      const jobs = service.listJobs();
      expect(jobs.length).toBe(2);
    });

    it('should return empty array when no jobs exist', () => {
      const jobs = service.listJobs();
      expect(jobs).toEqual([]);
    });
  });

  describe('processJob', () => {
    it('should process all meetings successfully', async () => {
      const job = service.createJob({ meetingIds: ['m1', 'm2', 'm3'] });
      const progressUpdates: BatchJob[] = [];

      const mockGenerator: SingleMeetingGenerator = async () => ({
        success: true,
      });

      const result = await service.processJob(
        job.id,
        (updated) => progressUpdates.push({ ...updated }),
        mockGenerator
      );

      expect(result.status).toBe('completed');
      expect(result.progress.completed).toBe(3);
      expect(result.progress.failed).toBe(0);
      expect(result.results.length).toBe(3);
      expect(result.results.every((r) => r.status === 'success')).toBe(true);
      expect(result.completedAt).toBeDefined();

      // Should have progress updates: running + 3x (current + result) + final
      expect(progressUpdates.length).toBeGreaterThan(3);
    });

    it('should handle partial failures', async () => {
      const job = service.createJob({ meetingIds: ['m1', 'm2', 'm3'] });
      const progressUpdates: BatchJob[] = [];

      const mockGenerator: SingleMeetingGenerator = async (meetingId) => {
        if (meetingId === 'm2') {
          return { success: false, error: 'Transcript not found' };
        }
        return { success: true };
      };

      const result = await service.processJob(
        job.id,
        (updated) => progressUpdates.push({ ...updated }),
        mockGenerator
      );

      // Partial failure still counts as "completed" since some succeeded
      expect(result.status).toBe('completed');
      expect(result.progress.completed).toBe(2);
      expect(result.progress.failed).toBe(1);
      expect(result.results.length).toBe(3);

      const failedResult = result.results.find((r) => r.meetingId === 'm2');
      expect(failedResult?.status).toBe('failed');
      expect(failedResult?.error).toBe('Transcript not found');
    });

    it('should mark as failed when all meetings fail', async () => {
      const job = service.createJob({ meetingIds: ['m1', 'm2'] });

      const mockGenerator: SingleMeetingGenerator = async () => ({
        success: false,
        error: 'Service unavailable',
      });

      const result = await service.processJob(
        job.id,
        () => {},
        mockGenerator
      );

      expect(result.status).toBe('failed');
      expect(result.progress.completed).toBe(0);
      expect(result.progress.failed).toBe(2);
    });

    it('should handle generator exceptions', async () => {
      const job = service.createJob({ meetingIds: ['m1'] });

      const mockGenerator: SingleMeetingGenerator = async () => {
        throw new Error('Network timeout');
      };

      const result = await service.processJob(
        job.id,
        () => {},
        mockGenerator
      );

      expect(result.status).toBe('failed');
      expect(result.progress.failed).toBe(1);
      expect(result.results[0]?.status).toBe('failed');
      expect(result.results[0]?.error).toBe('Network timeout');
    });

    it('should throw for non-existent job', async () => {
      await expect(
        service.processJob('non-existent', () => {})
      ).rejects.toThrow(BatchGenerationError);
    });

    it('should throw for already running job', async () => {
      const job = service.createJob({ meetingIds: ['m1'] });

      // Start processing without awaiting
      const slowGenerator: SingleMeetingGenerator = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return { success: true };
      };

      // Start the first process
      const promise = service.processJob(
        job.id,
        () => {},
        slowGenerator
      );

      // The job is now running, so another call should throw
      await expect(
        service.processJob(job.id, () => {})
      ).rejects.toThrow('already running');

      // Cleanup: we can't easily cancel, but the test completes
      // since the mock generator will be garbage collected
      vi.useFakeTimers();
      vi.advanceTimersByTime(10000);
      vi.useRealTimers();

      // Suppress unhandled promise
      promise.catch(() => {});
    });

    it('should throw for already completed job', async () => {
      const job = service.createJob({ meetingIds: ['m1'] });

      const mockGenerator: SingleMeetingGenerator = async () => ({
        success: true,
      });

      await service.processJob(job.id, () => {}, mockGenerator);

      await expect(
        service.processJob(job.id, () => {}, mockGenerator)
      ).rejects.toThrow('already finished');
    });

    it('should report current meeting in progress updates', async () => {
      const job = service.createJob({ meetingIds: ['m1', 'm2'] });
      const currentMeetings: (string | undefined)[] = [];

      const mockGenerator: SingleMeetingGenerator = async () => ({
        success: true,
      });

      await service.processJob(
        job.id,
        (updated) => {
          if (updated.progress.current !== undefined) {
            currentMeetings.push(updated.progress.current);
          }
        },
        mockGenerator
      );

      expect(currentMeetings).toContain('m1');
      expect(currentMeetings).toContain('m2');
    });
  });

  describe('deleteJob', () => {
    it('should delete an existing job', () => {
      const job = service.createJob({ meetingIds: ['m1'] });
      const deleted = service.deleteJob(job.id);

      expect(deleted).toBe(true);
      expect(service.getJob(job.id)).toBeUndefined();
    });

    it('should return false for non-existent job', () => {
      const deleted = service.deleteJob('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('clearJobs', () => {
    it('should remove all jobs', () => {
      service.createJob({ meetingIds: ['m1'] });
      service.createJob({ meetingIds: ['m2'] });

      service.clearJobs();

      expect(service.listJobs()).toEqual([]);
    });
  });
});

describe('Singleton', () => {
  beforeEach(() => {
    resetBatchGenerationService();
  });

  it('should return the same instance', () => {
    const instance1 = getBatchGenerationService();
    const instance2 = getBatchGenerationService();
    expect(instance1).toBe(instance2);
  });

  it('should create a new instance after reset', () => {
    const instance1 = getBatchGenerationService();
    resetBatchGenerationService();
    const instance2 = getBatchGenerationService();
    expect(instance1).not.toBe(instance2);
  });
});
