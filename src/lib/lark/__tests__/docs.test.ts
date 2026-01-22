/**
 * Docs service unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LarkClient, LarkClientError } from '../client';
import {
  DocsClient,
  DocsApiError,
  DocsImportTimeoutError,
  DocsImportError,
  createDocsClient,
} from '../docs';
import type { LarkConfig } from '@/types/lark';

// =============================================================================
// Mock Data Factories
// =============================================================================

const createMockFileUploadResponse = (fileToken = 'file_token_123') => ({
  code: 0,
  msg: 'success',
  data: {
    file_token: fileToken,
  },
});

const createMockImportTaskResponse = (ticket = 'ticket_123') => ({
  code: 0,
  msg: 'success',
  data: {
    ticket,
  },
});

const createMockImportTaskResultResponse = (
  status: 'processing' | 'success' | 'failed' = 'success',
  options: { token?: string; url?: string; errorMsg?: string } = {}
) => {
  const jobStatus = status === 'processing' ? 0 : status === 'success' ? 1 : 2;
  return {
    code: 0,
    msg: 'success',
    data: {
      result: {
        ticket: 'ticket_123',
        type: 'import_doc',
        job_status: jobStatus,
        token: status === 'success' ? (options.token ?? 'doc_token_123') : undefined,
        url: status === 'success' ? (options.url ?? 'https://larksuite.com/docs/doc_token_123') : undefined,
        job_error_msg: status === 'failed' ? (options.errorMsg ?? 'Import failed') : undefined,
      },
    },
  };
};

const createMockPermissionMemberResponse = () => ({
  code: 0,
  msg: 'success',
  data: {
    member: {
      member_type: 'email' as const,
      member_id: 'user@example.com',
      perm: 'view' as const,
    },
  },
});

// =============================================================================
// DocsApiError Tests
// =============================================================================

describe('DocsApiError', () => {
  it('should create error with details', () => {
    const error = new DocsApiError(
      'API failed',
      500,
      'createDoc',
      { extra: 'info' }
    );

    expect(error.message).toBe('API failed');
    expect(error.code).toBe(500);
    expect(error.operation).toBe('createDoc');
    expect(error.details).toEqual({ extra: 'info' });
    expect(error.name).toBe('DocsApiError');
  });

  it('should create from LarkClientError', () => {
    const clientError = new LarkClientError('Client error', 401, '/test', { log_id: '123' });
    const apiError = DocsApiError.fromLarkClientError(clientError, 'testOperation');

    expect(apiError.message).toBe('Client error');
    expect(apiError.code).toBe(401);
    expect(apiError.operation).toBe('testOperation');
    expect(apiError.details).toEqual({ log_id: '123' });
  });
});

// =============================================================================
// DocsImportTimeoutError Tests
// =============================================================================

describe('DocsImportTimeoutError', () => {
  it('should create error with ticket and timeout', () => {
    const error = new DocsImportTimeoutError('ticket_123', 30000);

    expect(error.ticket).toBe('ticket_123');
    expect(error.timeoutMs).toBe(30000);
    expect(error.message).toBe('Document import timed out after 30000ms. Ticket: ticket_123');
    expect(error.name).toBe('DocsImportTimeoutError');
  });
});

// =============================================================================
// DocsImportError Tests
// =============================================================================

describe('DocsImportError', () => {
  it('should create error with ticket and error message', () => {
    const error = new DocsImportError('ticket_123', 'File format not supported');

    expect(error.ticket).toBe('ticket_123');
    expect(error.message).toBe('Document import failed. File format not supported');
    expect(error.name).toBe('DocsImportError');
  });

  it('should handle undefined error message', () => {
    const error = new DocsImportError('ticket_123');

    expect(error.message).toBe('Document import failed. Unknown error');
  });
});

// =============================================================================
// DocsClient Tests
// =============================================================================

describe('DocsClient', () => {
  const config: LarkConfig = {
    appId: 'test_app_id',
    appSecret: 'test_secret',
    baseUrl: 'https://open.larksuite.com',
    redirectUri: 'http://localhost:3000/api/auth/callback',
  };

  let client: LarkClient;
  let docsClient: DocsClient;
  const accessToken = 'test_access_token';

  beforeEach(() => {
    client = new LarkClient(config);
    docsClient = new DocsClient(client);
    vi.stubGlobal('fetch', vi.fn());
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('createDocFromMarkdown', () => {
    it('should create document from markdown successfully', async () => {
      // Mock file upload
      const uploadResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(createMockFileUploadResponse()),
      };
      // Mock import task creation
      const importTaskResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(createMockImportTaskResponse()),
      };
      // Mock import task result (success)
      const importResultResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(createMockImportTaskResultResponse('success')),
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce(uploadResponse as unknown as Response) // File upload
        .mockResolvedValueOnce(importTaskResponse as unknown as Response) // Import task create
        .mockResolvedValueOnce(importResultResponse as unknown as Response); // Import task result

      const result = await docsClient.createDocFromMarkdown(accessToken, {
        title: 'Test Document',
        content: '# Hello World\n\nThis is a test.',
        folderId: 'folder_123',
      });

      expect(result.documentId).toBe('doc_token_123');
      expect(result.url).toBe('https://larksuite.com/docs/doc_token_123');
    });

    it('should handle file upload failure', async () => {
      const uploadResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 99991400,
          msg: 'Invalid token',
        }),
      };

      vi.mocked(fetch).mockResolvedValueOnce(uploadResponse as unknown as Response);

      await expect(
        docsClient.createDocFromMarkdown(accessToken, {
          title: 'Test',
          content: 'content',
        })
      ).rejects.toThrow(DocsApiError);
    });

    it('should handle HTTP error during file upload', async () => {
      const uploadResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };

      vi.mocked(fetch).mockResolvedValueOnce(uploadResponse as unknown as Response);

      await expect(
        docsClient.createDocFromMarkdown(accessToken, {
          title: 'Test',
          content: 'content',
        })
      ).rejects.toThrow(DocsApiError);
    });

    it('should handle import task creation failure', async () => {
      // Mock file upload success
      const uploadResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(createMockFileUploadResponse()),
      };
      // Mock import task creation failure
      const importTaskResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 99991402,
          msg: 'Permission denied',
        }),
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce(uploadResponse as unknown as Response)
        .mockResolvedValueOnce(importTaskResponse as unknown as Response);

      await expect(
        docsClient.createDocFromMarkdown(accessToken, {
          title: 'Test',
          content: 'content',
        })
      ).rejects.toThrow(DocsApiError);
    });

    it('should handle import task failure', async () => {
      // Mock file upload success
      const uploadResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(createMockFileUploadResponse()),
      };
      // Mock import task creation success
      const importTaskResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(createMockImportTaskResponse()),
      };
      // Mock import task result (failed)
      const importResultResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(
          createMockImportTaskResultResponse('failed', { errorMsg: 'File corrupted' })
        ),
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce(uploadResponse as unknown as Response)
        .mockResolvedValueOnce(importTaskResponse as unknown as Response)
        .mockResolvedValueOnce(importResultResponse as unknown as Response);

      await expect(
        docsClient.createDocFromMarkdown(accessToken, {
          title: 'Test',
          content: 'content',
        })
      ).rejects.toThrow(DocsImportError);
    });

    it('should poll for import completion when processing', async () => {
      // Mock file upload success
      const uploadResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(createMockFileUploadResponse()),
      };
      // Mock import task creation success
      const importTaskResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(createMockImportTaskResponse()),
      };
      // Mock import task result (processing then success)
      const processingResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(createMockImportTaskResultResponse('processing')),
      };
      const successResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(createMockImportTaskResultResponse('success')),
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce(uploadResponse as unknown as Response)
        .mockResolvedValueOnce(importTaskResponse as unknown as Response)
        .mockResolvedValueOnce(processingResponse as unknown as Response)
        .mockResolvedValueOnce(successResponse as unknown as Response);

      const promise = docsClient.createDocFromMarkdown(accessToken, {
        title: 'Test',
        content: 'content',
      });

      // Advance timers for polling
      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;
      expect(result.documentId).toBe('doc_token_123');
    });

    it('should include authorization header in file upload', async () => {
      const uploadResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(createMockFileUploadResponse()),
      };
      const importTaskResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(createMockImportTaskResponse()),
      };
      const importResultResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(createMockImportTaskResultResponse('success')),
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce(uploadResponse as unknown as Response)
        .mockResolvedValueOnce(importTaskResponse as unknown as Response)
        .mockResolvedValueOnce(importResultResponse as unknown as Response);

      await docsClient.createDocFromMarkdown(accessToken, {
        title: 'Test',
        content: 'content',
      });

      // Check first call (file upload)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/drive/v1/files/upload_all'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
      );
    });
  });

  describe('addPermission', () => {
    it('should add permission successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(createMockPermissionMemberResponse()),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await docsClient.addPermission(accessToken, 'doc_token_123', [
        { type: 'email', id: 'user@example.com', permission: 'view' },
      ]);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/drive/v1/permissions/doc_token_123/members'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should add multiple permissions', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(createMockPermissionMemberResponse()),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await docsClient.addPermission(accessToken, 'doc_token_123', [
        { type: 'email', id: 'user1@example.com', permission: 'view' },
        { type: 'email', id: 'user2@example.com', permission: 'edit' },
        { type: 'openid', id: 'openid_123', permission: 'view' },
      ]);

      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle permission API failure', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 99991403,
          msg: 'User not found',
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(
        docsClient.addPermission(accessToken, 'doc_token_123', [
          { type: 'email', id: 'invalid@example.com', permission: 'view' },
        ])
      ).rejects.toThrow(DocsApiError);
    });

    it('should include document type in query params', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(createMockPermissionMemberResponse()),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await docsClient.addPermission(accessToken, 'doc_token_123', [
        { type: 'email', id: 'user@example.com', permission: 'view' },
      ]);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('type=doc'),
        expect.any(Object)
      );
    });

    it('should send correct permission body', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(createMockPermissionMemberResponse()),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await docsClient.addPermission(accessToken, 'doc_token_123', [
        { type: 'userid', id: 'user_id_123', permission: 'edit' },
      ]);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            member_type: 'userid',
            member_id: 'user_id_123',
            perm: 'edit',
          }),
        })
      );
    });
  });

  describe('getDocumentUrl', () => {
    it('should return document URL', () => {
      const url = docsClient.getDocumentUrl('doc_token_123');

      expect(url).toBe('https://open.larksuite.com/docs/doc_token_123');
    });

    it('should handle different document IDs', () => {
      const url = docsClient.getDocumentUrl('another_doc_456');

      expect(url).toBe('https://open.larksuite.com/docs/another_doc_456');
    });
  });
});

// =============================================================================
// createDocsClient Tests
// =============================================================================

describe('createDocsClient', () => {
  it('should create DocsClient instance', () => {
    const config: LarkConfig = {
      appId: 'test_app_id',
      appSecret: 'test_secret',
      baseUrl: 'https://open.larksuite.com',
      redirectUri: 'http://localhost:3000/api/auth/callback',
    };
    const client = new LarkClient(config);
    const docsClient = createDocsClient(client);

    expect(docsClient).toBeInstanceOf(DocsClient);
  });
});
