/**
 * ClaudeClient Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

import { ClaudeClient } from '../client.js';
import { ClaudeApiError, ClaudeParseError, DEFAULT_MODEL, DEFAULT_MAX_TOKENS } from '../types.js';

// Anthropic SDKをモック
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();

  class MockAnthropic {
    messages = {
      create: mockCreate,
    };
  }

  // APIErrorクラス（テスト用）- モック内で定義する必要がある
  class MockAPIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'APIError';
    }
  }

  return {
    default: MockAnthropic,
    APIError: MockAPIError,
  };
});

// テスト用APIErrorクラスを取得するヘルパー
async function createMockAPIError(status: number, message: string): Promise<Error> {
  const Anthropic = await import('@anthropic-ai/sdk');
  // モックしたAPIErrorは引数が2つ（status, message）
  type MockedAPIErrorConstructor = new (status: number, message: string) => Error;
  const MockedAPIError = Anthropic.APIError as unknown as MockedAPIErrorConstructor;
  return new MockedAPIError(status, message);
}

// モック関数を取得
async function getMockCreate(): Promise<ReturnType<typeof vi.fn>> {
  const Anthropic = await import('@anthropic-ai/sdk');
  const instance = new Anthropic.default({ apiKey: 'test-key' });
  return instance.messages.create as ReturnType<typeof vi.fn>;
}

describe('ClaudeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create client with valid API key', () => {
      const client = new ClaudeClient('test-api-key');
      expect(client).toBeInstanceOf(ClaudeClient);
    });

    it('should throw error with empty API key', () => {
      expect(() => new ClaudeClient('')).toThrow(ClaudeApiError);
      expect(() => new ClaudeClient('')).toThrow('API key is required');
    });

    it('should throw error with whitespace-only API key', () => {
      expect(() => new ClaudeClient('   ')).toThrow(ClaudeApiError);
    });

    it('should accept custom model and maxTokens options', () => {
      const client = new ClaudeClient('test-api-key', {
        model: 'claude-opus-4-20250514',
        maxTokens: 8000,
      });
      expect(client).toBeInstanceOf(ClaudeClient);
    });
  });

  describe('sendMessage', () => {
    it('should send message and return text response', async () => {
      const mockCreate = await getMockCreate();
      mockCreate.mockResolvedValueOnce({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello! How can I help you?' }],
        model: DEFAULT_MODEL,
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      const client = new ClaudeClient('test-api-key');
      const response = await client.sendMessage([
        { role: 'user', content: 'Hello!' },
      ]);

      expect(response).toBe('Hello! How can I help you?');
      expect(mockCreate).toHaveBeenCalledWith({
        model: DEFAULT_MODEL,
        max_tokens: DEFAULT_MAX_TOKENS,
        messages: [{ role: 'user', content: 'Hello!' }],
      });
    });

    it('should include system prompt when provided', async () => {
      const mockCreate = await getMockCreate();
      mockCreate.mockResolvedValueOnce({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: DEFAULT_MODEL,
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const client = new ClaudeClient('test-api-key');
      await client.sendMessage(
        [{ role: 'user', content: 'Test' }],
        { system: 'You are a helpful assistant.' }
      );

      expect(mockCreate).toHaveBeenCalledWith({
        model: DEFAULT_MODEL,
        max_tokens: DEFAULT_MAX_TOKENS,
        messages: [{ role: 'user', content: 'Test' }],
        system: 'You are a helpful assistant.',
      });
    });

    it('should use custom maxTokens when provided', async () => {
      const mockCreate = await getMockCreate();
      mockCreate.mockResolvedValueOnce({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Response' }],
        model: DEFAULT_MODEL,
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const client = new ClaudeClient('test-api-key');
      await client.sendMessage(
        [{ role: 'user', content: 'Test' }],
        { maxTokens: 2000 }
      );

      expect(mockCreate).toHaveBeenCalledWith({
        model: DEFAULT_MODEL,
        max_tokens: 2000,
        messages: [{ role: 'user', content: 'Test' }],
      });
    });

    it('should throw error for empty messages array', async () => {
      const client = new ClaudeClient('test-api-key');

      await expect(client.sendMessage([])).rejects.toThrow(ClaudeApiError);
      await expect(client.sendMessage([])).rejects.toThrow(
        'At least one message is required'
      );
    });

    it('should throw ClaudeApiError when API returns error', async () => {
      const mockCreate = await getMockCreate();
      const apiError = await createMockAPIError(429, 'Rate limit exceeded');
      mockCreate.mockRejectedValueOnce(apiError);

      const client = new ClaudeClient('test-api-key');

      await expect(
        client.sendMessage([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow(ClaudeApiError);
    });

    it('should throw ClaudeApiError when no text content in response', async () => {
      const mockCreate = await getMockCreate();
      mockCreate.mockResolvedValueOnce({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [],
        model: DEFAULT_MODEL,
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 0 },
      });

      const client = new ClaudeClient('test-api-key');

      await expect(
        client.sendMessage([{ role: 'user', content: 'Hello' }])
      ).rejects.toThrow('No text content in response');
    });

    it('should handle multi-turn conversations', async () => {
      const mockCreate = await getMockCreate();
      mockCreate.mockResolvedValueOnce({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Paris' }],
        model: DEFAULT_MODEL,
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 30, output_tokens: 5 },
      });

      const client = new ClaudeClient('test-api-key');
      const response = await client.sendMessage([
        { role: 'user', content: 'What is the capital of France?' },
        { role: 'assistant', content: 'The capital of France is Paris.' },
        { role: 'user', content: 'Just the city name please.' },
      ]);

      expect(response).toBe('Paris');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'What is the capital of France?' },
            { role: 'assistant', content: 'The capital of France is Paris.' },
            { role: 'user', content: 'Just the city name please.' },
          ],
        })
      );
    });
  });

  describe('generateStructuredOutput', () => {
    const personSchema = z.object({
      name: z.string(),
      age: z.number(),
      email: z.string().email().optional(),
    });

    it('should parse valid JSON response', async () => {
      const mockCreate = await getMockCreate();
      mockCreate.mockResolvedValueOnce({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: '{"name": "John", "age": 30}' }],
        model: DEFAULT_MODEL,
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 50, output_tokens: 20 },
      });

      const client = new ClaudeClient('test-api-key');
      const result = await client.generateStructuredOutput(
        [{ role: 'user', content: 'Generate a person' }],
        personSchema
      );

      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should extract JSON from code block', async () => {
      const mockCreate = await getMockCreate();
      mockCreate.mockResolvedValueOnce({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Here is the JSON:\n```json\n{"name": "Jane", "age": 25}\n```',
          },
        ],
        model: DEFAULT_MODEL,
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 50, output_tokens: 30 },
      });

      const client = new ClaudeClient('test-api-key');
      const result = await client.generateStructuredOutput(
        [{ role: 'user', content: 'Generate a person' }],
        personSchema
      );

      expect(result).toEqual({ name: 'Jane', age: 25 });
    });

    it('should extract JSON object from mixed text', async () => {
      const mockCreate = await getMockCreate();
      mockCreate.mockResolvedValueOnce({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Sure! Here is the data: {"name": "Bob", "age": 35} Hope this helps!',
          },
        ],
        model: DEFAULT_MODEL,
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 50, output_tokens: 40 },
      });

      const client = new ClaudeClient('test-api-key');
      const result = await client.generateStructuredOutput(
        [{ role: 'user', content: 'Generate a person' }],
        personSchema
      );

      expect(result).toEqual({ name: 'Bob', age: 35 });
    });

    it('should parse array responses', async () => {
      const mockCreate = await getMockCreate();
      mockCreate.mockResolvedValueOnce({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: '["apple", "banana", "cherry"]' }],
        model: DEFAULT_MODEL,
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 30, output_tokens: 15 },
      });

      const arraySchema = z.array(z.string());
      const client = new ClaudeClient('test-api-key');
      const result = await client.generateStructuredOutput(
        [{ role: 'user', content: 'List fruits' }],
        arraySchema
      );

      expect(result).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should throw ClaudeParseError for invalid JSON', async () => {
      const mockCreate = await getMockCreate();
      // 2回呼ばれる（リトライ1回）
      mockCreate
        .mockResolvedValueOnce({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'This is not valid JSON at all' }],
          model: DEFAULT_MODEL,
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 50, output_tokens: 10 },
        })
        .mockResolvedValueOnce({
          id: 'msg_124',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Still not JSON' }],
          model: DEFAULT_MODEL,
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 50, output_tokens: 10 },
        });

      const client = new ClaudeClient('test-api-key');

      await expect(
        client.generateStructuredOutput(
          [{ role: 'user', content: 'Generate something' }],
          personSchema
        )
      ).rejects.toThrow(ClaudeParseError);
    });

    it('should throw ClaudeParseError for schema validation failure', async () => {
      const mockCreate = await getMockCreate();
      mockCreate
        .mockResolvedValueOnce({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: '{"name": "John"}' }], // missing required 'age'
          model: DEFAULT_MODEL,
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 50, output_tokens: 15 },
        })
        .mockResolvedValueOnce({
          id: 'msg_124',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: '{"name": "John"}' }],
          model: DEFAULT_MODEL,
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 50, output_tokens: 15 },
        });

      const client = new ClaudeClient('test-api-key');

      await expect(
        client.generateStructuredOutput(
          [{ role: 'user', content: 'Generate a person' }],
          personSchema
        )
      ).rejects.toThrow(ClaudeParseError);
    });

    it('should retry on parse failure', async () => {
      const mockCreate = await getMockCreate();
      mockCreate
        .mockResolvedValueOnce({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'invalid' }],
          model: DEFAULT_MODEL,
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 50, output_tokens: 5 },
        })
        .mockResolvedValueOnce({
          id: 'msg_124',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: '{"name": "Jane", "age": 28}' }],
          model: DEFAULT_MODEL,
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: { input_tokens: 50, output_tokens: 20 },
        });

      const client = new ClaudeClient('test-api-key');
      const result = await client.generateStructuredOutput(
        [{ role: 'user', content: 'Generate a person' }],
        personSchema,
        { retryCount: 1 }
      );

      expect(result).toEqual({ name: 'Jane', age: 28 });
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should not retry on API error', async () => {
      const mockCreate = await getMockCreate();
      const apiError = await createMockAPIError(500, 'Server error');
      mockCreate.mockRejectedValueOnce(apiError);

      const client = new ClaudeClient('test-api-key');

      await expect(
        client.generateStructuredOutput(
          [{ role: 'user', content: 'Generate a person' }],
          personSchema,
          { retryCount: 3 }
        )
      ).rejects.toThrow(ClaudeApiError);

      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should include base system prompt with JSON instructions', async () => {
      const mockCreate = await getMockCreate();
      mockCreate.mockResolvedValueOnce({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: '{"name": "Test", "age": 20}' }],
        model: DEFAULT_MODEL,
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 80, output_tokens: 20 },
      });

      const client = new ClaudeClient('test-api-key');
      await client.generateStructuredOutput(
        [{ role: 'user', content: 'Generate a person' }],
        personSchema,
        { system: 'Generate realistic data.' }
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Generate realistic data.'),
        })
      );
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('valid JSON'),
        })
      );
    });
  });
});

describe('Error classes', () => {
  describe('ClaudeApiError', () => {
    it('should create error with message only', () => {
      const error = new ClaudeApiError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ClaudeApiError');
      expect(error.statusCode).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });

    it('should create error with status code', () => {
      const error = new ClaudeApiError('Rate limited', 429);
      expect(error.statusCode).toBe(429);
    });

    it('should create error with cause', () => {
      const cause = new Error('Original error');
      const error = new ClaudeApiError('Wrapped error', 500, cause);
      expect(error.cause).toBe(cause);
    });

    it('should be instanceof Error', () => {
      const error = new ClaudeApiError('Test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ClaudeApiError);
    });
  });

  describe('ClaudeParseError', () => {
    it('should create error with message only', () => {
      const error = new ClaudeParseError('Parse failed');
      expect(error.message).toBe('Parse failed');
      expect(error.name).toBe('ClaudeParseError');
      expect(error.rawContent).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });

    it('should create error with raw content', () => {
      const error = new ClaudeParseError('Invalid JSON', '{ invalid }');
      expect(error.rawContent).toBe('{ invalid }');
    });

    it('should create error with cause', () => {
      const cause = new SyntaxError('Unexpected token');
      const error = new ClaudeParseError('Parse failed', '{}', cause);
      expect(error.cause).toBe(cause);
    });

    it('should be instanceof Error', () => {
      const error = new ClaudeParseError('Test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ClaudeParseError);
    });
  });
});
