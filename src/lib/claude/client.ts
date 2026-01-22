/**
 * Claude API Client
 *
 * Anthropic Claude APIを使用するためのクライアントクラス
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { ZodSchema } from 'zod';

import {
  ClaudeApiError,
  ClaudeParseError,
  DEFAULT_MAX_TOKENS,
  DEFAULT_MODEL,
  type ClaudeClientOptions,
  type ClaudeMessage,
  type SendMessageOptions,
  type StructuredOutputOptions,
} from './types';

/**
 * Claude APIクライアント
 *
 * Anthropic Claude APIとの通信を管理するクラス
 *
 * @example
 * ```typescript
 * const client = new ClaudeClient(process.env.ANTHROPIC_API_KEY);
 *
 * // 単純なメッセージ送信
 * const response = await client.sendMessage([
 *   { role: 'user', content: 'Hello, Claude!' }
 * ]);
 *
 * // 構造化出力
 * const schema = z.object({ name: z.string(), age: z.number() });
 * const data = await client.generateStructuredOutput(
 *   [{ role: 'user', content: 'Generate a person' }],
 *   schema
 * );
 * ```
 */
export class ClaudeClient {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  /**
   * ClaudeClientを作成
   *
   * @param apiKey - Anthropic APIキー
   * @param options - クライアント設定オプション
   */
  constructor(apiKey: string, options?: ClaudeClientOptions) {
    if (!apiKey || apiKey.trim() === '') {
      throw new ClaudeApiError('API key is required');
    }

    this.client = new Anthropic({ apiKey });
    this.model = options?.model ?? DEFAULT_MODEL;
    this.maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
  }

