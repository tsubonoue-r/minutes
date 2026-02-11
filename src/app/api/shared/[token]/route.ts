/**
 * Shared Minutes API endpoint - Public access to shared minutes
 * @module app/api/shared/[token]/route
 *
 * No authentication required. Token-based access with optional password.
 */

import { NextResponse } from 'next/server';
import { createShareService } from '@/services/share.service';
import { createEmptyMinutes } from '@/types/minutes';
import {
  rateLimitRequest,
  createRateLimitResponse,
  type RateLimitConfig,
} from '@/lib/rate-limit';

/**
 * Strict rate limit for shared endpoints (10 requests per minute per IP)
 * Prevents password brute-force attacks
 */
const SHARED_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60 * 1000,
  includeHeaders: true,
  keyPrefix: 'shared',
};

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
    readonly token: string;
  }>;
}

/**
 * Password request body
 */
interface PasswordRequestBody {
  readonly password?: string;
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
 * Fetch minutes for a meeting
 *
 * In the current implementation, returns sample minutes data.
 * In production, this would fetch from Lark Bitable or database.
 */
function fetchMinutesForMeeting(meetingId: string): ReturnType<typeof createEmptyMinutes> {
  // For now, return sample minutes.
  // In production, this would query the minutes storage.
  const minutes = createEmptyMinutes(meetingId, '共有された議事録');
  return {
    ...minutes,
    summary: 'この議事録は共有リンク経由でアクセスされました。実際のデータはデータベース連携後に表示されます。',
    date: new Date().toISOString().split('T')[0] ?? '1970-01-01',
    metadata: {
      ...minutes.metadata,
      model: 'shared-view',
      confidence: 1.0,
    },
  };
}

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * GET /api/shared/[token]
 *
 * Access shared minutes without password.
 * Returns minutes data if the link is valid and has no password.
 *
 * Response:
 * - 200: Minutes data
 * - 401: Password required
 * - 404: Link not found
 * - 410: Link expired or deactivated
 */
export async function GET(
  _request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    // Rate limit check
    const rateLimitResult = rateLimitRequest(_request, SHARED_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { token } = await context.params;

    if (token === undefined || token.trim() === '') {
      return createErrorResponse('INVALID_TOKEN', '無効なトークンです', 400);
    }

    const service = createShareService();
    const result = await service.validateAccess(token);

    if (result.requiresPassword === true) {
      return createErrorResponse(
        'PASSWORD_REQUIRED',
        'パスワードが必要です',
        401
      );
    }

    if (!result.valid || result.meetingId === undefined) {
      return createErrorResponse(
        'INVALID_LINK',
        '共有リンクが無効です',
        404
      );
    }

    // Fetch minutes for the meeting
    const minutes = fetchMinutesForMeeting(result.meetingId);

    return NextResponse.json({
      data: { minutes },
    });
  } catch (error) {
    console.error('[GET /api/shared/[token]] Error:', error);
    return createErrorResponse('INTERNAL_ERROR', 'エラーが発生しました', 500);
  }
}

/**
 * POST /api/shared/[token]
 *
 * Access password-protected shared minutes.
 *
 * Request Body:
 * - password: string
 *
 * Response:
 * - 200: Minutes data
 * - 401: Invalid password
 * - 404: Link not found
 */
export async function POST(
  request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    // Rate limit check (stricter for password attempts)
    const rateLimitResult = rateLimitRequest(request, SHARED_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { token } = await context.params;

    if (token === undefined || token.trim() === '') {
      return createErrorResponse('INVALID_TOKEN', '無効なトークンです', 400);
    }

    // Parse request body
    let body: PasswordRequestBody;
    try {
      body = (await request.json()) as PasswordRequestBody;
    } catch {
      return createErrorResponse('INVALID_BODY', 'リクエストが無効です', 400);
    }

    const service = createShareService();
    const result = await service.validateAccess(token, body.password);

    if (!result.valid) {
      if (result.requiresPassword === true) {
        return createErrorResponse(
          'INVALID_PASSWORD',
          'パスワードが正しくありません',
          401
        );
      }
      return createErrorResponse(
        'INVALID_LINK',
        '共有リンクが無効です',
        404
      );
    }

    if (result.meetingId === undefined) {
      return createErrorResponse(
        'INVALID_LINK',
        '共有リンクが無効です',
        404
      );
    }

    // Fetch minutes for the meeting
    const minutes = fetchMinutesForMeeting(result.meetingId);

    return NextResponse.json({
      data: { minutes },
    });
  } catch (error) {
    console.error('[POST /api/shared/[token]] Error:', error);
    return createErrorResponse('INTERNAL_ERROR', 'エラーが発生しました', 500);
  }
}
