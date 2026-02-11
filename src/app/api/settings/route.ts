/**
 * User Settings API endpoint - Get and update user settings
 * @module app/api/settings/route
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth/get-session';
import {
  UserSettingsSchema,
  createDefaultSettings,
} from '@/types/settings';
import type { UserSettings } from '@/types/settings';

// ============================================================================
// Types
// ============================================================================

/**
 * API response wrapper - success
 */
interface SuccessResponse {
  readonly success: true;
  readonly data: UserSettings;
}

/**
 * API response wrapper - error
 */
interface ErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

// ============================================================================
// In-Memory Storage
// ============================================================================

/**
 * In-memory settings store keyed by user open ID
 *
 * Note: In production, this should be replaced with a persistent
 * data store (e.g., database, Lark Base). This in-memory store
 * is suitable for development and demonstration purposes.
 */
const settingsStore = new Map<string, UserSettings>();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a success response
 */
function createSuccessResponse(data: UserSettings): NextResponse<SuccessResponse> {
  return NextResponse.json({ success: true, data });
}

/**
 * Create an error response
 */
function createErrorResponse(
  code: string,
  message: string,
  statusCode: number,
  details?: unknown
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };

  return NextResponse.json(response, { status: statusCode });
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/settings
 *
 * Get the current user's settings. Returns default settings if
 * the user has not previously saved any settings.
 *
 * Response:
 * - 200: UserSettings
 * - 401: Unauthorized
 * - 500: Internal Server Error
 *
 * @example
 * GET /api/settings
 */
export async function GET(): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const session = await getSession();

    if (session === null || !session.isAuthenticated) {
      return createErrorResponse(
        'UNAUTHORIZED',
        '認証が必要です',
        401
      );
    }

    const userId = session.user?.openId ?? 'unknown';
    const stored = settingsStore.get(userId);
    const settings = stored !== undefined ? stored : createDefaultSettings();

    return createSuccessResponse(settings);
  } catch (error) {
    console.error('[GET /api/settings] Error:', error);

    return createErrorResponse(
      'INTERNAL_ERROR',
      '設定の取得中にエラーが発生しました',
      500
    );
  }
}

/**
 * PUT /api/settings
 *
 * Update the current user's settings. The request body must contain
 * a complete UserSettings object that passes Zod validation.
 *
 * Request Body: UserSettings
 *
 * Response:
 * - 200: Updated UserSettings
 * - 400: Bad Request (validation error)
 * - 401: Unauthorized
 * - 500: Internal Server Error
 *
 * @example
 * PUT /api/settings
 * { "notifications": { ... }, "ai": { ... }, "display": { ... } }
 */
export async function PUT(
  request: Request
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const session = await getSession();

    if (session === null || !session.isAuthenticated) {
      return createErrorResponse(
        'UNAUTHORIZED',
        '認証が必要です',
        401
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        'INVALID_BODY',
        'リクエストボディの解析に失敗しました',
        400
      );
    }

    // Validate with Zod schema
    const parseResult = UserSettingsSchema.safeParse(body);

    if (!parseResult.success) {
      const message = parseResult.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');

      return createErrorResponse(
        'VALIDATION_ERROR',
        `設定のバリデーションに失敗しました: ${message}`,
        400,
        {
          validationErrors: parseResult.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        }
      );
    }

    const userId = session.user?.openId ?? 'unknown';
    const validatedSettings = parseResult.data;

    // Store settings
    settingsStore.set(userId, validatedSettings);

    return createSuccessResponse(validatedSettings);
  } catch (error) {
    console.error('[PUT /api/settings] Error:', error);

    if (error instanceof z.ZodError) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        '設定のバリデーションに失敗しました',
        400,
        { issues: error.issues }
      );
    }

    return createErrorResponse(
      'INTERNAL_ERROR',
      '設定の保存中にエラーが発生しました',
      500
    );
  }
}
