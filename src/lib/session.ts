/**
 * Session management with iron-session
 * @module lib/session
 */

import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import type { SessionData } from '@/types/auth';
import { defaultSession } from '@/types/auth';

/**
 * Session cookie name
 */
const SESSION_COOKIE_NAME = 'minutes_session';

/**
 * Session options type
 */
interface SessionOptions {
  password: string;
  cookieName: string;
  cookieOptions: {
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    maxAge: number;
  };
}

/**
 * Get session configuration
 */
function getSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;

  if (password === undefined || password.length < 32) {
    throw new Error(
      'SESSION_SECRET must be at least 32 characters long'
    );
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
 * Get the current session from request/response (for Route Handlers)
 *
 * @param req - Request object
 * @param res - Response object
 * @returns Session object
 */
export async function getSessionFromRequest(
  req: Request,
  res: Response
): Promise<IronSession<SessionData>> {
  const session = await getIronSession<SessionData>(req, res, getSessionOptions());

  if (session.isAuthenticated === undefined) {
    session.isAuthenticated = defaultSession.isAuthenticated;
  }

  return session;
}

/**
 * Check if request has valid session
 *
 * @param req - Request object
 * @param res - Response object
 * @returns Whether the user is authenticated
 */
export async function isAuthenticated(
  req: Request,
  res: Response
): Promise<boolean> {
  try {
    const session = await getSessionFromRequest(req, res);
    return session.isAuthenticated === true && session.accessToken !== undefined;
  } catch {
    return false;
  }
}

/**
 * Get the current user from session
 *
 * @param req - Request object
 * @param res - Response object
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser(
  req: Request,
  res: Response
): Promise<SessionData['user'] | null> {
  try {
    const session = await getSessionFromRequest(req, res);

    if (session.isAuthenticated !== true || session.user === undefined) {
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}

/**
 * Destroy the session (logout)
 *
 * @param req - Request object
 * @param res - Response object
 */
export async function destroySession(
  req: Request,
  res: Response
): Promise<void> {
  const session = await getSessionFromRequest(req, res);
  session.destroy();
}

/**
 * Get the current session using cookies() from next/headers
 * This is the recommended pattern for Next.js App Router Route Handlers
 *
 * @returns Session object
 */
export async function getSessionFromCookies(): Promise<IronSession<SessionData>> {
  // cookies() returns a Promise in Next.js 14 (becomes sync in Next.js 15)
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const cookieStore = await cookies();
  // Type assertion needed due to Next.js cookies() type incompatibility with iron-session
  // This is safe as iron-session v8 officially supports Next.js App Router cookies()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
  const session = await getIronSession<SessionData>(cookieStore as any, getSessionOptions());

  if (session.isAuthenticated === undefined) {
    session.isAuthenticated = defaultSession.isAuthenticated;
  }

  return session;
}

/**
 * Check if request has valid session using cookies()
 *
 * @returns Whether the user is authenticated
 */
export async function isAuthenticatedFromCookies(): Promise<boolean> {
  try {
    const session = await getSessionFromCookies();
    return session.isAuthenticated === true && session.accessToken !== undefined;
  } catch {
    return false;
  }
}

/**
 * Get the current user from session using cookies()
 *
 * @returns User object or null if not authenticated
 */
export async function getCurrentUserFromCookies(): Promise<SessionData['user'] | null> {
  try {
    const session = await getSessionFromCookies();

    if (session.isAuthenticated !== true || session.user === undefined) {
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}

/**
 * Destroy the session (logout) using cookies()
 */
export async function destroySessionFromCookies(): Promise<void> {
  const session = await getSessionFromCookies();
  session.destroy();
}
