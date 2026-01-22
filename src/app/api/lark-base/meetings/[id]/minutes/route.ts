/**
 * Lark Base Minutes API Route
 * @module app/api/lark-base/meetings/[id]/minutes/route
 *
 * POST - Save minutes for a meeting
 * GET - Get minutes for a meeting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import {
  createLarkBaseServiceFromEnv,
  LarkBaseServiceError,
  EntityNotFoundError,
} from '@/services/lark-base.service';
import type { Minutes } from '@/types/minutes';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/lark-base/meetings/[id]/minutes
 * Save minutes for a meeting
 */
export async function POST(
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

    const { id: meetingId } = await params;
    const body = await request.json();
    const { minutes, docUrl } = body as { minutes: Minutes; docUrl?: string };

    if (minutes === undefined) {
      return NextResponse.json(
        { error: 'Minutes data is required', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    const client = createLarkClient();
    const service = createLarkBaseServiceFromEnv(client, session.accessToken);

    const result = await service.saveMinutes(minutes, meetingId, docUrl);

    return NextResponse.json({
      success: true,
      data: {
        recordId: result.recordId,
        version: result.version,
        minutes: result.minutes,
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

    const { id } = await params;
    console.error(`[LarkBase/Meetings/${id}/Minutes] POST error:`, error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/lark-base/meetings/[id]/minutes
 * Get minutes for a meeting
 */
export async function GET(
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

    const { id: meetingId } = await params;
    const { searchParams } = new URL(request.url);
    const versionStr = searchParams.get('version');
    const version = versionStr !== null ? parseInt(versionStr, 10) : undefined;

    const client = createLarkClient();
    const service = createLarkBaseServiceFromEnv(client, session.accessToken);

    const minutes = await service.getMinutes(meetingId, version);

    if (minutes === null) {
      return NextResponse.json(
        { error: 'Minutes not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { minutes },
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
    console.error(`[LarkBase/Meetings/${id}/Minutes] GET error:`, error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
