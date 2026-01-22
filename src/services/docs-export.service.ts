/**
 * DocsExportService - Export Minutes to Lark Docs
 * @module services/docs-export.service
 */

import type { Minutes } from '@/types/minutes';
import type { ExportStatus, ExportAttendee } from '@/types/export';
import {
  DocsClient,
  DocsApiError,
  DocsImportTimeoutError,
  DocsImportError,
  type PermissionMember,
} from '@/lib/lark/docs';
import { createLarkClient } from '@/lib/lark/client';
import { convertMinutesToMarkdown } from '@/lib/export/markdown-converter';

// =============================================================================
// Types
// =============================================================================

/**
 * Input options for exporting minutes
 */
export interface DocsExportInput {
  /** Minutes data to export */
  readonly minutes: Minutes;
  /** Export options */
  readonly options: {
    /** Custom document title (defaults to minutes.title + " 議事録") */
    readonly title?: string | undefined;
    /** Target folder ID in Lark Docs */
    readonly folderId?: string | undefined;
    /** Whether to share with meeting attendees */
    readonly shareWithAttendees: boolean;
    /** Permission level for shared users */
    readonly permission: 'view' | 'edit';
    /** Output language ('ja' or 'en') */
    readonly language?: 'ja' | 'en' | undefined;
  };
}

/**
 * Result of a successful export operation
 */
export interface DocsExportResult {
  /** Created document ID */
  readonly documentId: string;
  /** Document URL */
  readonly documentUrl: string;
  /** Final document title */
  readonly title: string;
  /** List of user IDs the document was shared with */
  readonly sharedWith: readonly string[];
}

/**
 * Progress callback function type
 */
export type ProgressCallback = (status: ExportStatus, progress: number) => void;

// =============================================================================
// Error Class
// =============================================================================

/**
 * Error thrown when document export fails
 */
export class DocsExportError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly operation: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'DocsExportError';
  }

  /**
   * Create from DocsApiError
   */
  static fromDocsApiError(
    error: DocsApiError,
    operation: string
  ): DocsExportError {
    return new DocsExportError(
      error.message,
      `DOCS_API_${error.code}`,
      operation,
      error.details
    );
  }

  /**
   * Create from DocsImportTimeoutError
   */
  static fromDocsImportTimeoutError(
    error: DocsImportTimeoutError
  ): DocsExportError {
    return new DocsExportError(
      error.message,
      'IMPORT_TIMEOUT',
      'createDocument',
      { ticket: error.ticket, timeoutMs: error.timeoutMs }
    );
  }

  /**
   * Create from DocsImportError
   */
  static fromDocsImportError(error: DocsImportError): DocsExportError {
    return new DocsExportError(
      error.message,
      'IMPORT_FAILED',
      'createDocument',
      { ticket: error.ticket }
    );
  }
}

// =============================================================================
// Progress Constants
// =============================================================================

/**
 * Progress ranges for each export phase
 */
const PROGRESS_RANGES = {
  uploading: { start: 0, end: 30 },
  processing: { start: 30, end: 70 },
  setting_permissions: { start: 70, end: 90 },
  completed: { start: 100, end: 100 },
} as const;

// =============================================================================
// DocsExportService Class
// =============================================================================

/**
 * Service for exporting Minutes to Lark Docs
 *
 * Handles the complete export flow:
 * 1. Convert Minutes to Markdown
 * 2. Upload to Lark Docs
 * 3. Set permissions for attendees
 *
 * @example
 * ```typescript
 * const service = createDocsExportService();
 *
 * const result = await service.exportMinutes(accessToken, {
 *   minutes,
 *   options: {
 *     shareWithAttendees: true,
 *     permission: 'view',
 *     language: 'ja',
 *   },
 * });
 *
 * console.log(`Document created: ${result.documentUrl}`);
 * ```
 */
export class DocsExportService {
  private readonly docsClient: DocsClient;

  constructor(docsClient: DocsClient) {
    this.docsClient = docsClient;
  }

  /**
   * Export minutes to Lark Docs
   *
   * @param accessToken - User access token
   * @param input - Export input with minutes and options
   * @returns Export result with document ID and URL
   * @throws {DocsExportError} When export fails
   */
  async exportMinutes(
    accessToken: string,
    input: DocsExportInput
  ): Promise<DocsExportResult> {
    return this.exportMinutesWithProgress(accessToken, input, () => {
      // No-op callback
    });
  }

