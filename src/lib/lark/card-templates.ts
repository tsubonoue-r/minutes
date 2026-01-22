/**
 * Lark Card Templates for Notifications
 * @module lib/lark/card-templates
 */

import type {
  InteractiveCard,
  CardElement,
  CardHeader,
  CardTemplateColor,
} from './message';

// =============================================================================
// Types for Card Templates
// =============================================================================

/**
 * Minutes information for card generation
 */
export interface MinutesCardInfo {
  /** Minutes ID */
  readonly id: string;
  /** Meeting title */
  readonly title: string;
  /** Meeting date (YYYY-MM-DD) */
  readonly date: string;
  /** Meeting duration in milliseconds */
  readonly duration: number;
  /** Number of attendees */
  readonly attendeeCount: number;
  /** Number of action items */
  readonly actionItemCount: number;
  /** Document URL */
  readonly documentUrl: string;
}

/**
 * Action item information for card generation
 */
export interface ActionItemCardInfo {
  /** Action item ID */
  readonly id: string;
  /** Task content */
  readonly content: string;
  /** Assignee name */
  readonly assigneeName: string;
  /** Due date (YYYY-MM-DD) */
  readonly dueDate?: string | undefined;
  /** Priority level */
  readonly priority: 'high' | 'medium' | 'low';
  /** Meeting title */
  readonly meetingTitle: string;
  /** Meeting date (YYYY-MM-DD) */
  readonly meetingDate: string;
  /** Link to minutes document */
  readonly minutesUrl?: string | undefined;
}

/**
 * Draft minutes information for card generation
 */
export interface DraftMinutesCardInfo {
  /** Minutes ID */
  readonly id: string;
  /** Meeting title */
  readonly title: string;
  /** Meeting date (YYYY-MM-DD) */
  readonly date: string;
  /** Draft preview URL */
  readonly previewUrl: string;
  /** Approve action URL */
  readonly approveUrl: string;
}

/**
 * Language options for card content
 */
export type CardLanguage = 'ja' | 'en';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format duration in milliseconds to human-readable string
 *
 * @param ms - Duration in milliseconds
 * @param language - Output language
 * @returns Formatted duration string
 */
function formatDuration(ms: number, language: CardLanguage): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (language === 'ja') {
    if (hours > 0 && minutes > 0) {
      return `${hours}時間${minutes}分`;
    } else if (hours > 0) {
      return `${hours}時間`;
    } else if (minutes > 0) {
      return `${minutes}分`;
    } else {
      return '0分';
    }
  } else {
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '0m';
    }
  }
}

/**
 * Format date string for display
 *
 * @param dateStr - Date in YYYY-MM-DD format
 * @param language - Output language
 * @returns Formatted date string
 */