  /**
   * メッセージを送信してテキストレスポンスを取得
   *
   * @param messages - 送信するメッセージの配列
   * @param options - 送信オプション
   * @returns アシスタントからのテキストレスポンス
   * @throws {ClaudeApiError} API呼び出しに失敗した場合
   */
  async sendMessage(
    messages: ClaudeMessage[],
    options?: SendMessageOptions
  ): Promise<string> {
    if (messages.length === 0) {
      throw new ClaudeApiError('At least one message is required');
    }

    try {
      const requestParams: Anthropic.MessageCreateParams = {
        model: this.model,
        max_tokens: options?.maxTokens ?? this.maxTokens,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      };

      // systemが指定されている場合のみ追加
      if (options?.system !== undefined) {
        requestParams.system = options.system;
      }

      const response = await this.client.messages.create(requestParams);

      // テキストコンテンツを抽出
      const textContent = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      );

      if (!textContent) {
        throw new ClaudeApiError('No text content in response');
      }

      return textContent.text;
    } catch (error) {
      if (error instanceof ClaudeApiError) {
        throw error;
      }

      // Anthropic APIErrorの判定（error.nameで判定）
      if (error instanceof Error && error.name === 'APIError') {
        const apiError = error as { message: string; status?: number };
        throw new ClaudeApiError(
          `API request failed: ${apiError.message}`,
          apiError.status,
          error
        );
      }

      throw new ClaudeApiError(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        error
      );
    }
  }

  /**
   * 構造化出力を生成
   *
   * メッセージを送信し、レスポンスをJSONとしてパースしてスキーマで検証
   *
   * @param messages - 送信するメッセージの配列
   * @param schema - 出力を検証するZodスキーマ
   * @param options - 送信オプション
   * @returns スキーマに従ってパースされたデータ
   * @throws {ClaudeApiError} API呼び出しに失敗した場合
   * @throws {ClaudeParseError} JSONパースまたはスキーマ検証に失敗した場合
   */
  async generateStructuredOutput<T>(
    messages: ClaudeMessage[],
    schema: ZodSchema<T>,
    options?: StructuredOutputOptions
  ): Promise<T> {
    const retryCount = options?.retryCount ?? 1;
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        // JSON出力を促すシステムプロンプトを構築
        const systemPrompt = this.buildJsonSystemPrompt(
          schema,
          options?.system
        );

        const response = await this.sendMessage(messages, {
          ...options,
          system: systemPrompt,
        });

        // JSONをパース
        const parsed = this.parseJsonResponse(response);

        // スキーマで検証
        const result = schema.safeParse(parsed);

        if (!result.success) {
          throw new ClaudeParseError(
            `Schema validation failed: ${result.error.message}`,
            response,
            result.error
          );
        }

        return result.data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // APIエラーはリトライしない
        if (error instanceof ClaudeApiError) {
          throw error;
        }

        // 最後の試行でもパースエラーならスロー
        if (attempt === retryCount) {
          if (error instanceof ClaudeParseError) {
            throw error;
          }
          throw new ClaudeParseError(
            `Failed to parse structured output: ${lastError.message}`,
            undefined,
            lastError
          );
        }
      }
    }

    // TypeScriptの型システムのためにthrow（実際にはここには到達しない）
    throw new ClaudeParseError(
      `Failed after all retries: ${lastError.message}`,
      undefined,
      lastError
    );
  }

  /**
   * JSON出力を促すシステムプロンプトを構築
   */
  private buildJsonSystemPrompt(
    schema: ZodSchema<unknown>,
    baseSystem?: string
  ): string {
    const schemaDescription = this.describeSchema(schema);

    const jsonInstruction = `You must respond with valid JSON only. No markdown, no code blocks, no explanations.
Your response must conform to this schema:
${schemaDescription}

Respond with the JSON object directly.`;

    if (baseSystem !== undefined && baseSystem !== '') {
      return `${baseSystem}\n\n${jsonInstruction}`;
    }

    return jsonInstruction;
  }

  /**
   * Zodスキーマを人間が読める形式で記述
   */
  private describeSchema(schema: ZodSchema<unknown>): string {
    // Zodスキーマの内部構造を取得して説明を生成
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape as Record<string, z.ZodTypeAny>;
      const fields = Object.entries(shape)
        .map(([key, value]) => {
          const type = this.getZodTypeName(value);
          const isOptional = value.isOptional();
          return `  "${key}": ${type}${isOptional ? ' (optional)' : ''}`;
        })
        .join(',\n');
      return `{\n${fields}\n}`;
    }

    if (schema instanceof z.ZodArray) {
      const element = schema.element as z.ZodTypeAny;
      const elementType = this.getZodTypeName(element);
      return `Array<${elementType}>`;
    }

    return this.getZodTypeName(schema as z.ZodTypeAny);
  }

  /**
   * Zodタイプの名前を取得
   */
  private getZodTypeName(schema: z.ZodTypeAny): string {
    if (schema instanceof z.ZodString) return 'string';
    if (schema instanceof z.ZodNumber) return 'number';
    if (schema instanceof z.ZodBoolean) return 'boolean';
    if (schema instanceof z.ZodArray) {
      const element = schema.element as z.ZodTypeAny;
      return `Array<${this.getZodTypeName(element)}>`;
    }
    if (schema instanceof z.ZodObject) return 'object';
    if (schema instanceof z.ZodOptional) {
      const inner = schema.unwrap() as z.ZodTypeAny;
      return this.getZodTypeName(inner);
    }
    if (schema instanceof z.ZodNullable) {
      const inner = schema.unwrap() as z.ZodTypeAny;
      return `${this.getZodTypeName(inner)} | null`;
    }
    if (schema instanceof z.ZodEnum) {
      const options = schema.options as readonly string[];
      return options.map((o) => `"${o}"`).join(' | ');
    }
    if (schema instanceof z.ZodLiteral) {
      const value = schema.value as unknown;
      return typeof value === 'string' ? `"${value}"` : String(value);
    }
    return 'unknown';
  }

  /**
   * レスポンスからJSONをパース
   */
  private parseJsonResponse(response: string): unknown {
    // まず直接パースを試みる
    try {
      return JSON.parse(response);
    } catch {
      // JSON部分を抽出して再試行
    }

    // コードブロック内のJSONを抽出
    const codeBlockMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(response);
    const codeBlockContent = codeBlockMatch?.[1];
    if (codeBlockContent !== undefined && codeBlockContent !== '') {
      try {
        return JSON.parse(codeBlockContent.trim());
      } catch {
        // 抽出失敗
      }
    }

    // 最初の { から最後の } までを抽出
    const jsonMatch = /\{[\s\S]*\}/.exec(response);
    const jsonContent = jsonMatch?.[0];
    if (jsonContent !== undefined && jsonContent !== '') {
      try {
        return JSON.parse(jsonContent);
      } catch {
        // 抽出失敗
      }
    }

    // 最初の [ から最後の ] までを抽出（配列の場合）
    const arrayMatch = /\[[\s\S]*\]/.exec(response);
    const arrayContent = arrayMatch?.[0];
    if (arrayContent !== undefined && arrayContent !== '') {
      try {
        return JSON.parse(arrayContent);
      } catch {
        // 抽出失敗
      }
    }

    throw new ClaudeParseError(
      'Failed to extract valid JSON from response',
      response
    );
  }
}
