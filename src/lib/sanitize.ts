/**
 * Input sanitization utilities for security
 * @module lib/sanitize
 *
 * Provides protection against:
 * - XSS (Cross-Site Scripting) via HTML tag stripping
 * - SQL Injection (for Lark API parameters)
 * - Path Traversal attacks
 * - Buffer overflow via string length limits
 */

/**
 * Sanitization options
 */
export interface SanitizeOptions {
  /** Maximum allowed string length (default: 10000) */
  readonly maxLength: number;
  /** Whether to trim whitespace (default: true) */
  readonly trim: boolean;
  /** Whether to strip HTML tags (default: true) */
  readonly stripHtml: boolean;
  /** Whether to check for SQL injection patterns (default: true) */
  readonly checkSqlInjection: boolean;
  /** Whether to check for path traversal (default: true) */
  readonly checkPathTraversal: boolean;
  /** Custom allowed HTML tags (empty = strip all) */
  readonly allowedTags: readonly string[];
}

/**
 * Sanitization result
 */
export interface SanitizeResult {
  /** The sanitized value */
  readonly value: string;
  /** Whether the original value was modified */
  readonly wasModified: boolean;
  /** List of sanitization actions applied */
  readonly actions: readonly string[];
  /** Whether potentially dangerous content was detected */
  readonly hasDangerousContent: boolean;
}

/**
 * Default sanitization options
 */
export const DEFAULT_SANITIZE_OPTIONS: SanitizeOptions = {
  maxLength: 10000,
  trim: true,
  stripHtml: true,
  checkSqlInjection: true,
  checkPathTraversal: true,
  allowedTags: [],
};

/**
 * SQL injection patterns to detect
 * These patterns match common SQL injection attempts
 */
