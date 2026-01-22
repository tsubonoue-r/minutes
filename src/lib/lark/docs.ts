/**
 * Docs Client for Lark Docs API
 * @module lib/lark/docs
 */

import type { LarkClient } from './client';
import { LarkClientError } from './client';
import {
  type LarkImportTaskData,
  type LarkImportTaskResultData,
  type LarkFileUploadData,
  type LarkPermissionMemberData,
  type LarkPermissionMemberType,
  type LarkPermissionLevel,
  larkImportTaskResponseSchema,
  larkImportTaskResultResponseSchema,
  larkPermissionMemberResponseSchema,
  LarkDocsApiEndpoints,
} from './types';

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown when a document operation fails
 */
export class DocsApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly operation: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'DocsApiError';
  }

  /**
   * Create from LarkClientError
   */
  static fromLarkClientError(
    error: LarkClientError,
    operation: string
  ): DocsApiError {
    return new DocsApiError(error.message, error.code, operation, error.details);
  }
}

/**
 * Error thrown when a document import times out
 */
export class DocsImportTimeoutError extends Error {
  constructor(
    public readonly ticket: string,
    public readonly timeoutMs: number
  ) {
    super(`Document import timed out after ${timeoutMs}ms. Ticket: ${ticket}`);
    this.name = 'DocsImportTimeoutError';
  }
}

/**
 * Error thrown when a document import fails
 */
export class DocsImportError extends Error {
  constructor(
    public readonly ticket: string,
    public readonly jobErrorMsg?: string
  ) {
    super(`Document import failed. ${jobErrorMsg ?? 'Unknown error'}`);
    this.name = 'DocsImportError';
  }
}

// =============================================================================
// Application Types
// =============================================================================

/**
 * Options for creating a document from markdown
 */
export interface CreateDocFromMarkdownOptions {
  /** Document title */
  readonly title: string;
  /** Markdown content string */
  readonly content: string;
  /** Folder ID to save the document (optional) */
  readonly folderId?: string;
}

/**
 * Result of document creation
 */
export interface CreateDocResult {
  /** Created document ID */
  readonly documentId: string;
  /** Document URL */
  readonly url: string;
}

/**
 * Permission member to add
 */
export interface PermissionMember {
  /** Member type: email, openid, or userid */
  readonly type: LarkPermissionMemberType;
  /** Member identifier */
  readonly id: string;
  /** Permission level: view or edit */
  readonly permission: Exclude<LarkPermissionLevel, 'full_access'>;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default timeout for import task polling (30 seconds)
 */
const DEFAULT_IMPORT_TIMEOUT_MS = 30000;

/**
 * Polling interval for import task status (1 second)
 */
const IMPORT_POLL_INTERVAL_MS = 1000;

/**
 * Job status codes
 */
const JOB_STATUS = {
  PROCESSING: 0,
  SUCCESS: 1,
  FAILED: 2,
} as const;

// =============================================================================
// DocsClient Class
// =============================================================================

/**
 * Client for interacting with Lark Docs API
 *
 * Provides methods to create documents, manage permissions, and upload files.
 * Uses the Lark Drive API for document import and permission management.
 *
 * @example
 * ```typescript
 * const client = createLarkClient();
 * const docsClient = new DocsClient(client);
 *
 * // Create a document from markdown
 * const result = await docsClient.createDocFromMarkdown(accessToken, {
 *   title: 'Meeting Notes',
 *   content: '# Meeting Notes\n\n- Item 1\n- Item 2',
 *   folderId: 'folder_token',
 * });
 *
 * console.log(`Document created: ${result.url}`);
 *
 * // Add view permission
 * await docsClient.addPermission(accessToken, result.documentId, [
 *   { type: 'email', id: 'user@example.com', permission: 'view' },
 * ]);
 * ```
 */
export class DocsClient {
  private readonly client: LarkClient;

  constructor(client: LarkClient) {
    this.client = client;
  }

  /**
   * Create a document from markdown content
   *
   * This method:
   * 1. Uploads the markdown content as a file
   * 2. Creates an import task to convert it to a Lark document
   * 3. Polls for the import task completion
   * 4. Returns the created document information
   *
   * @param accessToken - User access token
   * @param options - Document creation options
   * @returns Created document information with ID and URL
   * @throws {DocsApiError} When API operations fail
   * @throws {DocsImportTimeoutError} When import task times out
   * @throws {DocsImportError} When import task fails
   */
  async createDocFromMarkdown(
    accessToken: string,
    options: CreateDocFromMarkdownOptions
  ): Promise<CreateDocResult> {
    const { title, content, folderId } = options;

    try {
      // Step 1: Upload markdown content as a file
      const fileToken = await this.uploadMarkdownFile(accessToken, title, content);

      // Step 2: Create import task
      const ticket = await this.createImportTask(accessToken, {
        fileName: title,
        fileToken,
        folderId,
      });

      // Step 3: Poll for import completion
      const result = await this.waitForImportCompletion(accessToken, ticket);

      return result;
    } catch (error) {
      if (
        error instanceof DocsApiError ||
        error instanceof DocsImportTimeoutError ||
        error instanceof DocsImportError
      ) {
        throw error;
      }
      if (error instanceof LarkClientError) {
        throw DocsApiError.fromLarkClientError(error, 'createDocFromMarkdown');
      }
      throw error;
    }
  }

