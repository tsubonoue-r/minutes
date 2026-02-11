/**
 * PDF Export Service - Convert Minutes to PDF-ready HTML
 * @module services/pdf-export.service
 *
 * Generates a styled HTML document from meeting minutes data
 * that can be printed as PDF via the browser's print dialog
 * or returned as an HTML response from the API.
 */

import type { Minutes, ActionItem, DecisionItem, TopicSegment, Speaker } from '@/types/minutes';

// =============================================================================
// Error Class
// =============================================================================

/**
 * Error thrown when PDF export operations fail
 */
export class PdfExportError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'PdfExportError';
  }
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Priority display labels in Japanese
 */
const PRIORITY_LABELS: Readonly<Record<ActionItem['priority'], string>> = {
  high: '高',
  medium: '中',
  low: '低',
};

/**
 * Priority badge color classes (inline CSS)
 */
const PRIORITY_COLORS: Readonly<Record<ActionItem['priority'], string>> = {
  high: 'background-color: #FEE2E2; color: #991B1B;',
  medium: 'background-color: #FEF3C7; color: #92400E;',
  low: 'background-color: #DBEAFE; color: #1E40AF;',
};

/**
 * Status display labels in Japanese
 */
const STATUS_LABELS: Readonly<Record<ActionItem['status'], string>> = {
  pending: '未着手',
  in_progress: '進行中',
  completed: '完了',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Escape HTML special characters to prevent XSS
 *
 * @param text - Raw text string
 * @returns HTML-safe escaped string
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format duration in milliseconds to a human-readable Japanese string
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "1時間30分")
 */
