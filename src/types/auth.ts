/**
 * Authentication related type definitions
 * @module types/auth
 */

/**
 * User information from Lark OAuth
 */
export interface LarkUser {
  /** Unique user ID (open_id) */
  readonly openId: string;
  /** User ID within the tenant (union_id) */
  readonly unionId: string;
  /** User display name */
  readonly name: string;
  /** User English name (optional) */
  readonly enName?: string | undefined;
  /** User avatar URL */
  readonly avatarUrl: string;
  /** User avatar thumbnail URL */
  readonly avatarThumb?: string | undefined;
  /** User avatar middle size URL */
  readonly avatarMiddle?: string | undefined;
  /** User avatar large size URL */
  readonly avatarBig?: string | undefined;
  /** User email (requires permission) */
  readonly email?: string | undefined;
  /** User mobile number (requires permission) */
  readonly mobile?: string | undefined;
  /** Tenant key */
  readonly tenantKey: string;
}

/**
 * Session data stored in iron-session
 */
export interface SessionData {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** User information */
  user?: LarkUser;
  /** Access token for API calls */
  accessToken?: string;
  /** Refresh token for token renewal */
  refreshToken?: string;
  /** Token expiration timestamp (Unix ms) */
  tokenExpiresAt?: number;
  /** CSRF state for OAuth flow */
  oauthState?: string;
}

/**
 * Default session data
 */
export const defaultSession: SessionData = {
  isAuthenticated: false,
};

/**
 * Authentication status
 */
export type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading';

/**
 * Authentication error types
 */
export type AuthErrorType =
  | 'invalid_state'
  | 'token_exchange_failed'
  | 'token_refresh_failed'
  | 'user_info_failed'
  | 'session_error'
  | 'network_error'
  | 'unknown_error';

/**
 * Authentication error
 */
export interface AuthError {
  /** Error type */
  readonly type: AuthErrorType;
  /** Error message */
  readonly message: string;
  /** Original error details */
  readonly details?: unknown;
}

/**
 * Authentication result
 */
export type AuthResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: AuthError };

/**
 * Create a successful auth result
 */
export function authSuccess<T>(data: T): AuthResult<T> {
  return { success: true, data };
}

/**
 * Create a failed auth result
 */
export function authFailure<T>(
  type: AuthErrorType,
  message: string,
  details?: unknown
): AuthResult<T> {
  return {
    success: false,
    error: { type, message, details },
  };
}
