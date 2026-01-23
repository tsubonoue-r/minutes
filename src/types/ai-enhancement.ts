/**
 * AI Enhancement type definitions
 *
 * Claude APIを活用した高度なAI機能のための型定義
 * - アクションアイテム重複検出
 * - 議事録品質スコアリング
 * - 改善提案
 * - 要約レベル
 *
 * @module types/ai-enhancement
 */

import { z, type ZodSafeParseResult } from 'zod';

// =============================================================================
// Summary Level Types
// =============================================================================

/**
 * 要約詳細度レベル
 */
export const SummaryLevelSchema = z.enum(['brief', 'standard', 'detailed']);

/**
 * 要約詳細度レベル型
 */
export type SummaryLevel = z.infer<typeof SummaryLevelSchema>;

// =============================================================================
// Duplicate Detection Types
// =============================================================================

/**
 * 重複アイテムペアのスキーマ
 */
export const DuplicatePairSchema = z.object({
  /** アクションアイテムID */
  itemId: z.string().min(1),
  /** アクションアイテムの内容 */
  content: z.string().min(1),
});

/**
 * 重複グループのスキーマ
 */
export const DuplicateGroupSchema = z.object({
  /** グループ識別子 */
  groupId: z.string().min(1),
  /** 類似度スコア（0-1） */
  similarityScore: z.number().min(0).max(1),
  /** 重複アイテムの配列 */
  items: z.array(DuplicatePairSchema).min(2),
  /** マージ提案テキスト */
  mergedSuggestion: z.string().min(1),
  /** 類似理由の説明 */
  reason: z.string().min(1),
});

/**
 * 重複検出結果のスキーマ
 */
export const DuplicateDetectionResultSchema = z.object({
  /** 検出された重複グループ */
  groups: z.array(DuplicateGroupSchema),
  /** 処理されたアイテム総数 */
  totalItemsProcessed: z.number().int().nonnegative(),
  /** 重複が検出されたアイテム数 */
  duplicateItemsFound: z.number().int().nonnegative(),
});

// =============================================================================
// Follow-Up Relation Types
// =============================================================================

/**
 * フォローアップ関係のスキーマ
 */
export const FollowUpRelationSchema = z.object({
  /** 現在のアクションアイテムID */
  currentItemId: z.string().min(1),
  /** 現在のアクションアイテム内容 */
  currentItemContent: z.string().min(1),
  /** 関連する過去のアクションアイテムID */
  previousItemId: z.string().min(1),
  /** 関連する過去のアクションアイテム内容 */
  previousItemContent: z.string().min(1),
  /** 関連元の議事録ID */
  previousMinutesId: z.string().min(1),
  /** 関連性スコア（0-1） */
  relevanceScore: z.number().min(0).max(1),
  /** 関連タイプ */
  relationType: z.enum(['continuation', 'follow_up', 'revision', 'escalation']),
  /** 関連理由の説明 */
  reason: z.string().min(1),
});

// =============================================================================
// Quality Score Types
// =============================================================================

/**
 * 個別評価項目のスキーマ
 */
export const QualityCriterionSchema = z.object({
  /** 評価項目名 */
  name: z.string().min(1),
  /** スコア（0-10） */
  score: z.number().min(0).max(10),
  /** 最大スコア */
  maxScore: z.literal(10),
  /** 評価コメント */
  comment: z.string().min(1),
});

/**
 * 品質スコアのスキーマ
 */
export const QualityScoreSchema = z.object({
  /** 総合スコア（0-100） */
  overallScore: z.number().min(0).max(100),
  /** 個別評価項目 */
  criteria: z.array(QualityCriterionSchema).length(10),
  /** 総合コメント */
  summary: z.string().min(1),
  /** 品質レベル */
  level: z.enum(['excellent', 'good', 'fair', 'needs_improvement', 'poor']),
});

// =============================================================================
// Improvement Types
// =============================================================================

/**
 * 改善提案のスキーマ
 */
