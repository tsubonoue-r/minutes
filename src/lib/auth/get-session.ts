/**
 * Server-side session retrieval utilities
 * @module lib/auth/get-session
 */

import { cookies } from 'next/headers';
import { getIronSession, type SessionOptions } from 'iron-session';
import type { SessionData, LarkUser } from '@/types/auth';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

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
 * Get the current session from server component
 *
 * @returns Session data or null if not authenticated
 */
export async function getSession(): Promise<SessionData | null> {
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

    return session;
  } catch (error) {
    console.error('[getSession] Error:', error);
    return null;
  }
}

/**
 * 開発用/API Key認証用ダミーユーザー
 */
const DEV_MOCK_USER: LarkUser = {
  openId: 'api-user-001',
  unionId: 'api-union-001',
  name: 'API User',
  email: 'api@example.com',
  avatarUrl: '',
  tenantKey: 'api-tenant-001',
};

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
 * Get the current user from server component
 *
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser(): Promise<LarkUser | null> {
  // API Key認証または開発用スキップ時はダミーユーザーを返す
  if (isSimpleAuthMode()) {
    console.log('[getCurrentUser] Simple auth mode: Returning mock user');
    return DEV_MOCK_USER;
  }

  const session = await getSession();

  if (session === null || session.user === undefined) {
    return null;
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
