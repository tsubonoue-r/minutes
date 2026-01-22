/**
 * Approval Service - Manage minutes approval workflow
 * @module services/approval.service
 */

import {
  type ApprovalRequest,
  type ApprovalHistoryEntry,
  type CreateApprovalRequestInput,
  type SubmitApprovalRequestInput,
  type ResolveApprovalRequestInput,
  type WithdrawApprovalRequestInput,
  type ApprovalFilters,
  type ApprovalListResponse,
  type ApprovalHistoryListResponse,
  type ApprovalStats,
  type ApprovalAction,
  type Approver,
  APPROVAL_STATUS,
  APPROVAL_ACTION,
  createApprovalRequest,
  createApprovalHistoryEntry,
  getNextStatus,
  isValidTransition,
  canUserApprove,
  canUserWithdraw,
  calculateApprovalStats,
  filterApprovalRequests,
} from '@/types/approval';
import {
  createNotificationService,
  createRecipientFromOpenId,
  type NotificationRecipient,
} from './notification.service';

// =============================================================================
// Types
// =============================================================================

/**
 * User context for approval operations
 */
export interface ApprovalUserContext {
  /** User ID */
  readonly id: string;
  /** User display name */
  readonly name: string;
  /** User email (optional) */
  readonly email?: string | undefined;
  /** Lark open_id for notifications */
  readonly larkOpenId?: string | undefined;
}

/**
 * Options for approval service operations
 */
export interface ApprovalServiceOptions {
  /** Access token for notifications */
  readonly accessToken?: string | undefined;
  /** Whether to send notifications (default: true) */
  readonly sendNotification?: boolean | undefined;
  /** Notification language */
  readonly language?: 'ja' | 'en' | undefined;
}

/**
 * Result of approval operation
 */
export interface ApprovalOperationResult {
  /** Whether the operation succeeded */
  readonly success: boolean;
  /** Updated approval request */
  readonly request?: ApprovalRequest | undefined;
  /** Created history entry */
  readonly historyEntry?: ApprovalHistoryEntry | undefined;
  /** Error message if failed */
  readonly error?: string | undefined;
  /** Error code if failed */
  readonly errorCode?: string | undefined;
  /** Whether notification was sent */
  readonly notificationSent?: boolean | undefined;
}

// =============================================================================
// Error Class
// =============================================================================

/**
 * Error thrown when approval operation fails
 */
export class ApprovalError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApprovalError';
  }
}

// =============================================================================
// In-Memory Storage (for development/testing)
// =============================================================================

/**
 * In-memory storage for approval requests
 * In production, this would be replaced with database operations
 */
class ApprovalStorage {
  private requests: Map<string, ApprovalRequest> = new Map();
  private history: Map<string, ApprovalHistoryEntry[]> = new Map();

  /**
   * Save an approval request
   */
  save(request: ApprovalRequest): void {
    this.requests.set(request.id, request);
  }

  /**
   * Get an approval request by ID
   */
  get(id: string): ApprovalRequest | undefined {
    return this.requests.get(id);
  }

  /**
   * Get all approval requests
   */
  getAll(): ApprovalRequest[] {
    return Array.from(this.requests.values());
  }

  /**
   * Delete an approval request
   */
  delete(id: string): boolean {
    const deleted = this.requests.delete(id);
    this.history.delete(id);
    return deleted;
  }

  /**
   * Add history entry
   */
  addHistory(entry: ApprovalHistoryEntry): void {
    const entries = this.history.get(entry.approvalRequestId) ?? [];
    entries.push(entry);
    this.history.set(entry.approvalRequestId, entries);
  }

  /**
   * Get history for a request
   */
  getHistory(approvalRequestId: string): ApprovalHistoryEntry[] {
    return this.history.get(approvalRequestId) ?? [];
  }

