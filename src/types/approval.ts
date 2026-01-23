/**
 * Approval workflow type definitions with Zod schemas
 * @module types/approval
 */

import { z, type ZodSafeParseResult } from 'zod';

// =============================================================================
// Enums and Constants
// =============================================================================

/**
 * Approval status values representing the workflow states
 */
export const APPROVAL_STATUS = {
  /** Initial draft state */
  DRAFT: 'draft',
  /** Awaiting approval */
  PENDING_APPROVAL: 'pending_approval',
  /** Approved by approver */
  APPROVED: 'approved',
  /** Rejected by approver */
  REJECTED: 'rejected',
} as const;

/**
 * Approval action types
 */
export const APPROVAL_ACTION = {
  /** Submit for approval */
  SUBMIT: 'submit',
  /** Approve the request */
  APPROVE: 'approve',
  /** Reject the request */
  REJECT: 'reject',
  /** Withdraw/cancel the request */
  WITHDRAW: 'withdraw',
} as const;

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Schema for approval status
 */
export const ApprovalStatusSchema = z.enum([
  APPROVAL_STATUS.DRAFT,
  APPROVAL_STATUS.PENDING_APPROVAL,
  APPROVAL_STATUS.APPROVED,
  APPROVAL_STATUS.REJECTED,
]);

/**
 * Schema for approval action
 */
export const ApprovalActionSchema = z.enum([
  APPROVAL_ACTION.SUBMIT,
  APPROVAL_ACTION.APPROVE,
  APPROVAL_ACTION.REJECT,
  APPROVAL_ACTION.WITHDRAW,
]);

/**
 * Schema for approver information
 */
export const ApproverSchema = z.object({
  /** Unique approver identifier (user ID) */
  id: z.string().min(1),
  /** Approver display name */
  name: z.string().min(1),
  /** Approver email address */
  email: z.string().email().optional(),
  /** Lark open_id for notifications */
  larkOpenId: z.string().optional(),
});

/**
 * Schema for approval request
 */
export const ApprovalRequestSchema = z.object({
  /** Unique approval request identifier */
  id: z.string().min(1),
  /** Minutes ID this approval is for */
  minutesId: z.string().min(1),
  /** Meeting ID associated with the minutes */
  meetingId: z.string().min(1),
  /** Title of the minutes (for display) */
  title: z.string().min(1),
  /** Current approval status */
  status: ApprovalStatusSchema,
  /** User who requested the approval */
  requesterId: z.string().min(1),
  /** Requester display name */
  requesterName: z.string().min(1),
  /** Designated approvers */
  approvers: z.array(ApproverSchema).min(1),
  /** Optional comment from requester */
  requestComment: z.string().max(1000).optional(),
  /** Created timestamp (ISO 8601) */
  createdAt: z.string().datetime({ offset: true }),
  /** Updated timestamp (ISO 8601) */
  updatedAt: z.string().datetime({ offset: true }),
  /** Submitted timestamp (ISO 8601) */
  submittedAt: z.string().datetime({ offset: true }).optional(),
  /** Resolved timestamp (ISO 8601) - when approved/rejected */
  resolvedAt: z.string().datetime({ offset: true }).optional(),
  /** ID of the approver who resolved the request */
  resolvedById: z.string().optional(),
  /** Name of the approver who resolved the request */
  resolvedByName: z.string().optional(),
  /** Comment from approver on approval/rejection */
  resolutionComment: z.string().max(1000).optional(),
});

/**
 * Schema for approval history entry
 */
export const ApprovalHistoryEntrySchema = z.object({
  /** Unique history entry identifier */
  id: z.string().min(1),
  /** Associated approval request ID */
  approvalRequestId: z.string().min(1),
  /** Action performed */
  action: ApprovalActionSchema,
  /** User who performed the action */
  actorId: z.string().min(1),
  /** Actor display name */
  actorName: z.string().min(1),
  /** Previous status before action */
  previousStatus: ApprovalStatusSchema,
  /** New status after action */
  newStatus: ApprovalStatusSchema,
  /** Optional comment for this action */
  comment: z.string().max(1000).optional(),
  /** Timestamp of the action (ISO 8601) */
  timestamp: z.string().datetime({ offset: true }),
});

