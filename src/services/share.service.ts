/**
 * Share service for managing share links
 * @module services/share.service
 *
 * Uses in-memory storage for now. In production, this would integrate
 * with Lark Bitable or another persistent store.
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import type {
  ShareLink,
  CreateShareLinkInput,
} from '@/types/share';
import {
  generateShareId,
  generateShareToken,
  calculateExpiresAt,
  isShareLinkExpired,
} from '@/types/share';

// =============================================================================
// Password Hashing Utilities
// =============================================================================

/**
 * Hash a password with a random salt using SHA-256
 * Returns "salt:hash" format
 */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256')
    .update(salt + password)
    .digest('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored "salt:hash" value using constant-time comparison
 */
function verifyPassword(password: string, storedHash: string): boolean {
  const colonIndex = storedHash.indexOf(':');
  if (colonIndex === -1) return false;

  const salt = storedHash.substring(0, colonIndex);
  const expectedHash = storedHash.substring(colonIndex + 1);
  const actualHash = createHash('sha256')
    .update(salt + password)
    .digest('hex');

  try {
    return timingSafeEqual(
      Buffer.from(expectedHash, 'hex'),
      Buffer.from(actualHash, 'hex')
    );
  } catch {
    return false;
  }
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Share service error
 */
export class ShareServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'ShareServiceError';
  }
}

// =============================================================================
// In-Memory Storage
// =============================================================================

/**
 * In-memory store for share links
 * Key: share link ID
 */
let shareLinkStore: Map<string, ShareLink> = new Map();

/**
 * Token-to-ID index for fast lookup by token
 */
let tokenIndex: Map<string, string> = new Map();

/**
 * Meeting-to-IDs index for fast lookup by meeting
 */
let meetingIndex: Map<string, Set<string>> = new Map();

/**
 * Reset the in-memory storage (used in tests)
 */
export function resetShareStorage(): void {
  shareLinkStore = new Map();
  tokenIndex = new Map();
  meetingIndex = new Map();
}

// =============================================================================
// Service Class
// =============================================================================

/**
 * Service for managing share links
 *
 * Provides CRUD operations for share links with an in-memory store.
 * All methods are async to facilitate future migration to persistent storage.
 */
export class ShareService {
  /**
   * Create a new share link for a meeting
   *
   * @param input - Share link creation input
   * @param userId - ID of the user creating the link
   * @returns The created share link
   * @throws ShareServiceError if creation fails
   */
  async createShareLink(
    input: CreateShareLinkInput,
    userId: string
  ): Promise<ShareLink> {
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

    // Build with optional fields for exactOptionalPropertyTypes compliance
    let shareLink = base;
    if (expiresAt !== undefined) {
      shareLink = { ...shareLink, expiresAt };
    }
    if (input.password !== undefined) {
      shareLink = { ...shareLink, password: hashPassword(input.password) };
    }

    // Store
    shareLinkStore.set(shareLink.id, shareLink);
    tokenIndex.set(shareLink.token, shareLink.id);

    // Update meeting index
    const meetingLinks = meetingIndex.get(shareLink.meetingId) ?? new Set();
    meetingLinks.add(shareLink.id);
    meetingIndex.set(shareLink.meetingId, meetingLinks);

    return shareLink;
  }

  /**
   * Get a share link by its token
   *
   * @param token - The share token
   * @returns The share link if found, null otherwise
   */
  async getShareLink(token: string): Promise<ShareLink | null> {
    const id = tokenIndex.get(token);
    if (id === undefined) {
      return null;
    }

    const shareLink = shareLinkStore.get(id);
    if (shareLink === undefined) {
      return null;
    }

    return shareLink;
  }

  /**
   * Get a share link by its ID
   *
   * @param id - The share link ID
   * @returns The share link if found, null otherwise
   */
  async getShareLinkById(id: string): Promise<ShareLink | null> {
    const shareLink = shareLinkStore.get(id);
    return shareLink ?? null;
  }

  /**
   * Deactivate a share link
   *
   * @param id - The share link ID to deactivate
   * @param userId - The user performing the deactivation
   * @throws ShareServiceError if link not found or user not authorized
   */
  async deactivateShareLink(id: string, userId: string): Promise<void> {
    const shareLink = shareLinkStore.get(id);
    if (shareLink === undefined) {
      throw new ShareServiceError(
        'Share link not found',
        'SHARE_LINK_NOT_FOUND',
        404
      );
    }

    if (shareLink.createdBy !== userId) {
      throw new ShareServiceError(
        'Not authorized to deactivate this share link',
        'UNAUTHORIZED',
        403
      );
    }

    const updatedLink: ShareLink = {
      ...shareLink,
      isActive: false,
    };

    shareLinkStore.set(id, updatedLink);
  }

  /**
   * Get all share links for a meeting
   *
   * @param meetingId - The meeting ID
   * @returns Array of share links for the meeting
   */
  async getShareLinksForMeeting(meetingId: string): Promise<ShareLink[]> {
    const linkIds = meetingIndex.get(meetingId);
    if (linkIds === undefined) {
      return [];
    }

    const links: ShareLink[] = [];
    for (const id of linkIds) {
      const link = shareLinkStore.get(id);
      if (link !== undefined) {
        links.push(link);
      }
    }

    // Sort by creation date, newest first
    links.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return links;
  }

  /**
   * Validate access to a shared resource
   *
   * Checks if the token is valid, the link is active, not expired,
   * and optionally verifies the password.
   *
   * @param token - The share token
   * @param password - The password if the link is password-protected
   * @returns Validation result with validity flag and meeting ID
   */
  async validateAccess(
    token: string,
    password?: string
  ): Promise<{ readonly valid: boolean; readonly meetingId?: string; readonly requiresPassword?: boolean }> {
    const shareLink = await this.getShareLink(token);

    if (shareLink === null) {
      return { valid: false };
    }

    if (!shareLink.isActive) {
      return { valid: false };
    }

    if (isShareLinkExpired(shareLink)) {
      return { valid: false };
    }

    // Check password if the link is password-protected
    if (shareLink.password !== undefined) {
      if (password === undefined) {
        return { valid: false, requiresPassword: true };
      }
      // Constant-time comparison via crypto.timingSafeEqual
      if (!verifyPassword(password, shareLink.password)) {
        return { valid: false };
      }
    }

    // Increment access count
    const updatedLink: ShareLink = {
      ...shareLink,
      accessCount: shareLink.accessCount + 1,
    };
    shareLinkStore.set(shareLink.id, updatedLink);

    return { valid: true, meetingId: shareLink.meetingId };
  }
}

/**
 * Create a new ShareService instance
 *
 * @returns ShareService instance
 */
export function createShareService(): ShareService {
  return new ShareService();
}
