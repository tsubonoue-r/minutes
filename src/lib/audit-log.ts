/**
 * Audit logging for security-critical operations
 * @module lib/audit-log
 *
 * Records user actions in structured JSON format for:
 * - Security monitoring and incident investigation
 * - Compliance and accountability tracking
 * - Operation history for minutes lifecycle
 */

/**
 * Log severity levels
 */
export type AuditLogLevel = 'info' | 'warn' | 'critical';

/**
 * Categories of auditable actions
 */
export type AuditActionCategory =
  | 'auth'
  | 'minutes'
  | 'meeting'
  | 'template'
  | 'export'
  | 'admin'
  | 'api'
  | 'security';

/**
 * Specific auditable action types
 */
export type AuditAction =
  // Authentication
  | 'auth.login'
  | 'auth.logout'
  | 'auth.token_refresh'
  | 'auth.login_failed'
  | 'auth.session_expired'
  // Minutes operations
  | 'minutes.generate'
  | 'minutes.update'
  | 'minutes.delete'
  | 'minutes.approve'
  | 'minutes.reject'
  | 'minutes.export'
  // Meeting operations
  | 'meeting.create'
  | 'meeting.update'
  | 'meeting.delete'
  // Template operations
  | 'template.create'
  | 'template.update'
  | 'template.delete'
  // Export operations
  | 'export.markdown'
  | 'export.pdf'
  | 'export.lark_doc'
  // Admin operations
  | 'admin.config_change'
  | 'admin.user_manage'
  // API operations
  | 'api.rate_limited'
  | 'api.unauthorized'
  | 'api.error'
  // Security events
  | 'security.xss_attempt'
  | 'security.sql_injection_attempt'
  | 'security.path_traversal_attempt'
  | 'security.suspicious_activity';

/**
 * Actor performing the action
 */
export interface AuditActor {
  /** User ID (open_id from Lark) */
  readonly userId?: string | undefined;
  /** User display name */
  readonly userName?: string | undefined;
  /** IP address */
  readonly ip?: string | undefined;
  /** User agent string */
  readonly userAgent?: string | undefined;
}

/**
 * Target of the action
 */
export interface AuditTarget {
  /** Target resource type */
  readonly type: string;
  /** Target resource ID */
  readonly id?: string | undefined;
  /** Target resource name/title */
  readonly name?: string | undefined;
}

/**
 * Structured audit log entry
 */
export interface AuditLogEntry {
  /** Unique log entry ID */
  readonly id: string;
  /** ISO 8601 timestamp */
  readonly timestamp: string;
  /** Log severity level */
  readonly level: AuditLogLevel;
  /** Action category */
  readonly category: AuditActionCategory;
  /** Specific action performed */
  readonly action: AuditAction;
  /** Actor who performed the action */
  readonly actor: AuditActor;
  /** Target of the action */
  readonly target?: AuditTarget | undefined;
  /** Additional context/metadata */
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
  /** Whether the action was successful */
  readonly success: boolean;
  /** Error message if action failed */
  readonly errorMessage?: string | undefined;
  /** Request ID for correlation */
  readonly requestId?: string | undefined;
  /** Duration of the operation in milliseconds */
  readonly durationMs?: number | undefined;
}

/**
 * Audit log configuration
 */
export interface AuditLogConfig {
  /** Minimum log level to record (default: 'info') */
  readonly minLevel: AuditLogLevel;
  /** Whether to output to console (default: true in development) */
  readonly consoleOutput: boolean;
  /** Maximum entries to keep in memory buffer (default: 1000) */
  readonly maxBufferSize: number;
  /** Whether to include stack traces for errors (default: false) */
  readonly includeStackTrace: boolean;
}

/**
 * Default audit log configuration
 */
export const DEFAULT_AUDIT_LOG_CONFIG: AuditLogConfig = {
  minLevel: 'info',
  consoleOutput: process.env.NODE_ENV !== 'production',
  maxBufferSize: 1000,
  includeStackTrace: false,
};

/**
 * Log level priority for comparison
 */
const LOG_LEVEL_PRIORITY: Readonly<Record<AuditLogLevel, number>> = {
  info: 0,
  warn: 1,
  critical: 2,
};

/**
 * In-memory log buffer for recent entries
 * In production, this should be replaced with a persistent store
 */
const logBuffer: AuditLogEntry[] = [];

/**
 * Current configuration
 */
let currentConfig: AuditLogConfig = { ...DEFAULT_AUDIT_LOG_CONFIG };

/**
 * Generate a unique ID for log entries
 *
 * @returns Unique log entry ID
 */
function generateLogId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `audit_${timestamp}_${random}`;
}

/**
 * Get the category from an action string
 *
 * @param action - Audit action
 * @returns Action category
 */
function getCategoryFromAction(action: AuditAction): AuditActionCategory {
  const category = action.split('.')[0];
  if (category === undefined) {
    return 'api';
  }
  return category as AuditActionCategory;
}

/**
 * Determine if a log entry should be recorded based on level
 *
 * @param entryLevel - Level of the log entry
 * @param minLevel - Minimum configured level
 * @returns Whether to record the entry
 */
function shouldLog(entryLevel: AuditLogLevel, minLevel: AuditLogLevel): boolean {
  return LOG_LEVEL_PRIORITY[entryLevel] >= LOG_LEVEL_PRIORITY[minLevel];
}

/**
 * Format a log entry for console output
 *
 * @param entry - Audit log entry
 * @returns Formatted string for console
 */
