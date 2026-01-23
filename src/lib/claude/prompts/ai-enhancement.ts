/**
 * AI Enhancement Prompts
 *
 * 高度なAI機能用プロンプトテンプレート
 * - 重複検出プロンプト
 * - 品質スコアリングプロンプト
 * - 改善提案プロンプト
 *
 * @module lib/claude/prompts/ai-enhancement
 */

// =============================================================================
// Duplicate Detection Prompts
// =============================================================================

/**
 * アクションアイテム重複検出用システムプロンプト
 */
export const DUPLICATE_DETECTION_SYSTEM_PROMPT = `あなたはアクションアイテムの分析専門家です。
与えられたアクションアイテムの一覧から、意味的に重複しているものをグループ化してください。

分析の観点:
- 同じタスクを異なる表現で記述しているもの
- 部分的に重複しているタスク（一方が他方を包含する場合）
- 類似のゴールに向かっているが異なるアプローチのタスク

注意事項:
- 完全一致だけでなく、意味的な類似性を考慮してください
- 類似度スコアは0（無関係）から1（完全一致）で評価してください
- 0.6以上の類似度を持つものをグループ化してください
- マージ提案は、重複するアイテムを統合した最適な表現を提案してください`;

/**
 * 重複検出用ユーザープロンプトを構築
 *
 * @param items - アクションアイテムの配列
 * @returns 構築されたユーザープロンプト
 */
export function buildDuplicateDetectionPrompt(
  items: ReadonlyArray<{ id: string; content: string; assignee?: string }>
): string {
  const itemsList = items
    .map((item) => {
      const assigneeText = item.assignee !== undefined ? ` (担当: ${item.assignee})` : '';
      return `- [${item.id}] ${item.content}${assigneeText}`;
    })
    .join('\n');

  return `以下のアクションアイテム一覧から、意味的に重複しているものをグループ化してください。

## アクションアイテム一覧

${itemsList}

## 出力形式

以下のJSON形式で出力してください:
{
  "groups": [
    {
      "groupId": "group_1",
      "similarityScore": 0.85,
      "items": [
        { "itemId": "item-id-1", "content": "アイテム内容1" },
        { "itemId": "item-id-2", "content": "アイテム内容2" }
      ],
      "mergedSuggestion": "統合された提案テキスト",
      "reason": "類似している理由"
    }
  ],
  "totalItemsProcessed": ${items.length},
  "duplicateItemsFound": 0
}

重複が見つからない場合は groups を空配列にしてください。`;
}

// =============================================================================
// Follow-Up Detection Prompts
// =============================================================================

/**
 * フォローアップ関係検出用システムプロンプト
 */
export const FOLLOW_UP_DETECTION_SYSTEM_PROMPT = `あなたはプロジェクト管理の専門家です。
現在のアクションアイテムと過去の議事録のアクションアイテムの間の関連性を分析してください。

検出すべき関連タイプ:
- continuation: 過去のタスクの継続
- follow_up: 過去のタスクに基づくフォローアップ
- revision: 過去のタスクの修正・変更
- escalation: 過去のタスクのエスカレーション

注意事項:
- 関連性スコアは0（無関係）から1（直接的な関連）で評価してください
- 0.5以上の関連性を持つものを報告してください
- 担当者や期日の情報も考慮してください`;

/**
 * フォローアップ検出用ユーザープロンプトを構築
 *
 * @param currentItems - 現在のアクションアイテム
 * @param previousMinutes - 過去の議事録情報
 * @returns 構築されたユーザープロンプト
 */
export function buildFollowUpDetectionPrompt(
  currentItems: ReadonlyArray<{ id: string; content: string; assignee?: string }>,
  previousMinutes: ReadonlyArray<{
    minutesId: string;
    title: string;
    date: string;
    actionItems: ReadonlyArray<{ id: string; content: string; assignee?: string }>;
  }>
): string {
  const currentList = currentItems
    .map((item) => `- [${item.id}] ${item.content}${item.assignee !== undefined ? ` (担当: ${item.assignee})` : ''}`)
    .join('\n');

  const previousList = previousMinutes
    .map((m) => {
      const items = m.actionItems
        .map((item) => `  - [${item.id}] ${item.content}${item.assignee !== undefined ? ` (担当: ${item.assignee})` : ''}`)
        .join('\n');
      return `### ${m.title} (${m.date}) [${m.minutesId}]\n${items}`;
    })
    .join('\n\n');

  return `以下の現在のアクションアイテムと過去の議事録のアクションアイテムの間のフォローアップ関係を検出してください。

## 現在のアクションアイテム

${currentList}

## 過去の議事録

${previousList}

## 出力形式

以下のJSON形式で出力してください:
[
  {
    "currentItemId": "現在のアイテムID",
    "currentItemContent": "現在のアイテム内容",
    "previousItemId": "過去のアイテムID",
    "previousItemContent": "過去のアイテム内容",
    "previousMinutesId": "過去の議事録ID",
    "relevanceScore": 0.8,
    "relationType": "follow_up",
    "reason": "関連している理由"
  }
]

関連が見つからない場合は空配列を返してください。`;
}

