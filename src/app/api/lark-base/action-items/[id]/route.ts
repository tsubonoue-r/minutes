/**
 * Lark Base Action Item Detail API Route
 * @module app/api/lark-base/action-items/[id]/route
 *
 * GET - Get an action item by ID
 * PUT - Update an action item
 * DELETE - Delete an action item
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import {
  createLarkBaseServiceFromEnv,
  LarkBaseServiceError,
  EntityNotFoundError,
} from '@/services/lark-base.service';
import type { ManagedActionItem } from '@/types/action-item';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/lark-base/action-items/[id]
 * Get an action item by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (session === null || session.accessToken === undefined) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const client = createLarkClient();
    const service = createLarkBaseServiceFromEnv(client, session.accessToken);

    const actionItem = await service.getActionItem(id);

    if (actionItem === null) {
      return NextResponse.json(
        { error: 'Action item not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { actionItem },
    });
  } catch (error) {
    if (error instanceof LarkBaseServiceError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.statusCode }
      );
    }

    const { id } = await params;
    console.error(`[LarkBase/ActionItems/${id}] GET error:`, error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/lark-base/action-items/[id]
 * Update an action item
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (session === null || session.accessToken === undefined) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const updates = body as Partial<
      Pick<
        ManagedActionItem,
        'content' | 'assignee' | 'dueDate' | 'priority' | 'status'
      >
    >;

    const client = createLarkClient();
    const service = createLarkBaseServiceFromEnv(client, session.accessToken);

    const actionItem = await service.updateActionItem(id, updates);

    return NextResponse.json({
      success: true,
      data: { actionItem },
    });
  } catch (error) {
    if (error instanceof EntityNotFoundError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: 404 }
      );
    }

    if (error instanceof LarkBaseServiceError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.statusCode }
      );
    }

    const { id } = await params;
    console.error(`[LarkBase/ActionItems/${id}] PUT error:`, error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lark-base/action-items/[id]
 * Delete an action item
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (session === null || session.accessToken === undefined) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const client = createLarkClient();
    const service = createLarkBaseServiceFromEnv(client, session.accessToken);

    await service.deleteActionItem(id);

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    if (error instanceof EntityNotFoundError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: 404 }
      );
    }

    if (error instanceof LarkBaseServiceError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.statusCode }
      );
    }

    const { id } = await params;
    console.error(`[LarkBase/ActionItems/${id}] DELETE error:`, error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
