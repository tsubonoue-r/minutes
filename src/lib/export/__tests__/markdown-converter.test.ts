/**
 * Unit tests for markdown-converter
 * @module lib/export/__tests__/markdown-converter.test
 */

import { describe, it, expect } from 'vitest';
import type {
  Minutes,
  TopicSegment,
  DecisionItem,
  ActionItem,
  Speaker,
} from '@/types/minutes';
import {
  convertMinutesToMarkdown,
  formatTopicsSection,
  formatDecisionsSection,
  formatActionItemsTable,
  formatAttendeesList,
  escapeMarkdown,
  createMarkdownTable,
} from '../markdown-converter';
import { getLabels, applyTemplate } from '../templates';

// ============================================================================
// Test Fixtures
// ============================================================================

const createTestSpeaker = (id: string, name: string): Speaker => ({
  id,
  name,
});

const createTestTopic = (
  id: string,
  title: string,
  summary: string,
  keyPoints: string[]
): TopicSegment => ({
  id,
  title,
  startTime: 0,
  endTime: 600000, // 10 minutes
  summary,
  keyPoints,
  speakers: [createTestSpeaker('s1', 'Speaker 1')],
});

const createTestDecision = (id: string, content: string): DecisionItem => ({
  id,
  content,
  context: 'Test context',
  decidedAt: 300000,
});

const createTestActionItem = (
  id: string,
  content: string,
  assignee?: Speaker,
  dueDate?: string
): ActionItem => ({
  id,
  content,
  assignee,
  dueDate,
  priority: 'medium',
  status: 'pending',
});

const createTestMinutes = (): Minutes => ({
  id: 'min_test_001',
  meetingId: 'meeting_001',
  title: '週次定例会議',
  date: '2025-01-22',
  duration: 3600000, // 1 hour
  summary: 'プロジェクト進捗の確認と今後の計画について議論した。',
  topics: [
    createTestTopic(
      'topic_1',
      'プロジェクト進捗報告',
      'プロジェクトは予定通り進行中',
      ['フロントエンド開発は80%完了', 'バックエンドAPIは90%完了']
    ),
    createTestTopic(
      'topic_2',
      '今後のスケジュール',
      'リリース日程について確認',
      ['1月30日にリリース予定', 'テスト期間を1週間設ける']
    ),
  ],
  decisions: [
    createTestDecision('dec_1', 'リリース日を1月30日に確定'),
    createTestDecision('dec_2', 'テスト期間を1週間延長'),
  ],
  actionItems: [
    createTestActionItem(
      'action_1',
      'UIレビュー完了',
      createTestSpeaker('s1', '田中太郎'),
      '2025-01-25'
    ),
    createTestActionItem(
      'action_2',
      'ドキュメント更新',
      createTestSpeaker('s2', '鈴木花子'),
      '2025-01-24'
    ),
    createTestActionItem('action_3', '未割当タスク'),
  ],
  attendees: [
    createTestSpeaker('s1', '田中太郎'),
    createTestSpeaker('s2', '鈴木花子'),
    createTestSpeaker('s3', '佐藤一郎'),
  ],
  metadata: {
    generatedAt: '2025-01-22T10:00:00.000Z',
    model: 'claude-sonnet-4-20250514',
    processingTimeMs: 1234,
    confidence: 0.95,
  },
});

// ============================================================================
// formatAttendeesList Tests
// ============================================================================

describe('formatAttendeesList', () => {
  it('should return comma-separated names', () => {
    const attendees = [
      createTestSpeaker('s1', '田中太郎'),
      createTestSpeaker('s2', '鈴木花子'),
      createTestSpeaker('s3', '佐藤一郎'),
    ];

    const result = formatAttendeesList(attendees);

    expect(result).toBe('田中太郎, 鈴木花子, 佐藤一郎');
  });

  it('should return single name without comma', () => {
    const attendees = [createTestSpeaker('s1', '田中太郎')];

    const result = formatAttendeesList(attendees);

    expect(result).toBe('田中太郎');
  });

  it('should return empty string for empty array', () => {
    const result = formatAttendeesList([]);

    expect(result).toBe('');
  });
});

