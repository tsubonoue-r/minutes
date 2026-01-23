/**
 * AI Enhancement Service
 *
 * Claude APIを活用した高度なAI機能を提供するサービス
 * - アクションアイテム重複検出
 * - フォローアップ関係検出
 * - 議事録品質スコアリング
 * - 改善提案生成
 *
 * @module services/ai-enhancement.service
 */

import { z } from 'zod';
import { ClaudeClient, ClaudeApiError, ClaudeParseError } from '@/lib/claude';
import {
  buildDuplicateDetectionPrompt,
  buildFollowUpDetectionPrompt,
  buildQualityScoringPrompt,
  buildImprovementSuggestionPrompt,
  DUPLICATE_DETECTION_SYSTEM_PROMPT,
  FOLLOW_UP_DETECTION_SYSTEM_PROMPT,
  QUALITY_SCORING_SYSTEM_PROMPT,
  IMPROVEMENT_SUGGESTION_SYSTEM_PROMPT,
} from '@/lib/claude/prompts/ai-enhancement';
import type { ActionItem, Minutes } from '@/types/minutes';
import {
  DuplicateDetectionResultSchema,
  FollowUpRelationSchema,
  QualityScoreSchema,
  ImprovementSchema,
  type DuplicateGroup,
  type FollowUpRelation,
  type QualityScore,
  type Improvement,
  type TokenUsage,
} from '@/types/ai-enhancement';
import { minutesToMarkdown } from '@/types/minutes';

// =============================================================================
// Constants
// =============================================================================

/**
 * デフォルト最大トークン数
 */
const DEFAULT_MAX_TOKENS = 4096;

/**
 * 品質スコアリング用最大トークン数
 */
const QUALITY_SCORING_MAX_TOKENS = 4096;

/**
 * 改善提案用最大トークン数
 */
const IMPROVEMENT_MAX_TOKENS = 4096;

// =============================================================================
// Error Class
// =============================================================================

/**
 * AI Enhancement Serviceのエラー
 */
export class AIEnhancementError extends Error {
  constructor(
    message: string,
    public readonly code: AIEnhancementErrorCode,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'AIEnhancementError';
    Object.setPrototypeOf(this, AIEnhancementError.prototype);
  }
}

/**
 * エラーコード
 */
export type AIEnhancementErrorCode =
  | 'API_ERROR'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'INSUFFICIENT_DATA'
  | 'UNKNOWN_ERROR';

// =============================================================================
// Service Class
// =============================================================================

/**
 * AI Enhancement Service
 *
 * Claude APIを使用してアクションアイテムの重複検出、
 * 議事録の品質評価、改善提案を行うサービス
 *
 * @example
 * ```typescript
 * const client = new ClaudeClient(process.env.ANTHROPIC_API_KEY!);
 * const service = new AIEnhancementService(client);
 *
 * // 重複検出
 * const duplicates = await service.detectDuplicateActionItems(actionItems);
 *
 * // 品質スコアリング
 * const score = await service.scoreMinutesQuality(minutes);
 *
 * // 改善提案
 * const improvements = await service.suggestImprovements(minutes);
 * ```
 */
export class AIEnhancementService {
  private readonly client: ClaudeClient;
  private tokenUsage: TokenUsage;

  /**
   * AIEnhancementServiceを作成
   *
   * @param client - ClaudeClientインスタンス
   */
  constructor(client: ClaudeClient) {
    this.client = client;
    this.tokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  }

  /**
   * 現在のトークン使用量を取得
   *
   * @returns 累積トークン使用量
   */
  getTokenUsage(): TokenUsage {
    return { ...this.tokenUsage };
  }

  /**
   * トークン使用量をリセット
   */
  resetTokenUsage(): void {
    this.tokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  }

