/**
 * Session management with iron-session
 * @module lib/session
 */

import { getIronSession, IronSession } from 'iron-session';
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
