/**
 * Lark Card Templates unit tests
 * @module lib/lark/__tests__/card-templates.test
 */

import { describe, it, expect } from 'vitest';
import {
  createMinutesCompletedCard,
  createMinutesDraftCard,
  createActionItemAssignedCard,
  createApprovalRequestCard,
  createApprovalResultCard,
  validateMinutesCardInfo,
  validateActionItemCardInfo,
  validateDraftMinutesCardInfo,
  validateApprovalRequestCardInfo,
  validateApprovalResultCardInfo,
  type MinutesCardInfo,
  type ActionItemCardInfo,
  type DraftMinutesCardInfo,
  type ApprovalRequestCardInfo,
  type ApprovalResultCardInfo,
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

// =============================================================================
// Approval Request Card Tests
// =============================================================================

describe('createApprovalRequestCard', () => {
  const validApprovalRequestInfo: ApprovalRequestCardInfo = {
    id: 'apr_123',
    title: 'Weekly Sync Minutes',
    date: '2024-01-15',
    requesterName: 'Suzuki',
    comment: 'Please review and approve',
    minutesUrl: '/meetings/meeting_456/minutes',
    approvalUrl: '/api/approvals/apr_123',
  };

  it('should create approval request card with Japanese labels', () => {
    const card = createApprovalRequestCard(validApprovalRequestInfo, 'ja');

    expect(card.header).toBeDefined();
    expect(card.header?.title.content).toBe('承認リクエスト');
    expect(card.header?.template).toBe('orange');
    expect(card.elements.length).toBeGreaterThan(0);
  });

  it('should create approval request card with English labels', () => {
    const card = createApprovalRequestCard(validApprovalRequestInfo, 'en');

    expect(card.header?.title.content).toBe('Approval Request');
    expect(card.header?.template).toBe('orange');
  });

  it('should include description, title, date, and requester information', () => {
    const card = createApprovalRequestCard(validApprovalRequestInfo, 'ja');

    const divElements = card.elements.filter((e) => e.tag === 'div');
    const elementContents = divElements
      .map((e) => {
        if (e.tag === 'div' && 'text' in e) {
          return e.text.content;
        }
        return '';
      })
      .join(' ');

    expect(elementContents).toContain('Weekly Sync Minutes');
    expect(elementContents).toContain('Suzuki');
    expect(elementContents).toContain('承認が依頼されています');
  });

  it('should include comment when provided', () => {
    const card = createApprovalRequestCard(validApprovalRequestInfo, 'ja');

    const divElements = card.elements.filter((e) => e.tag === 'div');
    const elementContents = divElements
      .map((e) => {
        if (e.tag === 'div' && 'text' in e) {
          return e.text.content;
        }
        return '';
      })
      .join(' ');

    expect(elementContents).toContain('Please review and approve');
  });

  it('should not include comment when not provided', () => {
    const infoWithoutComment = {
      ...validApprovalRequestInfo,
      comment: undefined,
    };
    const card = createApprovalRequestCard(infoWithoutComment, 'ja');

    const divElements = card.elements.filter((e) => e.tag === 'div');
    const commentElements = divElements.filter(
      (e) =>
        e.tag === 'div' &&
        'text' in e &&
        e.text.content.includes('Please review and approve')
    );
    expect(commentElements.length).toBe(0);
  });

  it('should include view and approve buttons', () => {
    const card = createApprovalRequestCard(validApprovalRequestInfo, 'ja');

    const actionElement = card.elements.find((e) => e.tag === 'action');
    expect(actionElement).toBeDefined();

    if (actionElement?.tag === 'action') {
      expect(actionElement.actions.length).toBe(2);

      const viewButton = actionElement.actions.find(
        (a) => a.url === validApprovalRequestInfo.minutesUrl
      );
      const approveButton = actionElement.actions.find(
        (a) => a.url === validApprovalRequestInfo.approvalUrl
      );

      expect(viewButton).toBeDefined();
      expect(viewButton?.type).toBe('default');
      expect(approveButton).toBeDefined();
      expect(approveButton?.type).toBe('primary');
    }
  });

  it('should default to Japanese language', () => {
    const card = createApprovalRequestCard(validApprovalRequestInfo);

    expect(card.header?.title.content).toBe('承認リクエスト');
  });
});

// =============================================================================
// Approval Result Card Tests
// =============================================================================

describe('createApprovalResultCard', () => {
  const validApprovedInfo: ApprovalResultCardInfo = {
    id: 'apr_123',
    title: 'Weekly Sync Minutes',
    date: '2024-01-15',
    approverName: 'Tanaka',
    result: 'approved',
    comment: 'Looks good!',
    minutesUrl: '/meetings/meeting_456/minutes',
  };

  const validRejectedInfo: ApprovalResultCardInfo = {
    ...validApprovedInfo,
    result: 'rejected',
    comment: 'Missing action items',
  };

  it('should create approved result card with green header', () => {
    const card = createApprovalResultCard(validApprovedInfo, 'ja');

    expect(card.header?.title.content).toBe('承認完了');
    expect(card.header?.template).toBe('green');
  });

  it('should create rejected result card with red header', () => {
    const card = createApprovalResultCard(validRejectedInfo, 'ja');

    expect(card.header?.title.content).toBe('差し戻し');
    expect(card.header?.template).toBe('red');
  });

  it('should create approved result card with English labels', () => {
    const card = createApprovalResultCard(validApprovedInfo, 'en');

    expect(card.header?.title.content).toBe('Approved');
    expect(card.header?.template).toBe('green');
  });

  it('should create rejected result card with English labels', () => {
    const card = createApprovalResultCard(validRejectedInfo, 'en');

    expect(card.header?.title.content).toBe('Rejected');
    expect(card.header?.template).toBe('red');
  });

  it('should include approval description for approved result', () => {
    const card = createApprovalResultCard(validApprovedInfo, 'ja');

    const divElements = card.elements.filter((e) => e.tag === 'div');
    const elementContents = divElements
      .map((e) => {
        if (e.tag === 'div' && 'text' in e) {
          return e.text.content;
        }
        return '';
      })
      .join(' ');

    expect(elementContents).toContain('承認されました');
  });

  it('should include rejection description for rejected result', () => {
    const card = createApprovalResultCard(validRejectedInfo, 'ja');

    const divElements = card.elements.filter((e) => e.tag === 'div');
    const elementContents = divElements
      .map((e) => {
        if (e.tag === 'div' && 'text' in e) {
          return e.text.content;
        }
        return '';
      })
      .join(' ');

    expect(elementContents).toContain('差し戻されました');
  });

  it('should include approver name and result status', () => {
    const card = createApprovalResultCard(validApprovedInfo, 'ja');

    const divElements = card.elements.filter((e) => e.tag === 'div');
    const elementContents = divElements
      .map((e) => {
        if (e.tag === 'div' && 'text' in e) {
          return e.text.content;
        }
        return '';
      })
      .join(' ');

    expect(elementContents).toContain('Tanaka');
    expect(elementContents).toContain('承認');
  });

  it('should include comment when provided', () => {
    const card = createApprovalResultCard(validApprovedInfo, 'ja');

    const divElements = card.elements.filter((e) => e.tag === 'div');
    const elementContents = divElements
      .map((e) => {
        if (e.tag === 'div' && 'text' in e) {
          return e.text.content;
        }
        return '';
      })
      .join(' ');

    expect(elementContents).toContain('Looks good!');
  });

  it('should show no comment message when comment is not provided', () => {
    const infoWithoutComment: ApprovalResultCardInfo = {
      ...validApprovedInfo,
      comment: undefined,
    };
    const card = createApprovalResultCard(infoWithoutComment, 'ja');

    const divElements = card.elements.filter((e) => e.tag === 'div');
    const elementContents = divElements
      .map((e) => {
        if (e.tag === 'div' && 'text' in e) {
          return e.text.content;
        }
        return '';
      })
      .join(' ');

    expect(elementContents).toContain('コメントなし');
  });

  it('should show no comment message for English when comment is empty', () => {
    const infoWithEmptyComment: ApprovalResultCardInfo = {
      ...validApprovedInfo,
      comment: '  ',
    };
    const card = createApprovalResultCard(infoWithEmptyComment, 'en');

    const divElements = card.elements.filter((e) => e.tag === 'div');
    const elementContents = divElements
      .map((e) => {
        if (e.tag === 'div' && 'text' in e) {
          return e.text.content;
        }
        return '';
      })
      .join(' ');

    expect(elementContents).toContain('No comment');
  });

  it('should include view minutes button', () => {
    const card = createApprovalResultCard(validApprovedInfo, 'ja');

    const actionElement = card.elements.find((e) => e.tag === 'action');
    expect(actionElement).toBeDefined();

    if (actionElement?.tag === 'action') {
      expect(actionElement.actions.length).toBe(1);
      const viewButton = actionElement.actions[0];
      expect(viewButton?.url).toBe(validApprovedInfo.minutesUrl);
      expect(viewButton?.type).toBe('default');
    }
  });

  it('should default to Japanese language', () => {
    const card = createApprovalResultCard(validApprovedInfo);

    expect(card.header?.title.content).toBe('承認完了');
  });
});

// =============================================================================
// Approval Card Validation Tests
// =============================================================================

describe('validateApprovalRequestCardInfo', () => {
  const validInfo: ApprovalRequestCardInfo = {
    id: 'apr_123',
    title: 'Weekly Sync Minutes',
    date: '2024-01-15',
    requesterName: 'Suzuki',
    minutesUrl: '/meetings/meeting_456/minutes',
    approvalUrl: '/api/approvals/apr_123',
  };

  it('should pass for valid info', () => {
    expect(validateApprovalRequestCardInfo(validInfo)).toBe(true);
  });

  it('should pass for valid info with optional comment', () => {
    expect(
      validateApprovalRequestCardInfo({ ...validInfo, comment: 'Please review' })
    ).toBe(true);
  });

  it('should throw for empty id', () => {
    expect(() =>
      validateApprovalRequestCardInfo({ ...validInfo, id: '' })
    ).toThrow('Approval request ID is required');
  });

  it('should throw for empty title', () => {
    expect(() =>
      validateApprovalRequestCardInfo({ ...validInfo, title: '  ' })
    ).toThrow('Minutes title is required');
  });

  it('should throw for invalid date format', () => {
    expect(() =>
      validateApprovalRequestCardInfo({ ...validInfo, date: '2024/01/15' })
    ).toThrow('Date must be in YYYY-MM-DD format');
  });

  it('should throw for empty requester name', () => {
    expect(() =>
      validateApprovalRequestCardInfo({ ...validInfo, requesterName: '' })
    ).toThrow('Requester name is required');
  });

  it('should throw for empty minutes URL', () => {
    expect(() =>
      validateApprovalRequestCardInfo({ ...validInfo, minutesUrl: '' })
    ).toThrow('Minutes URL is required');
  });

  it('should throw for empty approval URL', () => {
    expect(() =>
      validateApprovalRequestCardInfo({ ...validInfo, approvalUrl: '  ' })
    ).toThrow('Approval URL is required');
  });
});

describe('validateApprovalResultCardInfo', () => {
  const validInfo: ApprovalResultCardInfo = {
    id: 'apr_123',
    title: 'Weekly Sync Minutes',
    date: '2024-01-15',
    approverName: 'Tanaka',
    result: 'approved',
    minutesUrl: '/meetings/meeting_456/minutes',
  };

  it('should pass for valid approved info', () => {
    expect(validateApprovalResultCardInfo(validInfo)).toBe(true);
  });

  it('should pass for valid rejected info', () => {
    expect(
      validateApprovalResultCardInfo({ ...validInfo, result: 'rejected' })
    ).toBe(true);
  });

  it('should pass for valid info with comment', () => {
    expect(
      validateApprovalResultCardInfo({ ...validInfo, comment: 'Looks good' })
    ).toBe(true);
  });

  it('should throw for empty id', () => {
    expect(() =>
      validateApprovalResultCardInfo({ ...validInfo, id: '' })
    ).toThrow('Approval request ID is required');
  });

  it('should throw for empty title', () => {
    expect(() =>
      validateApprovalResultCardInfo({ ...validInfo, title: '  ' })
    ).toThrow('Minutes title is required');
  });

  it('should throw for invalid date format', () => {
    expect(() =>
      validateApprovalResultCardInfo({ ...validInfo, date: 'Jan 15, 2024' })
    ).toThrow('Date must be in YYYY-MM-DD format');
  });

  it('should throw for empty approver name', () => {
    expect(() =>
      validateApprovalResultCardInfo({ ...validInfo, approverName: '' })
    ).toThrow('Approver name is required');
  });

  it('should throw for invalid result value', () => {
    expect(() =>
      validateApprovalResultCardInfo({
        ...validInfo,
        result: 'pending' as 'approved',
      })
    ).toThrow('Result must be approved or rejected');
  });

  it('should throw for empty minutes URL', () => {
    expect(() =>
      validateApprovalResultCardInfo({ ...validInfo, minutesUrl: '' })
    ).toThrow('Minutes URL is required');
  });
});
