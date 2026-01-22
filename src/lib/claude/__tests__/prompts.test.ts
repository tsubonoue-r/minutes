/**
 * Prompt Templates Tests
 *
 * 議事録生成プロンプトテンプレートのテスト
 */

import { describe, it, expect } from 'vitest';

// Minutes Generation
import {
  MINUTES_GENERATION_SYSTEM_PROMPT,
  getSystemPrompt,
  buildMinutesGenerationPrompt,
  minutesOutputSchema,
  MinutesOutputSpeakerSchema,
  MinutesOutputTopicSchema,
  MinutesOutputDecisionSchema,
  MinutesOutputActionItemSchema,
  validateMinutesGenerationInput,
  validateMinutesOutput,
  type MinutesGenerationInput,
} from '../prompts/minutes-generation.js';

// Templates
import {
  replaceTemplateVariables,
  extractTemplateVariables,
  validateTemplateVariables,
  buildStructuredPrompt,
  JSON_OUTPUT_INSTRUCTION_JA,
  JSON_OUTPUT_INSTRUCTION_EN,
  JAPANESE_MEETING_INSTRUCTION,
  getJsonOutputInstruction,
  trimText,
  formatList,
  estimateTokenCount,
  splitTranscriptByTokens,
  formatDate,
  type TemplateVariables,
  type StructuredPrompt,
} from '../prompts/templates.js';

// =============================================================================
// Minutes Generation Tests
// =============================================================================