// ============================================================================
// formatTopicsSection Tests
// ============================================================================

describe('formatTopicsSection', () => {
  it('should format topics with numbered headers', () => {
    const topics = [
      createTestTopic('t1', 'First Topic', 'Summary 1', ['Point A', 'Point B']),
      createTestTopic('t2', 'Second Topic', 'Summary 2', ['Point C']),
    ];
    const labels = getLabels('ja');

    const result = formatTopicsSection(topics, labels);

    expect(result).toContain('### 1. First Topic');
    expect(result).toContain('### 2. Second Topic');
    expect(result).toContain('**要約**: Summary 1');
    expect(result).toContain('**主要ポイント**:');
    expect(result).toContain('- Point A');
    expect(result).toContain('- Point B');
  });

  it('should use default Japanese labels when not provided', () => {
    const topics = [createTestTopic('t1', 'Topic', 'Summary', ['Point'])];

    const result = formatTopicsSection(topics);

    expect(result).toContain('**要約**:');
    expect(result).toContain('**主要ポイント**:');
  });

  it('should use English labels when provided', () => {
    const topics = [createTestTopic('t1', 'Topic', 'Summary', ['Point'])];
    const labels = getLabels('en');

    const result = formatTopicsSection(topics, labels);

    expect(result).toContain('**Summary**:');
    expect(result).toContain('**Key Points**:');
  });

  it('should return empty string for empty topics', () => {
    const result = formatTopicsSection([]);

    expect(result).toBe('');
  });

  it('should handle topic without summary', () => {
    const topics: TopicSegment[] = [{
      id: 't1',
      title: 'No Summary Topic',
      startTime: 0,
      endTime: 600000,
      summary: '',
      keyPoints: ['Point A'],
      speakers: [],
    }];

    const result = formatTopicsSection(topics);

    expect(result).toContain('### 1. No Summary Topic');
    expect(result).not.toContain('**要約**:');
    expect(result).toContain('- Point A');
  });

  it('should handle topic without key points', () => {
    const topics: TopicSegment[] = [{
      id: 't1',
      title: 'No Points Topic',
      startTime: 0,
      endTime: 600000,
      summary: 'Has summary',
      keyPoints: [],
      speakers: [],
    }];

    const result = formatTopicsSection(topics);

    expect(result).toContain('**要約**: Has summary');
    expect(result).not.toContain('**主要ポイント**:');
  });
});

// ============================================================================
// formatDecisionsSection Tests
// ============================================================================

describe('formatDecisionsSection', () => {
  it('should format decisions as numbered list', () => {
    const decisions = [
      createTestDecision('d1', 'First decision'),
      createTestDecision('d2', 'Second decision'),
      createTestDecision('d3', 'Third decision'),
    ];

    const result = formatDecisionsSection(decisions);

    expect(result).toBe(
      '1. First decision\n2. Second decision\n3. Third decision'
    );
  });

  it('should return empty string for empty decisions', () => {
    const result = formatDecisionsSection([]);

    expect(result).toBe('');
  });

  it('should handle single decision', () => {
    const decisions = [createTestDecision('d1', 'Only decision')];

    const result = formatDecisionsSection(decisions);

    expect(result).toBe('1. Only decision');
  });
});

// ============================================================================
// formatActionItemsTable Tests
// ============================================================================

describe('formatActionItemsTable', () => {
  it('should format action items as table rows', () => {
    const items = [
      createTestActionItem('a1', 'Task 1', createTestSpeaker('s1', '田中'), '2025-01-25'),
      createTestActionItem('a2', 'Task 2', createTestSpeaker('s2', '鈴木'), '2025-01-26'),
    ];
    const labels = getLabels('ja');

    const result = formatActionItemsTable(items, labels);

    expect(result).toContain('| 田中 | Task 1 | 2025-01-25 |');
    expect(result).toContain('| 鈴木 | Task 2 | 2025-01-26 |');
  });

  it('should use default label for unassigned items', () => {
    const items = [createTestActionItem('a1', 'Unassigned Task')];
    const labels = getLabels('ja');

    const result = formatActionItemsTable(items, labels);

    expect(result).toContain('| 未割当 | Unassigned Task | 未定 |');
  });

  it('should use English labels when provided', () => {
    const items = [createTestActionItem('a1', 'Unassigned Task')];
    const labels = getLabels('en');

    const result = formatActionItemsTable(items, labels);

    expect(result).toContain('| Unassigned | Unassigned Task | TBD |');
  });

  it('should return empty string for empty items', () => {
    const result = formatActionItemsTable([]);

    expect(result).toBe('');
  });
});

