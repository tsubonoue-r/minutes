/**
 * Lark API response type definitions
 * @module lib/lark/types
 */

import { z } from 'zod';

/**
 * Base Lark API response structure
 */
export interface LarkApiResponse<T> {
  /** Response code (0 for success) */
  readonly code: number;
  /** Response message */
  readonly msg: string;
  /** Response data */
  readonly data?: T;
}

/**
 * Zod schema for base API response validation
 */
export const larkApiResponseSchema = <T extends z.ZodType>(
  dataSchema: T
): z.ZodObject<{
  code: z.ZodNumber;
  msg: z.ZodString;
  data: z.ZodOptional<T>;
}> =>
  z.object({
    code: z.number(),
    msg: z.string(),
    data: dataSchema.optional(),
  });

/**
 * App access token response data
 */
export const appAccessTokenDataSchema = z.object({
  app_access_token: z.string(),
  expire: z.number(),
});

export type AppAccessTokenData = z.infer<typeof appAccessTokenDataSchema>;

/**
 * App access token response
 */
export const appAccessTokenResponseSchema = larkApiResponseSchema(
  appAccessTokenDataSchema
);

export type AppAccessTokenResponse = z.infer<typeof appAccessTokenResponseSchema>;

/**
 * User access token response data
 */
export const userAccessTokenDataSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  refresh_expires_in: z.number(),
  scope: z.string().optional(),
  name: z.string().optional(),
  en_name: z.string().optional(),
  avatar_url: z.string().optional(),
  avatar_thumb: z.string().optional(),
  avatar_middle: z.string().optional(),
  avatar_big: z.string().optional(),
  open_id: z.string(),
  union_id: z.string(),
  email: z.string().optional(),
  mobile: z.string().optional(),
  tenant_key: z.string(),
});

export type UserAccessTokenData = z.infer<typeof userAccessTokenDataSchema>;

/**
 * User access token response
 */
export const userAccessTokenResponseSchema = larkApiResponseSchema(
  userAccessTokenDataSchema
);

export type UserAccessTokenResponse = z.infer<typeof userAccessTokenResponseSchema>;

/**
 * Refresh token response data (same structure as user access token)
 */
export const refreshTokenDataSchema = userAccessTokenDataSchema;

export type RefreshTokenData = z.infer<typeof refreshTokenDataSchema>;

/**
 * Refresh token response
 */
export const refreshTokenResponseSchema = larkApiResponseSchema(refreshTokenDataSchema);

export type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>;

/**
 * User info response data
 */
export const userInfoDataSchema = z.object({
  user: z.object({
    open_id: z.string(),
    union_id: z.string(),
    name: z.string(),
    en_name: z.string().optional(),
    avatar_url: z.string(),
    avatar_thumb: z.string().optional(),
    avatar_middle: z.string().optional(),
    avatar_big: z.string().optional(),
    email: z.string().optional(),
    mobile: z.string().optional(),
    tenant_key: z.string(),
  }),
});

export type UserInfoData = z.infer<typeof userInfoDataSchema>;

/**
 * User info response
 */
export const userInfoResponseSchema = larkApiResponseSchema(userInfoDataSchema);

export type UserInfoResponse = z.infer<typeof userInfoResponseSchema>;

/**
 * Lark API error response
 */
export interface LarkApiError {
  /** Error code */
  readonly code: number;
  /** Error message */
  readonly msg: string;
  /** Error details */
  readonly error?: {
    readonly log_id?: string;
    readonly details?: unknown;
  };
}

/**
 * Check if response indicates success
 */
export function isLarkApiSuccess<T>(
  response: LarkApiResponse<T>
): response is LarkApiResponse<T> & { data: T } {
  return response.code === 0 && response.data !== undefined;
}

/**
 * Lark API endpoints
 */
export const LarkApiEndpoints = {
  /** Get app access token */
  APP_ACCESS_TOKEN: '/open-apis/auth/v3/app_access_token/internal',
  /** Get user access token from authorization code */
  USER_ACCESS_TOKEN: '/open-apis/authen/v1/oidc/access_token',
  /** Refresh user access token */
  REFRESH_TOKEN: '/open-apis/authen/v1/oidc/refresh_access_token',
  /** Get user info */
  USER_INFO: '/open-apis/authen/v1/user_info',
  /** OAuth authorize URL */
  AUTHORIZE: '/open-apis/authen/v1/authorize',
} as const;

export type LarkApiEndpoint = (typeof LarkApiEndpoints)[keyof typeof LarkApiEndpoints];

// =============================================================================
// Lark VC (Video Conference) API Types
// =============================================================================

/**
 * Meeting user information
 */
export const larkMeetingUserSchema = z.object({
  /** User ID */
  user_id: z.string(),
  /** User name */
  user_name: z.string(),
  /** User avatar URL */
  avatar_url: z.string().optional(),
});

export type LarkMeetingUser = z.infer<typeof larkMeetingUserSchema>;

/**
 * Meeting status enum
 */
export const larkMeetingStatusSchema = z.enum(['not_started', 'in_progress', 'ended']);