describe('Minutes Generation Prompts', () => {
  describe('MINUTES_GENERATION_SYSTEM_PROMPT', () => {
    it('should be a non-empty string', () => {
      expect(MINUTES_GENERATION_SYSTEM_PROMPT).toBeDefined();
      expect(typeof MINUTES_GENERATION_SYSTEM_PROMPT).toBe('string');
      expect(MINUTES_GENERATION_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });

    it('should contain key instructions', () => {
      expect(MINUTES_GENERATION_SYSTEM_PROMPT).toContain('議事録');
      expect(MINUTES_GENERATION_SYSTEM_PROMPT).toContain('JSON');
    });
  });

  describe('getSystemPrompt', () => {
    it('should return Japanese prompt by default', () => {
      const prompt = getSystemPrompt();
      expect(prompt).toContain('議事録');
    });

    it('should return Japanese prompt when ja is specified', () => {
      const prompt = getSystemPrompt('ja');
      expect(prompt).toContain('議事録');
      expect(prompt).toContain('JSON形式');
    });

    it('should return English prompt when en is specified', () => {
      const prompt = getSystemPrompt('en');
      expect(prompt).toContain('meeting minutes');
      expect(prompt).toContain('JSON');
    });
  });

  describe('buildMinutesGenerationPrompt', () => {
    const validInput: MinutesGenerationInput = {
      transcript: '田中: おはようございます。本日の議題について説明します。',
      meetingTitle: '週次定例会議',
      meetingDate: '2025-01-22',
      attendees: ['田中', '鈴木', '佐藤'],
      language: 'ja',
    };

    it('should build prompt with all required fields', () => {
      const prompt = buildMinutesGenerationPrompt(validInput);

      expect(prompt).toContain('週次定例会議');
      expect(prompt).toContain('2025-01-22');
      expect(prompt).toContain('田中, 鈴木, 佐藤');
      expect(prompt).toContain('田中: おはようございます');
    });

    it('should use Japanese template by default', () => {
      const input: Omit<MinutesGenerationInput, 'language'> = {
        transcript: validInput.transcript,
        meetingTitle: validInput.meetingTitle,
        meetingDate: validInput.meetingDate,
        attendees: validInput.attendees,
      };
      const prompt = buildMinutesGenerationPrompt(input);

      expect(prompt).toContain('出力要件');
      expect(prompt).toContain('全体要約');
      expect(prompt).toContain('話題セグメント');
    });

    it('should use English template when specified', () => {
      const input: MinutesGenerationInput = {
        ...validInput,
        language: 'en',
      };
      const prompt = buildMinutesGenerationPrompt(input);

      expect(prompt).toContain('Output Requirements');
      expect(prompt).toContain('Overall Summary');
      expect(prompt).toContain('Topic Segments');
    });

    it('should handle empty attendees array', () => {
      const input: MinutesGenerationInput = {
        ...validInput,
        attendees: [],
      };
      const prompt = buildMinutesGenerationPrompt(input);

      expect(prompt).toContain('(Not specified)');
    });

    it('should throw error for empty transcript', () => {
      const input: MinutesGenerationInput = {
        ...validInput,
        transcript: '',
      };

      expect(() => buildMinutesGenerationPrompt(input)).toThrow(
        'Transcript is required and cannot be empty'
      );
    });

    it('should throw error for whitespace-only transcript', () => {
      const input: MinutesGenerationInput = {
        ...validInput,
        transcript: '   ',
      };

      expect(() => buildMinutesGenerationPrompt(input)).toThrow(
        'Transcript is required and cannot be empty'
      );
    });

    it('should throw error for empty meeting title', () => {
      const input: MinutesGenerationInput = {
        ...validInput,
        meetingTitle: '',
      };

      expect(() => buildMinutesGenerationPrompt(input)).toThrow(
        'Meeting title is required and cannot be empty'
      );
    });

    it('should throw error for empty meeting date', () => {
      const input: MinutesGenerationInput = {
        ...validInput,
        meetingDate: '',
      };

      expect(() => buildMinutesGenerationPrompt(input)).toThrow(
        'Meeting date is required and cannot be empty'
      );
    });

    it('should include decision extraction keywords', () => {
      const prompt = buildMinutesGenerationPrompt(validInput);

      expect(prompt).toMatch(/決定|承認|合意/);
    });

    it('should include action item extraction keywords', () => {
      const prompt = buildMinutesGenerationPrompt(validInput);

      expect(prompt).toMatch(/やる|対応|確認|作成/);
    });

    it('should contain schema field descriptions', () => {
      const prompt = buildMinutesGenerationPrompt(validInput);

      expect(prompt).toContain('summary');
      expect(prompt).toContain('topics');
      expect(prompt).toContain('decisions');
      expect(prompt).toContain('actionItems');
    });
  });

  describe('validateMinutesGenerationInput', () => {
    it('should validate valid input', () => {
      const input = {
        transcript: 'Test transcript',
        meetingTitle: 'Test Meeting',
        meetingDate: '2025-01-22',
        attendees: ['Person 1', 'Person 2'],
      };

      const result = validateMinutesGenerationInput(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.transcript).toBe('Test transcript');
        expect(result.data.language).toBe('ja'); // default
      }
    });

    it('should validate input with optional language', () => {
      const input = {
        transcript: 'Test transcript',
        meetingTitle: 'Test Meeting',
        meetingDate: '2025-01-22',
        attendees: [],
        language: 'en',
      };

      const result = validateMinutesGenerationInput(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.language).toBe('en');
      }
    });

    it('should reject non-object input', () => {
      const result = validateMinutesGenerationInput('not an object');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('Input must be an object');
      }
    });

    it('should reject null input', () => {
      const result = validateMinutesGenerationInput(null);

      expect(result.valid).toBe(false);
    });

    it('should reject missing transcript', () => {
      const input = {
        meetingTitle: 'Test Meeting',
        meetingDate: '2025-01-22',
        attendees: [],
      };

      const result = validateMinutesGenerationInput(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.includes('transcript'))).toBe(true);
      }
    });

    it('should reject invalid date format', () => {
      const input = {
        transcript: 'Test',
        meetingTitle: 'Test Meeting',
        meetingDate: 'January 22, 2025',
        attendees: [],
      };

      const result = validateMinutesGenerationInput(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.includes('meetingDate'))).toBe(true);
      }
    });

    it('should reject invalid language', () => {
      const input = {
        transcript: 'Test',
        meetingTitle: 'Test Meeting',
        meetingDate: '2025-01-22',
        attendees: [],
        language: 'fr',
      };

      const result = validateMinutesGenerationInput(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.includes('language'))).toBe(true);
      }
    });

    it('should reject non-string attendees', () => {
      const input = {
        transcript: 'Test',
        meetingTitle: 'Test Meeting',
        meetingDate: '2025-01-22',
        attendees: [1, 2, 3],
      };

      const result = validateMinutesGenerationInput(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some((e) => e.includes('attendees'))).toBe(true);
      }
    });
  });
});

