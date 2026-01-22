/**
 * DocsExportService unit tests
 * @module services/__tests__/docs-export.service.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DocsExportService,
  DocsExportError,
  createDocsExportService,
  type DocsExportInput,
  type ProgressCallback,
} from '../docs-export.service';
import type { DocsClient } from '@/lib/lark/docs';
import { DocsApiError, DocsImportTimeoutError, DocsImportError } from '@/lib/lark/docs';
import type { Minutes, Speaker } from '@/types/minutes';
import type { ExportAttendee } from '@/types/export';
import type { ExportStatus } from '@/types/export';

// =============================================================================
// Mock Data
// =============================================================================

/**
 * Create a mock Minutes object for testing
 */
function createMockMinutes(overrides: Partial<Minutes> = {}): Minutes {
  return {
    id: 'min_test_123',
    meetingId: 'meeting_456',
    title: 'Weekly Standup',
    date: '2024-01-15',
    duration: 3600000, // 1 hour
    summary: 'Discussed project updates and blockers.',
    topics: [
      {
        id: 'topic_1',
        title: 'Project Updates',
        startTime: 0,
        endTime: 1800000,
        summary: 'Team members shared their progress.',
        keyPoints: ['Feature A completed', 'Feature B in progress'],
        speakers: [{ id: 'speaker_1', name: 'Alice' }],
      },
    ],
    decisions: [
      {
        id: 'decision_1',
        content: 'Move to next sprint',
        context: 'All tasks completed',
        decidedAt: 1800000,
      },
    ],
    actionItems: [
      {
        id: 'action_1',
        content: 'Complete documentation',
        assignee: { id: 'speaker_1', name: 'Alice' },
        dueDate: '2024-01-22',
        priority: 'high',
        status: 'pending',
      },
    ],
    attendees: [
      { id: 'speaker_1', name: 'Alice' },
      { id: 'speaker_2', name: 'Bob' },
    ],
    metadata: {
      generatedAt: '2024-01-15T10:00:00Z',
      model: 'claude-3-opus',
      processingTimeMs: 5000,
      confidence: 0.95,
    },
    ...overrides,
  };
}

/**
 * Create mock attendees with email addresses
 * Using ExportAttendee type which extends Speaker with optional email
 */
function createMockAttendeesWithEmail(): ExportAttendee[] {
  const baseAttendees: Speaker[] = [
    { id: 'speaker_1', name: 'Alice' },
    { id: 'speaker_2', name: 'Bob' },
    { id: 'speaker_3', name: 'Charlie' },
  ];

  // Add email to first two attendees
  return [
    { ...baseAttendees[0], email: 'alice@example.com' } as ExportAttendee,
    { ...baseAttendees[1], email: 'bob@example.com' } as ExportAttendee,
    baseAttendees[2] as ExportAttendee, // No email
  ];
}

/**
 * Create a mock DocsClient
 */
function createMockDocsClient(): {
  client: DocsClient;
  createDocFromMarkdown: ReturnType<typeof vi.fn>;
  addPermission: ReturnType<typeof vi.fn>;
  getDocumentUrl: ReturnType<typeof vi.fn>;
} {
  const createDocFromMarkdown = vi.fn();
  const addPermission = vi.fn();
  const getDocumentUrl = vi.fn();

  const client = {
    createDocFromMarkdown,
    addPermission,
    getDocumentUrl,
  } as unknown as DocsClient;

  return { client, createDocFromMarkdown, addPermission, getDocumentUrl };
}

// =============================================================================
// Test Suite
// =============================================================================

