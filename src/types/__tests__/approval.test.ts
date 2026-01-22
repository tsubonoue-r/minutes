/**
 * Approval types unit tests
 * @module types/__tests__/approval.test
 */

import { describe, it, expect } from 'vitest';
import {
  APPROVAL_STATUS,
  APPROVAL_ACTION,
  ApprovalRequestSchema,
  ApprovalHistoryEntrySchema,
  CreateApprovalRequestSchema,
  ResolveApprovalRequestSchema,
  ApprovalFiltersSchema,
  generateApprovalId,
  createApprovalRequest,
  createApprovalHistoryEntry,
  getNextStatus,
  isValidTransition,
  canUserApprove,
  canUserWithdraw,
  getStatusLabel,
  getActionLabel,
  calculateApprovalStats,
  filterApprovalRequests,
  validateApprovalRequest,
  validateCreateApprovalRequest,
  validateResolveApprovalRequest,
  validateApprovalFilters,
  type ApprovalRequest,
} from '../approval';

// =============================================================================
// Test Data
// =============================================================================

const createTestRequest = (overrides?: Partial<ApprovalRequest>): ApprovalRequest => ({
  id: 'apr_123',
  minutesId: 'min_123',
  meetingId: 'meeting_456',
  title: 'Test Minutes',
  status: APPROVAL_STATUS.PENDING_APPROVAL,
  requesterId: 'user_1',
  requesterName: 'Suzuki',
  approvers: [{ id: 'approver_1', name: 'Tanaka' }],
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  ...overrides,
});

// =============================================================================
// Schema Validation Tests
// =============================================================================