// =============================================================================
// Output Schema Tests
// =============================================================================

describe('Output Schema', () => {
  describe('MinutesOutputSpeakerSchema', () => {
    it('should validate valid speaker', () => {
      const speaker = { name: 'John Doe' };
      const result = MinutesOutputSpeakerSchema.safeParse(speaker);

      expect(result.success).toBe(true);
    });

    it('should validate speaker with larkUserId', () => {
      const speaker = { name: 'John Doe', larkUserId: 'user123' };
      const result = MinutesOutputSpeakerSchema.safeParse(speaker);

      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const speaker = { name: '' };
      const result = MinutesOutputSpeakerSchema.safeParse(speaker);

      expect(result.success).toBe(false);
    });
  });

  describe('MinutesOutputTopicSchema', () => {
    it('should validate valid topic', () => {
      const topic = {
        title: 'Budget Discussion',
        startTime: 0,
        endTime: 300000,
        summary: 'Discussed Q1 budget',
        keyPoints: ['Point 1', 'Point 2'],
      };
      const result = MinutesOutputTopicSchema.safeParse(topic);

      expect(result.success).toBe(true);
    });

    it('should validate topic with speakers', () => {
      const topic = {
        title: 'Budget Discussion',
        startTime: 0,
        endTime: 300000,
        summary: 'Discussed Q1 budget',
        keyPoints: [],
        speakers: [{ name: 'John' }],
      };
      const result = MinutesOutputTopicSchema.safeParse(topic);

      expect(result.success).toBe(true);
    });

    it('should reject negative startTime', () => {
      const topic = {
        title: 'Topic',
        startTime: -1,
        endTime: 100,
        summary: '',
        keyPoints: [],
      };
      const result = MinutesOutputTopicSchema.safeParse(topic);

      expect(result.success).toBe(false);
    });
  });

  describe('MinutesOutputDecisionSchema', () => {
    it('should validate valid decision', () => {
      const decision = {
        content: 'Approved budget increase',
        context: 'Based on Q4 performance',
        decidedAt: 150000,
      };
      const result = MinutesOutputDecisionSchema.safeParse(decision);

      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const decision = {
        content: '',
        context: 'Some context',
        decidedAt: 0,
      };
      const result = MinutesOutputDecisionSchema.safeParse(decision);

      expect(result.success).toBe(false);
    });
  });

  describe('MinutesOutputActionItemSchema', () => {
    it('should validate valid action item', () => {
      const item = {
        content: 'Review document',
        priority: 'high',
      };
      const result = MinutesOutputActionItemSchema.safeParse(item);

      expect(result.success).toBe(true);
    });

    it('should validate action item with all optional fields', () => {
      const item = {
        content: 'Review document',
        assignee: { name: 'John' },
        dueDate: '2025-01-30',
        priority: 'medium',
      };
      const result = MinutesOutputActionItemSchema.safeParse(item);

      expect(result.success).toBe(true);
    });

    it('should reject invalid priority', () => {
      const item = {
        content: 'Task',
        priority: 'urgent',
      };
      const result = MinutesOutputActionItemSchema.safeParse(item);

      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const item = {
        content: 'Task',
        dueDate: 'Jan 30, 2025',
        priority: 'low',
      };
      const result = MinutesOutputActionItemSchema.safeParse(item);

      expect(result.success).toBe(false);
    });
  });

  describe('minutesOutputSchema', () => {
    it('should validate complete valid output', () => {
      const output = {
        summary: 'Meeting covered budget and timeline',
        topics: [
          {
            title: 'Budget',
            startTime: 0,
            endTime: 300000,
            summary: 'Budget discussion',
            keyPoints: ['Increase approved'],
          },
        ],
        decisions: [
          {
            content: 'Budget approved',
            context: 'After review',
            decidedAt: 250000,
          },
        ],
        actionItems: [
          {
            content: 'Update documents',
            priority: 'high',
          },
        ],
      };
      const result = minutesOutputSchema.safeParse(output);

      expect(result.success).toBe(true);
    });

    it('should validate output with empty arrays', () => {
      const output = {
        summary: 'Brief meeting',
        topics: [],
        decisions: [],
        actionItems: [],
      };
      const result = minutesOutputSchema.safeParse(output);

      expect(result.success).toBe(true);
    });

    it('should validate output with optional attendees', () => {
      const output = {
        summary: 'Meeting summary',
        topics: [],
        decisions: [],
        actionItems: [],
        attendees: [{ name: 'John' }, { name: 'Jane' }],
      };
      const result = minutesOutputSchema.safeParse(output);

      expect(result.success).toBe(true);
    });

    it('should reject empty summary', () => {
      const output = {
        summary: '',
        topics: [],
        decisions: [],
        actionItems: [],
      };
      const result = minutesOutputSchema.safeParse(output);

      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const output = {
        summary: 'Summary only',
      };
      const result = minutesOutputSchema.safeParse(output);

      expect(result.success).toBe(false);
    });
  });

  describe('validateMinutesOutput', () => {
    it('should return success for valid output', () => {
      const output = {
        summary: 'Test summary',
        topics: [],
        decisions: [],
        actionItems: [],
      };
      const result = validateMinutesOutput(output);

      expect(result.success).toBe(true);
    });

    it('should return error for invalid output', () => {
      const output = { invalid: 'data' };
      const result = validateMinutesOutput(output);

      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// Template Utilities Tests
// =============================================================================

describe('Template Utilities', () => {
  describe('replaceTemplateVariables', () => {
    it('should replace simple variables', () => {
      const template = 'Hello, {{name}}!';
      const variables: TemplateVariables = { name: 'World' };
      const result = replaceTemplateVariables(template, variables);

      expect(result).toBe('Hello, World!');
    });

    it('should replace multiple variables', () => {
      const template = '{{greeting}}, {{name}}! Today is {{day}}.';
      const variables: TemplateVariables = {
        greeting: 'Hello',
        name: 'John',
        day: 'Monday',
      };
      const result = replaceTemplateVariables(template, variables);

      expect(result).toBe('Hello, John! Today is Monday.');
    });

    it('should handle array variables', () => {
      const template = 'Attendees: {{attendees}}';
      const variables: TemplateVariables = {
        attendees: ['Alice', 'Bob', 'Charlie'],
      };
      const result = replaceTemplateVariables(template, variables);

      expect(result).toBe('Attendees: Alice, Bob, Charlie');
    });

    it('should use custom array separator', () => {
      const template = 'Items: {{items}}';
      const variables: TemplateVariables = { items: ['A', 'B', 'C'] };
      const result = replaceTemplateVariables(template, variables, {
        arraySeparator: ' | ',
      });

      expect(result).toBe('Items: A | B | C');
    });

    it('should keep missing variables by default', () => {
      const template = 'Hello, {{name}}! Your role is {{role}}.';
      const variables: TemplateVariables = { name: 'John' };
      const result = replaceTemplateVariables(template, variables);

      expect(result).toBe('Hello, John! Your role is {{role}}.');
    });

    it('should remove missing variables when option is set', () => {
      const template = 'Hello, {{name}}! Your role is {{role}}.';
      const variables: TemplateVariables = { name: 'John' };
      const result = replaceTemplateVariables(template, variables, {
        missingVariableHandling: 'remove',
      });

      expect(result).toBe('Hello, John! Your role is .');
    });

    it('should throw error for missing variables when option is set', () => {
      const template = 'Hello, {{name}}! Your role is {{role}}.';
      const variables: TemplateVariables = { name: 'John' };

      expect(() =>
        replaceTemplateVariables(template, variables, {
          missingVariableHandling: 'error',
        })
      ).toThrow("Template variable 'role' is not defined");
    });

    it('should handle number variables', () => {
      const template = 'Count: {{count}}';
      const variables: TemplateVariables = { count: 42 };
      const result = replaceTemplateVariables(template, variables);

      expect(result).toBe('Count: 42');
    });

    it('should handle boolean variables', () => {
      const template = 'Active: {{active}}';
      const variables: TemplateVariables = { active: true };
      const result = replaceTemplateVariables(template, variables);

      expect(result).toBe('Active: true');
    });
  });

  describe('extractTemplateVariables', () => {
    it('should extract single variable', () => {
      const template = 'Hello, {{name}}!';
      const variables = extractTemplateVariables(template);

      expect(variables).toEqual(['name']);
    });

    it('should extract multiple variables', () => {
      const template = '{{greeting}}, {{name}}! Today is {{day}}.';
      const variables = extractTemplateVariables(template);

      expect(variables).toContain('greeting');
      expect(variables).toContain('name');
      expect(variables).toContain('day');
      expect(variables).toHaveLength(3);
    });

    it('should return unique variables only', () => {
      const template = '{{name}} said to {{name}}: Hello {{name}}!';
      const variables = extractTemplateVariables(template);

      expect(variables).toEqual(['name']);
    });

    it('should return empty array for no variables', () => {
      const template = 'No variables here!';
      const variables = extractTemplateVariables(template);

      expect(variables).toEqual([]);
    });
  });

  describe('validateTemplateVariables', () => {
    it('should return valid for all variables provided', () => {
      const template = '{{a}} and {{b}}';
      const variables: TemplateVariables = { a: '1', b: '2' };
      const result = validateTemplateVariables(template, variables);

      expect(result.valid).toBe(true);
    });

    it('should return missing variables when some are not provided', () => {
      const template = '{{a}}, {{b}}, {{c}}';
      const variables: TemplateVariables = { a: '1' };
      const result = validateTemplateVariables(template, variables);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.missingVariables).toContain('b');
        expect(result.missingVariables).toContain('c');
      }
    });

    it('should allow extra variables', () => {
      const template = '{{a}}';
      const variables: TemplateVariables = { a: '1', b: '2', c: '3' };
      const result = validateTemplateVariables(template, variables);

      expect(result.valid).toBe(true);
    });
  });

  describe('buildStructuredPrompt', () => {
    it('should build prompt with sections only', () => {
      const prompt: StructuredPrompt = {
        sections: [
          { title: 'Task', content: 'Do something' },
          { title: 'Requirements', content: 'Be careful' },
        ],
      };
      const result = buildStructuredPrompt(prompt);

      expect(result).toContain('## Task');
      expect(result).toContain('Do something');
      expect(result).toContain('## Requirements');
      expect(result).toContain('Be careful');
    });

    it('should include prefix when provided', () => {
      const prompt: StructuredPrompt = {
        prefix: 'You are an assistant.',
        sections: [{ title: 'Task', content: 'Help me' }],
      };
      const result = buildStructuredPrompt(prompt);

      expect(result).toMatch(/^You are an assistant\./);
    });

    it('should include suffix when provided', () => {
      const prompt: StructuredPrompt = {
        sections: [{ title: 'Task', content: 'Help me' }],
        suffix: 'Begin now.',
      };
      const result = buildStructuredPrompt(prompt);

      expect(result).toMatch(/Begin now\.$/);
    });

    it('should respect section levels', () => {
      const prompt: StructuredPrompt = {
        sections: [
          { title: 'Main', content: 'Main content', level: 1 },
          { title: 'Sub', content: 'Sub content', level: 3 },
        ],
      };
      const result = buildStructuredPrompt(prompt);

      expect(result).toContain('# Main');
      expect(result).toContain('### Sub');
    });
  });

  describe('Common Templates', () => {
    it('JSON_OUTPUT_INSTRUCTION_JA should contain Japanese instructions', () => {
      expect(JSON_OUTPUT_INSTRUCTION_JA).toContain('JSON');
      expect(JSON_OUTPUT_INSTRUCTION_JA).toContain('形式');
    });

    it('JSON_OUTPUT_INSTRUCTION_EN should contain English instructions', () => {
      expect(JSON_OUTPUT_INSTRUCTION_EN).toContain('JSON');
      expect(JSON_OUTPUT_INSTRUCTION_EN).toContain('format');
    });

    it('JAPANESE_MEETING_INSTRUCTION should contain Japanese meeting guidance', () => {
      expect(JAPANESE_MEETING_INSTRUCTION).toContain('日本語');
      expect(JAPANESE_MEETING_INSTRUCTION).toContain('敬語');
    });

    it('getJsonOutputInstruction should return correct instruction', () => {
      expect(getJsonOutputInstruction('ja')).toBe(JSON_OUTPUT_INSTRUCTION_JA);
      expect(getJsonOutputInstruction('en')).toBe(JSON_OUTPUT_INSTRUCTION_EN);
    });
  });

  describe('trimText', () => {
    it('should return text unchanged if under maxLength', () => {
      const result = trimText('Hello', 10);
      expect(result).toBe('Hello');
    });

    it('should trim text and add ellipsis', () => {
      const result = trimText('Hello World', 8);
      expect(result).toBe('Hello...');
    });

    it('should use custom ellipsis', () => {
      const result = trimText('Hello World', 9, '...(more)');
      expect(result).toBe('...(more)');
    });

    it('should handle exact length', () => {
      const result = trimText('Hello', 5);
      expect(result).toBe('Hello');
    });
  });

  describe('formatList', () => {
    it('should format as bullet list by default', () => {
      const result = formatList(['Item 1', 'Item 2']);
      expect(result).toBe('- Item 1\n- Item 2');
    });

    it('should format as numbered list', () => {
      const result = formatList(['First', 'Second', 'Third'], { type: 'numbered' });
      expect(result).toBe('1. First\n2. Second\n3. Third');
    });

    it('should format as inline list', () => {
      const result = formatList(['A', 'B', 'C'], { type: 'inline' });
      expect(result).toBe('A, B, C');
    });

    it('should use custom separator for inline', () => {
      const result = formatList(['A', 'B', 'C'], { type: 'inline', separator: ' | ' });
      expect(result).toBe('A | B | C');
    });

    it('should return empty string for empty array', () => {
      const result = formatList([]);
      expect(result).toBe('');
    });
  });

  describe('estimateTokenCount', () => {
    it('should estimate tokens for Japanese text', () => {
      const text = 'こんにちは世界';
      const count = estimateTokenCount(text);
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(20);
    });

    it('should estimate tokens for English text', () => {
      const text = 'Hello world how are you';
      const count = estimateTokenCount(text);
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(20);
    });

    it('should estimate tokens for mixed text', () => {
      const text = 'Hello, 世界! This is a test テスト.';
      const count = estimateTokenCount(text);
      expect(count).toBeGreaterThan(0);
    });

    it('should return 0 for empty text', () => {
      const count = estimateTokenCount('');
      expect(count).toBe(0);
    });
  });

  describe('splitTranscriptByTokens', () => {
    it('should not split short transcript', () => {
      const transcript = 'Line 1\nLine 2\nLine 3';
      const chunks = splitTranscriptByTokens(transcript, 1000);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(transcript);
    });

    it('should split long transcript', () => {
      const lines = Array(100).fill('This is a test line with some content.').join('\n');
      const chunks = splitTranscriptByTokens(lines, 50);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should preserve line breaks in chunks', () => {
      const transcript = 'Line 1\nLine 2\nLine 3';
      const chunks = splitTranscriptByTokens(transcript, 1000);
      expect(chunks[0]).toContain('\n');
    });
  });

  describe('formatDate', () => {
    it('should format date in ISO format by default', () => {
      const result = formatDate(new Date('2025-01-22'));
      expect(result).toBe('2025-01-22');
    });

    it('should format date in Japanese format', () => {
      const result = formatDate('2025-01-22', 'japanese');
      expect(result).toBe('2025年1月22日');
    });

    it('should format date in English format', () => {
      const result = formatDate('2025-01-22', 'english');
      expect(result).toContain('January');
      expect(result).toContain('22');
      expect(result).toContain('2025');
    });

    it('should accept Date object', () => {
      const date = new Date('2025-03-15');
      const result = formatDate(date, 'iso');
      expect(result).toBe('2025-03-15');
    });

    it('should throw error for invalid date', () => {
      expect(() => formatDate('invalid-date')).toThrow('Invalid date');
    });
  });
});