const SQL_INJECTION_PATTERNS: readonly RegExp[] = [
  // SELECT/INSERT/UPDATE/DELETE followed by SQL-like syntax (FROM, INTO, SET, WHERE, etc.)
  /\b(SELECT)\b\s+.+\bFROM\b/i,
  /\b(INSERT)\b\s+\bINTO\b/i,
  /\b(UPDATE)\b\s+\S+\s+\bSET\b/i,
  /\b(DELETE)\b\s+\bFROM\b/i,
  /\b(DROP)\b\s+\b(TABLE|DATABASE|INDEX)\b/i,
  /\b(ALTER)\b\s+\b(TABLE|DATABASE)\b/i,
  /\b(UNION)\b\s+\b(SELECT|ALL)\b/i,
  /\b(EXEC|EXECUTE)\b\s+/i,
  // Tautology patterns
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
  // SQL comments (-- followed by space or end, or /* block comment)
  /(--\s|--$|\/\*)/,
  // SQL functions used in injection
  /(\b(CONCAT|CHAR|SUBSTRING|ASCII|HEX|UNHEX)\s*\()/i,
  // Stacked queries with SQL keywords
  /(;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER))/i,
  // String-based tautology
  /('\s*(OR|AND)\s*')/i,
  // Time-based injection
  /(SLEEP\s*\(\s*\d+\s*\))/i,
  /(BENCHMARK\s*\()/i,
  // File operations
  /(LOAD_FILE\s*\()/i,
  /(INTO\s+(OUT|DUMP)FILE)/i,
];

/**
 * Path traversal patterns to detect
 */
const PATH_TRAVERSAL_PATTERNS: readonly RegExp[] = [
  /\.\.\//,
  /\.\.\\/,
  /%2e%2e%2f/i,
  /%2e%2e\//i,
  /\.\.%2f/i,
  /%2e%2e%5c/i,
  /\.\.%5c/i,
  /%252e%252e%252f/i,
  /\.\.[/\\]/,
];

/**
 * HTML tag regex pattern
 */
const HTML_TAG_PATTERN = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g;

/**
 * Dangerous HTML content patterns (script, event handlers, etc.)
 */
const DANGEROUS_HTML_PATTERNS: readonly RegExp[] = [
  /<script\b[^>]*>[\s\S]*?<\/script>/i,
  /<script\b[^>]*><\/script>/i,
  /on\w+\s*=\s*["'][^"']*["']/i,
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
  /vbscript\s*:/i,
  /<iframe\b[^>]*>/i,
  /<object\b[^>]*>/i,
  /<embed\b[^>]*>/i,
  /<link\b[^>]*>/i,
  /<meta\b[^>]*>/i,
];

/**
 * Strip HTML tags from a string, optionally preserving allowed tags
 *
 * @param input - String to strip HTML from
 * @param allowedTags - Tags to preserve (empty array = strip all)
 * @returns String with HTML tags removed
 */
export function stripHtmlTags(input: string, allowedTags: readonly string[] = []): string {
  if (allowedTags.length === 0) {
    return input.replace(HTML_TAG_PATTERN, '');
  }

  const allowedSet = new Set(allowedTags.map((t) => t.toLowerCase()));

  return input.replace(HTML_TAG_PATTERN, (match, tagName: string) => {
    if (allowedSet.has(tagName.toLowerCase())) {
      return match;
    }
    return '';
  });
}

/**
 * Check if a string contains SQL injection patterns
 *
 * @param input - String to check
 * @returns True if SQL injection patterns are detected
 */
export function hasSqlInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Neutralize SQL injection patterns by escaping dangerous characters
 *
 * @param input - String to sanitize
 * @returns Sanitized string with SQL-dangerous characters escaped
 */
export function escapeSqlChars(input: string): string {
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/--/g, '\\-\\-');
}

/**
 * Check if a string contains path traversal patterns
 *
 * @param input - String to check
 * @returns True if path traversal patterns are detected
 */
export function hasPathTraversal(input: string): boolean {
  return PATH_TRAVERSAL_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Sanitize a path string by removing traversal sequences
 *
 * @param input - Path string to sanitize
 * @returns Sanitized path string
 */
export function sanitizePath(input: string): string {
  let result = input;

  // Decode URL-encoded sequences first
  try {
    result = decodeURIComponent(result);
  } catch {
    // If decoding fails, continue with original
  }

  // Remove path traversal sequences
  result = result.replace(/\.\.[/\\]/g, '');
  result = result.replace(/[/\\]\.\./g, '');

  // Remove null bytes
  result = result.replace(/\0/g, '');

  // Normalize path separators
  result = result.replace(/\\/g, '/');

  // Remove leading slashes (prevent absolute path access)
  result = result.replace(/^\/+/, '');

  return result;
}

/**
 * Check if a string contains dangerous HTML content
 *
 * @param input - String to check
 * @returns True if dangerous HTML patterns are detected
 */
export function hasDangerousHtml(input: string): boolean {
  return DANGEROUS_HTML_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Encode HTML entities to prevent XSS
 *
 * @param input - String to encode
 * @returns String with HTML entities encoded
 */
export function encodeHtmlEntities(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitize a string with comprehensive security checks
 *
 * @param input - String to sanitize
 * @param options - Sanitization options (merged with defaults)
 * @returns Sanitization result with cleaned value and metadata
 */
export function sanitize(
  input: string,
  options: Partial<SanitizeOptions> = {}
): SanitizeResult {
  const config: SanitizeOptions = { ...DEFAULT_SANITIZE_OPTIONS, ...options };
  const actions: string[] = [];
  let value = input;
  let hasDangerousContent = false;

  // 1. Trim whitespace
  if (config.trim) {
    const trimmed = value.trim();
    if (trimmed !== value) {
      actions.push('trimmed');
      value = trimmed;
    }
  }

  // 2. Enforce length limit
  if (value.length > config.maxLength) {
    value = value.slice(0, config.maxLength);
    actions.push(`truncated_to_${config.maxLength}`);
  }

  // 3. Remove null bytes
  if (value.includes('\0')) {
    value = value.replace(/\0/g, '');
    actions.push('removed_null_bytes');
    hasDangerousContent = true;
  }

  // 4. Check and strip dangerous HTML
  if (config.stripHtml) {
    if (hasDangerousHtml(value)) {
      hasDangerousContent = true;
      actions.push('dangerous_html_detected');
    }

    const stripped = stripHtmlTags(value, config.allowedTags);
    if (stripped !== value) {
      value = stripped;
      actions.push('html_stripped');
    }
  }

  // 5. Check SQL injection patterns
  if (config.checkSqlInjection && hasSqlInjection(value)) {
    hasDangerousContent = true;
    actions.push('sql_injection_detected');
    value = escapeSqlChars(value);
    actions.push('sql_chars_escaped');
  }

  // 6. Check path traversal
  if (config.checkPathTraversal && hasPathTraversal(value)) {
    hasDangerousContent = true;
    actions.push('path_traversal_detected');
    value = sanitizePath(value);
    actions.push('path_sanitized');
  }

  const wasModified = value !== input;

  return {
    value,
    wasModified,
    actions,
    hasDangerousContent,
  };
}

/**
 * Sanitize an object's string properties recursively
 *
 * @param obj - Object to sanitize
 * @param options - Sanitization options
 * @returns New object with sanitized string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: Partial<SanitizeOptions> = {}
): { readonly value: T; readonly hasDangerousContent: boolean } {
  let hasDangerousContent = false;

  function sanitizeValue(val: unknown): unknown {
    if (typeof val === 'string') {
      const result = sanitize(val, options);
      if (result.hasDangerousContent) {
        hasDangerousContent = true;
      }
      return result.value;
    }

    if (Array.isArray(val)) {
      return val.map(sanitizeValue);
    }

    if (val !== null && typeof val === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(val)) {
        sanitized[key] = sanitizeValue(value);
      }
      return sanitized;
    }

    return val;
  }

  const sanitizedValue = sanitizeValue(obj) as T;

  return {
    value: sanitizedValue,
    hasDangerousContent,
  };
}

/**
 * Validate and sanitize a Lark API parameter
 * Applies stricter sanitization for API query parameters
 *
 * @param param - Parameter value to sanitize
 * @param maxLength - Maximum allowed length (default: 255)
 * @returns Sanitized parameter value
 */
export function sanitizeLarkApiParam(param: string, maxLength: number = 255): string {
  const result = sanitize(param, {
    maxLength,
    stripHtml: true,
    checkSqlInjection: true,
    checkPathTraversal: true,
    trim: true,
  });

  // Additional Lark-specific sanitization:
  // Remove control characters except newline and tab
  const value = result.value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return value;
}
