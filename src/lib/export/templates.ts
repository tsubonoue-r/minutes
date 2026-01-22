/**
 * Markdown templates for minutes export
 * @module lib/export/templates
 */

/**
 * Default Japanese template for minutes export
 */
export const MINUTES_TEMPLATE_JA = `# {title}

## {basicInfoHeader}
| {itemLabel} | {contentLabel} |
|------|------|
| {dateLabel} | {date} |
| {attendeesLabel} | {attendees} |
| {recorderLabel} | {recorder} |

## {topicsHeader}
{topics}

## {decisionsHeader}
{decisions}

## {actionItemsHeader}
| {assigneeLabel} | {taskLabel} | {dueDateLabel} |
|--------|--------|------|
{actionItems}
`;

/**
 * Default English template for minutes export
 */
export const MINUTES_TEMPLATE_EN = `# {title}

## {basicInfoHeader}
| {itemLabel} | {contentLabel} |
|------|------|
| {dateLabel} | {date} |
| {attendeesLabel} | {attendees} |
| {recorderLabel} | {recorder} |

## {topicsHeader}
{topics}

## {decisionsHeader}
{decisions}

## {actionItemsHeader}
| {assigneeLabel} | {taskLabel} | {dueDateLabel} |
|--------|--------|------|
{actionItems}
`;

/**
 * Localized labels for templates
 */
export interface TemplateLabels {
  readonly basicInfoHeader: string;
  readonly itemLabel: string;
  readonly contentLabel: string;
  readonly dateLabel: string;
  readonly attendeesLabel: string;
  readonly recorderLabel: string;
  readonly recorder: string;
  readonly topicsHeader: string;
  readonly decisionsHeader: string;
  readonly actionItemsHeader: string;
  readonly assigneeLabel: string;
  readonly taskLabel: string;
  readonly dueDateLabel: string;
  readonly summaryLabel: string;
  readonly keyPointsLabel: string;
  readonly noDueDate: string;
  readonly unassigned: string;
}

/**
 * Japanese labels
 */
export const LABELS_JA: TemplateLabels = {
  basicInfoHeader: '基本情報',
  itemLabel: '項目',
  contentLabel: '内容',
  dateLabel: '日時',
  attendeesLabel: '参加者',
  recorderLabel: '記録者',
  recorder: 'AI自動生成',
  topicsHeader: '議題と議論内容',
  decisionsHeader: '決定事項',
  actionItemsHeader: 'アクションアイテム',
  assigneeLabel: '担当者',
  taskLabel: 'タスク',
  dueDateLabel: '期限',
  summaryLabel: '要約',
  keyPointsLabel: '主要ポイント',
  noDueDate: '未定',
  unassigned: '未割当',
} as const;

/**
 * English labels
 */
export const LABELS_EN: TemplateLabels = {
  basicInfoHeader: 'Basic Information',
  itemLabel: 'Item',
  contentLabel: 'Content',
  dateLabel: 'Date',
  attendeesLabel: 'Attendees',
  recorderLabel: 'Recorder',
  recorder: 'AI Generated',
  topicsHeader: 'Topics and Discussions',
  decisionsHeader: 'Decisions',
  actionItemsHeader: 'Action Items',
  assigneeLabel: 'Assignee',
  taskLabel: 'Task',
  dueDateLabel: 'Due Date',
  summaryLabel: 'Summary',
  keyPointsLabel: 'Key Points',
  noDueDate: 'TBD',
  unassigned: 'Unassigned',
} as const;

/**
 * Get labels for specified language
 * @param language - Language code ('ja' or 'en')
 * @returns Labels for the specified language
 */
export function getLabels(language: 'ja' | 'en'): TemplateLabels {
  return language === 'ja' ? LABELS_JA : LABELS_EN;
}

/**
 * Get template for specified language
 * @param language - Language code ('ja' or 'en')
 * @returns Template string for the specified language
 */
export function getTemplate(language: 'ja' | 'en'): string {
  return language === 'ja' ? MINUTES_TEMPLATE_JA : MINUTES_TEMPLATE_EN;
}

/**
 * Simple template variable replacement
 * @param template - Template string with {variable} placeholders
 * @param variables - Object with variable values
 * @returns Template with variables replaced
 */
export function applyTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(pattern, value);
  }
  return result;
}
