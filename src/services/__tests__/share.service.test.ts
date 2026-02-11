/**
 * Share Service Tests
 * @module services/__tests__/share.service.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ShareService,
  ShareServiceError,
  resetShareStorage,
} from '../share.service';

describe('ShareService', () => {
  let service: ShareService;

  beforeEach(() => {
    resetShareStorage();
    service = new ShareService();
  });

  // ===========================================================================
  // createShareLink
  // ===========================================================================

  describe('createShareLink', () => {
    it('should create a share link with minimal input', async () => {
      const link = await service.createShareLink(
        { meetingId: 'meeting-001' },
        'user-001'
      );

      expect(link.id).toMatch(/^shr_/);
      expect(link.meetingId).toBe('meeting-001');
      expect(link.token).toHaveLength(64);
      expect(link.isActive).toBe(true);
      expect(link.createdBy).toBe('user-001');
      expect(link.accessCount).toBe(0);
    });

    it('should create a share link with expiry', async () => {
      const link = await service.createShareLink(
        { meetingId: 'meeting-001', expiresIn: '7d' },
        'user-001'
      );

      expect(link.expiresAt).toBeDefined();
      const expiresAt = new Date(link.expiresAt!).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(expiresAt).toBeGreaterThan(Date.now() + sevenDaysMs - 2000);
    });

    it('should create a share link with password', async () => {
      const link = await service.createShareLink(
        { meetingId: 'meeting-001', password: 'secret123' },
        'user-001'
      );

      expect(link.password).toBe('secret123');
    });

    it('should create a share link without expiry for "never"', async () => {
      const link = await service.createShareLink(
        { meetingId: 'meeting-001', expiresIn: 'never' },
        'user-001'
      );

      expect(link.expiresAt).toBeUndefined();
    });

    it('should generate unique tokens', async () => {
      const link1 = await service.createShareLink(
        { meetingId: 'meeting-001' },
        'user-001'
      );
      const link2 = await service.createShareLink(
        { meetingId: 'meeting-001' },
        'user-001'
      );

      expect(link1.token).not.toBe(link2.token);
      expect(link1.id).not.toBe(link2.id);
    });
  });

  // ===========================================================================
  // getShareLink
  // ===========================================================================

  describe('getShareLink', () => {
    it('should retrieve a share link by token', async () => {
      const created = await service.createShareLink(
        { meetingId: 'meeting-001' },
        'user-001'
      );

      const found = await service.getShareLink(created.token);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.meetingId).toBe('meeting-001');
    });

    it('should return null for non-existent token', async () => {
      const found = await service.getShareLink('non-existent-token');
      expect(found).toBeNull();
    });
  });

  // ===========================================================================
  // getShareLinkById
  // ===========================================================================

  describe('getShareLinkById', () => {
    it('should retrieve a share link by ID', async () => {
      const created = await service.createShareLink(
        { meetingId: 'meeting-001' },
        'user-001'
      );

      const found = await service.getShareLinkById(created.id);
      expect(found).not.toBeNull();
      expect(found!.token).toBe(created.token);
    });

    it('should return null for non-existent ID', async () => {
      const found = await service.getShareLinkById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  // ===========================================================================
  // deactivateShareLink
  // ===========================================================================

  describe('deactivateShareLink', () => {
    it('should deactivate a share link', async () => {
      const created = await service.createShareLink(
        { meetingId: 'meeting-001' },
        'user-001'
      );

      await service.deactivateShareLink(created.id, 'user-001');

      const found = await service.getShareLinkById(created.id);
      expect(found).not.toBeNull();
      expect(found!.isActive).toBe(false);
    });

    it('should throw error for non-existent link', async () => {
      await expect(
        service.deactivateShareLink('non-existent-id', 'user-001')
      ).rejects.toThrow(ShareServiceError);

      await expect(
        service.deactivateShareLink('non-existent-id', 'user-001')
      ).rejects.toThrow('Share link not found');
    });

    it('should throw error when different user tries to deactivate', async () => {
      const created = await service.createShareLink(
        { meetingId: 'meeting-001' },
        'user-001'
      );

      await expect(
        service.deactivateShareLink(created.id, 'user-002')
      ).rejects.toThrow('Not authorized');
    });
  });

  // ===========================================================================
  // getShareLinksForMeeting
  // ===========================================================================

  describe('getShareLinksForMeeting', () => {
    it('should return empty array for meeting with no links', async () => {
      const links = await service.getShareLinksForMeeting('meeting-001');
      expect(links).toEqual([]);
    });

    it('should return all links for a meeting', async () => {
      await service.createShareLink(
        { meetingId: 'meeting-001' },
        'user-001'
      );
      await service.createShareLink(
        { meetingId: 'meeting-001' },
        'user-001'
      );
      await service.createShareLink(
        { meetingId: 'meeting-002' },
        'user-001'
      );

      const links = await service.getShareLinksForMeeting('meeting-001');
      expect(links).toHaveLength(2);
      expect(links.every((l) => l.meetingId === 'meeting-001')).toBe(true);
    });

    it('should sort links by creation date, newest first', async () => {
      const link1 = await service.createShareLink(
        { meetingId: 'meeting-001' },
        'user-001'
      );

      // Small delay to ensure different timestamps
      await new Promise<void>((resolve) => setTimeout(resolve, 10));

      const link2 = await service.createShareLink(
        { meetingId: 'meeting-001' },
        'user-001'
      );

      const links = await service.getShareLinksForMeeting('meeting-001');
      expect(links).toHaveLength(2);
      expect(links[0]!.id).toBe(link2.id);
      expect(links[1]!.id).toBe(link1.id);
    });
  });

  // ===========================================================================
  // validateAccess
  // ===========================================================================

  describe('validateAccess', () => {
    it('should return valid for active, non-expired link without password', async () => {
      const created = await service.createShareLink(
        { meetingId: 'meeting-001' },
        'user-001'
      );

      const result = await service.validateAccess(created.token);
      expect(result.valid).toBe(true);
      expect(result.meetingId).toBe('meeting-001');
    });

    it('should return invalid for non-existent token', async () => {
      const result = await service.validateAccess('non-existent-token');
      expect(result.valid).toBe(false);
    });

    it('should return invalid for deactivated link', async () => {
      const created = await service.createShareLink(
        { meetingId: 'meeting-001' },
        'user-001'
      );

      await service.deactivateShareLink(created.id, 'user-001');

      const result = await service.validateAccess(created.token);
      expect(result.valid).toBe(false);
    });

    it('should return requiresPassword when password not provided', async () => {
      const created = await service.createShareLink(
        { meetingId: 'meeting-001', password: 'secret123' },
        'user-001'
      );

      const result = await service.validateAccess(created.token);
      expect(result.valid).toBe(false);
      expect(result.requiresPassword).toBe(true);
    });

    it('should return valid when correct password provided', async () => {
      const created = await service.createShareLink(
        { meetingId: 'meeting-001', password: 'secret123' },
        'user-001'
      );

      const result = await service.validateAccess(created.token, 'secret123');
      expect(result.valid).toBe(true);
      expect(result.meetingId).toBe('meeting-001');
    });

    it('should return invalid when wrong password provided', async () => {
      const created = await service.createShareLink(
        { meetingId: 'meeting-001', password: 'secret123' },
        'user-001'
      );

      const result = await service.validateAccess(created.token, 'wrongpassword');
      expect(result.valid).toBe(false);
    });

    it('should increment access count on valid access', async () => {
      const created = await service.createShareLink(
        { meetingId: 'meeting-001' },
        'user-001'
      );

      await service.validateAccess(created.token);
      await service.validateAccess(created.token);

      const link = await service.getShareLinkById(created.id);
      expect(link!.accessCount).toBe(2);
    });

    it('should not increment access count on invalid access', async () => {
      const created = await service.createShareLink(
        { meetingId: 'meeting-001', password: 'secret123' },
        'user-001'
      );

      await service.validateAccess(created.token, 'wrongpassword');

      const link = await service.getShareLinkById(created.id);
      expect(link!.accessCount).toBe(0);
    });
  });

  // ===========================================================================
  // ShareServiceError
  // ===========================================================================

  describe('ShareServiceError', () => {
    it('should create error with defaults', () => {
      const error = new ShareServiceError('Test error', 'TEST_CODE');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('ShareServiceError');
    });

    it('should create error with custom status code', () => {
      const error = new ShareServiceError('Not found', 'NOT_FOUND', 404);
      expect(error.statusCode).toBe(404);
    });
  });
});
