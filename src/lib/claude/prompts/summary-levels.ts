/**
 * Summary Level Prompts
 *
 * 要約詳細度レベルに応じたプロンプトテンプレート
 * - brief: 3行以内の簡潔な要約
 * - standard: 標準的な要約（現行）
 * - detailed: 詳細な要約（発言者引用含む）
 *
 * @module lib/claude/prompts/summary-levels
 */

import type { SummaryLevel } from '@/types/ai-enhancement';

// =============================================================================
// Summary Level Configurations
// =============================================================================

/**
 * 各要約レベルの設定情報
 */
export interface SummaryLevelConfig {
  /** レベル名 */
  level: SummaryLevel;
  /** 表示名 */
  displayName: string;
  /** 説明 */
  description: string;
  /** 推奨最大文字数 */
  maxCharacters: number;
  /** 追加指示 */
  instruction: string;
}

/**
 * 要約レベル設定マップ
 */
export const SUMMARY_LEVEL_CONFIGS: Record<SummaryLevel, SummaryLevelConfig> = {
  brief: {
    level: 'brief',
    displayName: '簡潔',
    description: '3行以内の簡潔な要約',
    maxCharacters: 200,
    instruction: '3行以内で会議の要点のみをまとめてください。詳細は省略し、最も重要なポイントだけを含めてください。',
  },
  standard: {
    level: 'standard',
    displayName: '標準',
    description: '標準的な要約（3-5文）',
    maxCharacters: 500,
    instruction: '3-5文で会議の概要をまとめてください。主要な議題、決定事項、次のステップを含めてください。',
  },
  detailed: {
    level: 'detailed',
    displayName: '詳細',
    description: '詳細な要約（発言者引用含む）',
    maxCharacters: 1500,
    instruction: `詳細な会議要約を作成してください。以下を含めてください:
- 各議題の詳細な要約
- 重要な発言の引用（「〇〇さん: ...」形式）
- 議論の経緯と結論に至った背景
- 参加者の意見の対立点があればその内容
- 次回への持ち越し事項`,
  },
};

// =============================================================================
// Summary Level System Prompts
// =============================================================================

/**
 * Brief要約用システムプロンプト
 */
export const BRIEF_SUMMARY_SYSTEM_PROMPT = `あなたは議事録の要約専門家です。
会議の内容を3行以内に凝縮し、最も重要な情報のみを伝えてください。

ルール:
- 最大3行（200文字以内）
- 箇条書きではなく文章で
- 主題、決定事項、次のアクションを優先
- 詳細や背景情報は省略`;

/**
 * Standard要約用システムプロンプト
 */
export const STANDARD_SUMMARY_SYSTEM_PROMPT = `あなたは議事録の要約専門家です。
会議の内容を3-5文の標準的な要約にまとめてください。

ルール:
- 3-5文（500文字以内）
- 主要な議題を網羅
- 重要な決定事項を含める
- アクションアイテムの概要を含める
- 読みやすく簡潔な文体`;

/**
 * Detailed要約用システムプロンプト
 */
export const DETAILED_SUMMARY_SYSTEM_PROMPT = `あなたは議事録の要約専門家です。
会議の内容を詳細に要約し、発言者の引用も含めてください。

ルール:
- 詳細な要約（1500文字以内）
- 各議題について詳しく記述
- 重要な発言は「〇〇さん: "..."」形式で引用
- 議論の流れと結論の背景を説明
- 賛否両方の意見があればどちらも記載
- 次回への持ち越し事項を明記`;

// =============================================================================
// Prompt Builder Functions
// =============================================================================

/**
 * 要約レベルに応じたシステムプロンプトを取得
 *
 * @param level - 要約レベル
 * @returns システムプロンプト文字列
 */
export function getSummarySystemPrompt(level: SummaryLevel): string {
  switch (level) {
    case 'brief':
      return BRIEF_SUMMARY_SYSTEM_PROMPT;
    case 'standard':
      return STANDARD_SUMMARY_SYSTEM_PROMPT;
    case 'detailed':
      return DETAILED_SUMMARY_SYSTEM_PROMPT;
  }
}

/**
 * 要約レベルに応じたユーザープロンプトを構築
 *
 * @param transcript - 文字起こしテキスト
 * @param level - 要約レベル
 * @param meetingTitle - 会議タイトル（オプション）
 * @returns 構築されたユーザープロンプト
 */
export function buildSummaryPrompt(
  transcript: string,
  level: SummaryLevel,
  meetingTitle?: string
): string {
  const config = SUMMARY_LEVEL_CONFIGS[level];
  const titleSection = meetingTitle !== undefined
    ? `## 会議タイトル\n${meetingTitle}\n\n`
    : '';

  return `${titleSection}## 文字起こし

${transcript}

## 指示

${config.instruction}

要約を直接テキストとして出力してください（JSON形式ではありません）。
最大${config.maxCharacters}文字以内でお願いします。`;
}

/**
 * 要約レベルの設定を取得
 *
 * @param level - 要約レベル
 * @returns 設定情報
 */
export function getSummaryLevelConfig(level: SummaryLevel): SummaryLevelConfig {
  return SUMMARY_LEVEL_CONFIGS[level];
}

/**
 * 全ての要約レベル設定を取得
 *
 * @returns 全設定の配列
 */
export function getAllSummaryLevelConfigs(): SummaryLevelConfig[] {
  return Object.values(SUMMARY_LEVEL_CONFIGS);
}
