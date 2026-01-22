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
  /** Get meeting transcript */
  TRANSCRIPT_GET: '/open-apis/vc/v1/meetings/:meeting_id/transcript',
} as const;

export type LarkVCApiEndpoint = (typeof LarkVCApiEndpoints)[keyof typeof LarkVCApiEndpoints];

// =============================================================================
// Lark VC Transcript API Types
// =============================================================================

/**
 * Speaker information in transcript segment
 */
export const larkSpeakerSchema = z.object({
  /** User ID of the speaker */
  user_id: z.string(),
  /** Display name of the speaker */
  name: z.string(),
});

export type LarkSpeaker = z.infer<typeof larkSpeakerSchema>;

/**
 * Single transcript segment
 */
export const larkTranscriptSegmentSchema = z.object({
  /** Unique segment identifier */
  segment_id: z.string(),
  /** Start time in milliseconds from meeting start */
  start_time: z.number(),
  /** End time in milliseconds from meeting start */
  end_time: z.number(),
  /** Speaker information */
  speaker: larkSpeakerSchema,
  /** Transcribed text content */
  text: z.string(),
  /** Confidence score (0.0 - 1.0) */
  confidence: z.number().min(0).max(1).optional(),
});

export type LarkTranscriptSegment = z.infer<typeof larkTranscriptSegmentSchema>;

/**
 * Supported transcript languages
 */
export const larkTranscriptLanguageSchema = z.enum([
  'ja',
  'en',
  'zh',
  'ko',
  'de',
  'fr',
  'es',
  'pt',
  'it',
  'ru',
]);

export type LarkTranscriptLanguage = z.infer<typeof larkTranscriptLanguageSchema>;

/**
 * Complete transcript data for a meeting
 */
export const larkTranscriptSchema = z.object({
  /** Meeting ID */
  meeting_id: z.string(),
  /** Transcript language */
  language: larkTranscriptLanguageSchema.optional(),
  /** Array of transcript segments */
  segments: z.array(larkTranscriptSegmentSchema),
});

export type LarkTranscript = z.infer<typeof larkTranscriptSchema>;

/**
 * Transcript response data from Lark API
 */
export const larkTranscriptDataSchema = larkTranscriptSchema;

export type LarkTranscriptData = z.infer<typeof larkTranscriptDataSchema>;

/**
 * Transcript API response
 */
export const larkTranscriptResponseSchema = larkApiResponseSchema(larkTranscriptDataSchema);

export type LarkTranscriptResponse = z.infer<typeof larkTranscriptResponseSchema>;

// =============================================================================
// Lark Docs API Types
// =============================================================================

/**
 * Document information
 */
export const larkDocumentSchema = z.object({
  /** Document ID */
  document_id: z.string(),
  /** Document title */
  title: z.string(),
  /** Document URL */
  url: z.string(),
});

export type LarkDocument = z.infer<typeof larkDocumentSchema>;

/**
 * Document creation response data
 */
export const larkDocCreateDataSchema = z.object({
  /** Created document information */
  document: larkDocumentSchema,
});

export type LarkDocCreateData = z.infer<typeof larkDocCreateDataSchema>;

/**
 * Document creation response
 */
export const larkDocCreateResponseSchema = larkApiResponseSchema(larkDocCreateDataSchema);

export type LarkDocCreateResponse = z.infer<typeof larkDocCreateResponseSchema>;

/**
 * Permission member types
 */
export const larkPermissionMemberTypeSchema = z.enum(['email', 'openid', 'userid']);

export type LarkPermissionMemberType = z.infer<typeof larkPermissionMemberTypeSchema>;

/**
 * Permission levels
 */
export const larkPermissionLevelSchema = z.enum(['view', 'edit', 'full_access']);

export type LarkPermissionLevel = z.infer<typeof larkPermissionLevelSchema>;

/**
 * Permission member request for adding permissions
 */
export const larkPermissionMemberRequestSchema = z.object({
  /** Member type: email, openid, or userid */
  member_type: larkPermissionMemberTypeSchema,
  /** Member identifier */
  member_id: z.string(),
  /** Permission level */
  perm: larkPermissionLevelSchema,
});

export type LarkPermissionMemberRequest = z.infer<typeof larkPermissionMemberRequestSchema>;

/**
 * Permission member response data
 */
export const larkPermissionMemberDataSchema = z.object({
  /** Created member information */
  member: z.object({
    member_type: larkPermissionMemberTypeSchema,
    member_id: z.string(),
    perm: larkPermissionLevelSchema,
  }),
});

