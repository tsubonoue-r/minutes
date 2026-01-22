/**
 * Token refresh endpoint - Refreshes Lark access token
 * @module app/api/auth/lark/refresh/route
 */

import { NextResponse } from 'next/server';
import { createLarkClient } from '@/lib/lark/client';
import { refreshAccessToken } from '@/lib/lark/oauth';
import { getSessionFromRequest } from '@/lib/session';
import { calculateExpirationTimestamp, checkTokenExpiration } from '@/lib/lark/token';

/**
 * Response type for token refresh
 */
interface RefreshResponse {
  success: boolean;
  message: string;
  expiresAt?: number;
}

/**
 * POST /api/auth/lark/refresh
 * Refreshes the user's access token
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Create response for session handling
    const response = new Response();
    const session = await getSessionFromRequest(request, response);

    // Check if user is authenticated
    if (!session.isAuthenticated || session.refreshToken === undefined) {
      return NextResponse.json<RefreshResponse>(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if token actually needs refresh
    if (session.tokenExpiresAt !== undefined) {
      const status = checkTokenExpiration(session.tokenExpiresAt);

      if (!status.isExpired && !status.expiresSoon) {
        return NextResponse.json<RefreshResponse>({
          success: true,
          message: 'Token still valid',
          expiresAt: session.tokenExpiresAt,
        });
      }
    }

    // Refresh the token
    const client = createLarkClient();
    const result = await refreshAccessToken(client, session.refreshToken);

    if (!result.success) {
      console.error('[Token Refresh] Failed:', result.error);

      // Clear session if refresh fails
      session.isAuthenticated = false;
      delete session.user;
      delete session.accessToken;
      delete session.refreshToken;
      delete session.tokenExpiresAt;
      await session.save();

      // Get session cookie from response
      const sessionCookie = response.headers.get('set-cookie');
      const jsonResponse = NextResponse.json<RefreshResponse>(
        { success: false, message: 'Token refresh failed' },
        { status: 401 }
      );

      if (sessionCookie !== null) {
        jsonResponse.headers.set('set-cookie', sessionCookie);
      }

      return jsonResponse;
    }

    const { user, token } = result.data;

    // Update session with new tokens
    session.user = user;
    session.accessToken = token.accessToken;
    session.refreshToken = token.refreshToken;
    session.tokenExpiresAt = calculateExpirationTimestamp(token);
    await session.save();

    // Get session cookie from response
    const sessionCookie = response.headers.get('set-cookie');

    const jsonResponse = NextResponse.json<RefreshResponse>({
      success: true,
      message: 'Token refreshed successfully',
      expiresAt: session.tokenExpiresAt,
    });

    if (sessionCookie !== null) {
      jsonResponse.headers.set('set-cookie', sessionCookie);
    }

    console.log('[Token Refresh] Successful for user:', user.name);

    return jsonResponse;
  } catch (error) {
    console.error('[Token Refresh] Error:', error);

    return NextResponse.json<RefreshResponse>(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