function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}時間${minutes}分`;
  } else if (hours > 0) {
    return `${hours}時間`;
  } else if (minutes > 0) {
    return `${minutes}分`;
  }
  return '0分';
}

/**
 * Format timestamp in milliseconds to MM:SS or HH:MM:SS format
 *
 * @param ms - Time in milliseconds
 * @returns Formatted time string
 */
function formatTimestamp(ms: number): string {
  if (ms < 0) {
    return '00:00';
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number): string => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format a date string (YYYY-MM-DD) to Japanese display format
 *
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns Formatted date string (e.g., "2024年1月15日")
 */
function formatDateJa(dateStr: string): string {
  const parts = dateStr.split('-');
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  if (year === undefined || month === undefined || day === undefined) {
    return dateStr;
  }

  return `${year}年${parseInt(month, 10)}月${parseInt(day, 10)}日`;
}

// =============================================================================
// HTML Section Builders
// =============================================================================

/**
 * Build the CSS styles for the PDF document
 *
 * @returns Complete CSS stylesheet as a string
 */
function buildStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Meiryo', sans-serif;
      color: #1F2329;
      line-height: 1.7;
      font-size: 14px;
      background: #FFFFFF;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 48px;
    }

    /* Header */
    .header {
      border-bottom: 3px solid #3370FF;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }

    .header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #1F2329;
      margin-bottom: 16px;
      line-height: 1.3;
    }

    .header-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px 32px;
      font-size: 13px;
      color: #646A73;
    }

    .header-meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .header-meta-label {
      font-weight: 600;
      color: #1F2329;
    }

    /* Attendees */
    .attendees {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }

    .attendee-badge {
      display: inline-block;
      padding: 2px 10px;
      background-color: #F0F1F5;
      border-radius: 12px;
      font-size: 12px;
      color: #646A73;
    }

    /* Sections */
    .section {
      margin-bottom: 28px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #3370FF;
      border-bottom: 1px solid #DEE0E3;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }

    /* Summary */
    .summary-text {
      font-size: 14px;
      color: #1F2329;
      background-color: #F7F8FA;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #3370FF;
    }

    /* Topics */
    .topic {
      margin-bottom: 20px;
      padding: 16px;
      background-color: #FAFBFC;
      border-radius: 8px;
      border: 1px solid #DEE0E3;
    }

    .topic-title {
      font-size: 15px;
      font-weight: 600;
      color: #1F2329;
      margin-bottom: 4px;
    }

    .topic-time {
      font-size: 12px;
      color: #8F959E;
      margin-bottom: 8px;
    }

    .topic-summary {
      font-size: 13px;
      color: #646A73;
      margin-bottom: 10px;
    }

    .topic-speakers {
      font-size: 12px;
      color: #8F959E;
      margin-top: 8px;
    }

    .key-points-label {
      font-size: 13px;
      font-weight: 600;
      color: #1F2329;
      margin-bottom: 4px;
    }

    .key-points-list {
      list-style: none;
      padding: 0;
    }

    .key-points-list li {
      font-size: 13px;
      color: #1F2329;
      padding: 3px 0 3px 16px;
      position: relative;
    }

    .key-points-list li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 11px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #3370FF;
    }

    /* Decisions */
    .decision {
      margin-bottom: 16px;
      padding: 12px 16px;
      background-color: #EFF6FF;
      border-radius: 8px;
      border-left: 4px solid #3370FF;
    }

    .decision-content {
      font-size: 14px;
      font-weight: 600;
      color: #1F2329;
      margin-bottom: 4px;
    }

    .decision-context {
      font-size: 13px;
      color: #646A73;
    }

    .decision-time {
      font-size: 12px;
      color: #8F959E;
      margin-top: 4px;
    }

    /* Action Items Table */
    .action-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .action-table th {
      background-color: #F0F1F5;
      color: #1F2329;
      font-weight: 600;
      padding: 10px 12px;
      text-align: left;
      border: 1px solid #DEE0E3;
    }

    .action-table td {
      padding: 10px 12px;
      border: 1px solid #DEE0E3;
      vertical-align: top;
    }

    .action-table tr:nth-child(even) {
      background-color: #FAFBFC;
    }

    .priority-badge {
      display: inline-block;
      padding: 1px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    .status-badge {
      display: inline-block;
      padding: 1px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      background-color: #F0F1F5;
      color: #646A73;
    }

    .status-completed {
      background-color: #D1FAE5;
      color: #065F46;
    }

    .status-in_progress {
      background-color: #FEF3C7;
      color: #92400E;
    }

    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #DEE0E3;
      font-size: 11px;
      color: #8F959E;
      text-align: center;
    }

    /* Print styles */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .container {
        padding: 20px 24px;
        max-width: 100%;
      }

      .topic,
      .decision {
        break-inside: avoid;
      }

      .action-table tr {
        break-inside: avoid;
      }

      .section {
        break-inside: avoid;
      }
    }
  `;
}

/**
 * Build the header section HTML
 *
 * @param minutes - Minutes data
 * @returns HTML string for the header
 */
function buildHeader(minutes: Minutes): string {
  const title = escapeHtml(minutes.title);
  const date = formatDateJa(minutes.date);
  const duration = formatDuration(minutes.duration);

  const attendeeHtml = minutes.attendees.length > 0
    ? `
      <div class="attendees">
        ${minutes.attendees.map((a: Speaker) => `<span class="attendee-badge">${escapeHtml(a.name)}</span>`).join('')}
      </div>
    `
    : '';

  return `
    <div class="header">
      <h1>${title}</h1>
      <div class="header-meta">
        <div class="header-meta-item">
          <span class="header-meta-label">日付:</span>
          <span>${date}</span>
        </div>
        <div class="header-meta-item">
          <span class="header-meta-label">所要時間:</span>
          <span>${duration}</span>
        </div>
        <div class="header-meta-item">
          <span class="header-meta-label">参加者:</span>
          <span>${minutes.attendees.length}名</span>
        </div>
      </div>
      ${attendeeHtml}
    </div>
  `;
}

/**
 * Build the summary section HTML
 *
 * @param summary - Meeting summary text
 * @returns HTML string for the summary section, or empty string if no summary
 */