  /**
   * Get all history entries
   */
  getAllHistory(): ApprovalHistoryEntry[] {
    const allEntries: ApprovalHistoryEntry[] = [];
    const historyValues = Array.from(this.history.values());
    for (const entries of historyValues) {
      allEntries.push(...entries);
    }
    return allEntries;
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.requests.clear();
    this.history.clear();
  }
}

// Global storage instance
const storage = new ApprovalStorage();

// =============================================================================
// ApprovalService Class
// =============================================================================

/**
 * Service for managing approval workflows
 *
 * Handles the complete lifecycle of approval requests:
 * - Creating and submitting approval requests
 * - Approving or rejecting requests
 * - Withdrawing requests
 * - Tracking approval history
 * - Sending notifications to approvers and requesters
 *
 * @example
 * ```typescript
 * const service = createApprovalService();
 *
 * // Create and submit approval request
 * const result = await service.requestApproval(
 *   {
 *     minutesId: 'min_123',
 *     meetingId: 'meeting_456',
 *     title: 'Weekly Sync Minutes',
 *     approvers: [{ id: 'user_1', name: 'Tanaka' }],
 *   },
 *   { id: 'requester_1', name: 'Suzuki' },
 *   { accessToken: 'xxx', sendNotification: true }
 * );
 *
 * // Approve the request
 * const approveResult = service.approve(
 *   result.request!.id,
 *   { id: 'user_1', name: 'Tanaka' },
 *   { comment: 'Looks good!' }
 * );
 * ```
 */
export class ApprovalService {
  /**
   * Create a new approval request
   *
   * @param input - Input data for creating the request
   * @param user - User creating the request
   * @param options - Service options
   * @returns Operation result
   */
  async requestApproval(
    input: CreateApprovalRequestInput,
    user: ApprovalUserContext,
    options: ApprovalServiceOptions = {}
  ): Promise<ApprovalOperationResult> {
    try {
      // Create the approval request
      const request = createApprovalRequest(input, user.id, user.name);

      // If sendNotification is true and we're auto-submitting, submit immediately
      if (input.sendNotification !== false) {
        // Auto-submit after creation
        const now = new Date().toISOString();
        const submittedRequest: ApprovalRequest = {
          ...request,
          status: APPROVAL_STATUS.PENDING_APPROVAL,
          submittedAt: now,
          updatedAt: now,
        };

        // Save the submitted request
        storage.save(submittedRequest);

        // Create history entry
        const historyEntry = createApprovalHistoryEntry(
          submittedRequest.id,
          APPROVAL_ACTION.SUBMIT,
          user.id,
          user.name,
          APPROVAL_STATUS.DRAFT,
          APPROVAL_STATUS.PENDING_APPROVAL,
          input.comment
        );
        storage.addHistory(historyEntry);

        // Send notifications to approvers
        let notificationSent = false;
        if (options.sendNotification !== false && options.accessToken !== undefined) {
          notificationSent = await this.notifyApprovers(
            submittedRequest,
            user,
            options.accessToken,
            options.language ?? 'ja'
          );
        }

        return {
          success: true,
          request: submittedRequest,
          historyEntry,
          notificationSent,
        };
      }

      // Save as draft
      storage.save(request);

      return {
        success: true,
        request,
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
        errorCode: 'CREATE_FAILED',
      };
    }
  }

