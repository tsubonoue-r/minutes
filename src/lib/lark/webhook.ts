/**
 * Lark Webhook utilities - Signature verification and payload processing
 * @module lib/lark/webhook
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type {
  SignatureVerificationResult,
  WebhookPayload,
  WebhookChallenge,
} from '@/types/webhook';
import {
  safeParseWebhookPayload,
  isWebhookChallenge,
} from '@/types/webhook';

// =============================================================================
// Constants
// =============================================================================

/**
 * Webhook signature header name
 */
export const WEBHOOK_SIGNATURE_HEADER = 'x-lark-signature';

/**
 * Webhook timestamp header name
 */
export const WEBHOOK_TIMESTAMP_HEADER = 'x-lark-request-timestamp';

/**
 * Webhook nonce header name
 */
export const WEBHOOK_NONCE_HEADER = 'x-lark-request-nonce';

/**
 * Maximum timestamp age in seconds (5 minutes)
 */
export const MAX_TIMESTAMP_AGE_SECONDS = 300;

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown when webhook signature verification fails
 */
export class WebhookSignatureError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'WebhookSignatureError';
  }

  /**
   * Create an error for missing signature
   */
  static missingSignature(): WebhookSignatureError {
    return new WebhookSignatureError(
      'Missing webhook signature header',
      'MISSING_SIGNATURE'
    );
  }

  /**
   * Create an error for missing timestamp
   */
  static missingTimestamp(): WebhookSignatureError {
    return new WebhookSignatureError(
      'Missing webhook timestamp header',
      'MISSING_TIMESTAMP'
    );
  }

  /**
   * Create an error for invalid signature
   */
  static invalidSignature(): WebhookSignatureError {
    return new WebhookSignatureError(
      'Invalid webhook signature',
      'INVALID_SIGNATURE'
    );
  }

  /**
   * Create an error for expired timestamp
   */
  static expiredTimestamp(age: number): WebhookSignatureError {
    return new WebhookSignatureError(
      `Webhook timestamp expired (age: ${age}s, max: ${MAX_TIMESTAMP_AGE_SECONDS}s)`,
      'EXPIRED_TIMESTAMP',
      { age, maxAge: MAX_TIMESTAMP_AGE_SECONDS }
    );
  }

  /**
   * Create an error for invalid payload
   */
  static invalidPayload(details: unknown): WebhookSignatureError {
    return new WebhookSignatureError(
      'Invalid webhook payload',
      'INVALID_PAYLOAD',
      details
    );
  }
}

// =============================================================================
// Signature Verification
// =============================================================================

/**
 * Compute HMAC-SHA256 signature for webhook verification
 *
 * The signature is computed as:
 * HMAC-SHA256(timestamp + nonce + body, encrypt_key)
 *
 * @param timestamp - Request timestamp from header
 * @param nonce - Request nonce from header
 * @param body - Raw request body
 * @param encryptKey - Webhook encrypt key (from Lark app settings)
 * @returns Computed signature as hex string
 *
 * @example
 * ```typescript
 * const signature = computeSignature(
 *   '1704067200',
 *   'abc123',
 *   '{"event": {...}}',
 *   'your-encrypt-key'
 * );
 * ```
 */
export function computeSignature(
  timestamp: string,
  nonce: string,
  body: string,
  encryptKey: string
): string {
  const content = `${timestamp}${nonce}${body}`;
  return createHmac('sha256', encryptKey).update(content).digest('hex');
}

/**
 * Verify webhook signature using timing-safe comparison
 *
 * @param expectedSignature - Expected signature from header
 * @param computedSignature - Computed signature
 * @returns True if signatures match
 */
export function verifySignature(
  expectedSignature: string,
  computedSignature: string
): boolean {
  try {
    const expected = Buffer.from(expectedSignature, 'hex');
    const computed = Buffer.from(computedSignature, 'hex');

    if (expected.length !== computed.length) {
      return false;
    }

    return timingSafeEqual(expected, computed);
  } catch {
    return false;
  }
}

/**
 * Verify timestamp is within acceptable range
 *
 * @param timestamp - Timestamp string (Unix seconds)
 * @param maxAgeSeconds - Maximum age in seconds
 * @returns Object with isValid flag and age
 */