function buildSummarySection(summary: string): string {
  if (summary.trim() === '') {
    return '';
  }

  return `
    <div class="section">
      <h2 class="section-title">概要</h2>
      <div class="summary-text">${escapeHtml(summary)}</div>
    </div>
  `;
}

/**
 * Build a single topic HTML block
 *
 * @param topic - TopicSegment data
 * @returns HTML string for one topic
 */
function buildTopicHtml(topic: TopicSegment): string {
  const title = escapeHtml(topic.title);
  const timeRange = `${formatTimestamp(topic.startTime)} - ${formatTimestamp(topic.endTime)}`;

  const summaryHtml = topic.summary.trim() !== ''
    ? `<div class="topic-summary">${escapeHtml(topic.summary)}</div>`
    : '';

  const keyPointsHtml = topic.keyPoints.length > 0
    ? `
      <div class="key-points-label">要点:</div>
      <ul class="key-points-list">
        ${topic.keyPoints.map((point: string) => `<li>${escapeHtml(point)}</li>`).join('')}
      </ul>
    `
    : '';

  const speakersHtml = topic.speakers.length > 0
    ? `<div class="topic-speakers">発言者: ${topic.speakers.map((s: Speaker) => escapeHtml(s.name)).join(', ')}</div>`
    : '';

  return `
    <div class="topic">
      <div class="topic-title">${title}</div>
      <div class="topic-time">${timeRange}</div>
      ${summaryHtml}
      ${keyPointsHtml}
      ${speakersHtml}
    </div>
  `;
}

/**
 * Build the topics section HTML
 *
 * @param topics - Array of TopicSegment data
 * @returns HTML string for the topics section, or empty string if no topics
 */
function buildTopicsSection(topics: readonly TopicSegment[]): string {
  if (topics.length === 0) {
    return '';
  }

  return `
    <div class="section">
      <h2 class="section-title">議題</h2>
      ${topics.map((topic) => buildTopicHtml(topic)).join('')}
    </div>
  `;
}

/**
 * Build a single decision HTML block
 *
 * @param decision - DecisionItem data
 * @returns HTML string for one decision
 */
function buildDecisionHtml(decision: DecisionItem): string {
  const content = escapeHtml(decision.content);

  const contextHtml = decision.context.trim() !== ''
    ? `<div class="decision-context">${escapeHtml(decision.context)}</div>`
    : '';

  return `
    <div class="decision">
      <div class="decision-content">${content}</div>
      ${contextHtml}
      <div class="decision-time">決定時刻: ${formatTimestamp(decision.decidedAt)}</div>
    </div>
  `;
}

/**
 * Build the decisions section HTML
 *
 * @param decisions - Array of DecisionItem data
 * @returns HTML string for the decisions section, or empty string if no decisions
 */
function buildDecisionsSection(decisions: readonly DecisionItem[]): string {
  if (decisions.length === 0) {
    return '';
  }

  return `
    <div class="section">
      <h2 class="section-title">決定事項</h2>
      ${decisions.map((decision) => buildDecisionHtml(decision)).join('')}
    </div>
  `;
}

/**
 * Build a single action item table row HTML
 *
 * @param item - ActionItem data
 * @returns HTML string for one table row
 */
function buildActionItemRow(item: ActionItem): string {
  const content = escapeHtml(item.content);
  const assignee = item.assignee !== undefined ? escapeHtml(item.assignee.name) : '-';
  const dueDate = item.dueDate !== undefined ? item.dueDate : '-';
  const priorityLabel = PRIORITY_LABELS[item.priority];
  const priorityStyle = PRIORITY_COLORS[item.priority];
  const statusLabel = STATUS_LABELS[item.status];
  const statusClass = item.status === 'completed'
    ? 'status-badge status-completed'
    : item.status === 'in_progress'
      ? 'status-badge status-in_progress'
      : 'status-badge';

  return `
    <tr>
      <td>${content}</td>
      <td>${assignee}</td>
      <td><span class="priority-badge" style="${priorityStyle}">${priorityLabel}</span></td>
      <td>${dueDate}</td>
      <td><span class="${statusClass}">${statusLabel}</span></td>
    </tr>
  `;
}

