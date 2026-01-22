/**
 * Lark Card Templates unit tests
 * @module lib/lark/__tests__/card-templates.test
 */

import { describe, it, expect } from 'vitest';
import {
  createMinutesCompletedCard,
  createMinutesDraftCard,
  createActionItemAssignedCard,
  validateMinutesCardInfo,
  validateActionItemCardInfo,
  validateDraftMinutesCardInfo,
  type MinutesCardInfo,
  type ActionItemCardInfo,
  type DraftMinutesCardInfo,
} from '../card-templates';

describe('createMinutesCompletedCard', () => {
  const validMinutesInfo: MinutesCardInfo = {
    id: 'min_123',
    title: 'Weekly Sync Meeting',
    date: '2024-01-15',
    duration: 3600000, // 1 hour
    attendeeCount: 5,
    actionItemCount: 3,
    documentUrl: 'https://docs.larksuite.com/doc123',
  };

  it('should create card with Japanese labels', () => {
    const card = createMinutesCompletedCard(validMinutesInfo, 'ja');

    expect(card.header).toBeDefined();
    expect(card.header?.title.content).toBe('議事録が作成されました');
    expect(card.header?.template).toBe('blue');
    expect(card.elements.length).toBeGreaterThan(0);
  });

  it('should create card with English labels', () => {
    const card = createMinutesCompletedCard(validMinutesInfo, 'en');

    expect(card.header?.title.content).toBe('Minutes Created');
  });

  it('should include meeting information in elements', () => {
    const card = createMinutesCompletedCard(validMinutesInfo, 'ja');

    // Find div elements
    const divElements = card.elements.filter((e) => e.tag === 'div');
    expect(divElements.length).toBeGreaterThanOrEqual(5);

    // Check content includes meeting title
    const elementContents = divElements
      .map((e) => {
        if (e.tag === 'div' && 'text' in e) {
          return e.text.content;
        }
        return '';
      })
      .join(' ');
    expect(elementContents).toContain('Weekly Sync Meeting');
  });

  it('should include action button', () => {
    const card = createMinutesCompletedCard(validMinutesInfo, 'ja');

    const actionElement = card.elements.find((e) => e.tag === 'action');
    expect(actionElement).toBeDefined();

    if (actionElement !== undefined && actionElement.tag === 'action') {
      expect(actionElement.actions.length).toBeGreaterThan(0);
      const firstAction = actionElement.actions[0];
      expect(firstAction).toBeDefined();
      if (firstAction !== undefined) {
        expect(firstAction.url).toBe(validMinutesInfo.documentUrl);
      }
    }
  });

  it('should format duration correctly in Japanese', () => {
    const card = createMinutesCompletedCard(
      { ...validMinutesInfo, duration: 5400000 }, // 1h 30m
      'ja'
    );

    const divElements = card.elements.filter((e) => e.tag === 'div');
    const durationElement = divElements.find(
      (e) => e.tag === 'div' && 'text' in e && e.text.content.includes('時間')
    );
    expect(durationElement).toBeDefined();
  });

  it('should format duration correctly in English', () => {
    const card = createMinutesCompletedCard(
      { ...validMinutesInfo, duration: 5400000 },
      'en'
    );

    const divElements = card.elements.filter((e) => e.tag === 'div');
    const durationElement = divElements.find(
      (e) => e.tag === 'div' && 'text' in e && e.text.content.includes('1h 30m')
    );
    expect(durationElement).toBeDefined();
  });
});

describe('createMinutesDraftCard', () => {
  const validDraftInfo: DraftMinutesCardInfo = {
    id: 'min_123',
    title: 'Weekly Sync Meeting',
    date: '2024-01-15',
    previewUrl: 'https://app.example.com/preview/123',
    approveUrl: 'https://app.example.com/approve/123',
  };

  it('should create draft review card', () => {
    const card = createMinutesDraftCard(validDraftInfo, 'ja');

    expect(card.header?.title.content).toBe('議事録の確認依頼');
    expect(card.header?.template).toBe('yellow');
  });

  it('should include preview and approve buttons', () => {
    const card = createMinutesDraftCard(validDraftInfo, 'ja');

    const actionElement = card.elements.find((e) => e.tag === 'action');
    expect(actionElement).toBeDefined();

    if (actionElement?.tag === 'action') {
      expect(actionElement.actions.length).toBe(2);

      const previewButton = actionElement.actions.find(
        (a) => a.url === validDraftInfo.previewUrl
      );
      const approveButton = actionElement.actions.find(
        (a) => a.url === validDraftInfo.approveUrl
      );

      expect(previewButton).toBeDefined();
      expect(approveButton).toBeDefined();
      expect(approveButton?.type).toBe('primary');
    }
  });
});

