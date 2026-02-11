/**
 * PdfExportService unit tests
 * @module services/__tests__/pdf-export.service.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  minutesToPdfHtml,
  generatePdfDownload,
  PdfExportError,
} from '../pdf-export.service';
import type { Minutes } from '@/types/minutes';

// =============================================================================
// Mock Data
// =============================================================================

/**
 * Create a mock Minutes object for testing
 */
function createMockMinutes(overrides: Partial<Minutes> = {}): Minutes {
  return {
    id: 'min_test_123',
    meetingId: 'meeting_456',
    title: 'Weekly Standup',
    date: '2024-01-15',
    duration: 3600000, // 1 hour
    summary: 'Discussed project updates and blockers.',
    topics: [
      {
        id: 'topic_1',
        title: 'Project Updates',
        startTime: 0,
        endTime: 1800000,
        summary: 'Team members shared their progress.',
        keyPoints: ['Feature A completed', 'Feature B in progress'],
        speakers: [{ id: 'speaker_1', name: 'Alice' }],
      },
      {
        id: 'topic_2',
        title: 'Blockers Discussion',
        startTime: 1800000,
        endTime: 3000000,
        summary: 'Identified and resolved blockers.',
        keyPoints: ['Database migration issue', 'API rate limiting'],
        speakers: [
          { id: 'speaker_1', name: 'Alice' },
          { id: 'speaker_2', name: 'Bob' },
        ],
      },
    ],
    decisions: [
      {
        id: 'decision_1',
        content: 'Move to next sprint',
        context: 'All tasks completed',
        decidedAt: 1800000,
      },
      {
        id: 'decision_2',
        content: 'Implement caching layer',
        context: 'Performance improvement needed',
        decidedAt: 2400000,
        relatedTopicId: 'topic_2',
      },
    ],
    actionItems: [
      {
        id: 'action_1',
        content: 'Complete documentation',
        assignee: { id: 'speaker_1', name: 'Alice' },
        dueDate: '2024-01-22',
        priority: 'high',
        status: 'pending',
      },
      {
        id: 'action_2',
        content: 'Set up CI/CD pipeline',
        assignee: { id: 'speaker_2', name: 'Bob' },
        dueDate: '2024-01-25',
        priority: 'medium',
        status: 'in_progress',
      },
      {
        id: 'action_3',
        content: 'Review pull requests',
        priority: 'low',
        status: 'completed',
      },
    ],
    attendees: [
      { id: 'speaker_1', name: 'Alice' },
      { id: 'speaker_2', name: 'Bob' },
      { id: 'speaker_3', name: 'Charlie' },
    ],
    metadata: {
      generatedAt: '2024-01-15T10:00:00Z',
      model: 'claude-3-opus',
      processingTimeMs: 5000,
      confidence: 0.95,
    },
    ...overrides,
  };
}

// =============================================================================
// PdfExportError Tests
// =============================================================================