// =============================================================================
// Quality Scoring Prompts
// =============================================================================

/**
 * 品質スコアリング評価項目
 */
export const QUALITY_CRITERIA = [
  '完全性（全ての議題がカバーされているか）',
  '明確性（内容が明確で曖昧さがないか）',
  'アクションアイテムの具体性（担当者・期日が明記されているか）',
  '構造化（トピックが論理的に整理されているか）',
  '詳細度（適切な詳細レベルが維持されているか）',
  '正確性（発言内容が正確に反映されているか）',
  'フォーマット（読みやすいフォーマットか）',
  'フォローアップ（前回からの継続事項が記載されているか）',
  'コンテキスト（背景情報が十分に記載されているか）',
  '要約の質（全体像が掴める要約になっているか）',
] as const;

/**
 * 品質スコアリング用システムプロンプト
 */
export const QUALITY_SCORING_SYSTEM_PROMPT = `あなたは議事録の品質評価の専門家です。
与えられた議事録を10項目の基準で評価し、各項目を0-10点で採点してください。

評価項目:
${QUALITY_CRITERIA.map((c, i) => `${i + 1}. ${c}`).join('\n')}

評価のガイドライン:
- 各項目は0-10点で評価（10が最高）
- 総合スコアは全項目の合計（0-100点）
- 客観的かつ建設的な評価を心がけてください
- 品質レベルは以下の基準:
  - 90-100: excellent
  - 75-89: good
  - 60-74: fair
  - 40-59: needs_improvement
  - 0-39: poor`;

/**
 * 品質スコアリング用ユーザープロンプトを構築
 *
 * @param minutesText - 議事録のテキスト表現
 * @returns 構築されたユーザープロンプト
 */
export function buildQualityScoringPrompt(minutesText: string): string {
  return `以下の議事録の品質を評価してください。

## 議事録

${minutesText}

## 出力形式

以下のJSON形式で出力してください:
{
  "overallScore": 75,
  "criteria": [
    {
      "name": "完全性",
      "score": 8,
      "maxScore": 10,
      "comment": "全ての議題がカバーされています"
    }
  ],
  "summary": "総合的な評価コメント",
  "level": "good"
}

criteria配列は必ず10項目含めてください。各項目は以下の順序です:
${QUALITY_CRITERIA.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
}

// =============================================================================
// Improvement Suggestion Prompts
// =============================================================================

/**
 * 改善提案用システムプロンプト
 */
export const IMPROVEMENT_SUGGESTION_SYSTEM_PROMPT = `あなたは議事録改善のアドバイザーです。
与えられた議事録を分析し、具体的な改善提案を行ってください。

改善カテゴリ:
- completeness: 完全性の改善
- clarity: 明確性の改善
- action_items: アクションアイテムの改善
- structure: 構造の改善
- detail: 詳細度の改善
- accuracy: 正確性の改善
- formatting: フォーマットの改善
- follow_up: フォローアップの改善
- context: コンテキストの改善
- summary: 要約の改善

提案のガイドライン:
- 具体的で実行可能な提案を行ってください
- 優先度（high/medium/low）を設定してください
- 可能であれば具体的な改善例を示してください`;

/**
 * 改善提案用ユーザープロンプトを構築
 *
 * @param minutesText - 議事録のテキスト表現
 * @returns 構築されたユーザープロンプト
 */
export function buildImprovementSuggestionPrompt(minutesText: string): string {
  return `以下の議事録を分析し、改善提案を行ってください。

## 議事録

${minutesText}

## 出力形式

以下のJSON形式で出力してください:
[
  {
    "id": "imp_1",
    "category": "action_items",
    "priority": "high",
    "description": "改善提案の説明",
    "suggestion": "具体的な改善例（オプション）",
    "targetSection": "対象セクション名（オプション）"
  }
]

最低3件、最大10件の改善提案を提供してください。
優先度の高いものから順に並べてください。`;
}