  /**
   * Submit a draft approval request for approval
   *
   * @param input - Submit input
   * @param user - User submitting the request
   * @param options - Service options
   * @returns Operation result
   */
  async submit(
    input: SubmitApprovalRequestInput,
    user: ApprovalUserContext,
    options: ApprovalServiceOptions = {}
  ): Promise<ApprovalOperationResult> {
    const request = storage.get(input.approvalRequestId);

    if (request === undefined) {
      return {
        success: false,
        error: 'Approval request not found',
        errorCode: 'NOT_FOUND',
      };
    }

    // Check if user is the requester
    if (request.requesterId !== user.id) {
      return {
        success: false,
        error: 'Only the requester can submit the approval request',
        errorCode: 'FORBIDDEN',
      };
    }

    // Check valid transition
    if (!isValidTransition(request.status, APPROVAL_ACTION.SUBMIT)) {
      return {
        success: false,
        error: `Cannot submit request in ${request.status} status`,
        errorCode: 'INVALID_TRANSITION',
      };
    }

    const now = new Date().toISOString();
    const updatedRequest: ApprovalRequest = {
      ...request,
      status: APPROVAL_STATUS.PENDING_APPROVAL,
      submittedAt: now,
      updatedAt: now,
      requestComment: input.comment ?? request.requestComment,
    };

    storage.save(updatedRequest);

    // Create history entry
    const historyEntry = createApprovalHistoryEntry(
      updatedRequest.id,
      APPROVAL_ACTION.SUBMIT,
      user.id,
      user.name,
      request.status,
      APPROVAL_STATUS.PENDING_APPROVAL,
      input.comment
    );
    storage.addHistory(historyEntry);

    // Send notifications
    let notificationSent = false;
    if (input.sendNotification !== false && options.accessToken !== undefined) {
      notificationSent = await this.notifyApprovers(
        updatedRequest,
        user,
        options.accessToken,
        options.language ?? 'ja'
      );
    }

    return {
      success: true,
      request: updatedRequest,
      historyEntry,
      notificationSent,
    };
  }

  /**
   * Approve an approval request
   *
   * @param approvalRequestId - Request ID to approve
   * @param user - User approving the request
   * @param options - Additional options including comment
   * @returns Operation result
   */
  approve(
    approvalRequestId: string,
    user: ApprovalUserContext,
    options: ApprovalServiceOptions & { comment?: string } = {}
  ): ApprovalOperationResult {
    return this.resolve(
      {
        approvalRequestId,
        action: APPROVAL_ACTION.APPROVE,
        comment: options.comment,
        sendNotification: options.sendNotification ?? true,
      },
      user,
      options
    );
  }

  /**
   * Reject an approval request
   *
   * @param approvalRequestId - Request ID to reject
   * @param user - User rejecting the request
   * @param options - Additional options including comment
   * @returns Operation result
   */
  reject(
    approvalRequestId: string,
    user: ApprovalUserContext,
    options: ApprovalServiceOptions & { comment?: string } = {}
  ): ApprovalOperationResult {
    return this.resolve(
      {
        approvalRequestId,
        action: APPROVAL_ACTION.REJECT,
        comment: options.comment,
        sendNotification: options.sendNotification ?? true,
      },
      user,
      options
    );
  }

  /**
   * Resolve (approve or reject) an approval request
   *
   * @param input - Resolution input
   * @param user - User resolving the request
   * @param options - Service options
   * @returns Operation result
   */
  resolve(
    input: ResolveApprovalRequestInput,
    user: ApprovalUserContext,
    options: ApprovalServiceOptions = {}
  ): ApprovalOperationResult {
    const request = storage.get(input.approvalRequestId);

    if (request === undefined) {
      return {
        success: false,
        error: 'Approval request not found',
        errorCode: 'NOT_FOUND',
      };
    }

    // Check if user can approve
    if (!canUserApprove(request, user.id)) {
      return {
        success: false,
        error: 'User is not authorized to approve this request',
        errorCode: 'FORBIDDEN',
      };
    }

    // Check valid transition
    const newStatus = getNextStatus(request.status, input.action);
    if (newStatus === null) {
      return {
        success: false,
        error: `Cannot ${input.action} request in ${request.status} status`,
        errorCode: 'INVALID_TRANSITION',
      };
    }

    const now = new Date().toISOString();
    const updatedRequest: ApprovalRequest = {
      ...request,
      status: newStatus,
      resolvedAt: now,
      resolvedById: user.id,
      resolvedByName: user.name,
      resolutionComment: input.comment,
      updatedAt: now,
    };

    storage.save(updatedRequest);

    // Create history entry
    const historyEntry = createApprovalHistoryEntry(
      updatedRequest.id,
      input.action,
      user.id,
      user.name,
      request.status,
      newStatus,
      input.comment
    );
    storage.addHistory(historyEntry);

    // Send notification to requester
    let notificationSent = false;
    if (input.sendNotification !== false && options.accessToken !== undefined) {
      notificationSent = this.notifyRequester(
        updatedRequest,
        input.action,
        user,
        options.accessToken,
        options.language ?? 'ja'
      );
    }

    return {
      success: true,
      request: updatedRequest,
      historyEntry,
      notificationSent,
    };
  }

