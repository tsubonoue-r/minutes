/**
 * Lark Base Action Items Batch API Route
 * @module app/api/lark-base/action-items/batch/route
 *
 * PUT - Batch update action item statuses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import {
  createLarkBaseServiceFromEnv,
  LarkBaseServiceError,
} from '@/services/lark-base.service';
import type { ActionItemStatus } from '@/types/minutes';

/**
 * PUT /api/lark-base/action-items/batch
 * Batch update action item statuses
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (session === null || session.accessToken === undefined) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { updates } = body as {
      updates: Array<{ id: string; status: ActionItemStatus }>;
    };

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        {
          error: 'Updates array is required and must not be empty',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    // Validate each update
    for (const update of updates) {
      if (update.id === undefined || update.id === '') {
        return NextResponse.json(
          { error: 'Each update must have an id', code: 'INVALID_REQUEST' },
          { status: 400 }
        );
      }
      if (!['pending', 'in_progress', 'completed'].includes(update.status)) {
        return NextResponse.json(
          {
            error: `Invalid status: ${update.status}`,
            code: 'INVALID_REQUEST',
          },
          { status: 400 }
        );
      }
    }

    const client = createLarkClient();
    const service = createLarkBaseServiceFromEnv(client, session.accessToken);

    const result = await service.batchUpdateActionItemStatus(updates);

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: result.length,
        actionItems: result,
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

    console.error('[LarkBase/ActionItems/Batch] PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
