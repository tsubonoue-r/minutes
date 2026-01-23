/**
 * Next.js Middleware for authentication and security
 * @module middleware
 *
 * Provides:
 * - Authentication protection for routes
 * - Security headers (HSTS, X-Frame-Options, etc.)
 * - Token expiration handling
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import type { SessionData } from '@/types/auth';

/**
 * Protected route patterns that require authentication
 */
const PROTECTED_ROUTES = ['/dashboard', '/settings', '/minutes', '/meetings', '/action-items', '/templates'];

/**
 * Public routes that should redirect authenticated users
 */
const AUTH_ROUTES = ['/login'];

/**
 * API routes that don't need middleware processing
 */
const API_ROUTES = ['/api/'];

/**
 * Static assets and system routes to skip
 */
const SKIP_ROUTES = ['/_next/', '/favicon.ico', '/robots.txt', '/sitemap.xml'];

/**
 * Security headers applied to all responses
 */
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Apply security headers to a NextResponse
 *
 * @param response - The response to add headers to
 * @returns The response with security headers applied
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

/**
 * Check if a path matches any pattern in the list
 */
function matchesPattern(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => path.startsWith(pattern));
}

/**
 * Get session from request cookies (edge-compatible)
 */
async function getSession(request: NextRequest): Promise<SessionData | null> {
  const password = process.env.SESSION_SECRET;

  if (password === undefined || password.length < 32) {
    console.error('[Middleware] SESSION_SECRET not configured');
    return null;
  }

  try {
    // Create a minimal response for iron-session
    const response = new Response();

    const session = await getIronSession<SessionData>(request, response, {
      password,
      cookieName: 'minutes_session',
      cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax' as const,
        maxAge: 60 * 60 * 24 * 7, // 7 days
      },
    });

    return session;
  } catch (error) {
    console.error('[Middleware] Session error:', error);
    return null;
  }
}

/**
 * Check if request has valid API Key
 */
function hasValidApiKey(request: NextRequest): boolean {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return false;

  // Check header first, then query param
  const headerKey = request.headers.get('x-api-key');
  const queryKey = request.nextUrl.searchParams.get('api_key');

  return headerKey === apiKey || queryKey === apiKey;
}

/**
 * Check if user is authenticated
 * 優先順位: 1. API Key, 2. DEV_SKIP_AUTH, 3. Session
 */
function isAuthenticated(request: NextRequest, session: SessionData | null): boolean {
  // API Key認証（最優先）
  if (hasValidApiKey(request)) {
    console.log('[Middleware] API Key authentication successful');
    return true;
  }

  // 開発用: 認証スキップ（本番環境では無効）
  const devSkipAuth = process.env.DEV_SKIP_AUTH;
  if (devSkipAuth === 'true' && process.env.NODE_ENV !== 'production') {
    console.log('[Middleware] DEV_SKIP_AUTH=true: Authentication bypassed');
    return true;
  }

  if (session === null) {
    return false;
  }

  return (
    session.isAuthenticated === true &&
    session.accessToken !== undefined &&
    session.user !== undefined
  );
}

/**
 * Check if access token is expired or expiring soon
 */
function isAccessTokenExpired(session: SessionData): boolean {
  if (session.tokenExpiresAt === undefined) {
    return true;
  }

  // Add 5 minute buffer
  const bufferMs = 5 * 60 * 1000;
  return Date.now() > session.tokenExpiresAt - bufferMs;
}

/**
 * Check if refresh token is expired
 */
function isRefreshTokenExpired(session: SessionData): boolean {
  if (session.refreshTokenExpiresAt === undefined) {
    // If no refresh token expiration, assume it's valid (backward compatibility)
    return false;
  }

  return Date.now() > session.refreshTokenExpiresAt;
}

/**
 * Middleware function
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Skip static assets and system routes
  if (matchesPattern(pathname, SKIP_ROUTES)) {
    return applySecurityHeaders(NextResponse.next());
  }

  // API routes: apply security headers but skip auth (handled by route handlers)
  if (matchesPattern(pathname, API_ROUTES)) {
    return applySecurityHeaders(NextResponse.next());
  }

  // Get session
  const session = await getSession(request);
  const authenticated = isAuthenticated(request, session);

  // Protected routes - require authentication
  if (matchesPattern(pathname, PROTECTED_ROUTES)) {
    if (!authenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }

    // Check if token is expired
    // DEV_SKIP_AUTH が有効な場合はトークン期限切れチェックをスキップ（本番環境では無効）
    const devSkipAuth = process.env.DEV_SKIP_AUTH === 'true' && process.env.NODE_ENV !== 'production';
    if (!devSkipAuth && session !== null) {
      // Check refresh token first - if expired, must re-authenticate
      if (isRefreshTokenExpired(session)) {
        console.log('[Middleware] Refresh token expired, redirecting to login');
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        loginUrl.searchParams.set('error', 'session_expired');
        return applySecurityHeaders(NextResponse.redirect(loginUrl));
      }

      // If only access token expired but refresh token valid, allow through
      // The page/API will handle token refresh via client-side or API call
      if (isAccessTokenExpired(session)) {
        console.log('[Middleware] Access token expired, allowing through for refresh');
        const response = NextResponse.next();
        // Set header to signal frontend that token needs refresh
        response.headers.set('x-token-refresh-needed', 'true');
        return applySecurityHeaders(response);
      }
    }

    return applySecurityHeaders(NextResponse.next());
  }

  // Auth routes - redirect authenticated users to dashboard
  if (matchesPattern(pathname, AUTH_ROUTES)) {
    if (authenticated) {
      const dashboardUrl = new URL('/dashboard', request.url);
      return applySecurityHeaders(NextResponse.redirect(dashboardUrl));
    }

    return applySecurityHeaders(NextResponse.next());
  }

  // Public routes - allow through with security headers
  return applySecurityHeaders(NextResponse.next());
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
