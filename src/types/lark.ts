/**
 * Lark API type definitions
 * @module types/lark
 */

/**
 * Lark API configuration
 */
export interface LarkConfig {
  /** Application ID */
  readonly appId: string;
  /** Application secret */
  readonly appSecret: string;
  /** API base URL (Larksuite or Feishu) */
  readonly baseUrl: string;
  /** OAuth redirect URI */
  readonly redirectUri: string;
}

/**
 * OAuth authorization parameters
 */
export interface OAuthAuthorizeParams {
  /** Application ID */
  readonly appId: string;
  /** Redirect URI after authorization */
  readonly redirectUri: string;
  /** CSRF protection state */
  readonly state: string;
  /** Optional: requested scopes */
  readonly scope?: string | undefined;
}

/**
 * OAuth token request parameters
 */
export interface TokenRequestParams {
  /** Authorization code from callback */
  readonly code: string;
  /** Application ID */
  readonly appId: string;
  /** Application secret */
  readonly appSecret: string;
}

/**
 * OAuth token refresh parameters
 */
export interface TokenRefreshParams {
  /** Refresh token */
  readonly refreshToken: string;
  /** Application ID */
  readonly appId: string;
  /** Application secret */
  readonly appSecret: string;
}

/**
 * Token information
 */
export interface TokenInfo {
  /** Access token */
  readonly accessToken: string;
  /** Token type (usually "Bearer") */
  readonly tokenType: string;
  /** Expires in seconds */
  readonly expiresIn: number;
  /** Refresh token */
  readonly refreshToken: string;
  /** Refresh token expires in seconds */
  readonly refreshTokenExpiresIn: number;
  /** Token scope */
  readonly scope?: string | undefined;
}

/**
 * App access token (for app-level API calls)
 */
export interface AppAccessToken {
  /** App access token */
  readonly appAccessToken: string;
  /** Expires in seconds */
  readonly expire: number;
}

/**
 * Lark OAuth scopes
 */
export const LarkScopes = {
  /** Read user info */
  USER_INFO: 'contact:user.base:readonly',
  /** Read calendar events */
  CALENDAR_READ: 'calendar:calendar:readonly',
  /** Read/write calendar events */
  CALENDAR_WRITE: 'calendar:calendar',
  /** Read documents */
  DOCS_READ: 'docs:doc:readonly',
  /** Read/write documents */
  DOCS_WRITE: 'docs:doc',
  /** Read minutes */
  MINUTES_READ: 'minutes:minutes:readonly',
  /** Read VC meetings */
  VC_MEETING_READ: 'vc:meeting:readonly',
  /** Read VC meeting recordings */
  VC_RECORD_READ: 'vc:record:readonly',
  /** Read VC rooms (required for meeting_list) */
  VC_ROOM_READ: 'vc:room:readonly',
} as const;

export type LarkScope = (typeof LarkScopes)[keyof typeof LarkScopes];
