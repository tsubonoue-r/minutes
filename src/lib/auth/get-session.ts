/**
 * Server-side session retrieval utilities
 * @module lib/auth/get-session
 */

import { cookies } from 'next/headers';
import { getIronSession, type SessionOptions } from 'iron-session';
import type { SessionData, LarkUser } from '@/types/auth';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { createLarkClient } from '@/lib/lark/client';
import { getAppAccessToken, refreshAccessToken } from '@/lib/lark/oauth';
import { checkTokenExpiration, calculateExpirationTimestamp, calculateRefreshTokenExpirationTimestamp } from '@/lib/lark/token';

/**
 * Session cookie name
 */
const SESSION_COOKIE_NAME = 'minutes_session';

/**
 * Get session options
 */
function getSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;

  if (password === undefined || password.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long');
  }

  return {
    password,
    cookieName: SESSION_COOKIE_NAME,
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  };
}

/**
 * Cookie store interface compatible with iron-session
 */
interface IronSessionCookieStore {
  get: (name: string) => { name: string; value: string } | undefined;
  set: {
    (name: string, value: string, cookie?: Partial<ResponseCookie>): void;
    (options: ResponseCookie): void;
  };
}

/**
 * Check if simple auth mode is enabled (API Key or DEV_SKIP_AUTH)
 */
function isSimpleAuthMode(): boolean {
  // API Key認証が設定されている場合
  if (process.env.API_KEY) {
    return true;
  }
  // 開発用認証スキップ（本番環境では無効）
  if (process.env.DEV_SKIP_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
    return true;
  }
  return false;
}

/**
 * Mock user for simple auth mode
 */
const MOCK_USER: LarkUser = {
  openId: 'api-user-001',
  unionId: 'api-union-001',
  name: 'API User',
  email: 'api@example.com',
  avatarUrl: '',
  tenantKey: 'api-tenant-001',
};

/**
 * Get mock session with real app access token for DEV_SKIP_AUTH mode
 */
async function getMockSession(): Promise<SessionData> {
  let accessToken = 'mock-access-token';
  try {
    const client = createLarkClient();
    accessToken = await getAppAccessToken(client);
  } catch (error) {
    console.warn('[getMockSession] Failed to get app access token, using mock:', error);
  }
  return {
    isAuthenticated: true,
    user: MOCK_USER,
    accessToken,
  };
}

/**
 * Get the current session from server component
 *
 * @returns Session data or null if not authenticated
 */
export async function getSession(): Promise<SessionData | null> {
  // Simple auth mode: get real app access token from Lark
  if (isSimpleAuthMode()) {
    return getMockSession();
  }

  try {
    // cookies() returns ReadonlyRequestCookies in Next.js 14+
    const cookieStore = cookies();

    // Cast to iron-session compatible type
    const session = await getIronSession<SessionData>(
      cookieStore as unknown as IronSessionCookieStore,
      getSessionOptions()
    );

    if (!session.isAuthenticated) {
      return null;
    }

    // Auto-refresh expired access tokens
    if (session.tokenExpiresAt !== undefined && session.refreshToken !== undefined) {
      const status = checkTokenExpiration(session.tokenExpiresAt);

      if (status.isExpired || status.expiresSoon) {
        // Check if refresh token is still valid
        if (session.refreshTokenExpiresAt !== undefined && Date.now() > session.refreshTokenExpiresAt) {
          // Refresh token expired - clear session
          session.isAuthenticated = false;
          delete session.accessToken;
          delete session.refreshToken;
          await session.save();
          return null;
        }

        // Attempt token refresh
        try {
          const client = createLarkClient();
          const result = await refreshAccessToken(client, session.refreshToken);

          if (result.success) {
            const now = Date.now();
            session.user = result.data.user;
            session.accessToken = result.data.token.accessToken;
            session.refreshToken = result.data.token.refreshToken;
            session.tokenExpiresAt = calculateExpirationTimestamp(result.data.token, now);
            session.refreshTokenExpiresAt = calculateRefreshTokenExpirationTimestamp(result.data.token, now);
            await session.save();
            console.log('[getSession] Token refreshed successfully');
          } else {
            console.warn('[getSession] Token refresh failed:', result.error.message);
            session.isAuthenticated = false;
            delete session.accessToken;
            delete session.refreshToken;
            await session.save();
            return null;
          }
        } catch (refreshError) {
          console.error('[getSession] Token refresh error:', refreshError);
        }
      }
    }

    return session;
  } catch (error) {
    console.error('[getSession] Error:', error);
    return null;
  }
}

/**
 * Get the current user from server component
 *
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser(): Promise<LarkUser | null> {
  const session = await getSession();

  if (session === null || session.user === undefined) {
    return null;
  }

  if (isSimpleAuthMode()) {
    console.log('[getCurrentUser] Simple auth mode: Returning mock user');
  }

  return session.user;
}

/**
 * Check if user is authenticated (server component)
 *
 * @returns Whether the user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null && session.isAuthenticated === true;
}

/**
 * Get access token from session (server component)
 *
 * @returns Access token or null
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();

  if (session === null || session.accessToken === undefined) {
    return null;
  }

  return session.accessToken;
}
