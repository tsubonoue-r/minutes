/**
 * OAuth start endpoint - Initiates Lark OAuth flow
 * @module app/api/auth/lark/route
 */

import { NextResponse } from 'next/server';
import { createLarkClient } from '@/lib/lark/client';
import { generateOAuthState, buildAuthorizationUrl } from '@/lib/lark/oauth';
import { getSessionFromRequest } from '@/lib/session';
import { LarkScopes } from '@/types/lark';

/**
 * GET /api/auth/lark
 * Redirects user to Lark OAuth authorization page
 */
export async function GET(request: Request): Promise<Response> {
  try {
    // Create response for session handling
    const response = new Response();
    const session = await getSessionFromRequest(request, response);

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

    // Get session cookie from response
    const sessionCookie = response.headers.get('set-cookie');

    // Create redirect response
    const redirectResponse = NextResponse.redirect(authorizationUrl);

    // Preserve session cookie
    if (sessionCookie !== null) {
      redirectResponse.headers.set('set-cookie', sessionCookie);
    }

    return redirectResponse;
  } catch (error) {
    console.error('[OAuth Start] Error:', error);

    // Redirect to login page with error
    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set('error', 'oauth_init_failed');

    return NextResponse.redirect(errorUrl);
  }
}
