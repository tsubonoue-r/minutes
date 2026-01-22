/**
 * Token management unit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkTokenExpiration,
  calculateExpirationTimestamp,
  formatExpirationTime,
  TokenManager,
  type TokenStorage,
  type StoredTokens,
} from '../token';
import type { TokenInfo } from '@/types/lark';

describe('checkTokenExpiration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should return not expired for valid token', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const expiresAt = now + 60 * 60 * 1000; // 1 hour from now

    const status = checkTokenExpiration(expiresAt);

    expect(status.isExpired).toBe(false);
    expect(status.expiresSoon).toBe(false);
    expect(status.timeUntilExpiration).toBe(60 * 60 * 1000);
  });

  it('should return expired for past expiration', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const expiresAt = now - 1000; // 1 second ago

    const status = checkTokenExpiration(expiresAt);

    expect(status.isExpired).toBe(true);
    expect(status.expiresSoon).toBe(true);
    expect(status.timeUntilExpiration).toBe(0);
  });

  it('should return expiresSoon when within buffer', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const expiresAt = now + 2 * 60 * 1000; // 2 minutes from now

    const status = checkTokenExpiration(expiresAt);

    expect(status.isExpired).toBe(false);
    expect(status.expiresSoon).toBe(true); // Within default 5 min buffer
  });

  it('should detect refresh token expiration', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const tokenCreatedAt = now - 31 * 24 * 60 * 60 * 1000; // 31 days ago
    const expiresAt = now + 60 * 60 * 1000;
    const refreshTokenExpiresIn = 30 * 24 * 60 * 60; // 30 days in seconds

    const status = checkTokenExpiration(
      expiresAt,
      refreshTokenExpiresIn,
      tokenCreatedAt
    );

    expect(status.refreshTokenExpired).toBe(true);
  });
});

describe('calculateExpirationTimestamp', () => {
  it('should calculate correct expiration timestamp', () => {
    const tokenInfo: TokenInfo = {
      accessToken: 'test_token',
      tokenType: 'Bearer',
      expiresIn: 7200, // 2 hours in seconds
      refreshToken: 'refresh_token',
      refreshTokenExpiresIn: 2592000,
    };

    const createdAt = 1000000;
    const expected = 1000000 + 7200 * 1000;

    expect(calculateExpirationTimestamp(tokenInfo, createdAt)).toBe(expected);
  });
});

describe('formatExpirationTime', () => {
  it('should format expired time', () => {
    expect(formatExpirationTime(0)).toBe('Expired');
    expect(formatExpirationTime(-1000)).toBe('Expired');
  });

  it('should format seconds', () => {
    expect(formatExpirationTime(30 * 1000)).toBe('30 seconds');
    expect(formatExpirationTime(1 * 1000)).toBe('1 second');
  });

  it('should format minutes', () => {
    expect(formatExpirationTime(5 * 60 * 1000)).toBe('5 minutes');
    expect(formatExpirationTime(1 * 60 * 1000)).toBe('1 minute');
  });

  it('should format hours', () => {
    expect(formatExpirationTime(2 * 60 * 60 * 1000)).toBe('2 hours');
    expect(formatExpirationTime(1 * 60 * 60 * 1000)).toBe('1 hour');
  });

  it('should format days', () => {
    expect(formatExpirationTime(3 * 24 * 60 * 60 * 1000)).toBe('3 days');
    expect(formatExpirationTime(1 * 24 * 60 * 60 * 1000)).toBe('1 day');
  });
});

describe('TokenManager', () => {
  let mockStorage: TokenStorage;
  let storedTokens: StoredTokens | null;

  beforeEach(() => {
    vi.useFakeTimers();
    storedTokens = null;

    mockStorage = {
      getTokens: vi.fn(async () => storedTokens),
      setTokens: vi.fn(async (tokens: StoredTokens) => {
        storedTokens = tokens;
      }),
      clearTokens: vi.fn(async () => {
        storedTokens = null;
      }),
    };
  });

  it('should return null when no tokens stored', async () => {
    const manager = new TokenManager(mockStorage);

    const token = await manager.getValidAccessToken();

    expect(token).toBeNull();
  });

  it('should return token when valid', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    storedTokens = {
      accessToken: 'valid_token',
      refreshToken: 'refresh_token',
      expiresAt: now + 60 * 60 * 1000, // 1 hour
      createdAt: now,
      refreshTokenExpiresIn: 30 * 24 * 60 * 60,
    };

    const manager = new TokenManager(mockStorage);
    const token = await manager.getValidAccessToken();

    expect(token).toBe('valid_token');
  });

  it('should refresh token when expiring soon', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    storedTokens = {
      accessToken: 'expiring_token',
      refreshToken: 'refresh_token',
      expiresAt: now + 2 * 60 * 1000, // 2 minutes (within buffer)
      createdAt: now - 60 * 60 * 1000,
      refreshTokenExpiresIn: 30 * 24 * 60 * 60,
    };

    const refreshCallback = vi.fn(async (): Promise<TokenInfo> => ({
      accessToken: 'new_access_token',
      tokenType: 'Bearer',
      expiresIn: 7200,
      refreshToken: 'new_refresh_token',
      refreshTokenExpiresIn: 2592000,
    }));

    const manager = new TokenManager(mockStorage, refreshCallback);
    const token = await manager.getValidAccessToken();

    expect(token).toBe('new_access_token');
    expect(refreshCallback).toHaveBeenCalledWith('refresh_token');
    expect(mockStorage.setTokens).toHaveBeenCalled();
  });

  it('should clear tokens when refresh token expired', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    storedTokens = {
      accessToken: 'expiring_token',
      refreshToken: 'expired_refresh',
      expiresAt: now + 2 * 60 * 1000,
      createdAt: now - 31 * 24 * 60 * 60 * 1000, // 31 days ago
      refreshTokenExpiresIn: 30 * 24 * 60 * 60, // 30 days
    };

    const manager = new TokenManager(mockStorage);
    const token = await manager.getValidAccessToken();

    expect(token).toBeNull();
    expect(mockStorage.clearTokens).toHaveBeenCalled();
  });

  it('should store tokens correctly', async () => {
    const tokenInfo: TokenInfo = {
      accessToken: 'new_token',
      tokenType: 'Bearer',
      expiresIn: 7200,
      refreshToken: 'new_refresh',
      refreshTokenExpiresIn: 2592000,
    };

    const manager = new TokenManager(mockStorage);
    await manager.storeTokens(tokenInfo);

    expect(mockStorage.setTokens).toHaveBeenCalled();
    const storedCall = vi.mocked(mockStorage.setTokens).mock.calls[0];
    if (storedCall === undefined) {
      throw new Error('Expected setTokens to have been called');
    }
    expect(storedCall[0]?.accessToken).toBe('new_token');
  });

  it('should check hasValidTokens correctly', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const manager = new TokenManager(mockStorage);

    // No tokens
    expect(await manager.hasValidTokens()).toBe(false);

    // Valid tokens
    storedTokens = {
      accessToken: 'valid',
      refreshToken: 'refresh',
      expiresAt: now + 60 * 60 * 1000,
      createdAt: now,
      refreshTokenExpiresIn: 30 * 24 * 60 * 60,
    };

    expect(await manager.hasValidTokens()).toBe(true);
  });
});
