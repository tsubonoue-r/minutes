/**
 * Token Management Utilities
 * @module lib/lark/token
 */

import type { TokenInfo } from '@/types/lark';

/**
 * Token expiration status
 */
export interface TokenExpirationStatus {
  /** Whether the token is expired */
  isExpired: boolean;
  /** Whether the token will expire soon (within buffer time) */
  expiresSoon: boolean;
  /** Time until expiration in milliseconds */
  timeUntilExpiration: number;
  /** Whether the refresh token is expired */
  refreshTokenExpired: boolean;
}

/**
 * Default buffer time before considering a token "expiring soon" (5 minutes)
 */
const DEFAULT_EXPIRATION_BUFFER = 5 * 60 * 1000;

/**
 * Check the expiration status of tokens
 *
 * @param tokenExpiresAt - Token expiration timestamp in milliseconds
 * @param refreshTokenExpiresIn - Refresh token expiration in seconds (optional)
 * @param tokenCreatedAt - Token creation timestamp (optional, for refresh token calc)
 * @param bufferMs - Buffer time in milliseconds before considering expired
 * @returns Token expiration status
 */
export function checkTokenExpiration(
  tokenExpiresAt: number,
  refreshTokenExpiresIn?: number,
  tokenCreatedAt?: number,
  bufferMs: number = DEFAULT_EXPIRATION_BUFFER
): TokenExpirationStatus {
  const now = Date.now();
  const timeUntilExpiration = tokenExpiresAt - now;

  const isExpired = timeUntilExpiration <= 0;
  const expiresSoon = timeUntilExpiration <= bufferMs;

  // Calculate refresh token expiration if provided
  let refreshTokenExpired = false;
  if (refreshTokenExpiresIn !== undefined && tokenCreatedAt !== undefined) {
    const refreshTokenExpiresAt = tokenCreatedAt + refreshTokenExpiresIn * 1000;
    refreshTokenExpired = refreshTokenExpiresAt <= now;
  }

  return {
    isExpired,
    expiresSoon,
    timeUntilExpiration: Math.max(0, timeUntilExpiration),
    refreshTokenExpired,
  };
}

/**
 * Calculate the expiration timestamp from token info
 *
 * @param tokenInfo - Token information
 * @param createdAt - When the token was created (defaults to now)
 * @returns Expiration timestamp in milliseconds
 */
export function calculateExpirationTimestamp(
  tokenInfo: TokenInfo,
  createdAt: number = Date.now()
): number {
  return createdAt + tokenInfo.expiresIn * 1000;
}

/**
 * Token storage interface for different storage backends
 */
export interface TokenStorage {
  /** Get stored tokens */
  getTokens(): Promise<StoredTokens | null>;
  /** Store tokens */
  setTokens(tokens: StoredTokens): Promise<void>;
  /** Clear stored tokens */
  clearTokens(): Promise<void>;
}

/**
 * Stored token structure
 */
export interface StoredTokens {
  /** Access token */
  accessToken: string;
  /** Refresh token */
  refreshToken: string;
  /** Access token expiration timestamp (ms) */
  expiresAt: number;
  /** When the token was created (ms) */
  createdAt: number;
  /** Refresh token expiration in seconds */
  refreshTokenExpiresIn: number;
}

/**
 * Token manager for handling token lifecycle
 */
export class TokenManager {
  private readonly storage: TokenStorage;
  private readonly refreshCallback:
    | ((refreshToken: string) => Promise<TokenInfo | null>)
    | undefined;

  constructor(
    storage: TokenStorage,
    refreshCallback?: (refreshToken: string) => Promise<TokenInfo | null>
  ) {
    this.storage = storage;
    this.refreshCallback = refreshCallback;
  }

  /**
   * Get a valid access token, refreshing if necessary
   *
   * @returns Valid access token or null if unable to obtain one
   */
  async getValidAccessToken(): Promise<string | null> {
    const tokens = await this.storage.getTokens();

    if (tokens === null) {
      return null;
    }

    const status = checkTokenExpiration(
      tokens.expiresAt,
      tokens.refreshTokenExpiresIn,
      tokens.createdAt
    );

    // Token is still valid
    if (!status.isExpired && !status.expiresSoon) {
      return tokens.accessToken;
    }

    // Refresh token is expired - need full re-authentication
    if (status.refreshTokenExpired) {
      await this.storage.clearTokens();
      return null;
    }

    // Try to refresh the token
    if (this.refreshCallback !== undefined) {
      const newTokenInfo = await this.refreshCallback(tokens.refreshToken);

      if (newTokenInfo !== null) {
        const now = Date.now();
        await this.storage.setTokens({
          accessToken: newTokenInfo.accessToken,
          refreshToken: newTokenInfo.refreshToken,
          expiresAt: calculateExpirationTimestamp(newTokenInfo, now),
          createdAt: now,
          refreshTokenExpiresIn: newTokenInfo.refreshTokenExpiresIn,
        });

        return newTokenInfo.accessToken;
      }
    }

    // Unable to refresh - clear tokens and require re-auth
    await this.storage.clearTokens();
    return null;
  }

  /**
   * Store new tokens after successful authentication
   *
   * @param tokenInfo - Token information from authentication
   */
  async storeTokens(tokenInfo: TokenInfo): Promise<void> {
    const now = Date.now();

    await this.storage.setTokens({
      accessToken: tokenInfo.accessToken,
      refreshToken: tokenInfo.refreshToken,
      expiresAt: calculateExpirationTimestamp(tokenInfo, now),
      createdAt: now,
      refreshTokenExpiresIn: tokenInfo.refreshTokenExpiresIn,
    });
  }

  /**
   * Clear all stored tokens (logout)
   */
  async clearTokens(): Promise<void> {
    await this.storage.clearTokens();
  }

  /**
   * Check if user has valid tokens stored
   */
  async hasValidTokens(): Promise<boolean> {
    const tokens = await this.storage.getTokens();

    if (tokens === null) {
      return false;
    }

    const status = checkTokenExpiration(
      tokens.expiresAt,
      tokens.refreshTokenExpiresIn,
      tokens.createdAt
    );

    // Has valid token OR can be refreshed
    return !status.isExpired || !status.refreshTokenExpired;
  }
}

/**
 * Format expiration time for display
 *
 * @param timeUntilExpiration - Time in milliseconds
 * @returns Human-readable string
 */
export function formatExpirationTime(timeUntilExpiration: number): string {
  if (timeUntilExpiration <= 0) {
    return 'Expired';
  }

  const seconds = Math.floor(timeUntilExpiration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}
