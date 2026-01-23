/**
 * Minutes Generation Prompts
 *
 * 議事録生成用のAIプロンプトテンプレート
 *
 * @module lib/claude/prompts/minutes-generation
 */

import { z, type ZodSafeParseResult } from 'zod';

// =============================================================================
// Types
// =============================================================================

/**
 * 議事録生成プロンプトの入力パラメータ
 */
export interface MinutesGenerationInput {
  /** 文字起こしテキスト */
  transcript: string;
  /** 会議タイトル */
  meetingTitle: string;
  /** 会議日（YYYY-MM-DD形式） */
  meetingDate: string;
  /** 参加者名の配列 */
  attendees: string[];
  /** 出力言語（デフォルト: 'ja'） */
  language?: 'ja' | 'en';
}

/**
 * 出力言語設定
 */
export type OutputLanguage = 'ja' | 'en';

// =============================================================================
// System Prompt
// =============================================================================

/**
 * 日本語システムプロンプト
 */
const SYSTEM_PROMPT_JA = `あなたは議事録作成の専門家です。
会議の文字起こしから、構造化された高品質な議事録を作成することが得意です。

あなたの役割:
- 会議の内容を正確に把握し、重要な情報を漏らさず抽出する
- 話題の流れを理解し、論理的にセグメント分けする
- 決定事項とアクションアイテムを明確に識別する
- 簡潔で読みやすい文章で要約する

出力形式:
- 必ずJSON形式で出力してください
- マークダウンやコードブロックは使用しないでください
- 指定されたスキーマに厳密に従ってください`;

/**
 * 英語システムプロンプト
 */
const SYSTEM_PROMPT_EN = `You are an expert meeting minutes creator.
You excel at creating structured, high-quality meeting minutes from transcripts.

Your role:
- Accurately understand the meeting content and extract all important information
- Understand the flow of topics and logically segment them
- Clearly identify decisions and action items
- Summarize in concise, readable prose

Output format:
- Always output in JSON format
- Do not use markdown or code blocks
- Strictly follow the specified schema`;

/**
 * 議事録生成用システムプロンプト
 *
 * 日本語会議に最適化されたシステムプロンプト。
 * 役割、出力形式、期待される品質基準を定義します。
 */
export const MINUTES_GENERATION_SYSTEM_PROMPT = SYSTEM_PROMPT_JA;

/**
 * 言語別システムプロンプトを取得
 *
 * @param language - 出力言語
 * @returns システムプロンプト文字列
 */
export function getSystemPrompt(language: OutputLanguage = 'ja'): string {
  return language === 'ja' ? SYSTEM_PROMPT_JA : SYSTEM_PROMPT_EN;
}

// =============================================================================
// User Prompt Builder
// =============================================================================

/**
 * 日本語ユーザープロンプトテンプレート
 */
const USER_PROMPT_TEMPLATE_JA = `以下の会議の文字起こしから、構造化された議事録を作成してください。

## 出力要件

### 1. 全体要約 (summary)
- 3-5文で会議全体の要点を簡潔にまとめてください
- 会議の目的、主な議論点、結論を含めてください

### 2. 話題セグメント (topics)
- 議論の流れに沿って話題を分割してください
- 各話題には以下を含めてください:
  - title: 話題のタイトル（簡潔に）
  - startTime: 開始時間（ミリ秒、推定で構いません）
  - endTime: 終了時間（ミリ秒、推定で構いません）
  - summary: 話題の要約（1-2文）
  - keyPoints: 主要なポイント（配列）
  - speakers: 発言者（参加者リストから選択）

### 3. 決定事項 (decisions)
- 「決定」「承認」「合意」「決まった」「採用」等のキーワードから抽出
- 各決定事項には以下を含めてください:
  - content: 決定内容
  - context: 決定の背景や理由
  - decidedAt: 決定時間（ミリ秒、推定で構いません）
- 明確な決定がない場合は空配列で構いません

### 4. アクションアイテム (actionItems)
- 「やる」「対応する」「確認する」「作成する」等のキーワードから抽出
- 各アクションアイテムには以下を含めてください:
  - content: タスク内容
  - assignee: 担当者（検出できた場合、参加者から選択）
  - dueDate: 期限（YYYY-MM-DD形式、検出できた場合）
  - priority: 優先度推定（"high", "medium", "low"）
- 明確なアクションがない場合は空配列で構いません

## 会議情報
タイトル: {{meetingTitle}}
日付: {{meetingDate}}
参加者: {{attendees}}

## 文字起こし
{{transcript}}

## 重要な注意事項
- IDフィールド（id）は含めないでください（サーバー側で生成します）
- 発言者情報はidとnameのみで構いません
- 時間は推定値で構いません（0から始まるミリ秒単位）
- 検出できない情報は省略可能なフィールドとして扱ってください`;