function formatDate(dateStr: string, language: CardLanguage): string {
  const date = new Date(dateStr);
  if (language === 'ja') {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

/**
 * Get priority display text
 *
 * @param priority - Priority level
 * @param language - Output language
 * @returns Formatted priority text with emoji
 */
function getPriorityText(
  priority: 'high' | 'medium' | 'low',
  language: CardLanguage
): string {
  const labels: Record<
    'high' | 'medium' | 'low',
    Record<CardLanguage, string>
  > = {
    high: { ja: '高', en: 'High' },
    medium: { ja: '中', en: 'Medium' },
    low: { ja: '低', en: 'Low' },
  };

  const emojis: Record<'high' | 'medium' | 'low', string> = {
    high: '!!!',
    medium: '!!',
    low: '!',
  };

  return `${emojis[priority]} ${labels[priority][language]}`;
}

/**
 * Get header color based on card type
 *
 * @param type - Card type
 * @returns Card template color
 */
function getHeaderColor(
  type: 'minutes' | 'draft' | 'action-item'
): CardTemplateColor {
  switch (type) {
    case 'minutes':
      return 'blue';
    case 'draft':
      return 'yellow';
    case 'action-item':
      return 'green';
    default:
      return 'blue';
  }
}

// =============================================================================
// Card Template Generators
// =============================================================================

/**
 * Labels for card content in different languages
 */
const labels = {
  minutesCompleted: {
    ja: {
      title: '議事録が作成されました',
      meetingTitle: '会議名',
      date: '日付',
      duration: '時間',
      attendees: '参加者',
      actionItems: 'アクションアイテム',
      viewButton: '議事録を確認',
      count: (n: number) => `${n}名`,
      items: (n: number) => `${n}件`,
    },
    en: {
      title: 'Minutes Created',
      meetingTitle: 'Meeting',
      date: 'Date',
      duration: 'Duration',
      attendees: 'Attendees',
      actionItems: 'Action Items',
      viewButton: 'View Minutes',
      count: (n: number) => `${n} people`,
      items: (n: number) => `${n} items`,
    },
  },
  minutesDraft: {
    ja: {
      title: '議事録の確認依頼',
      description: '以下の会議の議事録が作成されました。内容をご確認ください。',
      meetingTitle: '会議名',
      date: '日付',
      previewButton: '下書きを確認',
      approveButton: '承認する',
    },
    en: {
      title: 'Minutes Review Request',
      description:
        'Minutes have been created for the following meeting. Please review the content.',
      meetingTitle: 'Meeting',
      date: 'Date',
      previewButton: 'Preview Draft',
      approveButton: 'Approve',
    },
  },
  actionItemAssigned: {
    ja: {
      title: 'アクションアイテムが割り当てられました',
      task: 'タスク',
      meeting: '会議',
      dueDate: '期限',
      priority: '優先度',
      noDueDate: '未設定',
      viewMinutesButton: '議事録を確認',
    },
    en: {
      title: 'Action Item Assigned',
      task: 'Task',
      meeting: 'Meeting',
      dueDate: 'Due Date',
      priority: 'Priority',
      noDueDate: 'Not set',
      viewMinutesButton: 'View Minutes',
    },
  },
};

/**
 * Generate a card for completed minutes notification
 *
 * @param info - Minutes information
 * @param language - Output language
 * @returns Interactive card for minutes completion
 *
 * @example
 * ```typescript
 * const card = createMinutesCompletedCard({
 *   id: 'min_123',
 *   title: 'Weekly Sync',
 *   date: '2024-01-15',
 *   duration: 3600000,
 *   attendeeCount: 5,
 *   actionItemCount: 3,
 *   documentUrl: 'https://docs.larksuite.com/...',
 * }, 'ja');
 * ```
 */
export function createMinutesCompletedCard(
  info: MinutesCardInfo,
  language: CardLanguage = 'ja'
): InteractiveCard {
  const l = labels.minutesCompleted[language];

  const header: CardHeader = {
    title: {
      tag: 'plain_text',
      content: l.title,
    },
    template: getHeaderColor('minutes'),
  };

  const elements: CardElement[] = [
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**${l.meetingTitle}**: ${info.title}`,
      },
    },
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**${l.date}**: ${formatDate(info.date, language)}`,
      },
    },
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**${l.duration}**: ${formatDuration(info.duration, language)}`,
      },
    },
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**${l.attendees}**: ${l.count(info.attendeeCount)}`,
      },
    },
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**${l.actionItems}**: ${l.items(info.actionItemCount)}`,
      },
    },
    {
      tag: 'hr',
    },
    {
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: l.viewButton,
          },
          url: info.documentUrl,
          type: 'primary',
        },
      ],
    },
  ];

  return {
    header,
    elements,
  };
}

/**
 * Generate a card for draft minutes review request
 *
 * @param info - Draft minutes information
 * @param language - Output language
 * @returns Interactive card for draft review
 *
 * @example
 * ```typescript
 * const card = createMinutesDraftCard({
 *   id: 'min_123',
 *   title: 'Weekly Sync',
 *   date: '2024-01-15',
 *   previewUrl: 'https://app.example.com/preview/...',
 *   approveUrl: 'https://app.example.com/approve/...',
 * }, 'ja');
 * ```
 */
export function createMinutesDraftCard(
  info: DraftMinutesCardInfo,
  language: CardLanguage = 'ja'
): InteractiveCard {
  const l = labels.minutesDraft[language];

  const header: CardHeader = {
    title: {
      tag: 'plain_text',
      content: l.title,
    },
    template: getHeaderColor('draft'),
  };

  const elements: CardElement[] = [
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: l.description,
      },
    },
    {
      tag: 'hr',
    },
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**${l.meetingTitle}**: ${info.title}`,
      },
    },
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**${l.date}**: ${formatDate(info.date, language)}`,
      },
    },
    {
      tag: 'hr',
    },
    {
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: l.previewButton,
          },
          url: info.previewUrl,
          type: 'default',
        },
        {
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: l.approveButton,
          },
          url: info.approveUrl,
          type: 'primary',
        },
      ],
    },
  ];

  return {
    header,
    elements,
  };
}

/**
 * Generate a card for action item assignment notification
 *
 * @param info - Action item information
 * @param language - Output language
 * @returns Interactive card for action item assignment
 *
 * @example
 * ```typescript
 * const card = createActionItemAssignedCard({
 *   id: 'action_123',
 *   content: 'Prepare Q1 report',
 *   assigneeName: 'Tanaka',
 *   dueDate: '2024-01-20',
 *   priority: 'high',
 *   meetingTitle: 'Weekly Sync',
 *   meetingDate: '2024-01-15',
 *   minutesUrl: 'https://docs.larksuite.com/...',
 * }, 'ja');
 * ```
 */
export function createActionItemAssignedCard(
  info: ActionItemCardInfo,
  language: CardLanguage = 'ja'
): InteractiveCard {
  const l = labels.actionItemAssigned[language];

  const header: CardHeader = {
    title: {
      tag: 'plain_text',
      content: l.title,
    },
    template: getHeaderColor('action-item'),
  };

  const dueDateText =
    info.dueDate !== undefined
      ? formatDate(info.dueDate, language)
      : l.noDueDate;

  const elements: CardElement[] = [
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**${l.task}**: ${info.content}`,
      },
    },
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**${l.meeting}**: ${info.meetingTitle} (${formatDate(info.meetingDate, language)})`,
      },
    },
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**${l.dueDate}**: ${dueDateText}`,
      },
    },
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `**${l.priority}**: ${getPriorityText(info.priority, language)}`,
      },
    },
  ];

  // Add minutes link button if URL is provided
  if (info.minutesUrl !== undefined) {
    elements.push({
      tag: 'hr',
    });
    elements.push({
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: l.viewMinutesButton,
          },
          url: info.minutesUrl,
          type: 'default',
        },
      ],
    });
  }

  return {
    header,
    elements,
  };
}

