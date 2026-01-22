/**
 * Markdown converter for Minutes export
 * Converts Minutes data to Markdown format with template support
 * @module lib/export/markdown-converter
 */

import type {
  Minutes,
  TopicSegment,
  DecisionItem,
  ActionItem,
  Speaker,
} from '@/types/minutes';
import {
  getLabels,
  getTemplate,
  applyTemplate,
  type TemplateLabels,
} from './templates';

/**
 * Options for converting Minutes to Markdown
 */
export interface MinutesToMarkdownOptions {
  /** Custom template string (overrides language-based template) */
  template?: string;
  /** Include metadata section at the end */
  includeMetadata?: boolean;
  /** Language for output ('ja' or 'en') */
  language?: 'ja' | 'en';
}

/**
 * Default options for conversion
 */
const DEFAULT_OPTIONS: Required<MinutesToMarkdownOptions> = {
  template: '',
  includeMetadata: false,
  language: 'ja',
};

/**
 * Format a date string to localized format
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @param duration - Duration in milliseconds
 * @param language - Output language
 * @returns Formatted date string with time range
 */
function formatDateTime(
  dateStr: string,
  duration: number,
  language: 'ja' | 'en'
): string {
  const [year, month, day] = dateStr.split('-');
  if (year === undefined || month === undefined || day === undefined) {
    return dateStr;
  }

  const durationMinutes = Math.floor(duration / 60000);
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  let durationStr: string;
  if (hours > 0 && minutes > 0) {
    durationStr = language === 'ja' ? `${hours}時間${minutes}分` : `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    durationStr = language === 'ja' ? `${hours}時間` : `${hours}h`;
  } else if (minutes > 0) {
    durationStr = language === 'ja' ? `${minutes}分` : `${minutes}m`;
  } else {
    durationStr = language === 'ja' ? '0分' : '0m';
  }

  if (language === 'ja') {
    return `${year}年${parseInt(month, 10)}月${parseInt(day, 10)}日 (${durationStr})`;
  }
  return `${year}-${month}-${day} (${durationStr})`;
}

/**
 * Format attendees list to comma-separated string
 * @param attendees - Array of Speaker objects
 * @returns Comma-separated attendee names
 */
export function formatAttendeesList(attendees: readonly Speaker[]): string {
  if (attendees.length === 0) {
    return '';
  }
  return attendees.map((a) => a.name).join(', ');
}

/**
 * Format topics section for Markdown output
 * @param topics - Array of TopicSegment objects
 * @param labels - Localized labels
 * @returns Formatted topics Markdown string
 */
export function formatTopicsSection(
  topics: readonly TopicSegment[],
  labels?: TemplateLabels
): string {
  if (topics.length === 0) {
    return '';
  }

  const effectiveLabels = labels ?? getLabels('ja');
  const lines: string[] = [];

  topics.forEach((topic, index) => {
    lines.push(`### ${index + 1}. ${topic.title}`);

    if (topic.summary) {
      lines.push(`**${effectiveLabels.summaryLabel}**: ${topic.summary}`);
    }

    if (topic.keyPoints.length > 0) {
      lines.push(`**${effectiveLabels.keyPointsLabel}**:`);
      topic.keyPoints.forEach((point) => {
        lines.push(`- ${point}`);
      });
    }

    lines.push('');
  });

  return lines.join('\n').trim();
}

/**
 * Format decisions section for Markdown output
 * @param decisions - Array of DecisionItem objects
 * @returns Formatted decisions Markdown string (numbered list)
 */
export function formatDecisionsSection(decisions: readonly DecisionItem[]): string {
  if (decisions.length === 0) {
    return '';
  }

  return decisions
    .map((decision, index) => `${index + 1}. ${decision.content}`)
    .join('\n');
}

/**
 * Format action items as Markdown table rows
 * @param items - Array of ActionItem objects
 * @param labels - Localized labels
 * @returns Formatted action items table rows (without header)
 */
export function formatActionItemsTable(
  items: readonly ActionItem[],
  labels?: TemplateLabels
): string {
  if (items.length === 0) {
    return '';
  }

  const effectiveLabels = labels ?? getLabels('ja');

  return items
    .map((item) => {
      const assignee = item.assignee?.name ?? effectiveLabels.unassigned;
      const dueDate = item.dueDate ?? effectiveLabels.noDueDate;
      return `| ${assignee} | ${item.content} | ${dueDate} |`;
    })
    .join('\n');
}