  /**
   * アクションアイテムの重複を検出
   *
   * Claude APIを使用してアクションアイテムの意味的な類似性を分析し、
   * 重複しているアイテムをグループ化します。
   *
   * @param items - 分析対象のアクションアイテム配列
   * @returns 重複グループの配列
   * @throws {AIEnhancementError} API呼び出しやパースに失敗した場合
   *
   * @example
   * ```typescript
   * const groups = await service.detectDuplicateActionItems(actionItems);
   * for (const group of groups) {
   *   console.log(`類似度: ${group.similarityScore}`);
   *   console.log(`マージ提案: ${group.mergedSuggestion}`);
   * }
   * ```
   */
  async detectDuplicateActionItems(
    items: readonly ActionItem[]
  ): Promise<DuplicateGroup[]> {
    if (items.length < 2) {
      return [];
    }

    try {
      const promptItems = items.map((item) => {
        const base: { id: string; content: string; assignee?: string } = {
          id: item.id,
          content: item.content,
        };
        if (item.assignee !== undefined) {
          base.assignee = item.assignee.name;
        }
        return base;
      });

      const userPrompt = buildDuplicateDetectionPrompt(promptItems);

      const result = await this.client.generateStructuredOutput(
        [{ role: 'user', content: userPrompt }],
        DuplicateDetectionResultSchema,
        {
          system: DUPLICATE_DETECTION_SYSTEM_PROMPT,
          maxTokens: DEFAULT_MAX_TOKENS,
          retryCount: 2,
        }
      );

      this.updateTokenUsage(userPrompt, JSON.stringify(result));

      return result.groups;
    } catch (error) {
      throw this.wrapError(error, 'Failed to detect duplicate action items');
    }
  }

  /**
   * フォローアップ関係を検出
   *
   * 現在のアクションアイテムと過去の議事録のアクションアイテム間の
   * フォローアップ関係を検出します。
   *
   * @param currentItems - 現在のアクションアイテム配列
   * @param previousMinutes - 過去の議事録の配列
   * @returns フォローアップ関係の配列
   * @throws {AIEnhancementError} API呼び出しやパースに失敗した場合
   *
   * @example
   * ```typescript
   * const relations = await service.detectFollowUpItems(
   *   currentItems,
   *   previousMinutesList
   * );
   * for (const rel of relations) {
   *   console.log(`${rel.relationType}: ${rel.reason}`);
   * }
   * ```
   */
  async detectFollowUpItems(
    currentItems: readonly ActionItem[],
    previousMinutes: readonly Minutes[]
  ): Promise<FollowUpRelation[]> {
    if (currentItems.length === 0 || previousMinutes.length === 0) {
      return [];
    }

    try {
      const mapItemForPrompt = (item: ActionItem): { id: string; content: string; assignee?: string } => {
        const base: { id: string; content: string; assignee?: string } = {
          id: item.id,
          content: item.content,
        };
        if (item.assignee !== undefined) {
          base.assignee = item.assignee.name;
        }
        return base;
      };

      const currentPromptItems = currentItems.map(mapItemForPrompt);

      const previousPromptMinutes = previousMinutes.map((m) => ({
        minutesId: m.id,
        title: m.title,
        date: m.date,
        actionItems: m.actionItems.map(mapItemForPrompt),
      }));

      const userPrompt = buildFollowUpDetectionPrompt(
        currentPromptItems,
        previousPromptMinutes
      );

      const followUpArraySchema = z.array(FollowUpRelationSchema);

      const result = await this.client.generateStructuredOutput(
        [{ role: 'user', content: userPrompt }],
        followUpArraySchema,
        {
          system: FOLLOW_UP_DETECTION_SYSTEM_PROMPT,
          maxTokens: DEFAULT_MAX_TOKENS,
          retryCount: 2,
        }
      );

      this.updateTokenUsage(userPrompt, JSON.stringify(result));

      return result;
    } catch (error) {
      throw this.wrapError(error, 'Failed to detect follow-up items');
    }
  }

  /**
   * 議事録の品質をスコアリング
   *
   * 10項目の評価基準に基づいて議事録の品質を0-100点で評価します。
   *
   * @param minutes - 評価対象の議事録
   * @returns 品質スコア
   * @throws {AIEnhancementError} API呼び出しやパースに失敗した場合
   *
   * @example
   * ```typescript
   * const score = await service.scoreMinutesQuality(minutes);
   * console.log(`総合スコア: ${score.overallScore}/100`);
   * console.log(`レベル: ${score.level}`);
   * ```
   */
  async scoreMinutesQuality(minutes: Minutes): Promise<QualityScore> {
    try {
      const minutesText = minutesToMarkdown(minutes);
      const userPrompt = buildQualityScoringPrompt(minutesText);

      const result = await this.client.generateStructuredOutput(
        [{ role: 'user', content: userPrompt }],
        QualityScoreSchema,
        {
          system: QUALITY_SCORING_SYSTEM_PROMPT,
          maxTokens: QUALITY_SCORING_MAX_TOKENS,
          retryCount: 2,
        }
      );

      this.updateTokenUsage(userPrompt, JSON.stringify(result));

      return result;
    } catch (error) {
      throw this.wrapError(error, 'Failed to score minutes quality');
    }
  }