/**
 * Schema for approval request creation input
 */
export const CreateApprovalRequestSchema = z.object({
  /** Minutes ID to request approval for */
  minutesId: z.string().min(1),
  /** Meeting ID associated with the minutes */
  meetingId: z.string().min(1),
  /** Title of the minutes */
  title: z.string().min(1),
  /** Approvers to assign */
  approvers: z.array(ApproverSchema).min(1),
  /** Optional comment from requester */
  comment: z.string().max(1000).optional(),
  /** Whether to send notification to approvers */
  sendNotification: z.boolean().default(true),
});

/**
 * Schema for submit approval action input
 */
export const SubmitApprovalRequestSchema = z.object({
  /** Approval request ID */
  approvalRequestId: z.string().min(1),
  /** Optional comment */
  comment: z.string().max(1000).optional(),
  /** Whether to send notification */
  sendNotification: z.boolean().default(true),
});

/**
 * Schema for approve/reject action input
 */
export const ResolveApprovalRequestSchema = z.object({
  /** Approval request ID */
  approvalRequestId: z.string().min(1),
  /** Action: approve or reject */
  action: z.enum([APPROVAL_ACTION.APPROVE, APPROVAL_ACTION.REJECT]),
  /** Optional comment explaining the decision */
  comment: z.string().max(1000).optional(),
  /** Whether to send notification to requester */
  sendNotification: z.boolean().default(true),
});

/**
 * Schema for withdraw approval request input
 */
export const WithdrawApprovalRequestSchema = z.object({
  /** Approval request ID */
  approvalRequestId: z.string().min(1),
  /** Optional comment */
  comment: z.string().max(1000).optional(),
});

/**
 * Schema for approval filters
 */
export const ApprovalFiltersSchema = z.object({
  /** Filter by status */
  status: ApprovalStatusSchema.optional(),
  /** Filter by requester ID */
  requesterId: z.string().optional(),
  /** Filter by approver ID */
  approverId: z.string().optional(),
  /** Filter by minutes ID */
  minutesId: z.string().optional(),
  /** Filter by meeting ID */
  meetingId: z.string().optional(),
  /** Filter by date range start */
  fromDate: z.string().datetime({ offset: true }).optional(),
  /** Filter by date range end */
  toDate: z.string().datetime({ offset: true }).optional(),
});

/**
 * Schema for approval list response
 */
export const ApprovalListResponseSchema = z.object({
  /** List of approval requests */
  items: z.array(ApprovalRequestSchema),
  /** Total count matching filters */
  totalCount: z.number().int().nonnegative(),
  /** Current page (1-indexed) */
  page: z.number().int().positive(),
  /** Items per page */
  pageSize: z.number().int().positive(),
  /** Has more pages */
  hasMore: z.boolean(),
});

/**
 * Schema for approval history list response
 */
export const ApprovalHistoryListResponseSchema = z.object({
  /** List of history entries */
  items: z.array(ApprovalHistoryEntrySchema),
  /** Total count */
  totalCount: z.number().int().nonnegative(),
});

/**
 * Schema for approval stats
 */
export const ApprovalStatsSchema = z.object({
  /** Total requests */
  total: z.number().int().nonnegative(),
  /** Requests in draft status */
  draft: z.number().int().nonnegative(),
  /** Requests pending approval */
  pendingApproval: z.number().int().nonnegative(),
  /** Approved requests */
  approved: z.number().int().nonnegative(),
  /** Rejected requests */
  rejected: z.number().int().nonnegative(),
  /** Average time to approval (in milliseconds) */
  avgApprovalTimeMs: z.number().nonnegative().optional(),
});

// =============================================================================
// Types (inferred from Zod schemas)
// =============================================================================

/**
 * Approval status type
 */
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

/**
 * Approval action type
 */
export type ApprovalAction = z.infer<typeof ApprovalActionSchema>;

/**
 * Approver information
 */
export type Approver = z.infer<typeof ApproverSchema>;

