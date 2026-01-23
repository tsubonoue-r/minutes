/**
 * MSW request handlers for Lark API mocking
 * @module tests/mocks/handlers
 */

import { http, HttpResponse } from 'msw';
import {
  mockAppAccessTokenResponse,
  mockLarkMeetingListResponse,
  mockLarkMeetingDetailResponse,
  mockLarkParticipantsResponse,
  mockBitableRecordsResponse,
} from './data';

/**
 * Base URL for Lark API
 */
const LARK_BASE_URL = 'https://open.larksuite.com';

/**
 * Default Lark API mock handlers
 *
 * These handlers mock the core Lark API endpoints used by the application:
 * - Authentication: App access token retrieval
 * - VC (Video Conference): Meeting list, detail, and participants
 * - Bitable: Table record retrieval
 */
export const handlers = [
  // =========================================================================
  // Authentication Handlers
  // =========================================================================

  /**
   * POST /open-apis/auth/v3/app_access_token/internal
   * Get app access token for internal apps
   */
  http.post(
    `${LARK_BASE_URL}/open-apis/auth/v3/app_access_token/internal`,
    async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;

      // Validate required fields
      if (!body['app_id'] || !body['app_secret']) {
        return HttpResponse.json(
          {
            code: 10003,
            msg: 'app_id or app_secret is invalid',
            data: null,
          },
          { status: 200 }
        );
      }

      return HttpResponse.json(mockAppAccessTokenResponse);
    }
  ),

  // =========================================================================
  // Meeting (VC) Handlers
  // =========================================================================

  /**
   * GET /open-apis/vc/v1/meetings
   * List meetings with pagination
   */
  http.get(`${LARK_BASE_URL}/open-apis/vc/v1/meetings`, ({ request }) => {
    const url = new URL(request.url);
    const pageToken = url.searchParams.get('page_token');
    const pageSize = url.searchParams.get('page_size');

    // Validate authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          code: 99991663,
          msg: 'token is invalid',
          data: null,
        },
        { status: 200 }
      );
    }

    // Simulate pagination with empty results for subsequent pages
    if (pageToken && pageToken !== '') {
      return HttpResponse.json({
        code: 0,
        msg: 'ok',
        data: {
          has_more: false,
          page_token: '',
          meeting_list: [],
        },
      });
    }

    // Apply page_size limit if specified
    const response = { ...mockLarkMeetingListResponse };
    if (pageSize) {
      const limit = parseInt(pageSize, 10);
      if (!isNaN(limit) && limit > 0) {
        const meetings = response.data.meeting_list.slice(0, limit);
        response.data = {
          ...response.data,
          meeting_list: meetings,
          has_more: meetings.length < response.data.meeting_list.length,
        };
      }
    }

    return HttpResponse.json(response);
  }),

  /**
   * GET /open-apis/vc/v1/meetings/:id
   * Get meeting details by ID
   */
  http.get(
    `${LARK_BASE_URL}/open-apis/vc/v1/meetings/:id`,
    ({ params, request }) => {
      // Validate authorization header
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return HttpResponse.json(
          {
            code: 99991663,
            msg: 'token is invalid',
            data: null,
          },
          { status: 200 }
        );
      }

      const meetingId = params['id'] as string;

      // Check if meeting exists in mock data
      const meetingList = mockLarkMeetingListResponse.data.meeting_list;
      const meeting = meetingList.find((m) => m.meeting_id === meetingId);

      if (!meeting) {
        return HttpResponse.json(
          {
            code: 10404,
            msg: 'meeting not found',
            data: null,
          },
          { status: 200 }
        );
      }

      // Return in the format expected by larkMeetingSchema (single meeting)
      return HttpResponse.json({
        code: 0,
        msg: 'ok',
        data: meeting,
      });
    }
  ),

  /**
   * GET /open-apis/vc/v1/meetings/:id/participants
   * Get meeting participants
   */
  http.get(
    `${LARK_BASE_URL}/open-apis/vc/v1/meetings/:id/participants`,
    ({ params, request }) => {
      // Validate authorization header
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return HttpResponse.json(
          {
            code: 99991663,
            msg: 'token is invalid',
            data: null,
          },
          { status: 200 }
        );
      }

      const meetingId = params['id'] as string;

      // Only meeting-001 has participants in our mock data
      if (meetingId !== 'meeting-001') {
        return HttpResponse.json({
          code: 0,
          msg: 'ok',
          data: {
            participant_list: [],
            has_more: false,
            page_token: '',
          },
        });
      }

      return HttpResponse.json(mockLarkParticipantsResponse);
    }
  ),

  // =========================================================================
  // Bitable Handlers
  // =========================================================================

  /**
   * GET /open-apis/bitable/v1/apps/:app/tables/:table/records
   * Get Bitable table records
   */
  http.get(
    `${LARK_BASE_URL}/open-apis/bitable/v1/apps/:app/tables/:table/records`,
    ({ params, request }) => {
      // Validate authorization header
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return HttpResponse.json(
          {
            code: 99991663,
            msg: 'token is invalid',
            data: null,
          },
          { status: 200 }
        );
      }

      const appToken = params['app'] as string;
      const tableId = params['table'] as string;

      // Validate required path parameters
      if (!appToken || !tableId) {
        return HttpResponse.json(
          {
            code: 10001,
            msg: 'invalid parameter',
            data: null,
          },
          { status: 200 }
        );
      }

      return HttpResponse.json(mockBitableRecordsResponse);
    }
  ),
];

/**
 * Error simulation handlers
 * Use these for testing error handling scenarios
 */
export const errorHandlers = {
  /**
   * Handler that simulates a network timeout
   */
  networkTimeout: http.get(
    `${LARK_BASE_URL}/open-apis/vc/v1/meetings`,
    async () => {
      // Simulate a delay that exceeds typical timeout
      await new Promise((resolve) => setTimeout(resolve, 35000));
      return HttpResponse.json({ code: 0, msg: 'ok', data: {} });
    }
  ),

  /**
   * Handler that simulates a 500 Internal Server Error
   */
  serverError: http.get(
    `${LARK_BASE_URL}/open-apis/vc/v1/meetings`,
    () => {
      return HttpResponse.json(
        {
          code: 99991400,
          msg: 'internal server error',
          data: null,
        },
        { status: 500 }
      );
    }
  ),

  /**
   * Handler that simulates an expired token
   */
  expiredToken: http.get(
    `${LARK_BASE_URL}/open-apis/vc/v1/meetings`,
    () => {
      return HttpResponse.json(
        {
          code: 99991663,
          msg: 'token is expired',
          data: null,
        },
        { status: 200 }
      );
    }
  ),

  /**
   * Handler that simulates rate limiting
   */
  rateLimited: http.get(
    `${LARK_BASE_URL}/open-apis/vc/v1/meetings`,
    () => {
      return HttpResponse.json(
        {
          code: 99991400,
          msg: 'rate limit exceeded',
          data: null,
        },
        { status: 429 }
      );
    }
  ),
};