export type LarkMeetingStatus = z.infer<typeof larkMeetingStatusSchema>;

/**
 * Meeting details
 */
export const larkMeetingSchema = z.object({
  /** Meeting ID */
  meeting_id: z.string(),
  /** Meeting topic/title */
  topic: z.string(),
  /** Meeting number */
  meeting_no: z.string(),
  /** Start time (Unix timestamp in seconds) */
  start_time: z.string(),
  /** End time (Unix timestamp in seconds) */
  end_time: z.string(),
  /** Host user information */
  host_user: larkMeetingUserSchema,
  /** Meeting status */
  status: larkMeetingStatusSchema,
  /** Number of participants */
  participant_count: z.number(),
  /** Recording URL (if available) */
  record_url: z.string().optional(),
});

export type LarkMeeting = z.infer<typeof larkMeetingSchema>;

/**
 * Meeting list response data
 */
export const larkMeetingListDataSchema = z.object({
  /** Whether there are more results */
  has_more: z.boolean(),
  /** Page token for pagination */
  page_token: z.string().optional(),
  /** List of meetings */
  meeting_list: z.array(larkMeetingSchema),
});

export type LarkMeetingListData = z.infer<typeof larkMeetingListDataSchema>;

/**
 * Meeting list response
 */
export const larkMeetingListResponseSchema = larkApiResponseSchema(larkMeetingListDataSchema);

export type LarkMeetingListResponse = z.infer<typeof larkMeetingListResponseSchema>;

/**
 * Participant user type
 */
export const larkParticipantUserTypeSchema = z.enum([
  'lark_user',
  'rooms_user',
  'pstn_user',
  'sip_user',
]);

export type LarkParticipantUserType = z.infer<typeof larkParticipantUserTypeSchema>;

/**
 * Participant status
 */
export const larkParticipantStatusSchema = z.enum(['in_meeting', 'left']);

export type LarkParticipantStatus = z.infer<typeof larkParticipantStatusSchema>;

/**
 * Meeting participant details
 */
export const larkMeetingParticipantSchema = z.object({
  /** User ID */
  user_id: z.string(),
  /** User type */
  user_type: larkParticipantUserTypeSchema,
  /** User name */
  user_name: z.string(),
  /** User avatar URL */
  avatar_url: z.string().optional(),
  /** Join time (Unix timestamp in seconds) */
  join_time: z.string(),
  /** Leave time (Unix timestamp in seconds) */
  leave_time: z.string().optional(),
  /** Participant status */
  status: larkParticipantStatusSchema,
});

export type LarkMeetingParticipant = z.infer<typeof larkMeetingParticipantSchema>;

/**
 * Participant list response data
 */
export const larkParticipantListDataSchema = z.object({
  /** Whether there are more results */
  has_more: z.boolean(),
  /** Page token for pagination */
  page_token: z.string().optional(),
  /** List of participants */
  participant_list: z.array(larkMeetingParticipantSchema),
});

export type LarkParticipantListData = z.infer<typeof larkParticipantListDataSchema>;

/**
 * Participant list response
 */
export const larkParticipantListResponseSchema = larkApiResponseSchema(larkParticipantListDataSchema);

export type LarkParticipantListResponse = z.infer<typeof larkParticipantListResponseSchema>;

/**
 * Meeting recording information
 */
export const larkMeetingRecordingSchema = z.object({
  /** Recording ID */
  recording_id: z.string(),
  /** Recording URL */
  url: z.string(),
  /** Recording duration in seconds */
  duration: z.number(),
  /** Recording start time (Unix timestamp in seconds) */
  start_time: z.string(),
  /** Recording end time (Unix timestamp in seconds) */
  end_time: z.string(),
});

export type LarkMeetingRecording = z.infer<typeof larkMeetingRecordingSchema>;

/**
 * Recording list response data
 */
export const larkRecordingListDataSchema = z.object({
  /** Whether there are more results */
  has_more: z.boolean(),
  /** Page token for pagination */
  page_token: z.string().optional(),
  /** List of recordings */
  recording_list: z.array(larkMeetingRecordingSchema),
});

export type LarkRecordingListData = z.infer<typeof larkRecordingListDataSchema>;

/**
 * Recording list response
 */
export const larkRecordingListResponseSchema = larkApiResponseSchema(larkRecordingListDataSchema);

export type LarkRecordingListResponse = z.infer<typeof larkRecordingListResponseSchema>;

/**
 * Lark VC API endpoints
 */
export const LarkVCApiEndpoints = {
  /** List meetings */
  MEETING_LIST: '/open-apis/vc/v1/meetings',
  /** Get meeting details */
  MEETING_GET: '/open-apis/vc/v1/meetings/:meeting_id',
  /** List meeting participants */
  PARTICIPANT_LIST: '/open-apis/vc/v1/meetings/:meeting_id/participants',
  /** List meeting recordings */
  RECORDING_LIST: '/open-apis/vc/v1/meetings/:meeting_id/recordings',
} as const;

export type LarkVCApiEndpoint = (typeof LarkVCApiEndpoints)[keyof typeof LarkVCApiEndpoints];