// =============================================================================
// Card Validation
// =============================================================================

/**
 * Validate minutes card info
 *
 * @param info - Minutes card info to validate
 * @returns true if valid, throws Error if invalid
 */
export function validateMinutesCardInfo(info: MinutesCardInfo): boolean {
  if (info.id.trim() === '') {
    throw new Error('Minutes ID is required');
  }
  if (info.title.trim() === '') {
    throw new Error('Meeting title is required');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(info.date)) {
    throw new Error('Date must be in YYYY-MM-DD format');
  }
  if (info.duration < 0) {
    throw new Error('Duration must be non-negative');
  }
  if (info.attendeeCount < 0) {
    throw new Error('Attendee count must be non-negative');
  }
  if (info.actionItemCount < 0) {
    throw new Error('Action item count must be non-negative');
  }
  if (info.documentUrl.trim() === '') {
    throw new Error('Document URL is required');
  }
  return true;
}

/**
 * Validate action item card info
 *
 * @param info - Action item card info to validate
 * @returns true if valid, throws Error if invalid
 */
export function validateActionItemCardInfo(info: ActionItemCardInfo): boolean {
  if (info.id.trim() === '') {
    throw new Error('Action item ID is required');
  }
  if (info.content.trim() === '') {
    throw new Error('Task content is required');
  }
  if (info.assigneeName.trim() === '') {
    throw new Error('Assignee name is required');
  }
  if (
    info.dueDate !== undefined &&
    !/^\d{4}-\d{2}-\d{2}$/.test(info.dueDate)
  ) {
    throw new Error('Due date must be in YYYY-MM-DD format');
  }
  if (!['high', 'medium', 'low'].includes(info.priority)) {
    throw new Error('Priority must be high, medium, or low');
  }
  if (info.meetingTitle.trim() === '') {
    throw new Error('Meeting title is required');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(info.meetingDate)) {
    throw new Error('Meeting date must be in YYYY-MM-DD format');
  }
  return true;
}

/**
 * Validate draft minutes card info
 *
 * @param info - Draft minutes card info to validate
 * @returns true if valid, throws Error if invalid
 */
export function validateDraftMinutesCardInfo(
  info: DraftMinutesCardInfo
): boolean {
  if (info.id.trim() === '') {
    throw new Error('Minutes ID is required');
  }
  if (info.title.trim() === '') {
    throw new Error('Meeting title is required');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(info.date)) {
    throw new Error('Date must be in YYYY-MM-DD format');
  }
  if (info.previewUrl.trim() === '') {
    throw new Error('Preview URL is required');
  }
  if (info.approveUrl.trim() === '') {
    throw new Error('Approve URL is required');
  }
  return true;
}
