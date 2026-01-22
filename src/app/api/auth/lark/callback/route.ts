/**
 * OAuth callback endpoint - Handles Lark OAuth callback
 * @module app/api/auth/lark/callback/route
 */

import { NextResponse } from 'next/server';
import { createLarkClient } from '@/lib/lark/client';
import { exchangeCodeForToken } from '@/lib/lark/oauth';
import { getSessionFromCookies } from '@/lib/session';
import { calculateExpirationTimestamp, calculateRefreshTokenExpirationTimestamp } from '@/lib/lark/token';

/**
 * GET /api/auth/lark/callback
 * Handles OAuth callback from Lark
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors from Lark
  if (error !== null) {
    console.error('[OAuth Callback] Lark error:', error);
    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', 'oauth_denied');
    return NextResponse.redirect(errorUrl);
  }

  // Validate required parameters
  if (code === null || state === null) {
    console.error('[OAuth Callback] Missing code or state');
    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', 'invalid_callback');
    return NextResponse.redirect(errorUrl);
  }

  try {
    // Get session using cookies() - iron-session v8 recommended pattern
    const session = await getSessionFromCookies();

    // Verify CSRF state
    if (session.oauthState !== state) {
      console.error('[OAuth Callback] Invalid state:', {
        expected: session.oauthState,
        received: state,
      });
      const errorUrl = new URL('/login', request.url);
      errorUrl.searchParams.set('error', 'invalid_state');
      return NextResponse.redirect(errorUrl);
    }

    // Clear OAuth state after verification
    delete session.oauthState;

    // Exchange code for tokens
    const client = createLarkClient();
    const result = await exchangeCodeForToken(client, code);

    if (!result.success) {
      console.error('[OAuth Callback] Token exchange failed:', result.error);
      const errorUrl = new URL('/login', request.url);
      errorUrl.searchParams.set('error', 'token_exchange_failed');
      return NextResponse.redirect(errorUrl);
    }

    const { user, token } = result.data;

    // Store authentication data in session
    const now = Date.now();
    session.isAuthenticated = true;
    session.user = user;
    session.accessToken = token.accessToken;
    session.refreshToken = token.refreshToken;
    session.tokenExpiresAt = calculateExpirationTimestamp(token, now);
    session.refreshTokenExpiresAt = calculateRefreshTokenExpirationTimestamp(token, now);

    await session.save();

    console.log('[OAuth Callback] Authentication successful for user:', user.name);

    // Redirect to dashboard
    // Session cookie is automatically set by iron-session via cookies()
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  } catch (error) {
    console.error('[OAuth Callback] Error:', error);
    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', 'callback_failed');
    return NextResponse.redirect(errorUrl);
  }
}