  /**
   * Withdraw an approval request
   *
   * @param input - Withdraw input
   * @param user - User withdrawing the request
   * @param options - Service options
   * @returns Operation result
   */
  withdraw(
    input: WithdrawApprovalRequestInput,
    user: ApprovalUserContext,
    _options: ApprovalServiceOptions = {}
  ): ApprovalOperationResult {
    const request = storage.get(input.approvalRequestId);

    if (request === undefined) {
      return {
        success: false,
        error: 'Approval request not found',
        errorCode: 'NOT_FOUND',
      };
    }

    // Check if user can withdraw
    if (!canUserWithdraw(request, user.id)) {
      return {
        success: false,
        error: 'User is not authorized to withdraw this request',
        errorCode: 'FORBIDDEN',
      };
    }

    // Check valid transition
    const newStatus = getNextStatus(request.status, APPROVAL_ACTION.WITHDRAW);
    if (newStatus === null) {
      return {
        success: false,
        error: `Cannot withdraw request in ${request.status} status`,
        errorCode: 'INVALID_TRANSITION',
      };
    }

    const now = new Date().toISOString();
    const updatedRequest: ApprovalRequest = {
      ...request,
      status: newStatus,
      submittedAt: undefined,
      updatedAt: now,
    };

    storage.save(updatedRequest);

    // Create history entry
    const historyEntry = createApprovalHistoryEntry(
      updatedRequest.id,
      APPROVAL_ACTION.WITHDRAW,
      user.id,
      user.name,
      request.status,
      newStatus,
      input.comment
    );
    storage.addHistory(historyEntry);

    return {
      success: true,
      request: updatedRequest,
      historyEntry,
    };
  }

  /**
   * Get an approval request by ID
   *
   * @param id - Approval request ID
   * @returns Approval request or undefined
   */
  getRequest(id: string): ApprovalRequest | undefined {
    return storage.get(id);
  }

  /**
   * Get approval request by minutes ID
   *
   * @param minutesId - Minutes ID
   * @returns Approval request or undefined
   */
  getRequestByMinutesId(minutesId: string): ApprovalRequest | undefined {
    const requests = storage.getAll();
    return requests.find((r) => r.minutesId === minutesId);
  }

  /**
   * List approval requests with filters and pagination
   *
   * @param filters - Filter criteria
   * @param page - Page number (1-indexed)
   * @param pageSize - Items per page
   * @returns Paginated list response
   */
  listRequests(
    filters: ApprovalFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): ApprovalListResponse {
    const allRequests = storage.getAll();
    const filtered = filterApprovalRequests(allRequests, filters);

    // Sort by updatedAt descending
    filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const totalCount = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const items = filtered.slice(start, end);
    const hasMore = end < totalCount;

    return {
      items,
      totalCount,
      page,
      pageSize,
      hasMore,
    };
  }