describe('DocsExportService', () => {
  let mockDocsClient: ReturnType<typeof createMockDocsClient>;
  let service: DocsExportService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocsClient = createMockDocsClient();
    service = new DocsExportService(mockDocsClient.client);
  });

  // ===========================================================================
  // Basic Export Tests
  // ===========================================================================

  describe('exportMinutes', () => {
    it('should export minutes successfully with default title', async () => {
      const minutes = createMockMinutes();
      const accessToken = 'test_access_token';

      mockDocsClient.createDocFromMarkdown.mockResolvedValue({
        documentId: 'doc_123',
        url: 'https://docs.larksuite.com/docs/doc_123',
      });

      const input: DocsExportInput = {
        minutes,
        options: {
          shareWithAttendees: false,
          permission: 'view',
        },
      };

      const result = await service.exportMinutes(accessToken, input);

      expect(result.documentId).toBe('doc_123');
      expect(result.documentUrl).toBe('https://docs.larksuite.com/docs/doc_123');
      expect(result.title).toBe('Weekly Standup 議事録');
      expect(result.sharedWith).toEqual([]);

      expect(mockDocsClient.createDocFromMarkdown).toHaveBeenCalledTimes(1);
      expect(mockDocsClient.createDocFromMarkdown).toHaveBeenCalledWith(
        accessToken,
        expect.objectContaining({
          title: 'Weekly Standup 議事録',
        })
      );
    });

    it('should export minutes with custom title', async () => {
      const minutes = createMockMinutes();
      const accessToken = 'test_access_token';

      mockDocsClient.createDocFromMarkdown.mockResolvedValue({
        documentId: 'doc_123',
        url: 'https://docs.larksuite.com/docs/doc_123',
      });

      const input: DocsExportInput = {
        minutes,
        options: {
          title: 'Custom Title',
          shareWithAttendees: false,
          permission: 'view',
        },
      };

      const result = await service.exportMinutes(accessToken, input);

      expect(result.title).toBe('Custom Title');
      expect(mockDocsClient.createDocFromMarkdown).toHaveBeenCalledWith(
        accessToken,
        expect.objectContaining({
          title: 'Custom Title',
        })
      );
    });

    it('should export minutes with English title when language is en', async () => {
      const minutes = createMockMinutes();
      const accessToken = 'test_access_token';

      mockDocsClient.createDocFromMarkdown.mockResolvedValue({
        documentId: 'doc_123',
        url: 'https://docs.larksuite.com/docs/doc_123',
      });

      const input: DocsExportInput = {
        minutes,
        options: {
          shareWithAttendees: false,
          permission: 'view',
          language: 'en',
        },
      };

      const result = await service.exportMinutes(accessToken, input);

      expect(result.title).toBe('Weekly Standup Minutes');
    });

    it('should export minutes with folder ID', async () => {
      const minutes = createMockMinutes();
      const accessToken = 'test_access_token';

      mockDocsClient.createDocFromMarkdown.mockResolvedValue({
        documentId: 'doc_123',
        url: 'https://docs.larksuite.com/docs/doc_123',
      });

      const input: DocsExportInput = {
        minutes,
        options: {
          folderId: 'folder_abc',
          shareWithAttendees: false,
          permission: 'view',
        },
      };

      await service.exportMinutes(accessToken, input);

      expect(mockDocsClient.createDocFromMarkdown).toHaveBeenCalledWith(
        accessToken,
        expect.objectContaining({
          folderId: 'folder_abc',
        })
      );
    });
  });

  // ===========================================================================
  // Progress Callback Tests
  // ===========================================================================

  describe('exportMinutesWithProgress', () => {
    it('should call progress callback with correct statuses', async () => {
      const minutes = createMockMinutes();
      const accessToken = 'test_access_token';
      const progressUpdates: Array<{ status: ExportStatus; progress: number }> = [];

      mockDocsClient.createDocFromMarkdown.mockResolvedValue({
        documentId: 'doc_123',
        url: 'https://docs.larksuite.com/docs/doc_123',
      });

      const onProgress: ProgressCallback = (status, progress) => {
        progressUpdates.push({ status, progress });
      };

      const input: DocsExportInput = {
        minutes,
        options: {
          shareWithAttendees: false,
          permission: 'view',
        },
      };

      await service.exportMinutesWithProgress(accessToken, input, onProgress);

      // Verify progress sequence
      expect(progressUpdates).toContainEqual({ status: 'uploading', progress: 0 });
      expect(progressUpdates).toContainEqual({ status: 'uploading', progress: 15 });
      expect(progressUpdates).toContainEqual({ status: 'processing', progress: 30 });
      expect(progressUpdates).toContainEqual({ status: 'processing', progress: 70 });
      expect(progressUpdates).toContainEqual({ status: 'completed', progress: 100 });
    });

    it('should include permission setting progress when sharing with attendees', async () => {
      const attendeesWithEmail = createMockAttendeesWithEmail();
      const minutes = createMockMinutes({ attendees: attendeesWithEmail });
      const accessToken = 'test_access_token';
      const progressUpdates: Array<{ status: ExportStatus; progress: number }> = [];

      mockDocsClient.createDocFromMarkdown.mockResolvedValue({
        documentId: 'doc_123',
        url: 'https://docs.larksuite.com/docs/doc_123',
      });
      mockDocsClient.addPermission.mockResolvedValue(undefined);

      const onProgress: ProgressCallback = (status, progress) => {
        progressUpdates.push({ status, progress });
      };

      const input: DocsExportInput = {
        minutes,
        options: {
          shareWithAttendees: true,
          permission: 'view',
        },
      };

      await service.exportMinutesWithProgress(accessToken, input, onProgress);

      // Verify permission setting progress
      expect(progressUpdates).toContainEqual({ status: 'setting_permissions', progress: 70 });
      expect(progressUpdates).toContainEqual({ status: 'setting_permissions', progress: 90 });
    });
  });

  // ===========================================================================
  // Permission Tests
  // ===========================================================================

  describe('permission handling', () => {
    it('should share with attendees who have email addresses', async () => {
      const attendeesWithEmail = createMockAttendeesWithEmail();
      const minutes = createMockMinutes({ attendees: attendeesWithEmail });
      const accessToken = 'test_access_token';

      mockDocsClient.createDocFromMarkdown.mockResolvedValue({
        documentId: 'doc_123',
        url: 'https://docs.larksuite.com/docs/doc_123',
      });
      mockDocsClient.addPermission.mockResolvedValue(undefined);

      const input: DocsExportInput = {
        minutes,
        options: {
          shareWithAttendees: true,
          permission: 'view',
        },
      };

      const result = await service.exportMinutes(accessToken, input);

      expect(mockDocsClient.addPermission).toHaveBeenCalledTimes(1);
      expect(mockDocsClient.addPermission).toHaveBeenCalledWith(
        accessToken,
        'doc_123',
        expect.arrayContaining([
          { type: 'email', id: 'alice@example.com', permission: 'view' },
          { type: 'email', id: 'bob@example.com', permission: 'view' },
        ])
      );

      // Only attendees with email should be in sharedWith
      expect(result.sharedWith).toHaveLength(2);
      expect(result.sharedWith).toContain('speaker_1');
      expect(result.sharedWith).toContain('speaker_2');
      expect(result.sharedWith).not.toContain('speaker_3');
    });

    it('should not call addPermission when shareWithAttendees is false', async () => {
      const attendeesWithEmail = createMockAttendeesWithEmail();
      const minutes = createMockMinutes({ attendees: attendeesWithEmail });
      const accessToken = 'test_access_token';

      mockDocsClient.createDocFromMarkdown.mockResolvedValue({
        documentId: 'doc_123',
        url: 'https://docs.larksuite.com/docs/doc_123',
      });

      const input: DocsExportInput = {
        minutes,
        options: {
          shareWithAttendees: false,
          permission: 'view',
        },
      };

      const result = await service.exportMinutes(accessToken, input);

      expect(mockDocsClient.addPermission).not.toHaveBeenCalled();
      expect(result.sharedWith).toEqual([]);
    });

    it('should set edit permission when specified', async () => {
      const attendeesWithEmail = createMockAttendeesWithEmail();
      const minutes = createMockMinutes({ attendees: attendeesWithEmail });
      const accessToken = 'test_access_token';

      mockDocsClient.createDocFromMarkdown.mockResolvedValue({
        documentId: 'doc_123',
        url: 'https://docs.larksuite.com/docs/doc_123',
      });
      mockDocsClient.addPermission.mockResolvedValue(undefined);

      const input: DocsExportInput = {
        minutes,
        options: {
          shareWithAttendees: true,
          permission: 'edit',
        },
      };

      await service.exportMinutes(accessToken, input);

      expect(mockDocsClient.addPermission).toHaveBeenCalledWith(
        accessToken,
        'doc_123',
        expect.arrayContaining([
          expect.objectContaining({ permission: 'edit' }),
        ])
      );
    });

    it('should handle permission error gracefully (warning only)', async () => {
      const attendeesWithEmail = createMockAttendeesWithEmail();
      const minutes = createMockMinutes({ attendees: attendeesWithEmail });
      const accessToken = 'test_access_token';
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockDocsClient.createDocFromMarkdown.mockResolvedValue({
        documentId: 'doc_123',
        url: 'https://docs.larksuite.com/docs/doc_123',
      });
      mockDocsClient.addPermission.mockRejectedValue(
        new DocsApiError('Permission denied', 403, 'addPermission')
      );

      const input: DocsExportInput = {
        minutes,
        options: {
          shareWithAttendees: true,
          permission: 'view',
        },
      };

      // Should not throw, just log warning
      const result = await service.exportMinutes(accessToken, input);

      expect(result.documentId).toBe('doc_123');
      expect(result.sharedWith).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should skip permission setting when no attendees have email', async () => {
      const minutes = createMockMinutes(); // Default attendees have no email
      const accessToken = 'test_access_token';

      mockDocsClient.createDocFromMarkdown.mockResolvedValue({
        documentId: 'doc_123',
        url: 'https://docs.larksuite.com/docs/doc_123',
      });

      const input: DocsExportInput = {
        minutes,
        options: {
          shareWithAttendees: true,
          permission: 'view',
        },
      };

      const result = await service.exportMinutes(accessToken, input);

      expect(mockDocsClient.addPermission).not.toHaveBeenCalled();
      expect(result.sharedWith).toEqual([]);
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('error handling', () => {
    it('should throw DocsExportError for DocsApiError', async () => {
      const minutes = createMockMinutes();
      const accessToken = 'test_access_token';

      mockDocsClient.createDocFromMarkdown.mockRejectedValue(
        new DocsApiError('Upload failed', 500, 'createDocFromMarkdown')
      );

      const input: DocsExportInput = {
        minutes,
        options: {
          shareWithAttendees: false,
          permission: 'view',
        },
      };

      await expect(service.exportMinutes(accessToken, input)).rejects.toThrow(
        DocsExportError
      );

      try {
        await service.exportMinutes(accessToken, input);
      } catch (error) {
        expect(error).toBeInstanceOf(DocsExportError);
        expect((error as DocsExportError).code).toBe('DOCS_API_500');
        expect((error as DocsExportError).operation).toBe('exportMinutes');
      }
    });

    it('should throw DocsExportError for DocsImportTimeoutError', async () => {
      const minutes = createMockMinutes();
      const accessToken = 'test_access_token';

      mockDocsClient.createDocFromMarkdown.mockRejectedValue(
        new DocsImportTimeoutError('ticket_123', 30000)
      );

      const input: DocsExportInput = {
        minutes,
        options: {
          shareWithAttendees: false,
          permission: 'view',
        },
      };

      await expect(service.exportMinutes(accessToken, input)).rejects.toThrow(
        DocsExportError
      );

      try {
        await service.exportMinutes(accessToken, input);
      } catch (error) {
        expect(error).toBeInstanceOf(DocsExportError);
        expect((error as DocsExportError).code).toBe('IMPORT_TIMEOUT');
        expect((error as DocsExportError).details).toEqual({
          ticket: 'ticket_123',
          timeoutMs: 30000,
        });
      }
    });

    it('should throw DocsExportError for DocsImportError', async () => {
      const minutes = createMockMinutes();
      const accessToken = 'test_access_token';

      mockDocsClient.createDocFromMarkdown.mockRejectedValue(
        new DocsImportError('ticket_123', 'Import job failed')
      );

      const input: DocsExportInput = {
        minutes,
        options: {
          shareWithAttendees: false,
          permission: 'view',
        },
      };

      await expect(service.exportMinutes(accessToken, input)).rejects.toThrow(
        DocsExportError
      );

      try {
        await service.exportMinutes(accessToken, input);
      } catch (error) {
        expect(error).toBeInstanceOf(DocsExportError);
        expect((error as DocsExportError).code).toBe('IMPORT_FAILED');
      }
    });

    it('should throw DocsExportError for unknown errors', async () => {
      const minutes = createMockMinutes();
      const accessToken = 'test_access_token';

      mockDocsClient.createDocFromMarkdown.mockRejectedValue(
        new Error('Network error')
      );

      const input: DocsExportInput = {
        minutes,
        options: {
          shareWithAttendees: false,
          permission: 'view',
        },
      };

      await expect(service.exportMinutes(accessToken, input)).rejects.toThrow(
        DocsExportError
      );

      try {
        await service.exportMinutes(accessToken, input);
      } catch (error) {
        expect(error).toBeInstanceOf(DocsExportError);
        expect((error as DocsExportError).code).toBe('UNKNOWN_ERROR');
        expect((error as DocsExportError).message).toBe('Network error');
      }
    });

    it('should re-throw DocsExportError without wrapping', async () => {
      const minutes = createMockMinutes();
      const accessToken = 'test_access_token';
      const originalError = new DocsExportError(
        'Custom error',
        'CUSTOM_CODE',
        'customOperation'
      );

      mockDocsClient.createDocFromMarkdown.mockRejectedValue(originalError);

      const input: DocsExportInput = {
        minutes,
        options: {
          shareWithAttendees: false,
          permission: 'view',
        },
      };

      try {
        await service.exportMinutes(accessToken, input);
      } catch (error) {
        expect(error).toBe(originalError);
      }
    });
  });

  // ===========================================================================
  // DocsExportError Class Tests
  // ===========================================================================

  describe('DocsExportError', () => {
    it('should create error with all properties', () => {
      const error = new DocsExportError(
        'Test error message',
        'TEST_CODE',
        'testOperation',
        { extra: 'details' }
      );

      expect(error.name).toBe('DocsExportError');
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.operation).toBe('testOperation');
      expect(error.details).toEqual({ extra: 'details' });
    });

    it('should create from DocsApiError', () => {
      const docsApiError = new DocsApiError('API error', 400, 'apiOp', {
        reason: 'bad request',
      });
      const exportError = DocsExportError.fromDocsApiError(
        docsApiError,
        'exportOp'
      );

      expect(exportError.message).toBe('API error');
      expect(exportError.code).toBe('DOCS_API_400');
      expect(exportError.operation).toBe('exportOp');
      expect(exportError.details).toEqual({ reason: 'bad request' });
    });

    it('should create from DocsImportTimeoutError', () => {
      const timeoutError = new DocsImportTimeoutError('ticket_abc', 60000);
      const exportError = DocsExportError.fromDocsImportTimeoutError(timeoutError);

      expect(exportError.code).toBe('IMPORT_TIMEOUT');
      expect(exportError.operation).toBe('createDocument');
      expect(exportError.details).toEqual({
        ticket: 'ticket_abc',
        timeoutMs: 60000,
      });
    });

    it('should create from DocsImportError', () => {
      const importError = new DocsImportError('ticket_xyz', 'Job failed');
      const exportError = DocsExportError.fromDocsImportError(importError);

      expect(exportError.code).toBe('IMPORT_FAILED');
      expect(exportError.operation).toBe('createDocument');
      expect(exportError.details).toEqual({ ticket: 'ticket_xyz' });
    });
  });
});

// =============================================================================
// Factory Function Tests
// =============================================================================

describe('createDocsExportService', () => {
  it('should throw when environment variables are missing', () => {
    // Clear environment variables
    const originalEnv = { ...process.env };
    delete process.env.LARK_APP_ID;
    delete process.env.LARK_APP_SECRET;
    delete process.env.NEXT_PUBLIC_LARK_REDIRECT_URI;

    expect(() => createDocsExportService()).toThrow();

    // Restore environment
    process.env = originalEnv;
  });
});