/**
 * 英語ユーザープロンプトテンプレート
 */
const USER_PROMPT_TEMPLATE_EN = `Create structured meeting minutes from the following transcript.

## Output Requirements

### 1. Overall Summary (summary)
- Summarize the entire meeting in 3-5 sentences
- Include the meeting purpose, main discussion points, and conclusions

### 2. Topic Segments (topics)
- Divide topics following the flow of discussion
- Each topic should include:
  - title: Topic title (concise)
  - startTime: Start time (milliseconds, estimate is fine)
  - endTime: End time (milliseconds, estimate is fine)
  - summary: Topic summary (1-2 sentences)
  - keyPoints: Key points (array)
  - speakers: Speakers (select from attendee list)

### 3. Decisions (decisions)
- Extract from keywords like "decided", "approved", "agreed", "adopted"
- Each decision should include:
  - content: Decision content
  - context: Background or reason for the decision
  - decidedAt: Decision time (milliseconds, estimate is fine)
- Empty array is acceptable if no clear decisions

### 4. Action Items (actionItems)
- Extract from keywords like "will do", "handle", "check", "create"
- Each action item should include:
  - content: Task content
  - assignee: Assignee (if detected, select from attendees)
  - dueDate: Due date (YYYY-MM-DD format, if detected)
  - priority: Estimated priority ("high", "medium", "low")
- Empty array is acceptable if no clear actions

## Meeting Information
Title: {{meetingTitle}}
Date: {{meetingDate}}
Attendees: {{attendees}}

## Transcript
{{transcript}}

## Important Notes
- Do not include ID fields (id) - they will be generated server-side
- Speaker info only needs id and name
- Times can be estimates (milliseconds starting from 0)
- Treat undetectable information as optional fields`;

/**
 * 議事録生成用ユーザープロンプトを構築
 *
 * @param input - プロンプト生成に必要な入力パラメータ
 * @returns 構築されたユーザープロンプト文字列
 *
 * @example
 * ```typescript
 * const prompt = buildMinutesGenerationPrompt({
 *   transcript: '田中: おはようございます。本日の議題は...',
 *   meetingTitle: '週次定例会議',
 *   meetingDate: '2025-01-22',
 *   attendees: ['田中', '鈴木', '佐藤'],
 *   language: 'ja',
 * });
 * ```
 */
export function buildMinutesGenerationPrompt(input: MinutesGenerationInput): string {
  const {
    transcript,
    meetingTitle,
    meetingDate,
    attendees,
    language = 'ja',
  } = input;

  // 入力値のバリデーション
  if (!transcript || transcript.trim() === '') {
    throw new Error('Transcript is required and cannot be empty');
  }
  if (!meetingTitle || meetingTitle.trim() === '') {
    throw new Error('Meeting title is required and cannot be empty');
  }
  if (!meetingDate || meetingDate.trim() === '') {
    throw new Error('Meeting date is required and cannot be empty');
  }

  const template = language === 'ja' ? USER_PROMPT_TEMPLATE_JA : USER_PROMPT_TEMPLATE_EN;
  const attendeesStr = attendees.length > 0 ? attendees.join(', ') : '(Not specified)';

  return template
    .replace('{{meetingTitle}}', meetingTitle)
    .replace('{{meetingDate}}', meetingDate)
    .replace('{{attendees}}', attendeesStr)
    .replace('{{transcript}}', transcript);
}

// =============================================================================
// Output Schema (Zod)
// =============================================================================

/**
 * AI出力用の発言者スキーマ（IDなし - サーバー側で生成）
 */
export const MinutesOutputSpeakerSchema = z.object({
  /** 発言者名 */
  name: z.string().min(1),
  /** Lark ユーザーID（オプション） */
  larkUserId: z.string().optional(),
});

/**
 * AI出力用の話題セグメントスキーマ（IDなし）
 */
export const MinutesOutputTopicSchema = z.object({
  /** 話題タイトル */
  title: z.string().min(1),
  /** 開始時間（ミリ秒） */
  startTime: z.number().int().nonnegative(),
  /** 終了時間（ミリ秒） */
  endTime: z.number().int().nonnegative(),
  /** 話題の要約 */
  summary: z.string(),
  /** 主要ポイント */
  keyPoints: z.array(z.string()),
  /** 発言者 */
  speakers: z.array(MinutesOutputSpeakerSchema).optional(),
});

