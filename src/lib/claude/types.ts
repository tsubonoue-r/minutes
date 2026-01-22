/**
 * Claude API Type Definitions
 *
 * Anthropic Claude APIを使用するための型定義とZodスキーマ
 */

import { z } from 'zod';

// =============================================================================
// Custom Error Classes
// =============================================================================

/**
 * Claude API呼び出し時のエラー
 */
export class ClaudeApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ClaudeApiError';
    Object.setPrototypeOf(this, ClaudeApiError.prototype);
  }
}

/**
 * Claude レスポンスのパースエラー
 */
export class ClaudeParseError extends Error {
  constructor(
    message: string,
    public readonly rawContent?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ClaudeParseError';
    Object.setPrototypeOf(this, ClaudeParseError.prototype);
  }
}

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * メッセージロールのスキーマ
 */
export const MessageRoleSchema = z.enum(['user', 'assistant']);

/**
 * メッセージ型のスキーマ
 */
export const ClaudeMessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
});

/**
 * リクエスト型のスキーマ
 */
export const ClaudeRequestSchema = z.object({
  model: z.string(),
  max_tokens: z.number().int().positive(),
  messages: z.array(ClaudeMessageSchema).min(1),
  system: z.string().optional(),
});

/**
 * コンテンツブロックのスキーマ
 */
export const ContentBlockSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
});

/**
 * Usage情報のスキーマ
 */
export const UsageSchema = z.object({
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
});

/**
 * Stop reasonのスキーマ
 */
export const StopReasonSchema = z.enum([
  'end_turn',
  'max_tokens',
  'stop_sequence',
  'tool_use',
]);

/**
 * レスポンス型のスキーマ
 */
export const ClaudeResponseSchema = z.object({
  id: z.string(),
  type: z.literal('message'),
  role: z.literal('assistant'),
  content: z.array(ContentBlockSchema),
  model: z.string(),
  stop_reason: StopReasonSchema.nullable(),
  stop_sequence: z.string().nullable(),
  usage: UsageSchema,
});

// =============================================================================
// TypeScript Types (inferred from Zod schemas)
// =============================================================================

/**
 * メッセージロール
 */
export type MessageRole = z.infer<typeof MessageRoleSchema>;

/**
 * Claudeメッセージ型
 */
export type ClaudeMessage = z.infer<typeof ClaudeMessageSchema>;

/**
 * Claudeリクエスト型
 */
export type ClaudeRequest = z.infer<typeof ClaudeRequestSchema>;

/**
 * コンテンツブロック型
 */
export type ContentBlock = z.infer<typeof ContentBlockSchema>;

/**
 * Usage情報型
 */
export type Usage = z.infer<typeof UsageSchema>;

/**
 * Stop reason型
 */
export type StopReason = z.infer<typeof StopReasonSchema>;

/**
 * Claudeレスポンス型
 */
export type ClaudeResponse = z.infer<typeof ClaudeResponseSchema>;

// =============================================================================
// Client Configuration Types
// =============================================================================

/**
 * ClaudeClientの設定オプション
 */
export interface ClaudeClientOptions {
  /** 使用するモデル（デフォルト: claude-sonnet-4-20250514） */
  model?: string;
  /** 最大トークン数（デフォルト: 4096） */
  maxTokens?: number;
}

/**
 * メッセージ送信のオプション
 */
export interface SendMessageOptions {
  /** システムプロンプト */
  system?: string;
  /** 最大トークン数（クライアント設定を上書き） */
  maxTokens?: number;
}

/**
 * 構造化出力のオプション
 */
export interface StructuredOutputOptions extends SendMessageOptions {
  /** JSONパース失敗時のリトライ回数（デフォルト: 1） */
  retryCount?: number;
}

// =============================================================================
// Default Values
// =============================================================================

/**
 * デフォルトモデル
 */
export const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * デフォルト最大トークン数
 */
export const DEFAULT_MAX_TOKENS = 4096;