/**
 * Approval request
 */
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

/**
 * Approval history entry
 */
export type ApprovalHistoryEntry = z.infer<typeof ApprovalHistoryEntrySchema>;

/**
 * Create approval request input
 */
export type CreateApprovalRequestInput = z.infer<typeof CreateApprovalRequestSchema>;

/**
 * Submit approval request input
 */
export type SubmitApprovalRequestInput = z.infer<typeof SubmitApprovalRequestSchema>;

/**
 * Resolve approval request input
 */
export type ResolveApprovalRequestInput = z.infer<typeof ResolveApprovalRequestSchema>;

/**
 * Withdraw approval request input
 */
export type WithdrawApprovalRequestInput = z.infer<typeof WithdrawApprovalRequestSchema>;

/**
 * Approval filters
 */
export type ApprovalFilters = z.infer<typeof ApprovalFiltersSchema>;

/**
 * Approval list response
 */
export type ApprovalListResponse = z.infer<typeof ApprovalListResponseSchema>;

/**
 * Approval history list response
 */
export type ApprovalHistoryListResponse = z.infer<typeof ApprovalHistoryListResponseSchema>;

/**
 * Approval stats
 */
export type ApprovalStats = z.infer<typeof ApprovalStatsSchema>;

// =============================================================================
// Readonly Types (for immutable usage)
// =============================================================================

/**
 * Read-only Approver type
 */
export interface ReadonlyApprover {
  readonly id: string;
  readonly name: string;
  readonly email?: string | undefined;
  readonly larkOpenId?: string | undefined;
}

/**
 * Read-only ApprovalRequest type
 */
export interface ReadonlyApprovalRequest {
  readonly id: string;
  readonly minutesId: string;
  readonly meetingId: string;
  readonly title: string;
  readonly status: ApprovalStatus;
  readonly requesterId: string;
  readonly requesterName: string;
  readonly approvers: readonly ReadonlyApprover[];
  readonly requestComment?: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly submittedAt?: string | undefined;
  readonly resolvedAt?: string | undefined;
  readonly resolvedById?: string | undefined;
  readonly resolvedByName?: string | undefined;
  readonly resolutionComment?: string | undefined;
}

/**
 * Read-only ApprovalHistoryEntry type
 */
