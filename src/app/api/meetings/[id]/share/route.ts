/**
 * Share Link API endpoint - Create, list, and manage share links for meetings
 * @module app/api/meetings/[id]/share/route
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import {
  createShareService,
  ShareServiceError,
} from '@/services/share.service';
import { CreateShareLinkSchema } from '@/types/share';
import { buildShareUrl } from '@/types/share';

// =============================================================================
// Types
// =============================================================================

/**
 * Error response type
 */
interface ErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Route context with params
 */
interface RouteContext {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create error response
 */
function createErrorResponse(
  code: string,
  message: string,
  statusCode: number
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { error: { code, message } },
    { status: statusCode }
  );
}

/**
 * Get the base URL from the request
 */
function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * POST /api/meetings/[id]/share
 *
 * Create a new share link for a meeting.
 *
 * Request Body:
 * - expiresIn?: '1d' | '7d' | '30d' | 'never'
 * - password?: string (min 4 chars)
 *
 * Response:
 * - 201: Share link created
 * - 400: Invalid input
 * - 401: Unauthorized
 * - 500: Internal Server Error
 */
export async function POST(
  request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    // Authentication check
    const session = await getSession();

    if (session === null || !session.isAuthenticated) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    if (session.user === undefined) {
      return createErrorResponse('UNAUTHORIZED', 'User information not found', 401);
    }

    // Get meeting ID from path params
    const params = await context.params;
    const meetingId = params.id;

    if (meetingId === undefined || meetingId.trim() === '') {
      return createErrorResponse('INVALID_PARAMS', 'Meeting ID is required', 400);
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parseResult = CreateShareLinkSchema.safeParse({
      ...(typeof body === 'object' && body !== null ? body : {}),
      meetingId,
    });

    if (!parseResult.success) {
      return createErrorResponse(
        'INVALID_INPUT',
        `Validation failed: ${parseResult.error.issues.map((i) => i.message).join(', ')}`,
        400
      );
    }

    // Create share link
    const service = createShareService();
    const shareLink = await service.createShareLink(
      parseResult.data,
      session.user.openId
    );

    // Build share URL
    const baseUrl = getBaseUrl(request);
    const shareUrl = buildShareUrl(shareLink.token, baseUrl);

    return NextResponse.json(
      {
        data: {
          id: shareLink.id,
          token: shareLink.token,
          url: shareUrl,
          expiresAt: shareLink.expiresAt,
          hasPassword: shareLink.password !== undefined,
          isActive: shareLink.isActive,
          createdAt: shareLink.createdAt,
          accessCount: shareLink.accessCount,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/meetings/[id]/share] Error:', error);

    if (error instanceof ShareServiceError) {
      return createErrorResponse(error.code, error.message, error.statusCode);
    }

    return createErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

/**
 * GET /api/meetings/[id]/share
 *
 * Get all share links for a meeting.
 *
 * Response:
 * - 200: List of share links
 * - 401: Unauthorized
 * - 500: Internal Server Error
 */
export async function GET(
  request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    // Authentication check
    const session = await getSession();

    if (session === null || !session.isAuthenticated) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    // Get meeting ID from path params
    const params = await context.params;
    const meetingId = params.id;

    if (meetingId === undefined || meetingId.trim() === '') {
      return createErrorResponse('INVALID_PARAMS', 'Meeting ID is required', 400);
    }

    // Fetch share links
    const service = createShareService();
    const links = await service.getShareLinksForMeeting(meetingId);

    // Build share URLs
    const baseUrl = getBaseUrl(request);

    const responseLinks = links.map((link) => ({
      id: link.id,
      token: link.token,
      url: buildShareUrl(link.token, baseUrl),
      expiresAt: link.expiresAt,
      hasPassword: link.password !== undefined,
      isActive: link.isActive,
      createdAt: link.createdAt,
      accessCount: link.accessCount,
    }));

    return NextResponse.json({
      data: responseLinks,
    });
  } catch (error) {
    console.error('[GET /api/meetings/[id]/share] Error:', error);

    return createErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

/**
 * DELETE /api/meetings/[id]/share
 *
 * Deactivate a share link.
 *
 * Query Parameters:
 * - linkId: string - The share link ID to deactivate
 *
 * Response:
 * - 200: Link deactivated
 * - 400: Missing linkId
 * - 401: Unauthorized
 * - 403: Not authorized
 * - 404: Link not found
 * - 500: Internal Server Error
 */
export async function DELETE(
  request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    // Authentication check
    const session = await getSession();

    if (session === null || !session.isAuthenticated) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    if (session.user === undefined) {
      return createErrorResponse('UNAUTHORIZED', 'User information not found', 401);
    }

    // Get meeting ID from path params (validates the route)
    const params = await context.params;
    const meetingId = params.id;

    if (meetingId === undefined || meetingId.trim() === '') {
      return createErrorResponse('INVALID_PARAMS', 'Meeting ID is required', 400);
    }

    // Get link ID from query parameters
    const url = new URL(request.url);
    const linkId = url.searchParams.get('linkId');

    if (linkId === null || linkId.trim() === '') {
      return createErrorResponse('INVALID_PARAMS', 'Link ID is required', 400);
    }

    // Deactivate the share link
    const service = createShareService();
    await service.deactivateShareLink(linkId, session.user.openId);

    return NextResponse.json({
      data: { success: true },
    });
  } catch (error) {
    console.error('[DELETE /api/meetings/[id]/share] Error:', error);

    if (error instanceof ShareServiceError) {
      return createErrorResponse(error.code, error.message, error.statusCode);
    }

    return createErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