describe('createActionItemAssignedCard', () => {
  const validActionItemInfo: ActionItemCardInfo = {
    id: 'action_123',
    content: 'Complete quarterly report',
    assigneeName: 'Tanaka',
    dueDate: '2024-01-20',
    priority: 'high',
    meetingTitle: 'Weekly Sync',
    meetingDate: '2024-01-15',
    minutesUrl: 'https://docs.larksuite.com/doc123',
  };

  it('should create action item card', () => {
    const card = createActionItemAssignedCard(validActionItemInfo, 'ja');

    expect(card.header?.title.content).toBe('アクションアイテムが割り当てられました');
    expect(card.header?.template).toBe('green');
  });

  it('should include task details', () => {
    const card = createActionItemAssignedCard(validActionItemInfo, 'ja');

    const divElements = card.elements.filter((e) => e.tag === 'div');
    const elementContents = divElements
      .map((e) => {
        if (e.tag === 'div' && 'text' in e) {
          return e.text.content;
        }
        return '';
      })
      .join(' ');

    expect(elementContents).toContain('Complete quarterly report');
    expect(elementContents).toContain('Weekly Sync');
  });

  it('should show priority with correct label', () => {
    const card = createActionItemAssignedCard(validActionItemInfo, 'ja');

    const divElements = card.elements.filter((e) => e.tag === 'div');
    const priorityElement = divElements.find(
      (e) => e.tag === 'div' && 'text' in e && e.text.content.includes('!!!')
    );
    expect(priorityElement).toBeDefined();
  });

  it('should handle missing due date', () => {
    const infoWithoutDueDate = {
      ...validActionItemInfo,
      dueDate: undefined,
    };
    const card = createActionItemAssignedCard(infoWithoutDueDate, 'ja');

    const divElements = card.elements.filter((e) => e.tag === 'div');
    const dueDateElement = divElements.find(
      (e) => e.tag === 'div' && 'text' in e && e.text.content.includes('未設定')
    );
    expect(dueDateElement).toBeDefined();
  });

  it('should include minutes link when provided', () => {
    const card = createActionItemAssignedCard(validActionItemInfo, 'ja');

    const actionElement = card.elements.find((e) => e.tag === 'action');
    expect(actionElement).toBeDefined();
  });

  it('should not include minutes link when not provided', () => {
    const infoWithoutMinutesUrl = {
      ...validActionItemInfo,
      minutesUrl: undefined,
    };
    const card = createActionItemAssignedCard(infoWithoutMinutesUrl, 'ja');

    const actionElement = card.elements.find((e) => e.tag === 'action');
    expect(actionElement).toBeUndefined();
  });
});

describe('validateMinutesCardInfo', () => {
  const validInfo: MinutesCardInfo = {
    id: 'min_123',
    title: 'Meeting',
    date: '2024-01-15',
    duration: 3600000,
    attendeeCount: 5,
    actionItemCount: 3,
    documentUrl: 'https://example.com',
  };

  it('should pass for valid info', () => {
    expect(validateMinutesCardInfo(validInfo)).toBe(true);
  });

  it('should throw for empty id', () => {
    expect(() => validateMinutesCardInfo({ ...validInfo, id: '' })).toThrow(
      'Minutes ID is required'
    );
  });

  it('should throw for empty title', () => {
    expect(() => validateMinutesCardInfo({ ...validInfo, title: '  ' })).toThrow(
      'Meeting title is required'
    );
  });

  it('should throw for invalid date format', () => {
    expect(() =>
      validateMinutesCardInfo({ ...validInfo, date: '2024/01/15' })
    ).toThrow('Date must be in YYYY-MM-DD format');
  });

  it('should throw for negative duration', () => {
    expect(() =>
      validateMinutesCardInfo({ ...validInfo, duration: -1 })
    ).toThrow('Duration must be non-negative');
  });

  it('should throw for negative attendee count', () => {
    expect(() =>
      validateMinutesCardInfo({ ...validInfo, attendeeCount: -1 })
    ).toThrow('Attendee count must be non-negative');
  });

  it('should throw for empty document URL', () => {
    expect(() =>
      validateMinutesCardInfo({ ...validInfo, documentUrl: '' })
    ).toThrow('Document URL is required');
  });
});

describe('validateActionItemCardInfo', () => {
  const validInfo: ActionItemCardInfo = {
    id: 'action_123',
    content: 'Task content',
    assigneeName: 'Tanaka',
    dueDate: '2024-01-20',
    priority: 'high',
    meetingTitle: 'Meeting',
    meetingDate: '2024-01-15',
  };

  it('should pass for valid info', () => {
    expect(validateActionItemCardInfo(validInfo)).toBe(true);
  });

  it('should pass for info without due date', () => {
    expect(
      validateActionItemCardInfo({ ...validInfo, dueDate: undefined })
    ).toBe(true);
  });

  it('should throw for empty content', () => {
    expect(() =>
      validateActionItemCardInfo({ ...validInfo, content: '' })
    ).toThrow('Task content is required');
  });

  it('should throw for empty assignee name', () => {
    expect(() =>
      validateActionItemCardInfo({ ...validInfo, assigneeName: '  ' })
    ).toThrow('Assignee name is required');
  });

  it('should throw for invalid due date format', () => {
    expect(() =>
      validateActionItemCardInfo({ ...validInfo, dueDate: '01-20-2024' })
    ).toThrow('Due date must be in YYYY-MM-DD format');
  });

  it('should throw for invalid priority', () => {
    expect(() =>
      validateActionItemCardInfo({
        ...validInfo,
        priority: 'urgent' as 'high',
      })
    ).toThrow('Priority must be high, medium, or low');
  });
});

describe('validateDraftMinutesCardInfo', () => {
  const validInfo: DraftMinutesCardInfo = {
    id: 'min_123',
    title: 'Meeting',
    date: '2024-01-15',
    previewUrl: 'https://example.com/preview',
    approveUrl: 'https://example.com/approve',
  };

  it('should pass for valid info', () => {
    expect(validateDraftMinutesCardInfo(validInfo)).toBe(true);
  });

  it('should throw for empty preview URL', () => {
    expect(() =>
      validateDraftMinutesCardInfo({ ...validInfo, previewUrl: '' })
    ).toThrow('Preview URL is required');
  });

  it('should throw for empty approve URL', () => {
    expect(() =>
      validateDraftMinutesCardInfo({ ...validInfo, approveUrl: '  ' })
    ).toThrow('Approve URL is required');
  });
});