export interface ReadonlyApprovalHistoryEntry {
  readonly id: string;
  readonly approvalRequestId: string;
  readonly action: ApprovalAction;
  readonly actorId: string;
  readonly actorName: string;
  readonly previousStatus: ApprovalStatus;
  readonly newStatus: ApprovalStatus;
  readonly comment?: string | undefined;
  readonly timestamp: string;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique approval ID
 *
 * @param prefix - Prefix for the ID (default: 'apr')
 * @returns Unique approval ID
 */
export function generateApprovalId(prefix: string = 'apr'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Create a new approval request
 *
 * @param input - Input data for creating the request
 * @param requesterId - Requester user ID
 * @param requesterName - Requester display name
 * @returns New approval request object
 */
export function createApprovalRequest(
  input: CreateApprovalRequestInput,
  requesterId: string,
  requesterName: string
): ApprovalRequest {
  const now = new Date().toISOString();
  return {
    id: generateApprovalId(),
    minutesId: input.minutesId,
    meetingId: input.meetingId,
    title: input.title,
    status: APPROVAL_STATUS.DRAFT,
    requesterId,
    requesterName,
    approvers: [...input.approvers],
    requestComment: input.comment,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a history entry for an approval action
 *
 * @param approvalRequestId - Associated approval request ID
 * @param action - Action performed
 * @param actorId - User ID who performed the action
 * @param actorName - User name who performed the action
 * @param previousStatus - Status before the action
 * @param newStatus - Status after the action
 * @param comment - Optional comment
 * @returns New approval history entry
 */
export function createApprovalHistoryEntry(
  approvalRequestId: string,
  action: ApprovalAction,
  actorId: string,
  actorName: string,
  previousStatus: ApprovalStatus,
  newStatus: ApprovalStatus,
  comment?: string
): ApprovalHistoryEntry {
  const entry: ApprovalHistoryEntry = {
    id: generateApprovalId('ahst'),
    approvalRequestId,
    action,
    actorId,
    actorName,
    previousStatus,
    newStatus,
    timestamp: new Date().toISOString(),
  };

  if (comment !== undefined) {
    return { ...entry, comment };
  }

  return entry;
}

/**
 * Get the next status based on action
 *
 * @param currentStatus - Current approval status
 * @param action - Action to perform
 * @returns New status or null if action is invalid
 */
export function getNextStatus(
  currentStatus: ApprovalStatus,
  action: ApprovalAction
): ApprovalStatus | null {
  const transitions: Record<ApprovalStatus, Partial<Record<ApprovalAction, ApprovalStatus>>> = {
    [APPROVAL_STATUS.DRAFT]: {
      [APPROVAL_ACTION.SUBMIT]: APPROVAL_STATUS.PENDING_APPROVAL,
    },
    [APPROVAL_STATUS.PENDING_APPROVAL]: {
      [APPROVAL_ACTION.APPROVE]: APPROVAL_STATUS.APPROVED,
      [APPROVAL_ACTION.REJECT]: APPROVAL_STATUS.REJECTED,
      [APPROVAL_ACTION.WITHDRAW]: APPROVAL_STATUS.DRAFT,
    },
    [APPROVAL_STATUS.APPROVED]: {},
    [APPROVAL_STATUS.REJECTED]: {
      [APPROVAL_ACTION.SUBMIT]: APPROVAL_STATUS.PENDING_APPROVAL,
    },
  };

  const nextStatus = transitions[currentStatus][action];
  return nextStatus ?? null;
}

/**
 * Check if an action is valid for the current status
 *
 * @param currentStatus - Current approval status
 * @param action - Action to validate
 * @returns Whether the action is valid
 */
export function isValidTransition(currentStatus: ApprovalStatus, action: ApprovalAction): boolean {
  return getNextStatus(currentStatus, action) !== null;
}

/**
 * Check if user can approve a request
 *
 * @param request - Approval request
 * @param userId - User ID to check
 * @returns Whether the user can approve
 */
export function canUserApprove(request: ApprovalRequest, userId: string): boolean {
  if (request.status !== APPROVAL_STATUS.PENDING_APPROVAL) {
    return false;
  }
  return request.approvers.some((approver) => approver.id === userId);
}

/**
 * Check if user can withdraw a request
 *
 * @param request - Approval request
 * @param userId - User ID to check
 * @returns Whether the user can withdraw
 */
export function canUserWithdraw(request: ApprovalRequest, userId: string): boolean {
  if (request.status !== APPROVAL_STATUS.PENDING_APPROVAL) {
    return false;
  }
  return request.requesterId === userId;
}

/**
 * Get status display label
 *
 * @param status - Approval status
 * @param language - Display language
 * @returns Status label
 */
export function getStatusLabel(status: ApprovalStatus, language: 'ja' | 'en' = 'ja'): string {
  const labels: Record<ApprovalStatus, Record<'ja' | 'en', string>> = {
    [APPROVAL_STATUS.DRAFT]: { ja: '下書き', en: 'Draft' },
    [APPROVAL_STATUS.PENDING_APPROVAL]: { ja: '承認待ち', en: 'Pending Approval' },
    [APPROVAL_STATUS.APPROVED]: { ja: '承認済み', en: 'Approved' },
    [APPROVAL_STATUS.REJECTED]: { ja: '却下', en: 'Rejected' },
  };
  return labels[status][language];
}

/**
 * Get action display label
 *
 * @param action - Approval action
 * @param language - Display language
 * @returns Action label
 */
export function getActionLabel(action: ApprovalAction, language: 'ja' | 'en' = 'ja'): string {
  const labels: Record<ApprovalAction, Record<'ja' | 'en', string>> = {
    [APPROVAL_ACTION.SUBMIT]: { ja: '承認依頼', en: 'Submit for Approval' },
    [APPROVAL_ACTION.APPROVE]: { ja: '承認', en: 'Approve' },
    [APPROVAL_ACTION.REJECT]: { ja: '却下', en: 'Reject' },
    [APPROVAL_ACTION.WITHDRAW]: { ja: '取り下げ', en: 'Withdraw' },
  };
  return labels[action][language];
}

/**
 * Calculate approval statistics from a list of requests
 *
 * @param requests - List of approval requests
 * @returns Approval stats
 */
export function calculateApprovalStats(requests: readonly ApprovalRequest[]): ApprovalStats {
  const stats: ApprovalStats = {
    total: requests.length,
    draft: 0,
    pendingApproval: 0,
    approved: 0,
    rejected: 0,
  };

  const approvalTimes: number[] = [];

  for (const request of requests) {
    switch (request.status) {
      case APPROVAL_STATUS.DRAFT:
        stats.draft++;
        break;
      case APPROVAL_STATUS.PENDING_APPROVAL:
        stats.pendingApproval++;
        break;
      case APPROVAL_STATUS.APPROVED:
        stats.approved++;
        if (request.submittedAt !== undefined && request.resolvedAt !== undefined) {
          const submittedTime = new Date(request.submittedAt).getTime();
          const resolvedTime = new Date(request.resolvedAt).getTime();
          approvalTimes.push(resolvedTime - submittedTime);
        }
        break;
      case APPROVAL_STATUS.REJECTED:
        stats.rejected++;
        break;
    }
  }

  if (approvalTimes.length > 0) {
    const sum = approvalTimes.reduce((acc, time) => acc + time, 0);
    stats.avgApprovalTimeMs = sum / approvalTimes.length;
  }

  return stats;
}

/**
 * Filter approval requests
 *
 * @param requests - List of approval requests
 * @param filters - Filter criteria
 * @returns Filtered list
 */
export function filterApprovalRequests(
  requests: readonly ApprovalRequest[],
  filters: ApprovalFilters
): ApprovalRequest[] {
  return requests.filter((request) => {
    if (filters.status !== undefined && request.status !== filters.status) {
      return false;
    }
    if (filters.requesterId !== undefined && request.requesterId !== filters.requesterId) {
      return false;
    }
    if (filters.approverId !== undefined) {
      const isApprover = request.approvers.some((a) => a.id === filters.approverId);
      if (!isApprover) {
        return false;
      }
    }
    if (filters.minutesId !== undefined && request.minutesId !== filters.minutesId) {
      return false;
    }
    if (filters.meetingId !== undefined && request.meetingId !== filters.meetingId) {
      return false;
    }
    if (filters.fromDate !== undefined) {
      const fromTime = new Date(filters.fromDate).getTime();
      const createdTime = new Date(request.createdAt).getTime();
      if (createdTime < fromTime) {
        return false;
      }
    }
    if (filters.toDate !== undefined) {
      const toTime = new Date(filters.toDate).getTime();
      const createdTime = new Date(request.createdAt).getTime();
      if (createdTime > toTime) {
        return false;
      }
    }
    return true;
  });
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate an approval request
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateApprovalRequest(
  data: unknown
): ZodSafeParseResult<ApprovalRequest> {
  return ApprovalRequestSchema.safeParse(data);
}

/**
 * Validate create approval request input
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateCreateApprovalRequest(
  data: unknown
): ZodSafeParseResult<CreateApprovalRequestInput> {
  return CreateApprovalRequestSchema.safeParse(data);
}

/**
 * Validate resolve approval request input
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateResolveApprovalRequest(
  data: unknown
): ZodSafeParseResult<ResolveApprovalRequestInput> {
  return ResolveApprovalRequestSchema.safeParse(data);
}

/**
 * Validate approval filters
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateApprovalFilters(
  data: unknown
): ZodSafeParseResult<ApprovalFilters> {
  return ApprovalFiltersSchema.safeParse(data);
}

/**
 * Validate approval history entry
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateApprovalHistoryEntry(
  data: unknown
): ZodSafeParseResult<ApprovalHistoryEntry> {
  return ApprovalHistoryEntrySchema.safeParse(data);
}
