/**
 * Shared Prompt Templates and Utilities
 *
 * プロンプトテンプレートの共通ユーティリティ
 *
 * @module lib/claude/prompts/templates
 */

// =============================================================================
// Types
// =============================================================================

/**
 * テンプレート変数の型
 */
export type TemplateVariables = Record<string, string | number | boolean | string[]>;

/**
 * プロンプトセクションの型
 */
export interface PromptSection {
  /** セクションのタイトル */
  title: string;
  /** セクションの内容 */
  content: string;
  /** セクションのレベル（マークダウンのヘッダーレベル） */
  level?: 1 | 2 | 3 | 4;
}

/**
 * 構造化プロンプトの型
 */
export interface StructuredPrompt {
  /** プロンプトのセクション配列 */
  sections: PromptSection[];
  /** プレフィックステキスト */
  prefix?: string;
  /** サフィックステキスト */
  suffix?: string;
}

// =============================================================================
// Template Processing
// =============================================================================

/**
 * テンプレート文字列の変数を置換
 *
 * @param template - プレースホルダーを含むテンプレート文字列
 * @param variables - 置換する変数のオブジェクト
 * @param options - 置換オプション
 * @returns 変数が置換された文字列
 *
 * @example
 * ```typescript
 * const result = replaceTemplateVariables(
 *   'Hello, {{name}}! Today is {{date}}.',
 *   { name: 'World', date: '2025-01-22' }
 * );
 * // => 'Hello, World! Today is 2025-01-22.'
 * ```
 */
export function replaceTemplateVariables(
  template: string,
  variables: TemplateVariables,
  options?: {
    /** 配列の区切り文字（デフォルト: ', '） */
    arraySeparator?: string;
    /** 見つからない変数の処理方法 */
    missingVariableHandling?: 'keep' | 'remove' | 'error';
  }
): string {
  const { arraySeparator = ', ', missingVariableHandling = 'keep' } = options ?? {};

  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = variables[key];

    if (value === undefined) {
      switch (missingVariableHandling) {
        case 'remove':
          return '';
        case 'error':
          throw new Error(`Template variable '${key}' is not defined`);
        case 'keep':
        default:
          return match;
      }
    }

    if (Array.isArray(value)) {
      return value.join(arraySeparator);
    }

    return String(value);
  });
}

/**
 * テンプレート文字列から変数名を抽出
 *
 * @param template - テンプレート文字列
 * @returns 変数名の配列
 *
 * @example
 * ```typescript
 * const vars = extractTemplateVariables('Hello, {{name}}! {{greeting}}');
 * // => ['name', 'greeting']
 * ```
 */
export function extractTemplateVariables(template: string): string[] {
  const variables = new Set<string>();
  const regex = /\{\{(\w+)\}\}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template)) !== null) {
    const varName = match[1];
    if (varName !== undefined && varName !== '') {
      variables.add(varName);
    }
  }

  return Array.from(variables);
}

/**
 * テンプレートの必須変数が全て提供されているか確認
 *
 * @param template - テンプレート文字列
 * @param variables - 提供された変数
 * @returns 検証結果
 */
export function validateTemplateVariables(
  template: string,
  variables: TemplateVariables
): { valid: true } | { valid: false; missingVariables: string[] } {
  const required = extractTemplateVariables(template);
  const provided = new Set(Object.keys(variables));
  const missing = required.filter((v) => !provided.has(v));

  if (missing.length > 0) {
    return { valid: false, missingVariables: missing };
  }

  return { valid: true };
}

// =============================================================================
// Structured Prompt Building
// =============================================================================

/**
 * セクションをマークダウン形式でフォーマット
 *
 * @param section - プロンプトセクション
 * @returns フォーマットされた文字列
 */
function formatSection(section: PromptSection): string {
  const level = section.level ?? 2;
  const header = '#'.repeat(level);
  return `${header} ${section.title}\n${section.content}`;
}

/**
 * 構造化プロンプトを構築
 *
 * @param prompt - 構造化プロンプト定義
 * @returns 構築されたプロンプト文字列
 *
 * @example
 * ```typescript
 * const prompt = buildStructuredPrompt({
 *   prefix: 'You are an assistant.',
 *   sections: [
 *     { title: 'Task', content: 'Do something', level: 2 },
 *     { title: 'Requirements', content: '- Item 1\n- Item 2', level: 2 },
 *   ],
 *   suffix: 'Begin now.',
 * });
 * ```
 */
export function buildStructuredPrompt(prompt: StructuredPrompt): string {
  const parts: string[] = [];

  if (prompt.prefix !== undefined && prompt.prefix !== '') {
    parts.push(prompt.prefix);
  }

  for (const section of prompt.sections) {
    parts.push(formatSection(section));
  }

  if (prompt.suffix !== undefined && prompt.suffix !== '') {
    parts.push(prompt.suffix);
  }

  return parts.join('\n\n');
}

