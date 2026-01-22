/**
 * Lark integration barrel export
 * @module lib/lark
 */

// Client
export { LarkClient, LarkClientError, createLarkClient } from './client';

// OAuth
export {
  generateOAuthState,
  buildAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getAppAccessToken,
  clearAppAccessTokenCache,
  type OAuthAuthenticationResult,
} from './oauth';

// Token management
export {
  checkTokenExpiration,
  calculateExpirationTimestamp,
  formatExpirationTime,
  TokenManager,
  type TokenStorage,
  type StoredTokens,
  type TokenExpirationStatus,
} from './token';

// Types
export * from './types';
