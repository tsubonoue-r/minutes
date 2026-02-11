/**
 * Share link type definitions with Zod schemas
 * @module types/share
 */

import { z, type ZodSafeParseResult } from 'zod';

// =============================================================================
// Constants
// =============================================================================

/**
 * Expiry duration options for share links
 */
export const SHARE_EXPIRY_OPTIONS = {
  /** 1 day */
  ONE_DAY: '1d',
  /** 7 days */
  SEVEN_DAYS: '7d',
  /** 30 days */
  THIRTY_DAYS: '30d',
  /** Never expires */
  NEVER: 'never',
} as const;

/**
 * Expiry duration labels in Japanese
 */
export const SHARE_EXPIRY_LABELS: Record<ShareExpiryOption, string> = {
  '1d': '1日',
  '7d': '7日間',
  '30d': '30日間',
  'never': '無期限',
};

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Schema for share expiry option
 */
export const ShareExpiryOptionSchema = z.enum([
  SHARE_EXPIRY_OPTIONS.ONE_DAY,
  SHARE_EXPIRY_OPTIONS.SEVEN_DAYS,
  SHARE_EXPIRY_OPTIONS.THIRTY_DAYS,
  SHARE_EXPIRY_OPTIONS.NEVER,
]);

/**
 * Schema for a share link
 */
export const ShareLinkSchema = z.object({
  /** Unique share link identifier */
  id: z.string().min(1),
  /** Associated meeting ID */
  meetingId: z.string().min(1),
  /** Unique token for the share URL */
  token: z.string().min(32),
  /** Expiration timestamp (ISO 8601), undefined means never expires */
  expiresAt: z.string().datetime({ offset: true }).optional(),
  /** Optional password protection */
  password: z.string().optional(),
  /** Whether the link is currently active */
  isActive: z.boolean(),
  /** Creation timestamp (ISO 8601) */
  createdAt: z.string().datetime({ offset: true }),
  /** User ID of the creator */
  createdBy: z.string().min(1),
  /** Number of times the link has been accessed */
  accessCount: z.number().int().nonnegative(),
});

/**
 * Schema for creating a share link
 */
export const CreateShareLinkSchema = z.object({
  /** Meeting ID to share */
  meetingId: z.string().min(1),
  /** Expiry duration */
  expiresIn: ShareExpiryOptionSchema.optional(),
  /** Optional password (minimum 4 characters) */
  password: z.string().min(4).optional(),
});

/**
 * Schema for validating shared access
 */
export const ValidateShareAccessSchema = z.object({
  /** Share token */
  token: z.string().min(32),
  /** Password if required */
  password: z.string().optional(),
});

// =============================================================================
// Types (inferred from Zod schemas)
// =============================================================================

/**
 * Share expiry option type
 */
export type ShareExpiryOption = z.infer<typeof ShareExpiryOptionSchema>;

/**
 * Share link type
 */
export type ShareLink = z.infer<typeof ShareLinkSchema>;

/**
 * Create share link input type
 */
export type CreateShareLinkInput = z.infer<typeof CreateShareLinkSchema>;

/**
 * Validate share access input type
 */
export type ValidateShareAccessInput = z.infer<typeof ValidateShareAccessSchema>;

// =============================================================================
// Readonly Types (for immutable usage)
// =============================================================================

/**
 * Read-only ShareLink type
 */
export interface ReadonlyShareLink {
  readonly id: string;
  readonly meetingId: string;
  readonly token: string;
  readonly expiresAt?: string | undefined;
  readonly password?: string | undefined;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly accessCount: number;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique share link ID
 *
 * @param prefix - Prefix for the ID (default: 'shr')
 * @returns Unique share link ID
 */
export function generateShareId(prefix: string = 'shr'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate a cryptographically secure random token for share links
 *
 * @returns A 64-character hex string token
 */
export function generateShareToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate expiration date based on expiry option
 *
 * @param expiresIn - Expiry duration option
 * @returns ISO string of expiration date, or undefined for 'never'
 */
export function calculateExpiresAt(expiresIn: ShareExpiryOption | undefined): string | undefined {
  if (expiresIn === undefined || expiresIn === 'never') {
    return undefined;
  }

  const now = new Date();
  const durationMap: Record<string, number> = {
    '1d': 1 * 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  const durationMs = durationMap[expiresIn];
  if (durationMs === undefined) {
    return undefined;
  }

  return new Date(now.getTime() + durationMs).toISOString();
}

/**
 * Check if a share link has expired
 *
 * @param shareLink - The share link to check
 * @returns Whether the share link has expired
 */
export function isShareLinkExpired(shareLink: ShareLink): boolean {
  if (shareLink.expiresAt === undefined) {
    return false;
  }
  return new Date(shareLink.expiresAt).getTime() < Date.now();
}

/**
 * Check if a share link is valid (active and not expired)
 *
 * @param shareLink - The share link to check
 * @returns Whether the share link is valid
 */
export function isShareLinkValid(shareLink: ShareLink): boolean {
  return shareLink.isActive && !isShareLinkExpired(shareLink);
}

/**
 * Build the full share URL for a token
 *
 * @param token - Share token
 * @param baseUrl - Base URL of the application
 * @returns Full share URL
 */
export function buildShareUrl(token: string, baseUrl: string): string {
  const cleanBase = baseUrl.replace(/\/$/, '');
  return `${cleanBase}/shared/${token}`;
}

/**
 * Create a new share link object
 *
 * @param input - Create share link input
 * @param userId - ID of the user creating the link
 * @returns New ShareLink object
 */
export function createShareLink(
  input: CreateShareLinkInput,
  userId: string
): ShareLink {
  const now = new Date().toISOString();
  const link: ShareLink = {
    id: generateShareId(),
    meetingId: input.meetingId,
    token: generateShareToken(),
    isActive: true,
    createdAt: now,
    createdBy: userId,
    accessCount: 0,
  };

  // Build up with optional fields for exactOptionalPropertyTypes compliance
  let result = link;
  const expiresAt = calculateExpiresAt(input.expiresIn);
  if (expiresAt !== undefined) {
    result = { ...result, expiresAt };
  }
  if (input.password !== undefined) {
    result = { ...result, password: input.password };
  }

  return result;
}

/**
 * Create a share link with all optional fields
 *
 * @param input - Create share link input
 * @param userId - ID of the user creating the link
 * @returns New ShareLink object with all fields populated
 */
export function createShareLinkFull(
  input: CreateShareLinkInput,
  userId: string
): ShareLink {
  const now = new Date().toISOString();
  const expiresAt = calculateExpiresAt(input.expiresIn);

  const base: ShareLink = {
    id: generateShareId(),
    meetingId: input.meetingId,
    token: generateShareToken(),
    isActive: true,
    createdAt: now,
    createdBy: userId,
    accessCount: 0,
  };

  // Build up with optional fields for exactOptionalPropertyTypes compliance
  let result = base;
  if (expiresAt !== undefined) {
    result = { ...result, expiresAt };
  }
  if (input.password !== undefined) {
    result = { ...result, password: input.password };
  }

  return result;
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate a share link object
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateShareLink(data: unknown): ZodSafeParseResult<ShareLink> {
  return ShareLinkSchema.safeParse(data);
}

/**
 * Validate create share link input
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateCreateShareLinkInput(
  data: unknown
): ZodSafeParseResult<CreateShareLinkInput> {
  return CreateShareLinkSchema.safeParse(data);
}

/**
 * Validate share access input
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateShareAccessInput(
  data: unknown
): ZodSafeParseResult<ValidateShareAccessInput> {
  return ValidateShareAccessSchema.safeParse(data);
}