// =============================================================================
// Common Templates
// =============================================================================

/**
 * JSON出力指示テンプレート（日本語）
 */
export const JSON_OUTPUT_INSTRUCTION_JA = `## 出力形式

- 必ずJSON形式で出力してください
- マークダウンのコードブロック(\`\`\`)は使用しないでください
- 説明文は含めず、JSONオブジェクトのみを出力してください`;

/**
 * JSON出力指示テンプレート（英語）
 */
export const JSON_OUTPUT_INSTRUCTION_EN = `## Output Format

- Always output in JSON format
- Do not use markdown code blocks (\`\`\`)
- Output only the JSON object without explanations`;

/**
 * 日本語会議用の共通指示
 */
export const JAPANESE_MEETING_INSTRUCTION = `## 日本語会議の処理指針

- 敬語や丁寧語を適切に処理してください
- 日本特有の会議文化（挨拶、確認、合意形成）を考慮してください
- 曖昧な表現（「検討します」「前向きに」等）の解釈に注意してください
- 「よろしくお願いします」等の定型句は要約から除外してください`;

/**
 * 言語に応じたJSON出力指示を取得
 *
 * @param language - 言語コード
 * @returns JSON出力指示文字列
 */
export function getJsonOutputInstruction(language: 'ja' | 'en'): string {
  return language === 'ja' ? JSON_OUTPUT_INSTRUCTION_JA : JSON_OUTPUT_INSTRUCTION_EN;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * テキストを指定した長さでトリム（省略記号付き）
 *
 * @param text - トリムするテキスト
 * @param maxLength - 最大長
 * @param ellipsis - 省略記号（デフォルト: '...'）
 * @returns トリムされたテキスト
 */
export function trimText(text: string, maxLength: number, ellipsis: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * 配列をフォーマットされたリストに変換
 *
 * @param items - リストアイテム
 * @param options - フォーマットオプション
 * @returns フォーマットされたリスト文字列
 */
export function formatList(
  items: string[],
  options?: {
    /** リストの種類（デフォルト: 'bullet'） */
    type?: 'bullet' | 'numbered' | 'inline';
    /** インライン時の区切り文字 */
    separator?: string;
  }
): string {
  const { type = 'bullet', separator = ', ' } = options ?? {};

  if (items.length === 0) {
    return '';
  }

  switch (type) {
    case 'numbered':
      return items.map((item, i) => `${i + 1}. ${item}`).join('\n');
    case 'inline':
      return items.join(separator);
    case 'bullet':
    default:
      return items.map((item) => `- ${item}`).join('\n');
  }
}

/**
 * プロンプトのトークン数を概算（簡易版）
 *
 * 正確なトークン数ではなく、概算値を返します。
 * 日本語は1文字あたり約1.5トークン、英語は1単語あたり約1.3トークンとして計算。
 *
 * @param text - テキスト
 * @returns 概算トークン数
 */
export function estimateTokenCount(text: string): number {
  // 日本語文字（ひらがな、カタカナ、漢字）をカウント
  const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g) || []).length;

  // 英語単語をカウント
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;

  // その他の文字（数字、記号等）
  const otherChars = text.length - japaneseChars - (text.match(/[a-zA-Z]+/g) || []).join('').length;

  // 概算: 日本語1文字=1.5トークン、英語1単語=1.3トークン、その他=0.5トークン
  return Math.ceil(japaneseChars * 1.5 + englishWords * 1.3 + otherChars * 0.5);
}

/**
 * 文字起こしテキストを指定トークン数以内に分割
 *
 * @param transcript - 文字起こしテキスト
 * @param maxTokens - 最大トークン数
 * @returns 分割されたテキストの配列
 */
export function splitTranscriptByTokens(transcript: string, maxTokens: number): string[] {
  const lines = transcript.split('\n');
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const line of lines) {
    const lineTokens = estimateTokenCount(line);

    if (currentTokens + lineTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'));
      currentChunk = [];
      currentTokens = 0;
    }

    currentChunk.push(line);
    currentTokens += lineTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n'));
  }

  return chunks;
}

/**
 * 日付文字列をフォーマット
 *
 * @param date - Date オブジェクトまたは日付文字列
 * @param format - フォーマット形式
 * @returns フォーマットされた日付文字列
 */
export function formatDate(
  date: Date | string,
  format: 'iso' | 'japanese' | 'english' = 'iso'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }

  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  switch (format) {
    case 'japanese':
      return `${year}年${month}月${day}日`;
    case 'english':
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    case 'iso':
    default:
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
}