  /**
   * Get approval history for a request
   *
   * @param approvalRequestId - Approval request ID
   * @returns History list response
   */
  getHistory(approvalRequestId: string): ApprovalHistoryListResponse {
    const entries = storage.getHistory(approvalRequestId);

    // Sort by timestamp descending
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      items: entries,
      totalCount: entries.length,
    };
  }

  /**
   * Get approval statistics
   *
   * @param filters - Optional filters
   * @returns Approval stats
   */
  getStats(filters: ApprovalFilters = {}): ApprovalStats {
    const allRequests = storage.getAll();
    const filtered = filterApprovalRequests(allRequests, filters);
    return calculateApprovalStats(filtered);
  }

  /**
   * Delete an approval request (for testing/admin purposes)
   *
   * @param id - Approval request ID
   * @returns Whether deletion was successful
   */
  deleteRequest(id: string): boolean {
    return storage.delete(id);
  }

  /**
   * Clear all data (for testing purposes)
   */
  clearAll(): void {
    storage.clear();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Send notification to approvers
   */
  private async notifyApprovers(
    request: ApprovalRequest,
    requester: ApprovalUserContext,
    accessToken: string,
    language: 'ja' | 'en'
  ): Promise<boolean> {
    try {
      const notificationService = createNotificationService();

      // Convert approvers to recipients
      const recipients: NotificationRecipient[] = request.approvers
        .filter((a) => a.larkOpenId !== undefined && a.larkOpenId !== '')
        .map((a) => createRecipientFromOpenId(a.larkOpenId!, a.name));

      if (recipients.length === 0) {
        return false;
      }

      // Create minimal minutes object for notification
      const minimalMinutes = {
        id: request.minutesId,
        meetingId: request.meetingId,
        title: request.title,
        date: request.createdAt.split('T')[0] ?? '1970-01-01',
        duration: 0,
        summary: '',
        topics: [] as never[],
        decisions: [] as never[],
        actionItems: [] as never[],
        attendees: [] as never[],
        metadata: {
          generatedAt: request.createdAt,
          model: 'unknown',
          processingTimeMs: 0,
          confidence: 0,
        },
      };

      // Send draft notification (which prompts for review)
      const result = await notificationService.sendDraftMinutesNotification(accessToken, {
        minutes: minimalMinutes,
        previewUrl: `/meetings/${request.meetingId}/minutes`,
        approveUrl: `/api/approvals/${request.id}`,
        recipient: recipients[0]!, // Send to first approver
        language,
      });

      return result.success;
    } catch (error) {
      console.error('Failed to notify approvers:', error);
      return false;
    }
  }

  /**
   * Send notification to requester about approval result
   */
  private notifyRequester(
    request: ApprovalRequest,
    action: ApprovalAction,
    _approver: ApprovalUserContext,
    _accessToken: string,
    _language: 'ja' | 'en'
  ): boolean {
    // TODO: Implement requester notification using a custom card template
    // For now, we'll skip this as it requires additional card templates
    console.log(`Notification would be sent to requester ${request.requesterId} for ${action}`);
    return false;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an ApprovalService instance
 *
 * @returns New ApprovalService instance
 *
 * @example
 * ```typescript
 * const service = createApprovalService();
 * const result = await service.requestApproval(input, user, options);
 * ```
 */
export function createApprovalService(): ApprovalService {
  return new ApprovalService();
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create an approver object
 *
 * @param id - User ID
 * @param name - User name
 * @param email - Optional email
 * @param larkOpenId - Optional Lark open_id
 * @returns Approver object
 */
export function createApprover(
  id: string,
  name: string,
  email?: string,
  larkOpenId?: string
): Approver {
  const approver: Approver = { id, name };

  if (email !== undefined) {
    return { ...approver, email };
  }
  if (larkOpenId !== undefined) {
    return { ...approver, larkOpenId };
  }
  if (email !== undefined && larkOpenId !== undefined) {
    return { ...approver, email, larkOpenId };
  }

  return approver;
}

/**
 * Create user context for approval operations
 *
 * @param id - User ID
 * @param name - User name
 * @param email - Optional email
 * @param larkOpenId - Optional Lark open_id
 * @returns User context
 */
export function createApprovalUserContext(
  id: string,
  name: string,
  email?: string,
  larkOpenId?: string
): ApprovalUserContext {
  const context: ApprovalUserContext = { id, name };

  if (email !== undefined && larkOpenId !== undefined) {
    return { ...context, email, larkOpenId };
  }
  if (email !== undefined) {
    return { ...context, email };
  }
  if (larkOpenId !== undefined) {
    return { ...context, larkOpenId };
  }

  return context;
}