export function verifyTimestamp(
  timestamp: string,
  maxAgeSeconds: number = MAX_TIMESTAMP_AGE_SECONDS
): { isValid: boolean; age: number } {
  const requestTime = parseInt(timestamp, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  const age = Math.abs(currentTime - requestTime);

  return {
    isValid: age <= maxAgeSeconds,
    age,
  };
}

/**
 * Complete webhook signature verification
 *
 * Verifies:
 * 1. All required headers are present
 * 2. Timestamp is within acceptable range
 * 3. HMAC-SHA256 signature is valid
 *
 * @param params - Verification parameters
 * @returns Verification result
 *
 * @example
 * ```typescript
 * const result = verifyWebhookSignature({
 *   signature: request.headers.get('x-lark-signature'),
 *   timestamp: request.headers.get('x-lark-request-timestamp'),
 *   nonce: request.headers.get('x-lark-request-nonce'),
 *   body: await request.text(),
 *   encryptKey: process.env.LARK_WEBHOOK_ENCRYPT_KEY,
 * });
 *
 * if (!result.isValid) {
 *   throw new Error(result.error);
 * }
 * ```
 */
export function verifyWebhookSignature(params: {
  signature: string | null | undefined;
  timestamp: string | null | undefined;
  nonce: string | null | undefined;
  body: string;
  encryptKey: string;
}): SignatureVerificationResult {
  const { signature, timestamp, nonce, body, encryptKey } = params;

  // Check required headers
  if (signature === null || signature === undefined || signature === '') {
    return {
      isValid: false,
      error: 'Missing signature header',
    };
  }

  if (timestamp === null || timestamp === undefined || timestamp === '') {
    return {
      isValid: false,
      error: 'Missing timestamp header',
    };
  }

  if (nonce === null || nonce === undefined || nonce === '') {
    return {
      isValid: false,
      error: 'Missing nonce header',
    };
  }

  // Verify timestamp freshness
  const timestampResult = verifyTimestamp(timestamp);
  if (!timestampResult.isValid) {
    return {
      isValid: false,
      error: `Timestamp expired (age: ${timestampResult.age}s)`,
      timestamp,
    };
  }

  // Compute and verify signature
  const computedSignature = computeSignature(timestamp, nonce, body, encryptKey);
  const isValid = verifySignature(signature, computedSignature);

  if (!isValid) {
    return {
      isValid: false,
      error: 'Invalid signature',
      timestamp,
    };
  }

  return {
    isValid: true,
    timestamp,
  };
}

// =============================================================================
// Payload Processing
// =============================================================================

/**
 * Result of parsing webhook request
 */
export type WebhookParseResult =
  | { type: 'challenge'; data: WebhookChallenge }
  | { type: 'event'; data: WebhookPayload }
  | { type: 'error'; error: string; details?: unknown };

/**
 * Parse and validate webhook request body
 *
 * Handles both URL verification challenges and event payloads.
 *
 * @param body - Raw request body (JSON string)
 * @returns Parse result with type discriminator
 *
 * @example
 * ```typescript
 * const result = parseWebhookBody(requestBody);
 *
 * switch (result.type) {
 *   case 'challenge':
 *     return { challenge: result.data.challenge };
 *   case 'event':
 *     await processEvent(result.data);
 *     return { success: true };
 *   case 'error':
 *     throw new Error(result.error);
 * }
 * ```
 */
export function parseWebhookBody(body: string): WebhookParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch (error) {
    return {
      type: 'error',
      error: 'Invalid JSON body',
      details: error instanceof Error ? error.message : error,
    };
  }

  // Check if it's a URL verification challenge
  if (isWebhookChallenge(parsed)) {
    return {
      type: 'challenge',
      data: parsed,
    };
  }

  // Try to parse as event payload
  const eventResult = safeParseWebhookPayload(parsed);

  if (eventResult.success) {
    return {
      type: 'event',
      data: eventResult.data,
    };
  }

  return {
    type: 'error',
    error: 'Invalid webhook payload',
    details: eventResult.error.issues,
  };
}

// =============================================================================
// Request Processing
// =============================================================================

/**
 * Options for processing a webhook request
 */
