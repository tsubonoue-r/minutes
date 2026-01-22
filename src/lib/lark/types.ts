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
