/**
 * Lark OAuth Authentication Logic
 * @module lib/lark/oauth
 */

import type { LarkConfig, TokenInfo } from '@/types/lark';
import type { LarkUser, AuthResult } from '@/types/auth';
import { authSuccess, authFailure } from '@/types/auth';
import { LarkClient, LarkClientError } from './client';
import {
  LarkApiEndpoints,
  userAccessTokenResponseSchema,
  refreshTokenResponseSchema,
  type UserAccessTokenData,
} from './types';

/**
 * Generate a cryptographically secure random state for OAuth CSRF protection
 */
export function generateOAuthState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Build the OAuth authorization URL
 *
 * @param config - Lark configuration
 * @param state - CSRF protection state
 * @param scope - Optional scope string
 * @returns Authorization URL string
 */
export function buildAuthorizationUrl(
  config: LarkConfig,
  state: string,
  scope?: string
): string {
  const url = new URL(LarkApiEndpoints.AUTHORIZE, config.baseUrl);

  url.searchParams.set('app_id', config.appId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', state);

  if (scope !== undefined && scope !== '') {
    url.searchParams.set('scope', scope);
  }

  return url.toString();
}

/**
 * Transform Lark API user data to our LarkUser type
 */
function transformUserData(data: UserAccessTokenData): LarkUser {
  return {
    openId: data.open_id,
    unionId: data.union_id,
    name: data.name ?? 'Unknown',
    enName: data.en_name,
    avatarUrl: data.avatar_url ?? '',
    avatarThumb: data.avatar_thumb,
    avatarMiddle: data.avatar_middle,
    avatarBig: data.avatar_big,
    email: data.email,
    mobile: data.mobile,
    tenantKey: data.tenant_key,
  };
}

/**
 * Transform Lark API token data to our TokenInfo type
 */
function transformTokenData(data: UserAccessTokenData): TokenInfo {
  return {
    accessToken: data.access_token,
    tokenType: data.token_type,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
    refreshTokenExpiresIn: data.refresh_expires_in,
    scope: data.scope,
  };
}

/**
 * OAuth authentication result containing user and token information
 */
export interface OAuthAuthenticationResult {
  /** Authenticated user information */
  user: LarkUser;
  /** Token information */
  token: TokenInfo;
}

/**
 * Exchange authorization code for user access token
 *
 * @param client - Lark API client
 * @param code - Authorization code from OAuth callback
 * @returns Authentication result with user and token info
 */
export async function exchangeCodeForToken(
  client: LarkClient,
  code: string
): Promise<AuthResult<OAuthAuthenticationResult>> {
  try {
    const response = await client.post<unknown>(
      LarkApiEndpoints.USER_ACCESS_TOKEN,
      {
        body: {
          grant_type: 'authorization_code',
          code,
        },
        headers: {
          Authorization: `Bearer ${await getAppAccessToken(client)}`,
        },
      }
    );

    // Debug: Log the actual response structure
    console.log('[OAuth] User access token response:', JSON.stringify(response, null, 2));

    // Validate response structure
    const parseResult = userAccessTokenResponseSchema.safeParse(response);

    if (!parseResult.success) {
      console.error('[OAuth] Parse error paths:', parseResult.error.errors.map(e => e.path));
      return authFailure(
        'token_exchange_failed',
        'Invalid response structure from Lark API',
        parseResult.error.errors
      );
    }

    const { data } = parseResult;

    if (data.code !== 0 || data.data === undefined) {
      return authFailure(
        'token_exchange_failed',
        data.msg,
        { code: data.code }
      );
    }

    const user = transformUserData(data.data);
    const token = transformTokenData(data.data);

    return authSuccess({ user, token });
  } catch (error) {
    if (error instanceof LarkClientError) {
      return authFailure(
        'token_exchange_failed',
        error.message,
        { code: error.code, endpoint: error.endpoint }
      );
    }

    return authFailure(
      'network_error',
      error instanceof Error ? error.message : 'Unknown error',
      error
    );
  }
}

/**
 * Refresh the user access token
 *
 * @param client - Lark API client
 * @param refreshToken - Refresh token
 * @returns Authentication result with new token info
 */
export async function refreshAccessToken(
  client: LarkClient,
  refreshToken: string
): Promise<AuthResult<OAuthAuthenticationResult>> {
  try {
    const response = await client.post<unknown>(
      LarkApiEndpoints.REFRESH_TOKEN,
      {
        body: {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        },
        headers: {
          Authorization: `Bearer ${await getAppAccessToken(client)}`,
        },
      }
    );

    // Validate response structure
    const parseResult = refreshTokenResponseSchema.safeParse(response);

    if (!parseResult.success) {
      return authFailure(
        'token_refresh_failed',
        'Invalid response structure from Lark API',
        parseResult.error.errors
      );
    }

    const { data } = parseResult;

    if (data.code !== 0 || data.data === undefined) {
      return authFailure(
        'token_refresh_failed',
        data.msg,
        { code: data.code }
      );
    }

    const user = transformUserData(data.data);
    const token = transformTokenData(data.data);

    return authSuccess({ user, token });
  } catch (error) {
    if (error instanceof LarkClientError) {
      return authFailure(
        'token_refresh_failed',
        error.message,
        { code: error.code, endpoint: error.endpoint }
      );
    }

    return authFailure(
      'network_error',
      error instanceof Error ? error.message : 'Unknown error',
      error
    );
  }
}

/**
 * Cache for app access token
 */
let appAccessTokenCache: {
  token: string;
  expiresAt: number;
} | null = null;

/**
 * Get app access token (with caching)
 *
 * @param client - Lark API client
 * @returns App access token string
 */
export async function getAppAccessToken(client: LarkClient): Promise<string> {
  const now = Date.now();
  const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

  // Return cached token if still valid
  if (
    appAccessTokenCache !== null &&
    appAccessTokenCache.expiresAt > now + bufferTime
  ) {
    return appAccessTokenCache.token;
  }

  const config = client.getConfig();

  // Note: app_access_token API returns token at root level, not nested under "data"
  const response = await client.post<never>(LarkApiEndpoints.APP_ACCESS_TOKEN, {
    body: {
      app_id: config.appId,
      app_secret: config.appSecret,
    },
  });

  // Cast to the actual response structure (app_access_token is at root level)
  const tokenResponse = response as unknown as {
    app_access_token: string;
    expire: number;
    code: number;
    msg: string;
  };

  if (!tokenResponse.app_access_token) {
    throw new Error('Failed to get app access token');
  }

  // Cache the token
  appAccessTokenCache = {
    token: tokenResponse.app_access_token,
    expiresAt: now + tokenResponse.expire * 1000,
  };

  return appAccessTokenCache.token;
}

/**
 * Clear the app access token cache
 * Useful for testing or when credentials change
 */
export function clearAppAccessTokenCache(): void {
  appAccessTokenCache = null;
}