describe('PdfExportError', () => {
  it('should create an error with code and statusCode', () => {
    const error = new PdfExportError('Test error', 'TEST_CODE', 400);

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('PdfExportError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(PdfExportError);
  });

  it('should default statusCode to 500', () => {
    const error = new PdfExportError('Server error', 'SERVER_ERROR');

    expect(error.statusCode).toBe(500);
  });
});

// =============================================================================
// minutesToPdfHtml Tests
// =============================================================================

describe('minutesToPdfHtml', () => {
  describe('basic HTML structure', () => {
    it('should return a valid HTML document', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="ja">');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</html>');
    });

    it('should include UTF-8 charset meta tag', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('<meta charset="UTF-8">');
    });

    it('should include inline CSS styles', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
    });

    it('should include Japanese font family in styles', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('Hiragino Sans');
      expect(html).toContain('Noto Sans JP');
    });

    it('should include print media styles', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('@media print');
      expect(html).toContain('print-color-adjust: exact');
    });

    it('should set the page title', () => {
      const minutes = createMockMinutes({ title: 'My Meeting' });
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('<title>My Meeting - 議事録</title>');
    });
  });

  describe('header section', () => {
    it('should include the meeting title', () => {
      const minutes = createMockMinutes({ title: 'Weekly Standup' });
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('Weekly Standup');
    });

    it('should format the date in Japanese', () => {
      const minutes = createMockMinutes({ date: '2024-01-15' });
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('2024年1月15日');
    });

    it('should format the duration', () => {
      const minutes = createMockMinutes({ duration: 5400000 }); // 1h 30m
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('1時間30分');
    });

    it('should format short duration', () => {
      const minutes = createMockMinutes({ duration: 2700000 }); // 45m
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('45分');
    });

    it('should show attendee count', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('3名');
    });

    it('should show attendee badges', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('Alice');
      expect(html).toContain('Bob');
      expect(html).toContain('Charlie');
      expect(html).toContain('attendee-badge');
    });

    it('should handle no attendees', () => {
      const minutes = createMockMinutes({ attendees: [] });
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('0名');
      // The CSS class definition remains in styles, but no actual badge elements are rendered
      expect(html).not.toContain('class="attendee-badge"');
    });
  });

  describe('summary section', () => {
    it('should include the summary text', () => {
      const minutes = createMockMinutes({
        summary: 'This is the meeting summary.',
      });
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('概要');
      expect(html).toContain('This is the meeting summary.');
    });

    it('should omit summary section when summary is empty', () => {
      const minutes = createMockMinutes({ summary: '' });
      const html = minutesToPdfHtml(minutes);

      // The section title should not appear
      expect(html).not.toContain('class="summary-text"');
    });
  });

  describe('topics section', () => {
    it('should render topic titles', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('議題');
      expect(html).toContain('Project Updates');
      expect(html).toContain('Blockers Discussion');
    });

    it('should render topic time ranges', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('00:00 - 30:00');
      expect(html).toContain('30:00 - 50:00');
    });

    it('should render topic key points', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('Feature A completed');
      expect(html).toContain('Feature B in progress');
      expect(html).toContain('要点');
    });

    it('should render topic speakers', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('発言者');
    });

    it('should render topic summaries', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('Team members shared their progress.');
    });

    it('should omit topics section when no topics', () => {
      const minutes = createMockMinutes({ topics: [] });
      const html = minutesToPdfHtml(minutes);

      expect(html).not.toContain('class="topic"');
    });
  });

  describe('decisions section', () => {
    it('should render decision content', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('決定事項');
      expect(html).toContain('Move to next sprint');
      expect(html).toContain('Implement caching layer');
    });

    it('should render decision context', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('All tasks completed');
      expect(html).toContain('Performance improvement needed');
    });

    it('should render decision times', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('決定時刻');
    });

    it('should omit decisions section when no decisions', () => {
      const minutes = createMockMinutes({ decisions: [] });
      const html = minutesToPdfHtml(minutes);

      expect(html).not.toContain('決定事項');
    });
  });

  describe('action items section', () => {
    it('should render action items table', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('アクションアイテム');
      expect(html).toContain('action-table');
      expect(html).toContain('タスク');
      expect(html).toContain('担当者');
      expect(html).toContain('優先度');
      expect(html).toContain('期限');
      expect(html).toContain('ステータス');
    });

    it('should render action item content', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('Complete documentation');
      expect(html).toContain('Set up CI/CD pipeline');
      expect(html).toContain('Review pull requests');
    });

    it('should render assignee names', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('Alice');
      expect(html).toContain('Bob');
    });

    it('should show dash for unassigned items', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      // The third action item has no assignee
      // The dash should appear in a table cell
      expect(html).toContain('>-<');
    });

    it('should render priority badges in Japanese', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('>高<');
      expect(html).toContain('>中<');
      expect(html).toContain('>低<');
    });

    it('should render status labels in Japanese', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('未着手');
      expect(html).toContain('進行中');
      expect(html).toContain('完了');
    });

    it('should render due dates', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('2024-01-22');
      expect(html).toContain('2024-01-25');
    });

    it('should omit action items section when no items', () => {
      const minutes = createMockMinutes({ actionItems: [] });
      const html = minutesToPdfHtml(minutes);

      expect(html).not.toContain('アクションアイテム');
      // The CSS class definition remains in styles, but no actual table element is rendered
      expect(html).not.toContain('class="action-table"');
    });
  });

  describe('footer section', () => {
    it('should include generation metadata', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('AI生成日時');
      expect(html).toContain('2024-01-15T10:00:00Z');
      expect(html).toContain('95.0%');
    });

    it('should include PDF output timestamp', () => {
      const minutes = createMockMinutes();
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('PDF出力日時');
    });
  });

  describe('HTML escaping / XSS prevention', () => {
    it('should escape HTML in title', () => {
      const minutes = createMockMinutes({
        title: '<script>alert("xss")</script>',
      });
      const html = minutesToPdfHtml(minutes);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should escape HTML in summary', () => {
      const minutes = createMockMinutes({
        summary: 'Test <b>bold</b> & "quotes"',
      });
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
      expect(html).toContain('&amp;');
      expect(html).toContain('&quot;quotes&quot;');
    });

    it('should escape HTML in attendee names', () => {
      const minutes = createMockMinutes({
        attendees: [{ id: '1', name: '<img onerror=alert(1) src=x>' }],
      });
      const html = minutesToPdfHtml(minutes);

      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });

    it('should escape HTML in action item content', () => {
      const minutes = createMockMinutes({
        actionItems: [
          {
            id: 'action_1',
            content: 'Task with <em>emphasis</em>',
            priority: 'high',
            status: 'pending',
          },
        ],
      });
      const html = minutesToPdfHtml(minutes);

      expect(html).not.toContain('<em>');
      expect(html).toContain('&lt;em&gt;');
    });
  });

  describe('edge cases', () => {
    it('should handle empty minutes (no topics, decisions, action items)', () => {
      const minutes = createMockMinutes({
        summary: '',
        topics: [],
        decisions: [],
        actionItems: [],
        attendees: [],
      });

      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Weekly Standup');
    });

    it('should throw PdfExportError for empty id', () => {
      const minutes = createMockMinutes({ id: '' });

      expect(() => minutesToPdfHtml(minutes)).toThrow(PdfExportError);
      expect(() => minutesToPdfHtml(minutes)).toThrow('id and meetingId are required');
    });

    it('should throw PdfExportError for empty meetingId', () => {
      const minutes = createMockMinutes({ meetingId: '' });

      expect(() => minutesToPdfHtml(minutes)).toThrow(PdfExportError);
    });

    it('should handle zero duration', () => {
      const minutes = createMockMinutes({ duration: 0 });
      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('0分');
    });

    it('should handle topics with no key points', () => {
      const minutes = createMockMinutes({
        topics: [
          {
            id: 'topic_1',
            title: 'Empty Topic',
            startTime: 0,
            endTime: 60000,
            summary: '',
            keyPoints: [],
            speakers: [],
          },
        ],
      });

      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('Empty Topic');
      expect(html).not.toContain('要点');
    });

    it('should handle decisions with empty context', () => {
      const minutes = createMockMinutes({
        decisions: [
          {
            id: 'decision_1',
            content: 'Quick decision',
            context: '',
            decidedAt: 0,
          },
        ],
      });

      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('Quick decision');
    });

    it('should handle timestamps over 1 hour', () => {
      const minutes = createMockMinutes({
        topics: [
          {
            id: 'topic_1',
            title: 'Long Topic',
            startTime: 0,
            endTime: 7200000, // 2 hours
            summary: '',
            keyPoints: [],
            speakers: [],
          },
        ],
      });

      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('2:00:00');
    });

    it('should handle negative timestamps gracefully', () => {
      const minutes = createMockMinutes({
        topics: [
          {
            id: 'topic_1',
            title: 'Negative',
            startTime: -1000,
            endTime: 60000,
            summary: '',
            keyPoints: [],
            speakers: [],
          },
        ],
      });

      const html = minutesToPdfHtml(minutes);

      expect(html).toContain('00:00');
    });
  });
});