  /**
   * 議事録の改善提案を生成
   *
   * AIが議事録を分析し、具体的な改善提案を生成します。
   *
   * @param minutes - 分析対象の議事録
   * @returns 改善提案の配列
   * @throws {AIEnhancementError} API呼び出しやパースに失敗した場合
   *
   * @example
   * ```typescript
   * const improvements = await service.suggestImprovements(minutes);
   * for (const imp of improvements) {
   *   console.log(`[${imp.priority}] ${imp.category}: ${imp.description}`);
   * }
   * ```
   */
  async suggestImprovements(minutes: Minutes): Promise<Improvement[]> {
    try {
      const minutesText = minutesToMarkdown(minutes);
      const userPrompt = buildImprovementSuggestionPrompt(minutesText);

      const improvementsArraySchema = z.array(ImprovementSchema);

      const result = await this.client.generateStructuredOutput(
        [{ role: 'user', content: userPrompt }],
        improvementsArraySchema,
        {
          system: IMPROVEMENT_SUGGESTION_SYSTEM_PROMPT,
          maxTokens: IMPROVEMENT_MAX_TOKENS,
          retryCount: 2,
        }
      );

      this.updateTokenUsage(userPrompt, JSON.stringify(result));

      return result;
    } catch (error) {
      throw this.wrapError(error, 'Failed to suggest improvements');
    }
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * トークン使用量を推定して更新
   * (実際のAPIレスポンスにusage情報が含まれないため、推定値を使用)
   */
  private updateTokenUsage(input: string, output: string): void {
    // 簡易的なトークン推定（日本語は1文字約1.5トークン、英語は1単語約1トークン）
    const inputTokens = this.estimateTokens(input);
    const outputTokens = this.estimateTokens(output);

    this.tokenUsage.inputTokens += inputTokens;
    this.tokenUsage.outputTokens += outputTokens;
    this.tokenUsage.totalTokens += inputTokens + outputTokens;
  }

  /**
   * テキストのトークン数を推定
   */
  private estimateTokens(text: string): number {
    // 日本語文字数 + 英語単語数で推定
    const japaneseChars = text.replace(/[\x20-\x7E]/g, '').length;
    const englishWords = text.replace(/[^\x20-\x7E]/g, '').split(/\s+/).filter(Boolean).length;

    return Math.ceil(japaneseChars * 1.5 + englishWords * 1.3);
  }

  /**
   * エラーをAIEnhancementErrorにラップ
   */
  private wrapError(error: unknown, message: string): AIEnhancementError {
    if (error instanceof AIEnhancementError) {
      return error;
    }

    if (error instanceof ClaudeApiError) {
      return new AIEnhancementError(
        `${message}: ${error.message}`,
        'API_ERROR',
        error
      );
    }

    if (error instanceof ClaudeParseError) {
      return new AIEnhancementError(
        `${message}: ${error.message}`,
        'PARSE_ERROR',
        error
      );
    }

    return new AIEnhancementError(
      `${message}: ${error instanceof Error ? error.message : String(error)}`,
      'UNKNOWN_ERROR',
      error
    );
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * 環境変数からAIEnhancementServiceを作成
 *
 * @returns AIEnhancementServiceインスタンス
 * @throws {AIEnhancementError} API キーが設定されていない場合
 */
export function createAIEnhancementServiceFromEnv(): AIEnhancementService {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey === undefined || apiKey === '') {
    throw new AIEnhancementError(
      'ANTHROPIC_API_KEY environment variable is not set',
      'API_ERROR'
    );
  }

  const client = new ClaudeClient(apiKey);
  return new AIEnhancementService(client);
}

/**
 * ClaudeClientからAIEnhancementServiceを作成
 *
 * @param client - ClaudeClientインスタンス
 * @returns AIEnhancementServiceインスタンス
 */
export function createAIEnhancementServiceWithClient(
  client: ClaudeClient
): AIEnhancementService {
  return new AIEnhancementService(client);
}
