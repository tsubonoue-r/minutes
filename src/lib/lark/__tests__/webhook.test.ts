/**
 * Tests for Lark webhook utilities
 * @module lib/lark/__tests__/webhook.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  computeSignature,
  verifySignature,
  verifyTimestamp,
  verifyWebhookSignature,
  parseWebhookBody,
  processWebhookRequest,
  getWebhookConfig,
  WebhookSignatureError,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  WEBHOOK_NONCE_HEADER,
  MAX_TIMESTAMP_AGE_SECONDS,
} from '../webhook';

describe('Signature Computation', () => {
  describe('computeSignature', () => {
    it('should compute HMAC-SHA256 signature', () => {
      const timestamp = '1704067200';
      const nonce = 'abc123';
      const body = '{"test": "data"}';
      const encryptKey = 'secret_key';

      const signature = computeSignature(timestamp, nonce, body, encryptKey);

      // Signature should be a 64-character hex string (256 bits)
      expect(signature).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce consistent signatures for same input', () => {
      const timestamp = '1704067200';
      const nonce = 'abc123';
      const body = '{"test": "data"}';
      const encryptKey = 'secret_key';

      const sig1 = computeSignature(timestamp, nonce, body, encryptKey);
      const sig2 = computeSignature(timestamp, nonce, body, encryptKey);

      expect(sig1).toBe(sig2);
    });

    it('should produce different signatures for different inputs', () => {
      const encryptKey = 'secret_key';

      const sig1 = computeSignature('1704067200', 'abc', '{}', encryptKey);
      const sig2 = computeSignature('1704067201', 'abc', '{}', encryptKey);
      const sig3 = computeSignature('1704067200', 'def', '{}', encryptKey);
      const sig4 = computeSignature('1704067200', 'abc', '{"a":1}', encryptKey);

      expect(sig1).not.toBe(sig2);
      expect(sig1).not.toBe(sig3);
      expect(sig1).not.toBe(sig4);
    });

    it('should produce different signatures for different keys', () => {
      const timestamp = '1704067200';
      const nonce = 'abc123';
      const body = '{"test": "data"}';

      const sig1 = computeSignature(timestamp, nonce, body, 'key1');
      const sig2 = computeSignature(timestamp, nonce, body, 'key2');

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifySignature', () => {
    it('should return true for matching signatures', () => {
      const signature = 'a'.repeat(64); // Valid hex string
      expect(verifySignature(signature, signature)).toBe(true);
    });

    it('should return false for non-matching signatures', () => {
      const sig1 = 'a'.repeat(64);
      const sig2 = 'b'.repeat(64);
      expect(verifySignature(sig1, sig2)).toBe(false);
    });

    it('should return false for different length signatures', () => {
      const sig1 = 'a'.repeat(64);
      const sig2 = 'a'.repeat(32);
      expect(verifySignature(sig1, sig2)).toBe(false);
    });

    it('should return false for different length strings', () => {
      // Different lengths
      expect(verifySignature('abc', 'abcdef')).toBe(false);
      expect(verifySignature('a'.repeat(64), 'a'.repeat(32))).toBe(false);
    });
  });
});

describe('Timestamp Verification', () => {
  describe('verifyTimestamp', () => {
    it('should accept recent timestamps', () => {
      const now = Math.floor(Date.now() / 1000);
      const result = verifyTimestamp(String(now));
      expect(result.isValid).toBe(true);
      expect(result.age).toBeLessThanOrEqual(1);
    });

    it('should accept timestamps within max age', () => {
      const now = Math.floor(Date.now() / 1000);
      const timestamp = now - 60; // 60 seconds ago
      const result = verifyTimestamp(String(timestamp));
      expect(result.isValid).toBe(true);
      expect(result.age).toBeGreaterThanOrEqual(59);
      expect(result.age).toBeLessThanOrEqual(61);
    });

    it('should reject timestamps beyond max age', () => {
      const now = Math.floor(Date.now() / 1000);
      const timestamp = now - (MAX_TIMESTAMP_AGE_SECONDS + 60); // Beyond max age
      const result = verifyTimestamp(String(timestamp));
      expect(result.isValid).toBe(false);
    });

    it('should use custom max age when provided', () => {
      const now = Math.floor(Date.now() / 1000);
      const timestamp = now - 120; // 2 minutes ago

      const result1 = verifyTimestamp(String(timestamp), 60); // 1 min max
      expect(result1.isValid).toBe(false);

      const result2 = verifyTimestamp(String(timestamp), 180); // 3 min max
      expect(result2.isValid).toBe(true);
    });

    it('should handle future timestamps', () => {
      const now = Math.floor(Date.now() / 1000);
      const futureTimestamp = now + 60; // 60 seconds in future
      const result = verifyTimestamp(String(futureTimestamp));
      expect(result.isValid).toBe(true); // Within max age
      expect(result.age).toBe(60);
    });
  });
});

describe('Webhook Signature Verification', () => {
  const encryptKey = 'test_encrypt_key';

  describe('verifyWebhookSignature', () => {
    it('should return invalid for missing signature', () => {
      const result = verifyWebhookSignature({
        signature: null,
        timestamp: '1704067200',
        nonce: 'abc',
        body: '{}',
        encryptKey,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('signature');
    });

    it('should return invalid for missing timestamp', () => {
      const result = verifyWebhookSignature({
        signature: 'abc',
        timestamp: null,
        nonce: 'abc',
        body: '{}',
        encryptKey,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('timestamp');
    });

    it('should return invalid for missing nonce', () => {
      const result = verifyWebhookSignature({
        signature: 'abc',
        timestamp: '1704067200',
        nonce: null,
        body: '{}',
        encryptKey,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('nonce');
    });

    it('should return invalid for expired timestamp', () => {
      const expiredTimestamp = String(Math.floor(Date.now() / 1000) - 600);
      const result = verifyWebhookSignature({
        signature: 'abc',
        timestamp: expiredTimestamp,
        nonce: 'abc',
        body: '{}',
        encryptKey,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should return invalid for wrong signature', () => {
      const now = String(Math.floor(Date.now() / 1000));
      const result = verifyWebhookSignature({
        signature: 'wrong_signature'.padEnd(64, '0'),
        timestamp: now,
        nonce: 'abc',
        body: '{}',
        encryptKey,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid signature');
    });

    it('should return valid for correct signature', () => {
      const now = String(Math.floor(Date.now() / 1000));
      const nonce = 'test_nonce';
      const body = '{"test": "data"}';

      const signature = computeSignature(now, nonce, body, encryptKey);

      const result = verifyWebhookSignature({
        signature,
        timestamp: now,
        nonce,
        body,
        encryptKey,
      });

      expect(result.isValid).toBe(true);
      expect(result.timestamp).toBe(now);
    });
  });
});

describe('Body Parsing', () => {
  describe('parseWebhookBody', () => {
    it('should parse valid JSON event payload', () => {
      const body = JSON.stringify({
        header: {
          event_id: 'event_123',
          token: 'token',
          create_time: '1704067200',
          event_type: 'vc.meeting.meeting_ended_v1',
        },
        event: {
          type: 'vc.meeting.meeting_ended_v1',
          meeting_id: 'meeting_123',
          end_time: 1704067200,
          host_user_id: 'user_456',
        },
      });

      const result = parseWebhookBody(body);

      expect(result.type).toBe('event');
      if (result.type === 'event') {
        expect(result.data.header.event_id).toBe('event_123');
        expect(result.data.event.meeting_id).toBe('meeting_123');
      }
    });

    it('should parse URL verification challenge', () => {
      const body = JSON.stringify({
        challenge: 'abc123xyz',
        token: 'verification_token',
        type: 'url_verification',
      });

      const result = parseWebhookBody(body);

      expect(result.type).toBe('challenge');
      if (result.type === 'challenge') {
        expect(result.data.challenge).toBe('abc123xyz');
      }
    });

    it('should return error for invalid JSON', () => {
      const result = parseWebhookBody('not valid json');

      expect(result.type).toBe('error');
      if (result.type === 'error') {
        expect(result.error).toContain('Invalid JSON');
      }
    });

    it('should return error for invalid payload structure', () => {
      const body = JSON.stringify({ invalid: 'structure' });
      const result = parseWebhookBody(body);

      expect(result.type).toBe('error');
      if (result.type === 'error') {
        expect(result.error).toContain('Invalid webhook payload');
      }
    });
  });
});

describe('Request Processing', () => {
  const encryptKey = 'test_encrypt_key';
  const verificationToken = 'test_verification_token';

  describe('processWebhookRequest', () => {
    it('should handle URL verification challenge', () => {
      const body = JSON.stringify({
        challenge: 'abc123xyz',
        token: verificationToken,
        type: 'url_verification',
      });

      const result = processWebhookRequest({
        headers: { signature: null, timestamp: null, nonce: null },
        body,
        encryptKey,
        verificationToken,
      });

      expect(result.type).toBe('challenge');
      if (result.type === 'challenge') {
        expect(result.response.challenge).toBe('abc123xyz');
      }
    });

    it('should reject challenge with wrong token', () => {
      const body = JSON.stringify({
        challenge: 'abc123xyz',
        token: 'wrong_token',
        type: 'url_verification',
      });

      const result = processWebhookRequest({
        headers: { signature: null, timestamp: null, nonce: null },
        body,
        encryptKey,
        verificationToken,
      });

      expect(result.type).toBe('error');
      if (result.type === 'error') {
        expect(result.status).toBe(401);
        expect(result.message).toContain('Invalid verification token');
      }
    });

    it('should reject event without signature', () => {
      const body = JSON.stringify({
        header: {
          event_id: 'event_123',
          token: 'token',
          create_time: '1704067200',
          event_type: 'vc.meeting.meeting_ended_v1',
        },
        event: {
          type: 'vc.meeting.meeting_ended_v1',
          meeting_id: 'meeting_123',
          end_time: 1704067200,
          host_user_id: 'user_456',
        },
      });

      const result = processWebhookRequest({
        headers: { signature: null, timestamp: null, nonce: null },
        body,
        encryptKey,
        verificationToken,
      });

      expect(result.type).toBe('error');
      if (result.type === 'error') {
        expect(result.status).toBe(401);
      }
    });

    it('should process valid event with correct signature', () => {
      const now = String(Math.floor(Date.now() / 1000));
      const nonce = 'test_nonce';
      const body = JSON.stringify({
        header: {
          event_id: 'event_123',
          token: 'token',
          create_time: now,
          event_type: 'vc.meeting.meeting_ended_v1',
        },
        event: {
          type: 'vc.meeting.meeting_ended_v1',
          meeting_id: 'meeting_123',
          end_time: parseInt(now, 10),
          host_user_id: 'user_456',
        },
      });

      const signature = computeSignature(now, nonce, body, encryptKey);

      const result = processWebhookRequest({
        headers: { signature, timestamp: now, nonce },
        body,
        encryptKey,
        verificationToken,
      });

      expect(result.type).toBe('event');
      if (result.type === 'event') {
        expect(result.payload.header.event_id).toBe('event_123');
      }
    });

    it('should skip signature verification when flag is set', () => {
      const body = JSON.stringify({
        header: {
          event_id: 'event_123',
          token: 'token',
          create_time: '1704067200',
          event_type: 'vc.meeting.meeting_ended_v1',
        },
        event: {
          type: 'vc.meeting.meeting_ended_v1',
          meeting_id: 'meeting_123',
          end_time: 1704067200,
          host_user_id: 'user_456',
        },
      });

      const result = processWebhookRequest({
        headers: { signature: null, timestamp: null, nonce: null },
        body,
        encryptKey,
        verificationToken,
        skipSignatureVerification: true,
      });

      expect(result.type).toBe('event');
    });
  });
});

describe('Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getWebhookConfig', () => {
    it('should return config when environment variables are set', () => {
      process.env.LARK_WEBHOOK_ENCRYPT_KEY = 'test_key';
      process.env.LARK_WEBHOOK_VERIFICATION_TOKEN = 'test_token';

      const config = getWebhookConfig();

      expect(config.encryptKey).toBe('test_key');
      expect(config.verificationToken).toBe('test_token');
    });

    it('should throw when encrypt key is missing', () => {
      delete process.env.LARK_WEBHOOK_ENCRYPT_KEY;
      process.env.LARK_WEBHOOK_VERIFICATION_TOKEN = 'test_token';

      expect(() => getWebhookConfig()).toThrow('LARK_WEBHOOK_ENCRYPT_KEY');
    });

    it('should throw when verification token is missing', () => {
      process.env.LARK_WEBHOOK_ENCRYPT_KEY = 'test_key';
      delete process.env.LARK_WEBHOOK_VERIFICATION_TOKEN;

      expect(() => getWebhookConfig()).toThrow('LARK_WEBHOOK_VERIFICATION_TOKEN');
    });
  });
});

describe('WebhookSignatureError', () => {
  it('should create error with message and code', () => {
    const error = new WebhookSignatureError('Test error', 'TEST_CODE');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('WebhookSignatureError');
  });

  it('should create missing signature error', () => {
    const error = WebhookSignatureError.missingSignature();
    expect(error.code).toBe('MISSING_SIGNATURE');
  });

  it('should create missing timestamp error', () => {
    const error = WebhookSignatureError.missingTimestamp();
    expect(error.code).toBe('MISSING_TIMESTAMP');
  });

  it('should create invalid signature error', () => {
    const error = WebhookSignatureError.invalidSignature();
    expect(error.code).toBe('INVALID_SIGNATURE');
  });

  it('should create expired timestamp error', () => {
    const error = WebhookSignatureError.expiredTimestamp(600);
    expect(error.code).toBe('EXPIRED_TIMESTAMP');
    expect(error.details).toEqual({ age: 600, maxAge: MAX_TIMESTAMP_AGE_SECONDS });
  });

  it('should create invalid payload error', () => {
    const details = { field: 'test' };
    const error = WebhookSignatureError.invalidPayload(details);
    expect(error.code).toBe('INVALID_PAYLOAD');
    expect(error.details).toEqual(details);
  });
});

describe('Constants', () => {
  it('should have correct header names', () => {
    expect(WEBHOOK_SIGNATURE_HEADER).toBe('x-lark-signature');
    expect(WEBHOOK_TIMESTAMP_HEADER).toBe('x-lark-request-timestamp');
    expect(WEBHOOK_NONCE_HEADER).toBe('x-lark-request-nonce');
  });

  it('should have reasonable max timestamp age', () => {
    expect(MAX_TIMESTAMP_AGE_SECONDS).toBe(300); // 5 minutes
  });
});