export type LarkPermissionMemberData = z.infer<typeof larkPermissionMemberDataSchema>;

/**
 * Permission member response
 */
export const larkPermissionMemberResponseSchema = larkApiResponseSchema(
  larkPermissionMemberDataSchema
);

export type LarkPermissionMemberResponse = z.infer<typeof larkPermissionMemberResponseSchema>;

/**
 * Mount types for document import
 */
export const larkMountTypeSchema = z.union([
  z.literal(1), // My Drive
  z.literal(2), // Shared folder
]);

export type LarkMountType = z.infer<typeof larkMountTypeSchema>;

/**
 * Document import file extensions
 */
export const larkDocImportExtensionSchema = z.enum(['docx', 'doc', 'md']);

export type LarkDocImportExtension = z.infer<typeof larkDocImportExtensionSchema>;

/**
 * Document import point (destination)
 */
export const larkDocImportPointSchema = z.object({
  /** Mount type: 1 = My Drive, 2 = Shared folder */
  mount_type: larkMountTypeSchema,
  /** Folder token for destination */
  mount_key: z.string(),
});

export type LarkDocImportPoint = z.infer<typeof larkDocImportPointSchema>;

/**
 * Document import request
 */
export const larkDocImportRequestSchema = z.object({
  /** File extension */
  file_extension: larkDocImportExtensionSchema,
  /** File token (for existing files) */
  file_token: z.string().optional(),
  /** File name */
  file_name: z.string(),
  /** Destination point */
  point: larkDocImportPointSchema,
});

export type LarkDocImportRequest = z.infer<typeof larkDocImportRequestSchema>;

/**
 * Import task status
 */
export const larkImportTaskStatusSchema = z.enum([
  'processing',
  'success',
  'failed',
]);

export type LarkImportTaskStatus = z.infer<typeof larkImportTaskStatusSchema>;

/**
 * Import task response data
 */
export const larkImportTaskDataSchema = z.object({
  /** Import task ticket */
  ticket: z.string(),
});

export type LarkImportTaskData = z.infer<typeof larkImportTaskDataSchema>;

/**
 * Import task response
 */
export const larkImportTaskResponseSchema = larkApiResponseSchema(larkImportTaskDataSchema);

export type LarkImportTaskResponse = z.infer<typeof larkImportTaskResponseSchema>;

/**
 * Import task result data
 */
export const larkImportTaskResultDataSchema = z.object({
  /** Task result */
  result: z.object({
    /** Task ticket */
    ticket: z.string(),
    /** Task type */
    type: z.string(),
    /** Job status */
    job_status: z.number(),
    /** Job error message */
    job_error_msg: z.string().optional(),
    /** Token of the created document */
    token: z.string().optional(),
    /** URL of the created document */
    url: z.string().optional(),
    /** Extra information */
    extra: z.array(z.string()).optional(),
  }),
});

export type LarkImportTaskResultData = z.infer<typeof larkImportTaskResultDataSchema>;

/**
 * Import task result response
 */
export const larkImportTaskResultResponseSchema = larkApiResponseSchema(
  larkImportTaskResultDataSchema
);

export type LarkImportTaskResultResponse = z.infer<typeof larkImportTaskResultResponseSchema>;

/**
 * File upload response data
 */
export const larkFileUploadDataSchema = z.object({
  /** Uploaded file token */
  file_token: z.string(),
});

export type LarkFileUploadData = z.infer<typeof larkFileUploadDataSchema>;

/**
 * File upload response
 */
export const larkFileUploadResponseSchema = larkApiResponseSchema(larkFileUploadDataSchema);

export type LarkFileUploadResponse = z.infer<typeof larkFileUploadResponseSchema>;

/**
 * Lark Docs API endpoints
 */
export const LarkDocsApiEndpoints = {
  /** Create import task */
  IMPORT_TASK_CREATE: '/open-apis/drive/v1/import_tasks',
  /** Get import task result */
  IMPORT_TASK_GET: '/open-apis/drive/v1/import_tasks/:ticket',
  /** Upload file */
  FILE_UPLOAD: '/open-apis/drive/v1/files/upload_all',
  /** Add permission member */
  PERMISSION_MEMBER_CREATE: '/open-apis/drive/v1/permissions/:token/members',
} as const;

export type LarkDocsApiEndpoint = (typeof LarkDocsApiEndpoints)[keyof typeof LarkDocsApiEndpoints];