describe('Zod Schemas', () => {
  describe('ApprovalRequestSchema', () => {
    it('should validate a valid approval request', () => {
      const request = createTestRequest();
      const result = ApprovalRequestSchema.safeParse(request);

      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const request = { ...createTestRequest(), status: 'invalid_status' };
      const result = ApprovalRequestSchema.safeParse(request);

      expect(result.success).toBe(false);
    });

    it('should reject empty approvers array', () => {
      const request = { ...createTestRequest(), approvers: [] };
      const result = ApprovalRequestSchema.safeParse(request);

      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const request = createTestRequest({
        requestComment: 'Please review',
        submittedAt: '2024-01-15T10:00:00.000Z',
        resolvedAt: '2024-01-15T11:00:00.000Z',
        resolvedById: 'approver_1',
        resolvedByName: 'Tanaka',
        resolutionComment: 'Approved!',
      });
      const result = ApprovalRequestSchema.safeParse(request);

      expect(result.success).toBe(true);
    });
  });

  describe('ApprovalHistoryEntrySchema', () => {
    it('should validate a valid history entry', () => {
      const entry = {
        id: 'ahst_123',
        approvalRequestId: 'apr_123',
        action: APPROVAL_ACTION.SUBMIT,
        actorId: 'user_1',
        actorName: 'Suzuki',
        previousStatus: APPROVAL_STATUS.DRAFT,
        newStatus: APPROVAL_STATUS.PENDING_APPROVAL,
        timestamp: '2024-01-15T10:00:00.000Z',
      };
      const result = ApprovalHistoryEntrySchema.safeParse(entry);

      expect(result.success).toBe(true);
    });

    it('should accept optional comment', () => {
      const entry = {
        id: 'ahst_123',
        approvalRequestId: 'apr_123',
        action: APPROVAL_ACTION.APPROVE,
        actorId: 'approver_1',
        actorName: 'Tanaka',
        previousStatus: APPROVAL_STATUS.PENDING_APPROVAL,
        newStatus: APPROVAL_STATUS.APPROVED,
        comment: 'Looks good!',
        timestamp: '2024-01-15T11:00:00.000Z',
      };
      const result = ApprovalHistoryEntrySchema.safeParse(entry);

      expect(result.success).toBe(true);
    });
  });

  describe('CreateApprovalRequestSchema', () => {
    it('should validate valid input', () => {
      const input = {
        minutesId: 'min_123',
        meetingId: 'meeting_456',
        title: 'Test Minutes',
        approvers: [{ id: 'approver_1', name: 'Tanaka' }],
      };
      const result = CreateApprovalRequestSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should default sendNotification to true', () => {
      const input = {
        minutesId: 'min_123',
        meetingId: 'meeting_456',
        title: 'Test Minutes',
        approvers: [{ id: 'approver_1', name: 'Tanaka' }],
      };
      const result = CreateApprovalRequestSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sendNotification).toBe(true);
      }
    });

    it('should reject comment over 1000 characters', () => {
      const input = {
        minutesId: 'min_123',
        meetingId: 'meeting_456',
        title: 'Test Minutes',
        approvers: [{ id: 'approver_1', name: 'Tanaka' }],
        comment: 'x'.repeat(1001),
      };
      const result = CreateApprovalRequestSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('ResolveApprovalRequestSchema', () => {
    it('should validate approve action', () => {
      const input = {
        approvalRequestId: 'apr_123',
        action: APPROVAL_ACTION.APPROVE,
      };
      const result = ResolveApprovalRequestSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should validate reject action', () => {
      const input = {
        approvalRequestId: 'apr_123',
        action: APPROVAL_ACTION.REJECT,
        comment: 'Needs more detail',
      };
      const result = ResolveApprovalRequestSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should reject submit action (only approve/reject allowed)', () => {
      const input = {
        approvalRequestId: 'apr_123',
        action: APPROVAL_ACTION.SUBMIT,
      };
      const result = ResolveApprovalRequestSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe('ApprovalFiltersSchema', () => {
    it('should validate empty filters', () => {
      const result = ApprovalFiltersSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate all filter options', () => {
      const filters = {
        status: APPROVAL_STATUS.PENDING_APPROVAL,
        requesterId: 'user_1',
        approverId: 'approver_1',
        minutesId: 'min_123',
        meetingId: 'meeting_456',
        fromDate: '2024-01-01T00:00:00.000Z',
        toDate: '2024-12-31T23:59:59.000Z',
      };
      const result = ApprovalFiltersSchema.safeParse(filters);

      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('Utility Functions', () => {
  describe('generateApprovalId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateApprovalId();
      const id2 = generateApprovalId();

      expect(id1).not.toBe(id2);
    });

    it('should use default prefix', () => {
      const id = generateApprovalId();
      expect(id).toMatch(/^apr_/);
    });

    it('should use custom prefix', () => {
      const id = generateApprovalId('custom');
      expect(id).toMatch(/^custom_/);
    });
  });

  describe('createApprovalRequest', () => {
    it('should create a draft approval request', () => {
      const input = {
        minutesId: 'min_123',
        meetingId: 'meeting_456',
        title: 'Test Minutes',
        approvers: [{ id: 'approver_1', name: 'Tanaka' }],
        comment: 'Please review',
        sendNotification: true,
      };
      const request = createApprovalRequest(input, 'user_1', 'Suzuki');

      expect(request.id).toMatch(/^apr_/);
      expect(request.minutesId).toBe('min_123');
      expect(request.status).toBe(APPROVAL_STATUS.DRAFT);
      expect(request.requesterId).toBe('user_1');
      expect(request.requesterName).toBe('Suzuki');
      expect(request.requestComment).toBe('Please review');
    });
  });

  describe('createApprovalHistoryEntry', () => {
    it('should create a history entry', () => {
      const entry = createApprovalHistoryEntry(
        'apr_123',
        APPROVAL_ACTION.APPROVE,
        'approver_1',
        'Tanaka',
        APPROVAL_STATUS.PENDING_APPROVAL,
        APPROVAL_STATUS.APPROVED,
        'Looks good!'
      );

      expect(entry.id).toMatch(/^ahst_/);
      expect(entry.approvalRequestId).toBe('apr_123');
      expect(entry.action).toBe(APPROVAL_ACTION.APPROVE);
      expect(entry.actorId).toBe('approver_1');
      expect(entry.comment).toBe('Looks good!');
    });

    it('should create entry without comment', () => {
      const entry = createApprovalHistoryEntry(
        'apr_123',
        APPROVAL_ACTION.SUBMIT,
        'user_1',
        'Suzuki',
        APPROVAL_STATUS.DRAFT,
        APPROVAL_STATUS.PENDING_APPROVAL
      );

      expect(entry.comment).toBeUndefined();
    });
  });

  describe('getNextStatus', () => {
    it('should return pending_approval when submitting from draft', () => {
      const nextStatus = getNextStatus(APPROVAL_STATUS.DRAFT, APPROVAL_ACTION.SUBMIT);
      expect(nextStatus).toBe(APPROVAL_STATUS.PENDING_APPROVAL);
    });

    it('should return approved when approving', () => {
      const nextStatus = getNextStatus(APPROVAL_STATUS.PENDING_APPROVAL, APPROVAL_ACTION.APPROVE);
      expect(nextStatus).toBe(APPROVAL_STATUS.APPROVED);
    });

    it('should return rejected when rejecting', () => {
      const nextStatus = getNextStatus(APPROVAL_STATUS.PENDING_APPROVAL, APPROVAL_ACTION.REJECT);
      expect(nextStatus).toBe(APPROVAL_STATUS.REJECTED);
    });

    it('should return draft when withdrawing', () => {
      const nextStatus = getNextStatus(APPROVAL_STATUS.PENDING_APPROVAL, APPROVAL_ACTION.WITHDRAW);
      expect(nextStatus).toBe(APPROVAL_STATUS.DRAFT);
    });

    it('should return null for invalid transitions', () => {
      const nextStatus = getNextStatus(APPROVAL_STATUS.APPROVED, APPROVAL_ACTION.APPROVE);
      expect(nextStatus).toBeNull();
    });

    it('should allow resubmitting from rejected', () => {
      const nextStatus = getNextStatus(APPROVAL_STATUS.REJECTED, APPROVAL_ACTION.SUBMIT);
      expect(nextStatus).toBe(APPROVAL_STATUS.PENDING_APPROVAL);
    });
  });

  describe('isValidTransition', () => {
    it('should return true for valid transitions', () => {
      expect(isValidTransition(APPROVAL_STATUS.DRAFT, APPROVAL_ACTION.SUBMIT)).toBe(true);
      expect(isValidTransition(APPROVAL_STATUS.PENDING_APPROVAL, APPROVAL_ACTION.APPROVE)).toBe(true);
      expect(isValidTransition(APPROVAL_STATUS.PENDING_APPROVAL, APPROVAL_ACTION.REJECT)).toBe(true);
      expect(isValidTransition(APPROVAL_STATUS.PENDING_APPROVAL, APPROVAL_ACTION.WITHDRAW)).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(isValidTransition(APPROVAL_STATUS.DRAFT, APPROVAL_ACTION.APPROVE)).toBe(false);
      expect(isValidTransition(APPROVAL_STATUS.APPROVED, APPROVAL_ACTION.REJECT)).toBe(false);
      expect(isValidTransition(APPROVAL_STATUS.REJECTED, APPROVAL_ACTION.WITHDRAW)).toBe(false);
    });
  });

  describe('canUserApprove', () => {
    it('should return true if user is an approver and status is pending', () => {
      const request = createTestRequest({
        status: APPROVAL_STATUS.PENDING_APPROVAL,
        approvers: [{ id: 'approver_1', name: 'Tanaka' }],
      });

      expect(canUserApprove(request, 'approver_1')).toBe(true);
    });

    it('should return false if user is not an approver', () => {
      const request = createTestRequest({
        status: APPROVAL_STATUS.PENDING_APPROVAL,
        approvers: [{ id: 'approver_1', name: 'Tanaka' }],
      });

      expect(canUserApprove(request, 'other_user')).toBe(false);
    });

    it('should return false if status is not pending', () => {
      const request = createTestRequest({
        status: APPROVAL_STATUS.APPROVED,
        approvers: [{ id: 'approver_1', name: 'Tanaka' }],
      });

      expect(canUserApprove(request, 'approver_1')).toBe(false);
    });
  });

  describe('canUserWithdraw', () => {
    it('should return true if user is the requester and status is pending', () => {
      const request = createTestRequest({
        status: APPROVAL_STATUS.PENDING_APPROVAL,
        requesterId: 'user_1',
      });

      expect(canUserWithdraw(request, 'user_1')).toBe(true);
    });

    it('should return false if user is not the requester', () => {
      const request = createTestRequest({
        status: APPROVAL_STATUS.PENDING_APPROVAL,
        requesterId: 'user_1',
      });

      expect(canUserWithdraw(request, 'other_user')).toBe(false);
    });

    it('should return false if status is not pending', () => {
      const request = createTestRequest({
        status: APPROVAL_STATUS.DRAFT,
        requesterId: 'user_1',
      });

      expect(canUserWithdraw(request, 'user_1')).toBe(false);
    });
  });

  describe('getStatusLabel', () => {
    it('should return Japanese labels', () => {
      expect(getStatusLabel(APPROVAL_STATUS.DRAFT, 'ja')).toBe('下書き');
      expect(getStatusLabel(APPROVAL_STATUS.PENDING_APPROVAL, 'ja')).toBe('承認待ち');
      expect(getStatusLabel(APPROVAL_STATUS.APPROVED, 'ja')).toBe('承認済み');
      expect(getStatusLabel(APPROVAL_STATUS.REJECTED, 'ja')).toBe('却下');
    });

    it('should return English labels', () => {
      expect(getStatusLabel(APPROVAL_STATUS.DRAFT, 'en')).toBe('Draft');
      expect(getStatusLabel(APPROVAL_STATUS.PENDING_APPROVAL, 'en')).toBe('Pending Approval');
      expect(getStatusLabel(APPROVAL_STATUS.APPROVED, 'en')).toBe('Approved');
      expect(getStatusLabel(APPROVAL_STATUS.REJECTED, 'en')).toBe('Rejected');
    });

    it('should default to Japanese', () => {
      expect(getStatusLabel(APPROVAL_STATUS.APPROVED)).toBe('承認済み');
    });
  });

  describe('getActionLabel', () => {
    it('should return Japanese labels', () => {
      expect(getActionLabel(APPROVAL_ACTION.SUBMIT, 'ja')).toBe('承認依頼');
      expect(getActionLabel(APPROVAL_ACTION.APPROVE, 'ja')).toBe('承認');
      expect(getActionLabel(APPROVAL_ACTION.REJECT, 'ja')).toBe('却下');
      expect(getActionLabel(APPROVAL_ACTION.WITHDRAW, 'ja')).toBe('取り下げ');
    });

    it('should return English labels', () => {
      expect(getActionLabel(APPROVAL_ACTION.SUBMIT, 'en')).toBe('Submit for Approval');
      expect(getActionLabel(APPROVAL_ACTION.APPROVE, 'en')).toBe('Approve');
      expect(getActionLabel(APPROVAL_ACTION.REJECT, 'en')).toBe('Reject');
      expect(getActionLabel(APPROVAL_ACTION.WITHDRAW, 'en')).toBe('Withdraw');
    });
  });

  describe('calculateApprovalStats', () => {
    it('should calculate stats correctly', () => {
      const requests: ApprovalRequest[] = [
        createTestRequest({ status: APPROVAL_STATUS.DRAFT }),
        createTestRequest({ status: APPROVAL_STATUS.PENDING_APPROVAL }),
        createTestRequest({ status: APPROVAL_STATUS.PENDING_APPROVAL }),
        createTestRequest({
          status: APPROVAL_STATUS.APPROVED,
          submittedAt: '2024-01-15T10:00:00.000Z',
          resolvedAt: '2024-01-15T11:00:00.000Z',
        }),
        createTestRequest({ status: APPROVAL_STATUS.REJECTED }),
      ];

      const stats = calculateApprovalStats(requests);

      expect(stats.total).toBe(5);
      expect(stats.draft).toBe(1);
      expect(stats.pendingApproval).toBe(2);
      expect(stats.approved).toBe(1);
      expect(stats.rejected).toBe(1);
      expect(stats.avgApprovalTimeMs).toBe(3600000); // 1 hour
    });

    it('should handle empty array', () => {
      const stats = calculateApprovalStats([]);

      expect(stats.total).toBe(0);
      expect(stats.avgApprovalTimeMs).toBeUndefined();
    });
  });

  describe('filterApprovalRequests', () => {
    const requests: ApprovalRequest[] = [
      createTestRequest({
        id: 'apr_1',
        status: APPROVAL_STATUS.PENDING_APPROVAL,
        requesterId: 'user_1',
        minutesId: 'min_1',
        approvers: [{ id: 'approver_1', name: 'Tanaka' }],
      }),
      createTestRequest({
        id: 'apr_2',
        status: APPROVAL_STATUS.APPROVED,
        requesterId: 'user_2',
        minutesId: 'min_2',
        approvers: [{ id: 'approver_2', name: 'Yamada' }],
      }),
    ];

    it('should filter by status', () => {
      const filtered = filterApprovalRequests(requests, { status: APPROVAL_STATUS.PENDING_APPROVAL });
      expect(filtered.length).toBe(1);
      expect(filtered[0]?.id).toBe('apr_1');
    });

    it('should filter by requesterId', () => {
      const filtered = filterApprovalRequests(requests, { requesterId: 'user_2' });
      expect(filtered.length).toBe(1);
      expect(filtered[0]?.id).toBe('apr_2');
    });

    it('should filter by approverId', () => {
      const filtered = filterApprovalRequests(requests, { approverId: 'approver_1' });
      expect(filtered.length).toBe(1);
      expect(filtered[0]?.id).toBe('apr_1');
    });

    it('should filter by minutesId', () => {
      const filtered = filterApprovalRequests(requests, { minutesId: 'min_2' });
      expect(filtered.length).toBe(1);
      expect(filtered[0]?.id).toBe('apr_2');
    });

    it('should return all when no filters', () => {
      const filtered = filterApprovalRequests(requests, {});
      expect(filtered.length).toBe(2);
    });

    it('should combine multiple filters', () => {
      const filtered = filterApprovalRequests(requests, {
        status: APPROVAL_STATUS.PENDING_APPROVAL,
        requesterId: 'user_1',
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0]?.id).toBe('apr_1');
    });
  });
});

// =============================================================================
// Validation Function Tests
// =============================================================================

describe('Validation Functions', () => {
  describe('validateApprovalRequest', () => {
    it('should return success for valid request', () => {
      const result = validateApprovalRequest(createTestRequest());
      expect(result.success).toBe(true);
    });

    it('should return error for invalid request', () => {
      const result = validateApprovalRequest({ invalid: 'data' });
      expect(result.success).toBe(false);
    });
  });

  describe('validateCreateApprovalRequest', () => {
    it('should return success for valid input', () => {
      const input = {
        minutesId: 'min_123',
        meetingId: 'meeting_456',
        title: 'Test',
        approvers: [{ id: 'a1', name: 'Tanaka' }],
      };
      const result = validateCreateApprovalRequest(input);
      expect(result.success).toBe(true);
    });

    it('should return error for missing required fields', () => {
      const result = validateCreateApprovalRequest({ minutesId: 'min_123' });
      expect(result.success).toBe(false);
    });
  });

  describe('validateResolveApprovalRequest', () => {
    it('should return success for valid resolve input', () => {
      const input = {
        approvalRequestId: 'apr_123',
        action: APPROVAL_ACTION.APPROVE,
      };
      const result = validateResolveApprovalRequest(input);
      expect(result.success).toBe(true);
    });

    it('should return error for invalid action', () => {
      const input = {
        approvalRequestId: 'apr_123',
        action: 'invalid',
      };
      const result = validateResolveApprovalRequest(input);
      expect(result.success).toBe(false);
    });
  });

  describe('validateApprovalFilters', () => {
    it('should return success for valid filters', () => {
      const result = validateApprovalFilters({
        status: APPROVAL_STATUS.APPROVED,
      });
      expect(result.success).toBe(true);
    });

    it('should return success for empty filters', () => {
      const result = validateApprovalFilters({});
      expect(result.success).toBe(true);
    });
  });
});