/**
 * AI出力用の決定事項スキーマ（IDなし）
 */
export const MinutesOutputDecisionSchema = z.object({
  /** 決定内容 */
  content: z.string().min(1),
  /** 背景・理由 */
  context: z.string(),
  /** 決定時間（ミリ秒） */
  decidedAt: z.number().int().nonnegative(),
});

/**
 * AI出力用のアクションアイテムスキーマ（IDなし）
 */
export const MinutesOutputActionItemSchema = z.object({
  /** タスク内容 */
  content: z.string().min(1),
  /** 担当者（オプション） */
  assignee: MinutesOutputSpeakerSchema.optional(),
  /** 期限（YYYY-MM-DD形式、オプション） */
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** 優先度 */
  priority: z.enum(['high', 'medium', 'low']),
});

/**
 * AI出力用の議事録スキーマ（IDなし - 簡略版）
 *
 * Claude APIからの構造化出力を検証するためのスキーマ。
 * IDフィールドはサーバー側で生成するため、含まれていません。
 *
 * @example
 * ```typescript
 * import { ClaudeClient } from '@/lib/claude';
 *
 * const client = new ClaudeClient(apiKey);
 * const result = await client.generateStructuredOutput(
 *   messages,
 *   minutesOutputSchema,
 *   { system: MINUTES_GENERATION_SYSTEM_PROMPT }
 * );
 * ```
 */
export const minutesOutputSchema = z.object({
  /** 全体要約（3-5文） */
  summary: z.string().min(1),
  /** 話題セグメント */
  topics: z.array(MinutesOutputTopicSchema),
  /** 決定事項 */
  decisions: z.array(MinutesOutputDecisionSchema),
  /** アクションアイテム */
  actionItems: z.array(MinutesOutputActionItemSchema),
  /** 参加者（出力から抽出された場合） */
  attendees: z.array(MinutesOutputSpeakerSchema).optional(),
});

/**
 * AI出力の議事録型
 */
export type MinutesOutput = z.infer<typeof minutesOutputSchema>;

/**
 * AI出力の発言者型
 */
export type MinutesOutputSpeaker = z.infer<typeof MinutesOutputSpeakerSchema>;

/**
 * AI出力の話題セグメント型
 */
export type MinutesOutputTopic = z.infer<typeof MinutesOutputTopicSchema>;

/**
 * AI出力の決定事項型
 */
export type MinutesOutputDecision = z.infer<typeof MinutesOutputDecisionSchema>;

/**
 * AI出力のアクションアイテム型
 */
export type MinutesOutputActionItem = z.infer<typeof MinutesOutputActionItemSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * 議事録生成入力をバリデート
 *
 * @param input - バリデートする入力
 * @returns バリデーション結果
 */
export function validateMinutesGenerationInput(
  input: unknown
): { valid: true; data: MinutesGenerationInput } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (typeof input !== 'object' || input === null) {
    return { valid: false, errors: ['Input must be an object'] };
  }

  const obj = input as Record<string, unknown>;

  if (typeof obj.transcript !== 'string' || obj.transcript.trim() === '') {
    errors.push('transcript is required and must be a non-empty string');
  }

  if (typeof obj.meetingTitle !== 'string' || obj.meetingTitle.trim() === '') {
    errors.push('meetingTitle is required and must be a non-empty string');
  }

  if (typeof obj.meetingDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(obj.meetingDate)) {
    errors.push('meetingDate is required and must be in YYYY-MM-DD format');
  }

  if (!Array.isArray(obj.attendees)) {
    errors.push('attendees must be an array of strings');
  } else {
    const invalidAttendees = obj.attendees.filter(
      (a: unknown) => typeof a !== 'string'
    );
    if (invalidAttendees.length > 0) {
      errors.push('All attendees must be strings');
    }
  }

  if (obj.language !== undefined && obj.language !== 'ja' && obj.language !== 'en') {
    errors.push('language must be "ja" or "en"');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      transcript: obj.transcript as string,
      meetingTitle: obj.meetingTitle as string,
      meetingDate: obj.meetingDate as string,
      attendees: obj.attendees as string[],
      language: (obj.language as OutputLanguage | undefined) ?? 'ja',
    },
  };
}

/**
 * AI出力をバリデート
 *
 * @param output - バリデートする出力
 * @returns Zodのパース結果
 */
export function validateMinutesOutput(
  output: unknown
): ZodSafeParseResult<MinutesOutput> {
  return minutesOutputSchema.safeParse(output);
}
