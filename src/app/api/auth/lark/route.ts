/**
 * OAuth start endpoint - Initiates Lark OAuth flow
 * @module app/api/auth/lark/route
 */

import { NextResponse } from 'next/server';
import { createLarkClient } from '@/lib/lark/client';
import { generateOAuthState, buildAuthorizationUrl } from '@/lib/lark/oauth';
import { getSessionFromCookies } from '@/lib/session';
import { LarkScopes } from '@/types/lark';

/**
 * GET /api/auth/lark
 * Redirects user to Lark OAuth authorization page
 */
export async function GET(request: Request): Promise<Response> {
  try {
    // Get session using cookies() - iron-session v8 recommended pattern
    const session = await getSessionFromCookies();

    // Generate CSRF protection state
    const state = generateOAuthState();

    // Store state in session for verification in callback
    session.oauthState = state;
    await session.save();

    // Build authorization URL
    const client = createLarkClient();
    const config = client.getConfig();

    // Request basic user info and minutes access
    const scope = [LarkScopes.USER_INFO, LarkScopes.MINUTES_READ].join(' ');

    const authorizationUrl = buildAuthorizationUrl(config, state, scope);

    // Redirect to Lark authorization page
    // Session cookie is automatically set by iron-session via cookies()
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    console.error('[OAuth Start] Error:', error);

    // Redirect to login page with error
    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', 'oauth_init_failed');

    return NextResponse.redirect(errorUrl);
  }
}