  /**
   * Export minutes to Lark Docs with progress callback
   *
   * @param accessToken - User access token
   * @param input - Export input with minutes and options
   * @param onProgress - Callback for progress updates
   * @returns Export result with document ID and URL
   * @throws {DocsExportError} When export fails
   */
  async exportMinutesWithProgress(
    accessToken: string,
    input: DocsExportInput,
    onProgress: ProgressCallback
  ): Promise<DocsExportResult> {
    const { minutes, options } = input;
    const language = options.language ?? 'ja';

    // Determine document title
    const title = options.title ?? this.generateDefaultTitle(minutes.title, language);

    try {
      // Phase 1: Converting and uploading (0-30%)
      onProgress('uploading', PROGRESS_RANGES.uploading.start);

      const markdownContent = convertMinutesToMarkdown(minutes, { language });

      onProgress('uploading', 15);

      // Phase 2: Creating document (30-70%)
      onProgress('processing', PROGRESS_RANGES.processing.start);

      const createOptions = options.folderId !== undefined
        ? { title, content: markdownContent, folderId: options.folderId }
        : { title, content: markdownContent };

      const createResult = await this.docsClient.createDocFromMarkdown(
        accessToken,
        createOptions
      );

      onProgress('processing', PROGRESS_RANGES.processing.end);

      // Phase 3: Setting permissions (70-90%)
      const sharedWith: string[] = [];

      if (options.shareWithAttendees) {
        onProgress('setting_permissions', PROGRESS_RANGES.setting_permissions.start);

        const attendeesWithEmail = this.getAttendeesWithEmail(minutes.attendees as ExportAttendee[]);

        if (attendeesWithEmail.length > 0) {
          const permissionMembers = this.createPermissionMembers(
            attendeesWithEmail,
            options.permission
          );

          try {
            await this.docsClient.addPermission(
              accessToken,
              createResult.documentId,
              permissionMembers
            );

            sharedWith.push(...attendeesWithEmail.map((a) => a.id));
          } catch (permissionError) {
            // Log warning but don't fail the export
            console.warn(
              `[DocsExportService] Warning: Failed to set permissions for some users:`,
              permissionError
            );
          }
        }

        onProgress('setting_permissions', PROGRESS_RANGES.setting_permissions.end);
      }

      // Phase 4: Completed (100%)
      onProgress('completed', PROGRESS_RANGES.completed.end);

      return {
        documentId: createResult.documentId,
        documentUrl: createResult.url,
        title,
        sharedWith,
      };
    } catch (error) {
      if (error instanceof DocsExportError) {
        throw error;
      }

      if (error instanceof DocsApiError) {
        throw DocsExportError.fromDocsApiError(error, 'exportMinutes');
      }

      if (error instanceof DocsImportTimeoutError) {
        throw DocsExportError.fromDocsImportTimeoutError(error);
      }

      if (error instanceof DocsImportError) {
        throw DocsExportError.fromDocsImportError(error);
      }

      throw new DocsExportError(
        (error as Error).message ?? 'Unknown error during export',
        'UNKNOWN_ERROR',
        'exportMinutes',
        error
      );
    }
  }

  /**
   * Generate default document title based on minutes title
   *
   * @param minutesTitle - Original minutes title
   * @param language - Output language
   * @returns Default document title
   */
  private generateDefaultTitle(minutesTitle: string, language: 'ja' | 'en'): string {
    const suffix = language === 'ja' ? '議事録' : 'Minutes';
    return `${minutesTitle} ${suffix}`;
  }

  /**
   * Attendee with confirmed email address
   */
  private isAttendeeWithEmail(
    attendee: ExportAttendee
  ): attendee is ExportAttendee & { email: string } {
    return attendee.email !== undefined && attendee.email !== '';
  }

  /**
   * Get attendees that have email addresses
   *
   * @param attendees - Array of attendees
   * @returns Attendees with email addresses
   */
  private getAttendeesWithEmail(
    attendees: readonly ExportAttendee[]
  ): Array<ExportAttendee & { email: string }> {
    const result: Array<ExportAttendee & { email: string }> = [];
    for (const attendee of attendees) {
      if (this.isAttendeeWithEmail(attendee)) {
        result.push(attendee);
      }
    }
    return result;
  }

  /**
   * Create permission members from attendees
   *
   * @param attendees - Attendees with email addresses
   * @param permission - Permission level to grant
   * @returns Array of permission members
   */
  private createPermissionMembers(
    attendees: readonly (ExportAttendee & { email: string })[],
    permission: 'view' | 'edit'
  ): PermissionMember[] {
    return attendees.map((attendee) => ({
      type: 'email' as const,
      id: attendee.email,
      permission,
    }));
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a DocsExportService instance using environment configuration
 *
 * @returns New DocsExportService instance
 *
 * @example
 * ```typescript
 * const service = createDocsExportService();
 * const result = await service.exportMinutes(accessToken, input);
 * ```
 */
export function createDocsExportService(): DocsExportService {
  const larkClient = createLarkClient();
  const docsClient = new DocsClient(larkClient);
  return new DocsExportService(docsClient);
}
