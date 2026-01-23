/**
 * Approval Request Detail API Route
 * @module app/api/approvals/[id]/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createApprovalService,
  createApprovalUserContext,
} from '@/services/approval.service';
import { APPROVAL_ACTION } from '@/types/approval';

// =============================================================================
// Request Schemas
// =============================================================================

/**
 * Schema for PUT request body (approve/reject)
 */
const PutRequestSchema = z.object({
  /** Action to perform: approve or reject */
  action: z.enum([APPROVAL_ACTION.APPROVE, APPROVAL_ACTION.REJECT]),
  /** Optional comment */
  comment: z.string().max(1000).optional(),
  /** Whether to send notification */
  sendNotification: z.boolean().default(true),
});

/**
 * Schema for DELETE request body (withdraw)
 */
const DeleteRequestSchema = z.object({
  /** Optional comment for withdrawal */
  comment: z.string().max(1000).optional(),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get user context from request headers
 */
function getUserContext(request: NextRequest): { id: string; name: string } | null {
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
// Route Parameters Type
// =============================================================================

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * GET /api/approvals/[id]
 *
 * Get a specific approval request and its history.
 *
 * @example
 * ```
 * GET /api/approvals/apr_123
 * X-User-Id: user_123
 * X-User-Name: Suzuki
 * ```
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

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

  const service = createApprovalService();
  const approvalRequest = service.getRequest(id);

  if (approvalRequest === undefined) {
    return NextResponse.json(
      {
        success: false,
        error: 'Approval request not found',
        code: 'NOT_FOUND',
      },
      { status: 404 }
    );
  }

  // Get history
  const history = service.getHistory(id);

  return NextResponse.json({
    success: true,
    data: {
      request: approvalRequest,
      history: history.items,
    },
  });
}

/**
 * PUT /api/approvals/[id]
 *
 * Approve or reject an approval request.
 *
 * @example
 * ```
 * PUT /api/approvals/apr_123
 * X-User-Id: user_1
 * X-User-Name: Tanaka
 * Authorization: Bearer <access_token>
 * Content-Type: application/json
 *
 * {
 *   "action": "approve",
 *   "comment": "Looks good!",
 *   "sendNotification": true
 * }
 * ```
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

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
  const parseResult = PutRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request body',
        code: 'VALIDATION_ERROR',
        details: parseResult.error.errors,
      },
      { status: 400 }
    );
  }

  const { action, comment, sendNotification } = parseResult.data;
  const accessToken = getAccessToken(request);

  const service = createApprovalService();
  const user = createApprovalUserContext(userContext.id, userContext.name);

  try {
    const result = await service.resolve(
      {
        approvalRequestId: id,
        action,
        comment,
        sendNotification,
      },
      user,
      {
        accessToken: accessToken ?? undefined,
        language: 'ja',
      }
    );

    if (!result.success) {
      const statusCode = result.errorCode === 'NOT_FOUND' ? 404 :
        result.errorCode === 'FORBIDDEN' ? 403 : 400;

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: result.errorCode,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        request: result.request,
        historyEntry: result.historyEntry,
        notificationSent: result.notificationSent,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error('Approval resolve error:', err);

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
 * DELETE /api/approvals/[id]
 *
 * Withdraw an approval request (only by requester).
 *
 * @example
 * ```
 * DELETE /api/approvals/apr_123
 * X-User-Id: user_123
 * X-User-Name: Suzuki
 * Content-Type: application/json
 *
 * {
 *   "comment": "Need to make changes"
 * }
 * ```
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id } = await params;

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

  // Parse request body (optional)
  let body: { comment?: string } = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text) as { comment?: string };
    }
  } catch {
    // Body is optional for DELETE
  }

  const parseResult = DeleteRequestSchema.safeParse(body);
  const comment = parseResult.success ? parseResult.data.comment : undefined;

  const service = createApprovalService();
  const user = createApprovalUserContext(userContext.id, userContext.name);

  try {
    const result = service.withdraw(
      {
        approvalRequestId: id,
        comment,
      },
      user
    );

    if (!result.success) {
      const statusCode = result.errorCode === 'NOT_FOUND' ? 404 :
        result.errorCode === 'FORBIDDEN' ? 403 : 400;

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: result.errorCode,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        request: result.request,
        historyEntry: result.historyEntry,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error('Approval withdraw error:', err);

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
