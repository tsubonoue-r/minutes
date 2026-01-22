/**
 * Export (Lark Docs) related type definitions
 * @module types/export
 */

import type { Speaker } from './minutes';

// ============================================================================
// Export Status Types
// ============================================================================

/**
 * Export progress status
 */
export type ExportStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'setting_permissions'
  | 'completed'
  | 'error';

/**
 * Permission level for shared documents
 */
export type ExportPermission = 'view' | 'edit';

// ============================================================================
// Export Options and Result Types
// ============================================================================

/**
 * Options for exporting minutes to Lark Docs
 */
export interface ExportOptions {
  /** Custom document title (defaults to minutes title) */
  readonly title?: string | undefined;
  /** Target folder ID in Lark Docs */
  readonly folderId?: string | undefined;
  /** Whether to share with meeting attendees */
  readonly shareWithAttendees: boolean;
  /** Permission level for shared users */
  readonly permission: ExportPermission;
}

/**
 * Result of a successful export operation
 */
export interface ExportResult {
  /** URL to the created Lark Doc */
  readonly documentUrl: string;
  /** Document ID in Lark Docs */
  readonly documentId: string;
  /** Final document title */
  readonly documentTitle: string;
  /** Timestamp when export completed */
  readonly exportedAt: string;
  /** List of users the document was shared with */
  readonly sharedWith: readonly string[];
}

/**
 * Export error information
 */
export interface ExportError {
  /** Error code */
  readonly code: string;
  /** Human-readable error message */
  readonly message: string;
  /** Additional error details */
  readonly details?: Record<string, unknown> | undefined;
}

// ============================================================================
// Export State Types
// ============================================================================

/**
 * Export progress state
 */
export interface ExportProgress {
  /** Current export status */
  readonly status: ExportStatus;
  /** Progress percentage (0-100) */
  readonly progress: number;
  /** Current step description */
  readonly currentStep?: string | undefined;
}

/**
 * Complete export state
 */
export interface ExportState {
  /** Whether export is in progress */
  readonly isExporting: boolean;
  /** Current progress information */
  readonly progress: ExportProgress;
  /** Result when export completes successfully */
  readonly result?: ExportResult | undefined;
  /** Error information when export fails */
  readonly error?: ExportError | undefined;
}

// ============================================================================
// Attendee Type for Export
// ============================================================================

/**
 * Attendee information for export sharing
 * Extended from Speaker with email for sharing
 */
export interface ExportAttendee extends Speaker {
  /** Email address for sharing (optional) */
  readonly email?: string | undefined;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create default export options
 *
 * @returns Default ExportOptions object
 */
export function createDefaultExportOptions(): ExportOptions {
  return {
    shareWithAttendees: false,
    permission: 'view',
  };
}

/**
 * Create initial export state
 *
 * @returns Initial ExportState object
 */
export function createInitialExportState(): ExportState {
  return {
    isExporting: false,
    progress: {
      status: 'idle',
      progress: 0,
    },
  };
}

/**
 * Get display text for export status
 *
 * @param status - Export status
 * @returns Human-readable status text
 */
export function getExportStatusText(status: ExportStatus): string {
  const statusTexts: Record<ExportStatus, string> = {
    idle: 'Ready to export',
    uploading: 'Uploading content...',
    processing: 'Creating document...',
    setting_permissions: 'Setting permissions...',
    completed: 'Export completed',
    error: 'Export failed',
  };
  return statusTexts[status];
}

/**
 * Check if export is in a terminal state
 *
 * @param status - Export status to check
 * @returns True if export is completed or errored
 */
export function isExportTerminalState(status: ExportStatus): boolean {
  return status === 'completed' || status === 'error';
}

/**
 * Calculate progress percentage based on status
 *
 * @param status - Current export status
 * @returns Progress percentage (0-100)
 */
export function getProgressForStatus(status: ExportStatus): number {
  const progressMap: Record<ExportStatus, number> = {
    idle: 0,
    uploading: 25,
    processing: 50,
    setting_permissions: 75,
    completed: 100,
    error: 0,
  };
  return progressMap[status];
}