export const ImprovementSchema = z.object({
  /** 改善提案ID */
  id: z.string().min(1),
  /** 改善対象カテゴリ */
  category: z.enum([
    'completeness',
    'clarity',
    'action_items',
    'structure',
    'detail',
    'accuracy',
    'formatting',
    'follow_up',
    'context',
    'summary',
  ]),
  /** 優先度 */
  priority: z.enum(['high', 'medium', 'low']),
  /** 改善提案の説明 */
  description: z.string().min(1),
  /** 具体的な改善例（オプション） */
  suggestion: z.string().optional(),
  /** 対象セクション（オプション） */
  targetSection: z.string().optional(),
});

// =============================================================================
// API Response Types
// =============================================================================

/**
 * トークン使用量のスキーマ
 */
export const TokenUsageSchema = z.object({
  /** 入力トークン数 */
  inputTokens: z.number().int().nonnegative(),
  /** 出力トークン数 */
  outputTokens: z.number().int().nonnegative(),
  /** 合計トークン数 */
  totalTokens: z.number().int().nonnegative(),
});

/**
 * 分析APIレスポンスのスキーマ
 */
export const AnalysisResponseSchema = z.object({
  /** 品質スコア */
  qualityScore: QualityScoreSchema,
  /** 改善提案 */
  improvements: z.array(ImprovementSchema),
  /** 重複検出結果 */
  duplicateDetection: DuplicateDetectionResultSchema,
  /** トークン使用量 */
  tokenUsage: TokenUsageSchema,
  /** 処理時間（ミリ秒） */
  processingTimeMs: z.number().int().nonnegative(),
});

// =============================================================================
// TypeScript Types (inferred from Zod schemas)
// =============================================================================

/**
 * 重複アイテムペア
 */
export type DuplicatePair = z.infer<typeof DuplicatePairSchema>;

/**
 * 重複グループ
 */
export type DuplicateGroup = z.infer<typeof DuplicateGroupSchema>;

/**
 * 重複検出結果
 */
export type DuplicateDetectionResult = z.infer<typeof DuplicateDetectionResultSchema>;

/**
 * フォローアップ関係
 */
export type FollowUpRelation = z.infer<typeof FollowUpRelationSchema>;

/**
 * 個別評価項目
 */
export type QualityCriterion = z.infer<typeof QualityCriterionSchema>;

/**
 * 品質スコア
 */
export type QualityScore = z.infer<typeof QualityScoreSchema>;

/**
 * 改善提案
 */
export type Improvement = z.infer<typeof ImprovementSchema>;

/**
 * トークン使用量
 */
export type TokenUsage = z.infer<typeof TokenUsageSchema>;

/**
 * 分析APIレスポンス
 */
export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * DuplicateGroupを検証
 *
 * @param data - 検証対象データ
 * @returns 検証結果
 */
export function validateDuplicateGroup(
  data: unknown
): ZodSafeParseResult<DuplicateGroup> {
  return DuplicateGroupSchema.safeParse(data);
}

/**
 * FollowUpRelationを検証
 *
 * @param data - 検証対象データ
 * @returns 検証結果
 */
export function validateFollowUpRelation(
  data: unknown
): ZodSafeParseResult<FollowUpRelation> {
  return FollowUpRelationSchema.safeParse(data);
}

/**
 * QualityScoreを検証
 *
 * @param data - 検証対象データ
 * @returns 検証結果
 */
export function validateQualityScore(
  data: unknown
): ZodSafeParseResult<QualityScore> {
  return QualityScoreSchema.safeParse(data);
}

/**
 * Improvementを検証
 *
 * @param data - 検証対象データ
 * @returns 検証結果
 */
export function validateImprovement(
  data: unknown
): ZodSafeParseResult<Improvement> {
  return ImprovementSchema.safeParse(data);
}

/**
 * AnalysisResponseを検証
 *
 * @param data - 検証対象データ
 * @returns 検証結果
 */
export function validateAnalysisResponse(
  data: unknown
): ZodSafeParseResult<AnalysisResponse> {
  return AnalysisResponseSchema.safeParse(data);
}