export interface ProcessWebhookRequestOptions {
  /** Request headers */
  readonly headers: {
    readonly signature: string | null | undefined;
    readonly timestamp: string | null | undefined;
    readonly nonce: string | null | undefined;
  };
  /** Raw request body */
  readonly body: string;
  /** Webhook encrypt key */
  readonly encryptKey: string;
  /** Verification token (for challenge validation) */
  readonly verificationToken: string;
  /** Skip signature verification (for testing only) */
  readonly skipSignatureVerification?: boolean | undefined;
}

/**
 * Result of processing a webhook request
 */
export type ProcessWebhookRequestResult =
  | { type: 'challenge'; response: { challenge: string } }
  | { type: 'event'; payload: WebhookPayload }
  | { type: 'error'; status: number; message: string; details?: unknown };

/**
 * Process a complete webhook request
 *
 * Handles signature verification, payload parsing, and challenge responses.
 *
 * @param options - Processing options
 * @returns Processing result
 *
 * @example
 * ```typescript
 * const result = await processWebhookRequest({
 *   headers: {
 *     signature: request.headers.get('x-lark-signature'),
 *     timestamp: request.headers.get('x-lark-request-timestamp'),
 *     nonce: request.headers.get('x-lark-request-nonce'),
 *   },
 *   body: await request.text(),
 *   encryptKey: process.env.LARK_WEBHOOK_ENCRYPT_KEY!,
 *   verificationToken: process.env.LARK_WEBHOOK_VERIFICATION_TOKEN!,
 * });
 *
 * switch (result.type) {
 *   case 'challenge':
 *     return NextResponse.json(result.response);
 *   case 'event':
 *     await handleEvent(result.payload);
 *     return NextResponse.json({ success: true });
 *   case 'error':
 *     return NextResponse.json({ error: result.message }, { status: result.status });
 * }
 * ```
 */
export function processWebhookRequest(
  options: ProcessWebhookRequestOptions
): ProcessWebhookRequestResult {
  const {
    headers,
    body,
    encryptKey,
    verificationToken,
    skipSignatureVerification = false,
  } = options;

  // Parse the body first to check for challenge
  const parseResult = parseWebhookBody(body);

  // Handle URL verification challenge (no signature verification needed)
  if (parseResult.type === 'challenge') {
    // Validate the verification token
    if (parseResult.data.token !== verificationToken) {
      return {
        type: 'error',
        status: 401,
        message: 'Invalid verification token',
      };
    }

    return {
      type: 'challenge',
      response: { challenge: parseResult.data.challenge },
    };
  }

  // For event payloads, verify signature
  if (!skipSignatureVerification) {
    const signatureResult = verifyWebhookSignature({
      signature: headers.signature,
      timestamp: headers.timestamp,
      nonce: headers.nonce,
      body,
      encryptKey,
    });

    if (!signatureResult.isValid) {
      return {
        type: 'error',
        status: 401,
        message: signatureResult.error ?? 'Signature verification failed',
      };
    }
  }

  // Handle parse errors
  if (parseResult.type === 'error') {
    return {
      type: 'error',
      status: 400,
      message: parseResult.error,
      details: parseResult.details,
    };
  }

  // Return the validated event payload
  return {
    type: 'event',
    payload: parseResult.data,
  };
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  /** Webhook encrypt key for signature verification */
  readonly encryptKey: string;
  /** Verification token for URL challenges */
  readonly verificationToken: string;
}

/**
 * Get webhook configuration from environment variables
 *
 * @returns Webhook configuration
 * @throws Error if required environment variables are missing
 */
export function getWebhookConfig(): WebhookConfig {
  const encryptKey = process.env.LARK_WEBHOOK_ENCRYPT_KEY;
  const verificationToken = process.env.LARK_WEBHOOK_VERIFICATION_TOKEN;

  if (encryptKey === undefined || encryptKey === '') {
    throw new Error('LARK_WEBHOOK_ENCRYPT_KEY environment variable is required');
  }

  if (verificationToken === undefined || verificationToken === '') {
    throw new Error(
      'LARK_WEBHOOK_VERIFICATION_TOKEN environment variable is required'
    );
  }

  return {
    encryptKey,
    verificationToken,
  };
}
