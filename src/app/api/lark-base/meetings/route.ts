/**
 * Lark Base Meetings API Route
 * @module app/api/lark-base/meetings/route
 *
 * POST - Save a meeting to Lark Base
 * GET - List meetings from Lark Base
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import {
  createLarkBaseServiceFromEnv,
  LarkBaseServiceError,
} from '@/services/lark-base.service';
import type { Meeting } from '@/types/meeting';

/**
 * POST /api/lark-base/meetings
 * Save a meeting to Lark Base
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
    const meeting = body as Meeting;

    if (meeting.id === undefined || meeting.id === '') {
      return NextResponse.json(
        { error: 'Meeting ID is required', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    const client = createLarkClient();
    const service = createLarkBaseServiceFromEnv(client, session.accessToken);

    const result = await service.saveMeeting(meeting);

    return NextResponse.json({
      success: true,
      data: {
        recordId: result.recordId,
        meeting: result.meeting,
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

    console.error('[LarkBase/Meetings] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/lark-base/meetings
 * List meetings from Lark Base
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
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);
    const pageTokenParam = searchParams.get('pageToken');

    const client = createLarkClient();
    const service = createLarkBaseServiceFromEnv(client, session.accessToken);

    const listOptions: { pageSize?: number; pageToken?: string } = { pageSize };
    if (pageTokenParam !== null) {
      listOptions.pageToken = pageTokenParam;
    }

    const result = await service.listMeetings(listOptions);

    return NextResponse.json({
      success: true,
      data: {
        meetings: result.meetings,
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

    console.error('[LarkBase/Meetings] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