/**
 * Build the action items section HTML
 *
 * @param actionItems - Array of ActionItem data
 * @returns HTML string for the action items section, or empty string if no items
 */
function buildActionItemsSection(actionItems: readonly ActionItem[]): string {
  if (actionItems.length === 0) {
    return '';
  }

  return `
    <div class="section">
      <h2 class="section-title">アクションアイテム</h2>
      <table class="action-table">
        <thead>
          <tr>
            <th>タスク</th>
            <th>担当者</th>
            <th>優先度</th>
            <th>期限</th>
            <th>ステータス</th>
          </tr>
        </thead>
        <tbody>
          ${actionItems.map((item) => buildActionItemRow(item)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Build the footer section HTML
 *
 * @param minutes - Minutes data for metadata
 * @returns HTML string for the footer
 */
function buildFooter(minutes: Minutes): string {
  const generatedAt = minutes.metadata.generatedAt;
  const confidence = (minutes.metadata.confidence * 100).toFixed(1);
  const now = new Date().toISOString();

  return `
    <div class="footer">
      <p>AI生成日時: ${escapeHtml(generatedAt)} | 信頼度: ${confidence}%</p>
      <p>PDF出力日時: ${escapeHtml(now)}</p>
    </div>
  `;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate a PDF-ready HTML string from minutes data.
 *
 * Creates a complete, self-contained HTML document with inline CSS
 * that is optimized for printing as PDF. Supports Japanese text
 * with appropriate font-family settings.
 *
 * @param minutes - The Minutes object to convert
 * @returns Complete HTML document string ready for PDF rendering
 * @throws {PdfExportError} When minutes data is invalid
 *
 * @example
 * ```typescript
 * const html = minutesToPdfHtml(minutes);
 * // Use html for server-side rendering or client-side print
 * ```
 */
export function minutesToPdfHtml(minutes: Minutes): string {
  if (minutes.id === '' || minutes.meetingId === '') {
    throw new PdfExportError(
      'Minutes data is incomplete: id and meetingId are required',
      'INVALID_MINUTES',
      400
    );
  }

  const styles = buildStyles();
  const header = buildHeader(minutes);
  const summary = buildSummarySection(minutes.summary);
  const topics = buildTopicsSection(minutes.topics);
  const decisions = buildDecisionsSection(minutes.decisions);
  const actionItems = buildActionItemsSection(minutes.actionItems);
  const footer = buildFooter(minutes);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(minutes.title)} - 議事録</title>
  <style>${styles}</style>
</head>
<body>
  <div class="container">
    ${header}
    ${summary}
    ${topics}
    ${decisions}
    ${actionItems}
    ${footer}
  </div>
</body>
</html>`;
}

/**
 * Convert minutes to a downloadable PDF via browser print dialog.
 *
 * Opens a new browser window with the rendered HTML and triggers
 * the browser's native print dialog, which allows the user to
 * save as PDF.
 *
 * @param minutes - The Minutes object to convert
 * @param _filename - Reserved for future use when direct PDF download is supported
 * @throws {PdfExportError} When the print window cannot be opened
 *
 * @example
 * ```typescript
 * generatePdfDownload(minutes, 'meeting-minutes.pdf');
 * // Opens print dialog in a new window
 * ```
 */
export function generatePdfDownload(minutes: Minutes, _filename: string): void {
  const html = minutesToPdfHtml(minutes);
  const printWindow = window.open('', '_blank');

  if (printWindow === null) {
    throw new PdfExportError(
      'ポップアップがブロックされました。ブラウザのポップアップ設定を確認してください。',
      'POPUP_BLOCKED',
      400
    );
  }

  // Use srcdoc-based iframe approach instead of document.write for security
  const iframe = printWindow.document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;border:none;';
  iframe.srcdoc = html;
  printWindow.document.body.appendChild(iframe);

  iframe.onload = (): void => {
    iframe.contentWindow?.print();
  };
}