// ============================================================================
// convertMinutesToMarkdown Tests
// ============================================================================

describe('convertMinutesToMarkdown', () => {
  it('should convert minutes to Japanese markdown by default', () => {
    const minutes = createTestMinutes();

    const result = convertMinutesToMarkdown(minutes);

    expect(result).toContain('# 週次定例会議 議事録');
    expect(result).toContain('## 基本情報');
    expect(result).toContain('| 日時 | 2025年1月22日 (1時間) |');
    expect(result).toContain('| 参加者 | 田中太郎, 鈴木花子, 佐藤一郎 |');
    expect(result).toContain('| 記録者 | AI自動生成 |');
    expect(result).toContain('## 議題と議論内容');
    expect(result).toContain('## 決定事項');
    expect(result).toContain('## アクションアイテム');
  });

  it('should convert minutes to English markdown', () => {
    const minutes = createTestMinutes();

    const result = convertMinutesToMarkdown(minutes, { language: 'en' });

    expect(result).toContain('# 週次定例会議 Minutes');
    expect(result).toContain('## Basic Information');
    expect(result).toContain('| Date | 2025-01-22 (1h) |');
    expect(result).toContain('| Attendees |');
    expect(result).toContain('| Recorder | AI Generated |');
    expect(result).toContain('## Topics and Discussions');
    expect(result).toContain('## Decisions');
    expect(result).toContain('## Action Items');
  });

  it('should include metadata when requested', () => {
    const minutes = createTestMinutes();

    const result = convertMinutesToMarkdown(minutes, { includeMetadata: true });

    expect(result).toContain('---');
    expect(result).toContain('**メタデータ**');
    expect(result).toContain('生成日時: 2025-01-22T10:00:00.000Z');
    expect(result).toContain('モデル: claude-sonnet-4-20250514');
    expect(result).toContain('処理時間: 1234ms');
    expect(result).toContain('信頼度: 95.0%');
  });

  it('should include English metadata', () => {
    const minutes = createTestMinutes();

    const result = convertMinutesToMarkdown(minutes, {
      language: 'en',
      includeMetadata: true,
    });

    expect(result).toContain('**Metadata**');
    expect(result).toContain('Generated:');
    expect(result).toContain('Model:');
    expect(result).toContain('Processing Time:');
    expect(result).toContain('Confidence:');
  });

  it('should handle empty minutes', () => {
    const emptyMinutes: Minutes = {
      id: 'min_empty',
      meetingId: 'meeting_empty',
      title: 'Empty Meeting',
      date: '2025-01-22',
      duration: 0,
      summary: '',
      topics: [],
      decisions: [],
      actionItems: [],
      attendees: [],
      metadata: {
        generatedAt: '2025-01-22T10:00:00.000Z',
        model: 'test',
        processingTimeMs: 0,
        confidence: 0,
      },
    };

    const result = convertMinutesToMarkdown(emptyMinutes);

    expect(result).toContain('# Empty Meeting 議事録');
    expect(result).toContain('(なし)');
  });

  it('should handle empty minutes in English', () => {
    const emptyMinutes: Minutes = {
      id: 'min_empty',
      meetingId: 'meeting_empty',
      title: 'Empty Meeting',
      date: '2025-01-22',
      duration: 0,
      summary: '',
      topics: [],
      decisions: [],
      actionItems: [],
      attendees: [],
      metadata: {
        generatedAt: '2025-01-22T10:00:00.000Z',
        model: 'test',
        processingTimeMs: 0,
        confidence: 0,
      },
    };

    const result = convertMinutesToMarkdown(emptyMinutes, { language: 'en' });

    expect(result).toContain('(None)');
  });

  it('should handle duration with minutes', () => {
    const minutes = createTestMinutes();
    minutes.duration = 5400000; // 1h 30m

    const result = convertMinutesToMarkdown(minutes);

    expect(result).toContain('1時間30分');
  });

  it('should handle duration with only minutes', () => {
    const minutes = createTestMinutes();
    minutes.duration = 2700000; // 45m

    const result = convertMinutesToMarkdown(minutes);

    expect(result).toContain('45分');
  });

  it('should use custom template when provided', () => {
    const minutes = createTestMinutes();
    const customTemplate = '# Custom: {title}\n\nDate: {date}';

    const result = convertMinutesToMarkdown(minutes, { template: customTemplate });

    expect(result).toContain('# Custom: 週次定例会議 議事録');
    expect(result).toContain('Date: 2025年1月22日');
  });
});

