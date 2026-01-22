/**
 * Logout endpoint - Destroys user session
 * @module app/api/auth/logout/route
 */

import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';

/**
 * Response type for logout
 */
interface LogoutResponse {
  success: boolean;
  message: string;
}

/**
 * POST /api/auth/logout
 * Logs out the user by destroying their session
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Create response for session handling
    const response = new Response();
    const session = await getSessionFromRequest(request, response);

    // Check if user is authenticated
    if (!session.isAuthenticated) {
      return NextResponse.json<LogoutResponse>(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userName = session.user?.name ?? 'Unknown';

    // Destroy the session
    session.destroy();

    // Get session cookie from response (will be cleared)
    const sessionCookie = response.headers.get('set-cookie');

    const jsonResponse = NextResponse.json<LogoutResponse>({
      success: true,
      message: 'Logged out successfully',
    });

    if (sessionCookie !== null) {
      jsonResponse.headers.set('set-cookie', sessionCookie);
    }

    console.log('[Logout] User logged out:', userName);

    return jsonResponse;
  } catch (error) {
    console.error('[Logout] Error:', error);

    return NextResponse.json<LogoutResponse>(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/logout
 * Alternative logout via GET (for simple links)
 */
export async function GET(request: Request): Promise<Response> {
  try {
    // Create response for session handling
    const response = new Response();
    const session = await getSessionFromRequest(request, response);

    // Destroy the session (regardless of auth state)
    session.destroy();

    // Get session cookie from response
    const sessionCookie = response.headers.get('set-cookie');

    // Redirect to home page
    const homeUrl = new URL('/', request.url);
    const redirectResponse = NextResponse.redirect(homeUrl);

    if (sessionCookie !== null) {
      redirectResponse.headers.set('set-cookie', sessionCookie);
    }

    return redirectResponse;
  } catch (error) {
    console.error('[Logout] Error:', error);

    // Still redirect to home on error
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }
}
