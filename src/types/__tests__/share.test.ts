/**
 * Share type definitions tests
 * @module types/__tests__/share.test
 */

import { describe, it, expect } from 'vitest';
import {
  ShareLinkSchema,
  CreateShareLinkSchema,
  ValidateShareAccessSchema,
  generateShareId,
  generateShareToken,
  calculateExpiresAt,
  isShareLinkExpired,
  isShareLinkValid,
  buildShareUrl,
  createShareLinkFull,
  validateShareLink,
  validateCreateShareLinkInput,
  validateShareAccessInput,
  SHARE_EXPIRY_OPTIONS,
  SHARE_EXPIRY_LABELS,
} from '../share';
import type { ShareLink } from '../share';

// =============================================================================
// Schema Validation Tests
// =============================================================================

describe('ShareLinkSchema', () => {
  const validShareLink = {
    id: 'shr_test123',
    meetingId: 'meeting-001',
    token: 'a'.repeat(64),
    isActive: true,
    createdAt: '2025-01-15T10:00:00.000Z',
    createdBy: 'user-001',
    accessCount: 0,
  };

  it('should validate a valid share link', () => {
    const result = ShareLinkSchema.safeParse(validShareLink);
    expect(result.success).toBe(true);
  });

  it('should validate a share link with optional fields', () => {
    const result = ShareLinkSchema.safeParse({
      ...validShareLink,
      expiresAt: '2025-02-15T10:00:00.000Z',
      password: 'test1234',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty id', () => {
    const result = ShareLinkSchema.safeParse({
      ...validShareLink,
      id: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject token shorter than 32 chars', () => {
    const result = ShareLinkSchema.safeParse({
      ...validShareLink,
      token: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative accessCount', () => {
    const result = ShareLinkSchema.safeParse({
      ...validShareLink,
      accessCount: -1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid datetime format for expiresAt', () => {
    const result = ShareLinkSchema.safeParse({
      ...validShareLink,
      expiresAt: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateShareLinkSchema', () => {
  it('should validate minimal input', () => {
    const result = CreateShareLinkSchema.safeParse({
      meetingId: 'meeting-001',
    });
    expect(result.success).toBe(true);
  });

  it('should validate with all options', () => {
    const result = CreateShareLinkSchema.safeParse({
      meetingId: 'meeting-001',
      expiresIn: '7d',
      password: 'test1234',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty meetingId', () => {
    const result = CreateShareLinkSchema.safeParse({
      meetingId: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid expiry option', () => {
    const result = CreateShareLinkSchema.safeParse({
      meetingId: 'meeting-001',
      expiresIn: '2d',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 4 chars', () => {
    const result = CreateShareLinkSchema.safeParse({
      meetingId: 'meeting-001',
      password: '123',
    });
    expect(result.success).toBe(false);
  });

  it('should accept all valid expiry options', () => {
    const options = ['1d', '7d', '30d', 'never'] as const;
    for (const option of options) {
      const result = CreateShareLinkSchema.safeParse({
        meetingId: 'meeting-001',
        expiresIn: option,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('ValidateShareAccessSchema', () => {
  it('should validate with token only', () => {
    const result = ValidateShareAccessSchema.safeParse({
      token: 'a'.repeat(32),
    });
    expect(result.success).toBe(true);
  });

  it('should validate with token and password', () => {
    const result = ValidateShareAccessSchema.safeParse({
      token: 'a'.repeat(32),
      password: 'test1234',
    });
    expect(result.success).toBe(true);
  });

  it('should reject short token', () => {
    const result = ValidateShareAccessSchema.safeParse({
      token: 'short',
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('generateShareId', () => {
  it('should generate an ID with default prefix', () => {
    const id = generateShareId();
    expect(id).toMatch(/^shr_/);
  });

  it('should generate an ID with custom prefix', () => {
    const id = generateShareId('custom');
    expect(id).toMatch(/^custom_/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateShareId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('generateShareToken', () => {
  it('should generate a 64-character hex string', () => {
    const token = generateShareToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should generate unique tokens', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 50; i++) {
      tokens.add(generateShareToken());
    }
    expect(tokens.size).toBe(50);
  });
});

describe('calculateExpiresAt', () => {
  it('should return undefined for "never"', () => {
    const result = calculateExpiresAt('never');
    expect(result).toBeUndefined();
  });

  it('should return undefined for undefined input', () => {
    const result = calculateExpiresAt(undefined);
    expect(result).toBeUndefined();
  });

  it('should return a date 1 day from now for "1d"', () => {
    const before = Date.now();
    const result = calculateExpiresAt('1d');
    const after = Date.now();

    expect(result).toBeDefined();
    const resultTime = new Date(result!).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    expect(resultTime).toBeGreaterThanOrEqual(before + oneDayMs);
    expect(resultTime).toBeLessThanOrEqual(after + oneDayMs);
  });

  it('should return a date 7 days from now for "7d"', () => {
    const result = calculateExpiresAt('7d');
    expect(result).toBeDefined();
    const resultTime = new Date(result!).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(resultTime).toBeGreaterThan(Date.now() + sevenDaysMs - 1000);
  });

  it('should return a date 30 days from now for "30d"', () => {
    const result = calculateExpiresAt('30d');
    expect(result).toBeDefined();
    const resultTime = new Date(result!).getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(resultTime).toBeGreaterThan(Date.now() + thirtyDaysMs - 1000);
  });
});

describe('isShareLinkExpired', () => {
  it('should return false when no expiresAt is set', () => {
    const link: ShareLink = {
      id: 'shr_test',
      meetingId: 'meeting-001',
      token: 'a'.repeat(64),
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: 'user-001',
      accessCount: 0,
    };
    expect(isShareLinkExpired(link)).toBe(false);
  });

  it('should return true for a past expiry date', () => {
    const link: ShareLink = {
      id: 'shr_test',
      meetingId: 'meeting-001',
      token: 'a'.repeat(64),
      expiresAt: '2020-01-01T00:00:00.000Z',
      isActive: true,
      createdAt: '2020-01-01T00:00:00.000Z',
      createdBy: 'user-001',
      accessCount: 0,
    };
    expect(isShareLinkExpired(link)).toBe(true);
  });

  it('should return false for a future expiry date', () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const link: ShareLink = {
      id: 'shr_test',
      meetingId: 'meeting-001',
      token: 'a'.repeat(64),
      expiresAt: futureDate,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: 'user-001',
      accessCount: 0,
    };
    expect(isShareLinkExpired(link)).toBe(false);
  });
});

describe('isShareLinkValid', () => {
  it('should return true for active, non-expired link', () => {
    const link: ShareLink = {
      id: 'shr_test',
      meetingId: 'meeting-001',
      token: 'a'.repeat(64),
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: 'user-001',
      accessCount: 0,
    };
    expect(isShareLinkValid(link)).toBe(true);
  });

  it('should return false for inactive link', () => {
    const link: ShareLink = {
      id: 'shr_test',
      meetingId: 'meeting-001',
      token: 'a'.repeat(64),
      isActive: false,
      createdAt: new Date().toISOString(),
      createdBy: 'user-001',
      accessCount: 0,
    };
    expect(isShareLinkValid(link)).toBe(false);
  });

  it('should return false for expired link', () => {
    const link: ShareLink = {
      id: 'shr_test',
      meetingId: 'meeting-001',
      token: 'a'.repeat(64),
      expiresAt: '2020-01-01T00:00:00.000Z',
      isActive: true,
      createdAt: '2020-01-01T00:00:00.000Z',
      createdBy: 'user-001',
      accessCount: 0,
    };
    expect(isShareLinkValid(link)).toBe(false);
  });
});

describe('buildShareUrl', () => {
  it('should build a correct share URL', () => {
    const url = buildShareUrl('abc123', 'https://example.com');
    expect(url).toBe('https://example.com/shared/abc123');
  });

  it('should strip trailing slash from base URL', () => {
    const url = buildShareUrl('abc123', 'https://example.com/');
    expect(url).toBe('https://example.com/shared/abc123');
  });
});

describe('createShareLinkFull', () => {
  it('should create a share link with defaults', () => {
    const link = createShareLinkFull(
      { meetingId: 'meeting-001' },
      'user-001'
    );
    expect(link.meetingId).toBe('meeting-001');
    expect(link.createdBy).toBe('user-001');
    expect(link.isActive).toBe(true);
    expect(link.accessCount).toBe(0);
    expect(link.token).toHaveLength(64);
    expect(link.id).toMatch(/^shr_/);
  });

  it('should create a share link with expiry', () => {
    const link = createShareLinkFull(
      { meetingId: 'meeting-001', expiresIn: '7d' },
      'user-001'
    );
    expect(link.expiresAt).toBeDefined();
  });

  it('should create a share link with password', () => {
    const link = createShareLinkFull(
      { meetingId: 'meeting-001', password: 'test1234' },
      'user-001'
    );
    expect(link.password).toBe('test1234');
  });

  it('should create a share link without expiry for "never"', () => {
    const link = createShareLinkFull(
      { meetingId: 'meeting-001', expiresIn: 'never' },
      'user-001'
    );
    expect(link.expiresAt).toBeUndefined();
  });
});

// =============================================================================
// Validation Function Tests
// =============================================================================

describe('validateShareLink', () => {
  it('should return success for valid data', () => {
    const result = validateShareLink({
      id: 'shr_test',
      meetingId: 'meeting-001',
      token: 'a'.repeat(64),
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: 'user-001',
      accessCount: 0,
    });
    expect(result.success).toBe(true);
  });

  it('should return failure for invalid data', () => {
    const result = validateShareLink({ invalid: true });
    expect(result.success).toBe(false);
  });
});

describe('validateCreateShareLinkInput', () => {
  it('should return success for valid input', () => {
    const result = validateCreateShareLinkInput({
      meetingId: 'meeting-001',
      expiresIn: '7d',
    });
    expect(result.success).toBe(true);
  });

  it('should return failure for missing meetingId', () => {
    const result = validateCreateShareLinkInput({});
    expect(result.success).toBe(false);
  });
});

describe('validateShareAccessInput', () => {
  it('should return success for valid input', () => {
    const result = validateShareAccessInput({
      token: 'a'.repeat(32),
    });
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Constants Tests
// =============================================================================

describe('SHARE_EXPIRY_OPTIONS', () => {
  it('should have all expected options', () => {
    expect(SHARE_EXPIRY_OPTIONS.ONE_DAY).toBe('1d');
    expect(SHARE_EXPIRY_OPTIONS.SEVEN_DAYS).toBe('7d');
    expect(SHARE_EXPIRY_OPTIONS.THIRTY_DAYS).toBe('30d');
    expect(SHARE_EXPIRY_OPTIONS.NEVER).toBe('never');
  });
});

describe('SHARE_EXPIRY_LABELS', () => {
  it('should have Japanese labels for all options', () => {
    expect(SHARE_EXPIRY_LABELS['1d']).toBe('1日');
    expect(SHARE_EXPIRY_LABELS['7d']).toBe('7日間');
    expect(SHARE_EXPIRY_LABELS['30d']).toBe('30日間');
    expect(SHARE_EXPIRY_LABELS['never']).toBe('無期限');
  });
});