// ============================================================================
// escapeMarkdown Tests
// ============================================================================

describe('escapeMarkdown', () => {
  it('should escape asterisks', () => {
    expect(escapeMarkdown('*bold*')).toBe('\\*bold\\*');
  });

  it('should escape underscores', () => {
    expect(escapeMarkdown('_italic_')).toBe('\\_italic\\_');
  });

  it('should escape brackets', () => {
    expect(escapeMarkdown('[link](url)')).toBe('\\[link\\]\\(url\\)');
  });

  it('should escape backticks', () => {
    expect(escapeMarkdown('`code`')).toBe('\\`code\\`');
  });

  it('should escape pipes', () => {
    expect(escapeMarkdown('cell | cell')).toBe('cell \\| cell');
  });

  it('should escape multiple characters', () => {
    const input = '*text* with [link] and `code`';
    const expected = '\\*text\\* with \\[link\\] and \\`code\\`';
    expect(escapeMarkdown(input)).toBe(expected);
  });

  it('should handle empty string', () => {
    expect(escapeMarkdown('')).toBe('');
  });
});

// ============================================================================
// createMarkdownTable Tests
// ============================================================================

describe('createMarkdownTable', () => {
  it('should create table with headers and rows', () => {
    const headers = ['Name', 'Age', 'City'];
    const rows = [
      ['Alice', '30', 'Tokyo'],
      ['Bob', '25', 'Osaka'],
    ];

    const result = createMarkdownTable(headers, rows);

    expect(result).toContain('| Name | Age | City |');
    expect(result).toContain('|------|------|------|');
    expect(result).toContain('| Alice | 30 | Tokyo |');
    expect(result).toContain('| Bob | 25 | Osaka |');
  });

  it('should return empty string for empty headers', () => {
    const result = createMarkdownTable([], []);

    expect(result).toBe('');
  });

  it('should handle table with no data rows', () => {
    const headers = ['Col1', 'Col2'];
    const rows: string[][] = [];

    const result = createMarkdownTable(headers, rows);

    expect(result).toContain('| Col1 | Col2 |');
    expect(result).toContain('|------|------|');
  });
});

// ============================================================================
// applyTemplate Tests
// ============================================================================

describe('applyTemplate', () => {
  it('should replace single variable', () => {
    const template = 'Hello {name}!';
    const result = applyTemplate(template, { name: 'World' });

    expect(result).toBe('Hello World!');
  });

  it('should replace multiple variables', () => {
    const template = '{greeting} {name}!';
    const result = applyTemplate(template, { greeting: 'Hello', name: 'World' });

    expect(result).toBe('Hello World!');
  });

  it('should replace repeated variables', () => {
    const template = '{x} + {x} = {result}';
    const result = applyTemplate(template, { x: '2', result: '4' });

    expect(result).toBe('2 + 2 = 4');
  });

  it('should handle missing variables', () => {
    const template = 'Hello {name}!';
    const result = applyTemplate(template, {});

    expect(result).toBe('Hello {name}!');
  });

  it('should handle empty template', () => {
    const result = applyTemplate('', { key: 'value' });

    expect(result).toBe('');
  });
});
