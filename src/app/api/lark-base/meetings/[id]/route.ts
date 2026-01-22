/**
 * Lark Base Meeting Detail API Route
 * @module app/api/lark-base/meetings/[id]/route
 *
 * GET - Get a meeting by ID
 * PUT - Update a meeting
 * DELETE - Delete a meeting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import {
  createLarkBaseServiceFromEnv,
  LarkBaseServiceError,
  EntityNotFoundError,
} from '@/services/lark-base.service';
import type { Meeting, MinutesStatus } from '@/types/meeting';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/lark-base/meetings/[id]
 * Get a meeting by ID
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

    const meeting = await service.getMeeting(id);

    if (meeting === null) {
      return NextResponse.json(
        { error: 'Meeting not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { meeting },
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
    console.error(`[LarkBase/Meetings/${id}] GET error:`, error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/lark-base/meetings/[id]
 * Update a meeting (currently supports minutesStatus update)
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
    const { minutesStatus } = body as { minutesStatus?: MinutesStatus };

    if (minutesStatus === undefined) {
      return NextResponse.json(
        { error: 'No update fields provided', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    // Validate minutesStatus
    const validStatuses: MinutesStatus[] = [
      'not_created',
      'draft',
      'pending_approval',
      'approved',
    ];
    if (!validStatuses.includes(minutesStatus)) {
      return NextResponse.json(
        {
          error: `Invalid minutesStatus: ${minutesStatus}`,
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    const client = createLarkClient();
    const service = createLarkBaseServiceFromEnv(client, session.accessToken);

    await service.updateMeetingMinutesStatus(id, minutesStatus);

    // Fetch and return updated meeting
    const updatedMeeting = await service.getMeeting(id);

    return NextResponse.json({
      success: true,
      data: { meeting: updatedMeeting },
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
    console.error(`[LarkBase/Meetings/${id}] PUT error:`, error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lark-base/meetings/[id]
 * Delete a meeting from Lark Base
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

    await service.deleteMeeting(id);

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
    console.error(`[LarkBase/Meetings/${id}] DELETE error:`, error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