function formatForConsole(entry: AuditLogEntry): string {
  const status = entry.success ? 'OK' : 'FAIL';
  const actor = entry.actor.userName ?? entry.actor.userId ?? 'unknown';
  const target = entry.target !== undefined
    ? ` -> ${entry.target.type}${entry.target.id !== undefined ? `:${entry.target.id}` : ''}`
    : '';
  const duration = entry.durationMs !== undefined ? ` (${entry.durationMs}ms)` : '';
  const error = entry.errorMessage !== undefined ? ` [${entry.errorMessage}]` : '';

  return `[AUDIT][${entry.level.toUpperCase()}] ${entry.timestamp} | ${status} | ${actor} | ${entry.action}${target}${duration}${error}`;
}

/**
 * Configure the audit logger
 *
 * @param config - Partial configuration to merge with defaults
 */
export function configureAuditLog(config: Partial<AuditLogConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Record an audit log entry
 *
 * @param params - Log entry parameters
 * @returns The created log entry
 */
export function auditLog(params: {
  readonly level: AuditLogLevel;
  readonly action: AuditAction;
  readonly actor: AuditActor;
  readonly target?: AuditTarget;
  readonly metadata?: Record<string, unknown>;
  readonly success: boolean;
  readonly errorMessage?: string;
  readonly requestId?: string;
  readonly durationMs?: number;
}): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    level: params.level,
    category: getCategoryFromAction(params.action),
    action: params.action,
    actor: params.actor,
    target: params.target,
    metadata: params.metadata !== undefined
      ? Object.freeze({ ...params.metadata })
      : undefined,
    success: params.success,
    errorMessage: params.errorMessage,
    requestId: params.requestId,
    durationMs: params.durationMs,
  };

  // Check if we should record this level
  if (!shouldLog(entry.level, currentConfig.minLevel)) {
    return entry;
  }

  // Add to buffer (FIFO, remove oldest if full)
  if (logBuffer.length >= currentConfig.maxBufferSize) {
    logBuffer.shift();
  }
  logBuffer.push(entry);

  // Console output
  if (currentConfig.consoleOutput) {
    const formatted = formatForConsole(entry);
    switch (entry.level) {
      case 'critical':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  return entry;
}

/**
 * Convenience: Log an info-level audit event
 */
export function auditInfo(
  action: AuditAction,
  actor: AuditActor,
  options: {
    readonly target?: AuditTarget;
    readonly metadata?: Record<string, unknown>;
    readonly requestId?: string;
    readonly durationMs?: number;
  } = {}
): AuditLogEntry {
  return auditLog({
    level: 'info',
    action,
    actor,
    success: true,
    ...options,
  });
}

/**
 * Convenience: Log a warning-level audit event
 */
export function auditWarn(
  action: AuditAction,
  actor: AuditActor,
  options: {
    readonly target?: AuditTarget;
    readonly metadata?: Record<string, unknown>;
    readonly errorMessage?: string;
    readonly requestId?: string;
  } = {}
): AuditLogEntry {
  return auditLog({
    level: 'warn',
    action,
    actor,
    success: false,
    ...options,
  });
}

/**
 * Convenience: Log a critical-level audit event
 */
export function auditCritical(
  action: AuditAction,
  actor: AuditActor,
  options: {
    readonly target?: AuditTarget;
    readonly metadata?: Record<string, unknown>;
    readonly errorMessage?: string;
    readonly requestId?: string;
  } = {}
): AuditLogEntry {
  return auditLog({
    level: 'critical',
    action,
    actor,
    success: false,
    ...options,
  });
}

/**
 * Get recent audit log entries from the buffer
 *
 * @param limit - Maximum number of entries to return (default: 100)
 * @param filter - Optional filter criteria
 * @returns Array of matching log entries (newest first)
 */
export function getRecentLogs(
  limit: number = 100,
  filter?: {
    readonly level?: AuditLogLevel;
    readonly category?: AuditActionCategory;
    readonly action?: AuditAction;
    readonly userId?: string;
    readonly success?: boolean;
  }
): readonly AuditLogEntry[] {
  let entries = [...logBuffer];

  if (filter !== undefined) {
    if (filter.level !== undefined) {
      entries = entries.filter((e) => e.level === filter.level);
    }
    if (filter.category !== undefined) {
      entries = entries.filter((e) => e.category === filter.category);
    }
    if (filter.action !== undefined) {
      entries = entries.filter((e) => e.action === filter.action);
    }
    if (filter.userId !== undefined) {
      entries = entries.filter((e) => e.actor.userId === filter.userId);
    }
    if (filter.success !== undefined) {
      entries = entries.filter((e) => e.success === filter.success);
    }
  }

  // Return newest first, limited
  return entries.slice(-limit).reverse();
}

/**
 * Clear the log buffer (primarily for testing)
 */
export function clearLogBuffer(): void {
  logBuffer.length = 0;
}

/**
 * Get the current buffer size
 *
 * @returns Number of entries in the buffer
 */
export function getLogBufferSize(): number {
  return logBuffer.length;
}

/**
 * Create an actor from request headers
 *
 * @param headers - Request headers
 * @param userId - Optional user ID
 * @param userName - Optional user name
 * @returns AuditActor object
 */
export function createActorFromRequest(
  headers: Headers,
  userId?: string,
  userName?: string
): AuditActor {
  const xForwardedFor = headers.get('x-forwarded-for');
  const ip = xForwardedFor !== null
    ? (xForwardedFor.split(',')[0]?.trim() ?? '127.0.0.1')
    : (headers.get('x-real-ip') ?? '127.0.0.1');

  return {
    userId,
    userName,
    ip,
    userAgent: headers.get('user-agent') ?? undefined,
  };
}
