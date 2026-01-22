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
 * 開発用ダミーユーザー
 */
const DEV_MOCK_USER: LarkUser = {
  openId: 'dev-user-001',
  unionId: 'dev-union-001',
  name: 'Dev User',
  email: 'dev@example.com',
  avatarUrl: '', // 開発用: 空文字でデフォルトアバターを使用
  tenantKey: 'dev-tenant-001',
};

/**
 * Get the current user from server component
 *
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser(): Promise<LarkUser | null> {
  // 開発用: 認証スキップ時はダミーユーザーを返す（本番環境では無効）
  if (process.env.DEV_SKIP_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
    console.log('[getCurrentUser] DEV_SKIP_AUTH=true: Returning mock user');
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