  /**
   * Add permissions to a document
   *
   * @param accessToken - User access token
   * @param documentId - Document token/ID
   * @param members - Array of permission members to add
   * @throws {DocsApiError} When API operations fail
   */
  async addPermission(
    accessToken: string,
    documentId: string,
    members: readonly PermissionMember[]
  ): Promise<void> {
    const endpoint = LarkDocsApiEndpoints.PERMISSION_MEMBER_CREATE.replace(
      ':token',
      documentId
    );

    for (const member of members) {
      try {
        const response = await this.client.authenticatedRequest<LarkPermissionMemberData>(
          endpoint,
          accessToken,
          {
            method: 'POST',
            params: {
              type: 'doc',
            },
            body: {
              member_type: member.type,
              member_id: member.id,
              perm: member.permission,
            },
          }
        );

        // Validate response with Zod
        larkPermissionMemberResponseSchema.parse(response);
      } catch (error) {
        if (error instanceof LarkClientError) {
          throw DocsApiError.fromLarkClientError(error, 'addPermission');
        }
        throw error;
      }
    }
  }

  /**
   * Get the URL for a document
   *
   * @param documentId - Document token/ID
   * @returns Document URL
   */
  getDocumentUrl(documentId: string): string {
    const baseUrl = this.client.getConfig().baseUrl;
    // Remove /open-apis prefix if present for document URL
    const docBaseUrl = baseUrl.replace(/\/open-apis$/, '');
    return `${docBaseUrl}/docs/${documentId}`;
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  /**
   * Upload markdown content as a file
   * @private
   */
  private async uploadMarkdownFile(
    accessToken: string,
    title: string,
    content: string
  ): Promise<string> {
    // Convert markdown content to a Blob/Buffer for upload
    const fileName = `${title}.md`;
    const fileContent = new TextEncoder().encode(content);

    // Create form data for multipart upload
    const formData = new FormData();
    const blob = new Blob([fileContent], { type: 'text/markdown' });
    formData.append('file', blob, fileName);
    formData.append('file_name', fileName);
    formData.append('parent_type', 'explorer');
    formData.append('parent_node', ''); // Root folder

    // Note: For multipart upload, we need to make a direct fetch call
    // because the LarkClient sets Content-Type to application/json
    const config = this.client.getConfig();
    const url = `${config.baseUrl}${LarkDocsApiEndpoints.FILE_UPLOAD}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new DocsApiError(
        `File upload failed: ${response.statusText}`,
        response.status,
        'uploadMarkdownFile'
      );
    }

    const data = (await response.json()) as {
      code: number;
      msg: string;
      data?: LarkFileUploadData;
    };

    if (data.code !== 0) {
      throw new DocsApiError(data.msg, data.code, 'uploadMarkdownFile', data);
    }

    if (data.data === undefined) {
      throw new DocsApiError(
        'File upload response missing data',
        -1,
        'uploadMarkdownFile'
      );
    }

    return data.data.file_token;
  }

  /**
   * Create an import task
   * @private
   */
  private async createImportTask(
    accessToken: string,
    options: {
      fileName: string;
      fileToken: string;
      folderId?: string | undefined;
    }
  ): Promise<string> {
    const { fileName, fileToken, folderId } = options;

    const body = {
      file_extension: 'md' as const,
      file_token: fileToken,
      file_name: fileName,
      type: 'docx',
      point: {
        mount_type: 1 as const, // My Drive
        mount_key: folderId ?? '',
      },
    };

    const response = await this.client.authenticatedRequest<LarkImportTaskData>(
      LarkDocsApiEndpoints.IMPORT_TASK_CREATE,
      accessToken,
      {
        method: 'POST',
        body,
      }
    );

    // Validate response with Zod
    const validated = larkImportTaskResponseSchema.parse(response);

    if (validated.data === undefined) {
      throw new DocsApiError(
        'Import task response missing data',
        -1,
        'createImportTask'
      );
    }

    return validated.data.ticket;
  }

  /**
   * Wait for import task completion
   * @private
   */
  private async waitForImportCompletion(
    accessToken: string,
    ticket: string,
    timeoutMs: number = DEFAULT_IMPORT_TIMEOUT_MS
  ): Promise<CreateDocResult> {
    const startTime = Date.now();
    const endpoint = LarkDocsApiEndpoints.IMPORT_TASK_GET.replace(':ticket', ticket);

    while (Date.now() - startTime < timeoutMs) {
      const response = await this.client.authenticatedRequest<LarkImportTaskResultData>(
        endpoint,
        accessToken
      );

      // Validate response with Zod
      const validated = larkImportTaskResultResponseSchema.parse(response);

      if (validated.data === undefined) {
        throw new DocsApiError(
          'Import task result response missing data',
          -1,
          'waitForImportCompletion'
        );
      }

      const { result } = validated.data;

      if (result.job_status === JOB_STATUS.SUCCESS) {
        if (result.token === undefined || result.url === undefined) {
          throw new DocsApiError(
            'Import task succeeded but missing token or url',
            -1,
            'waitForImportCompletion'
          );
        }

        return {
          documentId: result.token,
          url: result.url,
        };
      }

      if (result.job_status === JOB_STATUS.FAILED) {
        throw new DocsImportError(ticket, result.job_error_msg);
      }

      // Still processing, wait before polling again
      await this.delay(IMPORT_POLL_INTERVAL_MS);
    }

    throw new DocsImportTimeoutError(ticket, timeoutMs);
  }

  /**
   * Delay for specified milliseconds
   * @private
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a DocsClient instance with the provided LarkClient
 * @param client - LarkClient instance
 * @returns New DocsClient instance
 */
export function createDocsClient(client: LarkClient): DocsClient {
  return new DocsClient(client);
}
