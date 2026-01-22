/**
 * OAuth callback endpoint - Handles Lark OAuth callback
 * @module app/api/auth/lark/callback/route
 */

import { NextResponse } from 'next/server';
import { createLarkClient } from '@/lib/lark/client';
import { exchangeCodeForToken } from '@/lib/lark/oauth';
import { getSessionFromRequest } from '@/lib/session';
import { calculateExpirationTimestamp } from '@/lib/lark/token';

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
    // Create response for session handling
    const response = new Response();
    const session = await getSessionFromRequest(request, response);

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
    session.isAuthenticated = true;
    session.user = user;
    session.accessToken = token.accessToken;
    session.refreshToken = token.refreshToken;
    session.tokenExpiresAt = calculateExpirationTimestamp(token);

    await session.save();

    // Get session cookie from response
    const sessionCookie = response.headers.get('set-cookie');

    // Redirect to dashboard
    const dashboardUrl = new URL('/dashboard', request.url);
    const redirectResponse = NextResponse.redirect(dashboardUrl);

    // Preserve session cookie
    if (sessionCookie !== null) {
      redirectResponse.headers.set('set-cookie', sessionCookie);
    }

    console.log('[OAuth Callback] Authentication successful for user:', user.name);

    return redirectResponse;
  } catch (error) {
    console.error('[OAuth Callback] Error:', error);
    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', 'callback_failed');
    return NextResponse.redirect(errorUrl);
  }
}
