/**
 * Approvals API Route - Manage approval requests
 * @module app/api/approvals/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createApprovalService,
  createApprovalUserContext,
} from '@/services/approval.service';
import {
  CreateApprovalRequestSchema,
  APPROVAL_STATUS,
} from '@/types/approval';

// =============================================================================
// Request/Response Schemas
// =============================================================================

/**
 * Schema for POST request body
 */
const PostRequestSchema = CreateApprovalRequestSchema;

/**
 * Schema for GET query parameters
 */
const GetQuerySchema = z.object({
  status: z.enum([
    APPROVAL_STATUS.DRAFT,
    APPROVAL_STATUS.PENDING_APPROVAL,
    APPROVAL_STATUS.APPROVED,
    APPROVAL_STATUS.REJECTED,
  ]).optional(),
  requesterId: z.string().optional(),
  approverId: z.string().optional(),
  minutesId: z.string().optional(),
  meetingId: z.string().optional(),
  page: z.string().transform((v) => parseInt(v, 10)).optional(),
  pageSize: z.string().transform((v) => parseInt(v, 10)).optional(),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get user context from request headers
 * In production, this would extract user info from session/token
 */
function getUserContext(request: NextRequest): { id: string; name: string } | null {
  // For now, use headers as a simple mechanism
  // In production, this would be extracted from session/JWT
  const userId = request.headers.get('X-User-Id');
  const userName = request.headers.get('X-User-Name');

  if (userId === null || userName === null) {
    return null;
  }

  return { id: userId, name: userName };
}

/**
 * Get access token from request headers
 */
function getAccessToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader === null || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * POST /api/approvals
 *
 * Create a new approval request for minutes.
 *
 * @example
 * ```
 * POST /api/approvals
 * X-User-Id: user_123
 * X-User-Name: Suzuki
 * Authorization: Bearer <access_token>
 * Content-Type: application/json
 *
 * {
 *   "minutesId": "min_123",
 *   "meetingId": "meeting_456",
 *   "title": "Weekly Sync Minutes",
 *   "approvers": [
 *     { "id": "user_1", "name": "Tanaka", "larkOpenId": "ou_xxx" }
 *   ],
 *   "comment": "Please review these minutes",
 *   "sendNotification": true
 * }
 * ```
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Get user context
  const userContext = getUserContext(request);
  if (userContext === null) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing user context. X-User-Id and X-User-Name headers required.',
        code: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON body',
        code: 'INVALID_REQUEST',
      },
      { status: 400 }
    );
  }

  // Validate request body
  const parseResult = PostRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.issues,
      },
      { status: 400 }
    );
  }

  const input = parseResult.data;
  const accessToken = getAccessToken(request);

  // Create approval service and request
  const service = createApprovalService();
  const user = createApprovalUserContext(userContext.id, userContext.name);

  try {
    const result = await service.requestApproval(input, user, {
      accessToken: accessToken ?? undefined,
      sendNotification: input.sendNotification,
      language: 'ja',
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: result.errorCode,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        request: result.request,
        historyEntry: result.historyEntry,
        notificationSent: result.notificationSent,
      },
    }, { status: 201 });
  } catch (error) {
    const err = error as Error;
    console.error('Approval request error:', err);

    return NextResponse.json(
      {
        success: false,
        error: err.message,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/approvals
 *
 * List approval requests with optional filters.
 *
 * @example
 * ```
 * GET /api/approvals?status=pending_approval&approverId=user_1&page=1&pageSize=20
 * X-User-Id: user_123
 * X-User-Name: Suzuki
 * ```
 */
export function GET(request: NextRequest): NextResponse {
  // Get user context
  const userContext = getUserContext(request);
  if (userContext === null) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing user context',
        code: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  // Parse query parameters
  const searchParams = request.nextUrl.searchParams;
  const queryParams: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const parseResult = GetQuerySchema.safeParse(queryParams);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid query parameters',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.issues,
      },
      { status: 400 }
    );
  }

  const { status, requesterId, approverId, minutesId, meetingId, page, pageSize } = parseResult.data;

  // Build filters
  const filters = {
    status,
    requesterId,
    approverId,
    minutesId,
    meetingId,
  };

  // Get approval requests
  const service = createApprovalService();
  const result = service.listRequests(filters, page ?? 1, pageSize ?? 20);

  return NextResponse.json({
    success: true,
    data: result,
  });
}
