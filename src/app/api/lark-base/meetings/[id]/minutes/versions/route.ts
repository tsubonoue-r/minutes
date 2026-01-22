/**
 * Lark Base Minutes Versions API Route
 * @module app/api/lark-base/meetings/[id]/minutes/versions/route
 *
 * GET - List all minutes versions for a meeting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createLarkClient } from '@/lib/lark/client';
import {
  createLarkBaseServiceFromEnv,
  LarkBaseServiceError,
} from '@/services/lark-base.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/lark-base/meetings/[id]/minutes/versions
 * List all minutes versions for a meeting
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

    const { id: meetingId } = await params;

    const client = createLarkClient();
    const service = createLarkBaseServiceFromEnv(client, session.accessToken);

    const versions = await service.listMinutesVersions(meetingId);

    return NextResponse.json({
      success: true,
      data: {
        meetingId,
        versions,
        count: versions.length,
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

    const { id } = await params;
    console.error(`[LarkBase/Meetings/${id}/Minutes/Versions] GET error:`, error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