// =============================================================================
// generatePdfDownload Tests
// =============================================================================

describe('generatePdfDownload', () => {
  let mockIframe: {
    style: { cssText: string };
    srcdoc: string;
    onload: (() => void) | null;
    contentWindow: { print: ReturnType<typeof vi.fn> } | null;
  };

  let mockPrintWindow: {
    document: {
      createElement: ReturnType<typeof vi.fn>;
      body: { appendChild: ReturnType<typeof vi.fn> };
    };
  };

  // Store original window reference
  const originalWindow = globalThis.window;

  beforeEach(() => {
    mockIframe = {
      style: { cssText: '' },
      srcdoc: '',
      onload: null,
      contentWindow: { print: vi.fn() },
    };

    mockPrintWindow = {
      document: {
        createElement: vi.fn().mockReturnValue(mockIframe),
        body: { appendChild: vi.fn() },
      },
    };

    // Create a minimal window mock for the node environment
    (globalThis as Record<string, unknown>).window = {
      open: vi.fn(),
    };
  });

  afterEach(() => {
    // Restore original window state
    if (originalWindow === undefined) {
      delete (globalThis as Record<string, unknown>).window;
    } else {
      (globalThis as Record<string, unknown>).window = originalWindow;
    }
  });

  it('should open a new window and create an iframe with HTML', () => {
    (window.open as ReturnType<typeof vi.fn>).mockReturnValue(
      mockPrintWindow as unknown as Window
    );

    const minutes = createMockMinutes();
    generatePdfDownload(minutes, 'test.pdf');

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(mockPrintWindow.document.createElement).toHaveBeenCalledWith('iframe');
    expect(mockPrintWindow.document.body.appendChild).toHaveBeenCalledWith(mockIframe);

    // Verify the HTML content was set via srcdoc
    expect(mockIframe.srcdoc).toContain('<!DOCTYPE html>');
    expect(mockIframe.srcdoc).toContain('Weekly Standup');
  });

  it('should set onload handler that calls print on iframe', () => {
    (window.open as ReturnType<typeof vi.fn>).mockReturnValue(
      mockPrintWindow as unknown as Window
    );

    const minutes = createMockMinutes();
    generatePdfDownload(minutes, 'test.pdf');

    expect(mockIframe.onload).not.toBeNull();

    // Simulate the onload event
    if (mockIframe.onload !== null) {
      mockIframe.onload();
    }
    expect(mockIframe.contentWindow?.print).toHaveBeenCalledTimes(1);
  });

  it('should throw PdfExportError when popup is blocked', () => {
    (window.open as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const minutes = createMockMinutes();

    expect(() => generatePdfDownload(minutes, 'test.pdf')).toThrow(PdfExportError);
    expect(() => generatePdfDownload(minutes, 'test.pdf')).toThrow('ポップアップがブロック');
  });

  it('should throw PdfExportError for invalid minutes', () => {
    const minutes = createMockMinutes({ id: '' });

    expect(() => generatePdfDownload(minutes, 'test.pdf')).toThrow(PdfExportError);
  });
});
