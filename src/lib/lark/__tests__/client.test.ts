/**
 * Lark client unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LarkClient, LarkClientError } from '../client';
import type { LarkConfig } from '@/types/lark';

describe('LarkClient', () => {
  const config: LarkConfig = {
    appId: 'test_app_id',
    appSecret: 'test_secret',
    baseUrl: 'https://open.larksuite.com',
    redirectUri: 'http://localhost:3000/api/auth/callback',
  };

  let client: LarkClient;

  beforeEach(() => {
    client = new LarkClient(config);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create client with config', () => {
      expect(client.getConfig()).toEqual(config);
    });
  });

  describe('get', () => {
    it('should make GET request', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ code: 0, msg: 'success', data: { test: true } }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      const result = await client.get<{ test: boolean }>('/test');

      expect(fetch).toHaveBeenCalledWith(
        'https://open.larksuite.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json; charset=utf-8',
          }),
        })
      );
      expect(result.data?.test).toBe(true);
    });

    it('should include query parameters', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ code: 0, msg: 'success' }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await client.get('/test', { params: { foo: 'bar', baz: 'qux' } });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('foo=bar'),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('baz=qux'),
        expect.any(Object)
      );
    });
  });

  describe('post', () => {
    it('should make POST request with body', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ code: 0, msg: 'success', data: {} }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await client.post('/test', { body: { key: 'value' } });

      expect(fetch).toHaveBeenCalledWith(
        'https://open.larksuite.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ key: 'value' }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should throw on non-OK HTTP response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(client.get('/test')).rejects.toThrow(LarkClientError);
      await expect(client.get('/test')).rejects.toMatchObject({
        code: 500,
        message: 'HTTP 500: Internal Server Error',
      });
    });

    it('should throw on Lark API error code', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          code: 99991663,
          msg: 'Invalid app_id',
        }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await expect(client.get('/test')).rejects.toThrow(LarkClientError);
      await expect(client.get('/test')).rejects.toMatchObject({
        code: 99991663,
        message: 'Invalid app_id',
      });
    });

    it('should handle timeout', async () => {
      vi.mocked(fetch).mockImplementation(
        () => new Promise((_, reject) => {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          reject(error);
        })
      );

      await expect(client.get('/test', { timeout: 100 })).rejects.toThrow(LarkClientError);
      await expect(client.get('/test', { timeout: 100 })).rejects.toMatchObject({
        message: 'Request timeout',
      });
    });
  });

  describe('authenticatedRequest', () => {
    it('should include Authorization header', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ code: 0, msg: 'success', data: {} }),
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

      await client.authenticatedRequest('/test', 'bearer_token_123');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer bearer_token_123',
          }),
        })
      );
    });
  });
});

describe('LarkClientError', () => {
  it('should contain error details', () => {
    const error = new LarkClientError(
      'Test error',
      99999,
      '/test/endpoint',
      { extra: 'info' }
    );

    expect(error.message).toBe('Test error');
    expect(error.code).toBe(99999);
    expect(error.endpoint).toBe('/test/endpoint');
    expect(error.details).toEqual({ extra: 'info' });
    expect(error.name).toBe('LarkClientError');
  });
});
