/**
 * Lark API HTTP Client
 * @module lib/lark/client
 */

import type { LarkConfig } from '@/types/lark';
import type { LarkApiResponse } from './types';

/**
 * HTTP method types
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Request options for the Lark client
 */
interface RequestOptions {
  /** HTTP method */
  method?: HttpMethod;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body (will be JSON stringified) */
  body?: unknown;
  /** Query parameters */
  params?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Client error with additional context
 */
export class LarkClientError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly endpoint: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'LarkClientError';
  }
}

/**
 * Lark API HTTP Client
 *
 * Provides a type-safe wrapper around the Lark Open API.
 * Handles authentication headers, request/response serialization,
 * and error handling.
 *
 * @example
 * ```typescript
 * const client = new LarkClient(config);
 * const response = await client.post('/open-apis/auth/v3/app_access_token/internal', {
 *   body: { app_id: 'xxx', app_secret: 'xxx' }
 * });
 * ```
 */
export class LarkClient {
  private readonly config: LarkConfig;
  private readonly defaultTimeout = 30000;

  constructor(config: LarkConfig) {
    this.config = config;
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(endpoint, this.config.baseUrl);

    if (params !== undefined) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    return url.toString();
  }

  /**
   * Make an HTTP request to the Lark API
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<LarkApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      timeout = this.defaultTimeout,
    } = options;

    const url = this.buildUrl(endpoint, params);

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
        signal: controller.signal,
      };

      if (body !== undefined) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorBody: unknown;
        try {
          errorBody = await response.json();
        } catch {
          // ignore parse errors
        }
        console.error(`[LarkClient] API Error ${response.status} at ${endpoint}:`, errorBody);
        throw new LarkClientError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          endpoint,
          errorBody
        );
      }

      const data = (await response.json()) as LarkApiResponse<T> & { message?: string };

      // Check for Lark API error response
      if (data.code !== 0) {
        throw new LarkClientError(data.msg ?? data.message ?? 'Unknown error', data.code, endpoint, data);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof LarkClientError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new LarkClientError(
            'Request timeout',
            -1,
            endpoint,
            { timeout }
          );
        }

        throw new LarkClientError(
          error.message,
          -1,
          endpoint,
          { originalError: error.name }
        );
      }

      throw new LarkClientError(
        'Unknown error occurred',
        -1,
        endpoint,
        error
      );
    }
  }

  /**
   * Make a GET request
   */
  async get<T>(
    endpoint: string,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<LarkApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * Make a POST request
   */
  async post<T>(
    endpoint: string,
    options?: Omit<RequestOptions, 'method'>
  ): Promise<LarkApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST' });
  }

  /**
   * Make a PUT request
   */
  async put<T>(
    endpoint: string,
    options?: Omit<RequestOptions, 'method'>
  ): Promise<LarkApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT' });
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(
    endpoint: string,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<LarkApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Make an authenticated request with bearer token
   */
  async authenticatedRequest<T>(
    endpoint: string,
    accessToken: string,
    options: RequestOptions = {}
  ): Promise<LarkApiResponse<T>> {
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    };

    return this.request<T>(endpoint, { ...options, headers });
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<LarkConfig> {
    return this.config;
  }
}

/**
 * Create a Lark client instance from environment variables
 */
export function createLarkClient(): LarkClient {
  const appId = process.env.LARK_APP_ID;
  const appSecret = process.env.LARK_APP_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_LARK_REDIRECT_URI;
  const baseUrl = process.env.LARK_API_BASE_URL ?? 'https://open.larksuite.com';

  if (appId === undefined || appId === '') {
    throw new Error('LARK_APP_ID environment variable is required');
  }

  if (appSecret === undefined || appSecret === '') {
    throw new Error('LARK_APP_SECRET environment variable is required');
  }

  if (redirectUri === undefined || redirectUri === '') {
    throw new Error('NEXT_PUBLIC_LARK_REDIRECT_URI environment variable is required');
  }

  return new LarkClient({
    appId,
    appSecret,
    baseUrl,
    redirectUri,
  });
}
