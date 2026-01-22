/**
 * Lark Base Action Items API Route
 * @module app/api/lark-base/action-items/route
 *
 * POST - Save action items for a meeting
 * GET - List action items from Lark Base
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import {
  createLarkBaseServiceFromEnv,
  LarkBaseServiceError,
  EntityNotFoundError,
} from '@/services/lark-base.service';
import type { ManagedActionItem, ActionItemFilters } from '@/types/action-item';

/**
 * POST /api/lark-base/action-items
 * Save action items for a meeting
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (session === null || session.accessToken === undefined) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { meetingId, actionItems } = body as {
      meetingId: string;
      actionItems: ManagedActionItem[];
    };

    if (meetingId === undefined || meetingId === '') {
      return NextResponse.json(
        { error: 'Meeting ID is required', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    if (!Array.isArray(actionItems)) {
      return NextResponse.json(
        { error: 'Action items must be an array', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    const client = createLarkClient();
    const service = createLarkBaseServiceFromEnv(client, session.accessToken);

    const result = await service.saveActionItems(actionItems, meetingId);

    return NextResponse.json({
      success: true,
      data: {
        count: result.length,
        actionItems: result.map((r) => ({
          recordId: r.recordId,
          actionItem: r.actionItem,
        })),
      },
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

    console.error('[LarkBase/ActionItems] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/lark-base/action-items
 * List action items from Lark Base
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (session === null || session.accessToken === undefined) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse filters
    const filters: ActionItemFilters = {};

    const statusParam = searchParams.get('status');
    if (statusParam !== null) {
      filters.status = statusParam.split(',') as ActionItemFilters['status'];
    }

    const priorityParam = searchParams.get('priority');
    if (priorityParam !== null) {
      filters.priority = priorityParam.split(',') as ActionItemFilters['priority'];
    }

    const assigneeId = searchParams.get('assigneeId');
    if (assigneeId !== null) {
      filters.assigneeId = assigneeId;
    }

    const meetingId = searchParams.get('meetingId');
    if (meetingId !== null) {
      filters.meetingId = meetingId;
    }

    const isOverdueParam = searchParams.get('isOverdue');
    if (isOverdueParam !== null) {
      filters.isOverdue = isOverdueParam === 'true';
    }

    const searchQuery = searchParams.get('search');
    if (searchQuery !== null) {
      filters.searchQuery = searchQuery;
    }

    // Parse pagination
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);
    const pageTokenParam = searchParams.get('pageToken');

    const client = createLarkClient();
    const service = createLarkBaseServiceFromEnv(client, session.accessToken);

    const paginationOptions: { pageSize?: number; pageToken?: string } = { pageSize };
    if (pageTokenParam !== null) {
      paginationOptions.pageToken = pageTokenParam;
    }

    const result = await service.listActionItems(filters, paginationOptions);

    return NextResponse.json({
      success: true,
      data: {
        actionItems: result.actionItems,
        hasMore: result.hasMore,
        pageToken: result.pageToken,
      },
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

    console.error('[LarkBase/ActionItems] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