/**
 * Convert Minutes object to Markdown string
 * Uses template-based conversion with localization support
 *
 * @param minutes - Minutes object to convert
 * @param options - Conversion options
 * @returns Markdown formatted string
 *
 * @example
 * ```typescript
 * const markdown = convertMinutesToMarkdown(minutes, { language: 'ja' });
 * // Returns Japanese formatted markdown
 *
 * const englishMarkdown = convertMinutesToMarkdown(minutes, { language: 'en' });
 * // Returns English formatted markdown
 * ```
 */
export function convertMinutesToMarkdown(
  minutes: Minutes,
  options?: MinutesToMarkdownOptions
): string {
  const language = options?.language ?? DEFAULT_OPTIONS.language;
  const template = options?.template ?? '';
  const includeMetadata = options?.includeMetadata ?? DEFAULT_OPTIONS.includeMetadata;

  const labels = getLabels(language);
  const effectiveTemplate = template !== '' ? template : getTemplate(language);

  // Format each section
  const attendeesStr = formatAttendeesList(minutes.attendees);
  const topicsStr = formatTopicsSection(minutes.topics, labels);
  const decisionsStr = formatDecisionsSection(minutes.decisions);
  const actionItemsStr = formatActionItemsTable(minutes.actionItems, labels);
  const dateStr = formatDateTime(minutes.date, minutes.duration, language);

  // Build variables for template
  const variables: Record<string, string> = {
    title: `${minutes.title} ${language === 'ja' ? '議事録' : 'Minutes'}`,
    date: dateStr,
    attendees: attendeesStr !== '' ? attendeesStr : (language === 'ja' ? '(なし)' : '(None)'),
    topics: topicsStr !== '' ? topicsStr : (language === 'ja' ? '(なし)' : '(None)'),
    decisions: decisionsStr !== '' ? decisionsStr : (language === 'ja' ? '(なし)' : '(None)'),
    actionItems: actionItemsStr,
    // Labels
    basicInfoHeader: labels.basicInfoHeader,
    itemLabel: labels.itemLabel,
    contentLabel: labels.contentLabel,
    dateLabel: labels.dateLabel,
    attendeesLabel: labels.attendeesLabel,
    recorderLabel: labels.recorderLabel,
    recorder: labels.recorder,
    topicsHeader: labels.topicsHeader,
    decisionsHeader: labels.decisionsHeader,
    actionItemsHeader: labels.actionItemsHeader,
    assigneeLabel: labels.assigneeLabel,
    taskLabel: labels.taskLabel,
    dueDateLabel: labels.dueDateLabel,
  };

  let result = applyTemplate(effectiveTemplate, variables);

  // Add metadata section if requested
  if (includeMetadata === true) {
    const metadataSection = formatMetadataSection(minutes, language);
    result = result.trim() + '\n\n' + metadataSection;
  }

  return result.trim();
}

/**
 * Format metadata section for Markdown output
 * @param minutes - Minutes object
 * @param language - Output language
 * @returns Formatted metadata Markdown string
 */
function formatMetadataSection(minutes: Minutes, language: 'ja' | 'en'): string {
  const { metadata } = minutes;
  const confidence = (metadata.confidence * 100).toFixed(1);

  if (language === 'ja') {
    return `---

**メタデータ**
- 生成日時: ${metadata.generatedAt}
- モデル: ${metadata.model}
- 処理時間: ${metadata.processingTimeMs}ms
- 信頼度: ${confidence}%`;
  }

  return `---

**Metadata**
- Generated: ${metadata.generatedAt}
- Model: ${metadata.model}
- Processing Time: ${metadata.processingTimeMs}ms
- Confidence: ${confidence}%`;
}

/**
 * Escape special Markdown characters in a string
 * @param text - Text to escape
 * @returns Escaped text safe for Markdown
 */
export function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/~/g, '\\~')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!')
    .replace(/\|/g, '\\|');
}

/**
 * Create a simple Markdown table from data
 * @param headers - Table header strings
 * @param rows - Table row data (2D array)
 * @returns Markdown table string
 */
export function createMarkdownTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[]
): string {
  if (headers.length === 0) {
    return '';
  }

  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `|${headers.map(() => '------').join('|')}|`;
  const dataRows = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');

  return [headerRow, separatorRow, dataRows].filter(Boolean).join('\n');
}
