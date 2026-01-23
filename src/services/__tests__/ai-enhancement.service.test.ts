/**
 * AIEnhancementService tests
 * @module services/__tests__/ai-enhancement.service.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AIEnhancementService,
  AIEnhancementError,
  createAIEnhancementServiceWithClient,
  createAIEnhancementServiceFromEnv,
} from '../ai-enhancement.service';
import { ClaudeClient, ClaudeApiError, ClaudeParseError } from '@/lib/claude';
import type { ActionItem, Minutes } from '@/types/minutes';
import type {
  DuplicateDetectionResult,
  FollowUpRelation,
  QualityScore,
  Improvement,
} from '@/types/ai-enhancement';

// =============================================================================
// Mock Setup
// =============================================================================

/**
 * Create a mock ClaudeClient with mocked methods
 */
function createMockClaudeClient(): ClaudeClient {
  return {
    sendMessage: vi.fn(),
    generateStructuredOutput: vi.fn(),
  } as unknown as ClaudeClient;
}

// =============================================================================
// Test Data
// =============================================================================

function createMockActionItems(): ActionItem[] {
  return [
    {
      id: 'action_1',
      content: 'ユーザー認証機能を実装する',
      assignee: { id: 'user-1', name: '田中' },
      dueDate: '2025-02-01',
      priority: 'high',
      status: 'pending',
    },
    {
      id: 'action_2',
      content: 'ログイン機能の実装を完了する',
      assignee: { id: 'user-1', name: '田中' },
      dueDate: '2025-02-05',
      priority: 'high',
      status: 'pending',
    },
    {
      id: 'action_3',
      content: 'APIドキュメントを作成する',
      assignee: { id: 'user-2', name: '鈴木' },
      dueDate: '2025-02-10',
      priority: 'medium',
      status: 'pending',
    },
    {
      id: 'action_4',
      content: 'テストカバレッジを80%以上にする',
      assignee: { id: 'user-2', name: '鈴木' },
      dueDate: '2025-02-15',
      priority: 'medium',
      status: 'in_progress',
    },
  ];
}

function createMockMinutes(): Minutes {
  return {
    id: 'min_test_001',
    meetingId: 'meeting-123',
    title: '週次開発定例会議',
    date: '2025-01-22',
    duration: 3600000,
    summary: '新機能の開発進捗を確認し、来週のリリース計画を策定しました。',
    topics: [
      {
        id: 'topic_1',
        title: '開発進捗報告',
        startTime: 0,
        endTime: 1800000,
        summary: '各メンバーの開発進捗を確認しました。',
        keyPoints: ['認証機能は80%完了', 'API実装は予定通り'],
        speakers: [
          { id: 'user-1', name: '田中' },
          { id: 'user-2', name: '鈴木' },
        ],
      },
      {
        id: 'topic_2',
        title: 'リリース計画',
        startTime: 1800000,
        endTime: 3600000,
        summary: '来週金曜日にリリースすることを決定しました。',
        keyPoints: ['リリース日は1月31日', 'ステージング確認は1月30日'],
        speakers: [{ id: 'user-1', name: '田中' }],
      },
    ],
    decisions: [
      {
        id: 'dec_1',
        content: 'リリース日を1月31日に決定',
        context: 'スケジュールと品質のバランスを考慮',
        decidedAt: 2700000,
        relatedTopicId: 'topic_2',
      },
    ],
    actionItems: createMockActionItems(),
    attendees: [
      { id: 'user-1', name: '田中' },
      { id: 'user-2', name: '鈴木' },
    ],
    metadata: {
      generatedAt: '2025-01-22T11:00:00.000Z',
      model: 'claude-sonnet-4-20250514',
      processingTimeMs: 3500,
      confidence: 0.92,
    },
  };
}

function createMockDuplicateResult(): DuplicateDetectionResult {
  return {
    groups: [
      {
        groupId: 'group_1',
        similarityScore: 0.85,
        items: [
          { itemId: 'action_1', content: 'ユーザー認証機能を実装する' },
          { itemId: 'action_2', content: 'ログイン機能の実装を完了する' },
        ],
        mergedSuggestion: 'ユーザー認証・ログイン機能を実装する',
        reason: '両方ともユーザー認証に関連するタスクで、ログイン機能は認証機能の一部です',
      },
    ],
    totalItemsProcessed: 4,
    duplicateItemsFound: 2,
  };
}

function createMockQualityScore(): QualityScore {
  return {
    overallScore: 78,
    criteria: [
      { name: '完全性', score: 8, maxScore: 10, comment: '主要議題がカバーされています' },
      { name: '明確性', score: 8, maxScore: 10, comment: '内容は明確です' },
      { name: 'アクションアイテムの具体性', score: 7, maxScore: 10, comment: '担当者は明記されていますが期日が曖昧なものがあります' },
      { name: '構造化', score: 9, maxScore: 10, comment: 'トピックが論理的に整理されています' },
      { name: '詳細度', score: 7, maxScore: 10, comment: '適切な詳細レベルです' },
      { name: '正確性', score: 8, maxScore: 10, comment: '発言内容が正確に反映されています' },
      { name: 'フォーマット', score: 8, maxScore: 10, comment: '読みやすいフォーマットです' },
      { name: 'フォローアップ', score: 7, maxScore: 10, comment: '前回からの継続事項がもう少し詳しいと良いです' },
      { name: 'コンテキスト', score: 8, maxScore: 10, comment: '背景情報が十分です' },
      { name: '要約の質', score: 8, maxScore: 10, comment: '全体像が掴める要約です' },
    ],
    summary: '全体的に良質な議事録です。アクションアイテムの期日設定と前回からの継続事項の記載を改善するとさらに良くなります。',
    level: 'good',
  };
}

function createMockImprovements(): Improvement[] {
  return [
    {
      id: 'imp_1',
      category: 'action_items',
      priority: 'high',
      description: 'アクションアイテムの期日をより具体的に設定してください',
      suggestion: '「来週まで」ではなく「2025年1月31日」のように具体的な日付を記載',
      targetSection: 'Action Items',
    },
    {
      id: 'imp_2',
      category: 'follow_up',
      priority: 'medium',
      description: '前回の会議からの継続事項を明記してください',
      suggestion: '前回の決定事項の進捗状況を冒頭に記載することを推奨',
    },
    {
      id: 'imp_3',
      category: 'context',
      priority: 'low',
      description: '議論の背景情報をもう少し追加してください',
    },
  ];
}

function createMockFollowUpRelations(): FollowUpRelation[] {
  return [
    {
      currentItemId: 'action_1',
      currentItemContent: 'ユーザー認証機能を実装する',
      previousItemId: 'prev_action_1',
      previousItemContent: '認証システムの設計書を作成する',
      previousMinutesId: 'min_prev_001',
      relevanceScore: 0.8,
      relationType: 'follow_up',
      reason: '設計書作成の後続タスクとして認証機能の実装が位置づけられる',
    },
  ];
}

// =============================================================================
// Tests
// =============================================================================

describe('AIEnhancementService', () => {
  let mockClient: ClaudeClient;
  let service: AIEnhancementService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClaudeClient();
    service = new AIEnhancementService(mockClient);
  });

  // ===========================================================================
  // Constructor & Factory Functions
  // ===========================================================================

  describe('constructor and factory functions', () => {
    it('should create service with ClaudeClient', () => {
      const svc = new AIEnhancementService(mockClient);
      expect(svc).toBeInstanceOf(AIEnhancementService);
    });

    it('should create service with createAIEnhancementServiceWithClient', () => {
      const svc = createAIEnhancementServiceWithClient(mockClient);
      expect(svc).toBeInstanceOf(AIEnhancementService);
    });

    it('should throw when ANTHROPIC_API_KEY is not set', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => createAIEnhancementServiceFromEnv()).toThrow(AIEnhancementError);
    });

    it('should throw with correct error code when API key missing', () => {
      delete process.env.ANTHROPIC_API_KEY;
      try {
        createAIEnhancementServiceFromEnv();
      } catch (error) {
        expect(error).toBeInstanceOf(AIEnhancementError);
        expect((error as AIEnhancementError).code).toBe('API_ERROR');
      }
    });
  });

  // ===========================================================================
  // Token Usage
  // ===========================================================================

  describe('getTokenUsage', () => {
    it('should return zero usage initially', () => {
      const usage = service.getTokenUsage();
      expect(usage.inputTokens).toBe(0);
      expect(usage.outputTokens).toBe(0);
      expect(usage.totalTokens).toBe(0);
    });

    it('should reset token usage', () => {
      service.resetTokenUsage();
      const usage = service.getTokenUsage();
      expect(usage.totalTokens).toBe(0);
    });
  });

  // ===========================================================================
  // Duplicate Detection
  // ===========================================================================

  describe('detectDuplicateActionItems', () => {
    it('should return empty array for less than 2 items', async () => {
      const result = await service.detectDuplicateActionItems([
        createMockActionItems()[0]!,
      ]);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty input', async () => {
      const result = await service.detectDuplicateActionItems([]);
      expect(result).toEqual([]);
    });

    it('should call Claude API with correct parameters', async () => {
      const mockResult = createMockDuplicateResult();
      vi.mocked(mockClient.generateStructuredOutput).mockResolvedValue(mockResult);

      const items = createMockActionItems();
      await service.detectDuplicateActionItems(items);

      expect(mockClient.generateStructuredOutput).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(mockClient.generateStructuredOutput).mock.calls[0];
      expect(callArgs).toBeDefined();

      // Verify messages contain action items
      const messages = callArgs![0];
      expect(messages[0]!.role).toBe('user');
      expect(messages[0]!.content).toContain('action_1');
      expect(messages[0]!.content).toContain('ユーザー認証機能を実装する');
    });

    it('should return duplicate groups from API response', async () => {
      const mockResult = createMockDuplicateResult();
      vi.mocked(mockClient.generateStructuredOutput).mockResolvedValue(mockResult);

      const items = createMockActionItems();
      const result = await service.detectDuplicateActionItems(items);

      expect(result).toHaveLength(1);
      expect(result[0]!.groupId).toBe('group_1');
      expect(result[0]!.similarityScore).toBe(0.85);
      expect(result[0]!.items).toHaveLength(2);
      expect(result[0]!.mergedSuggestion).toBe('ユーザー認証・ログイン機能を実装する');
    });

    it('should update token usage after API call', async () => {
      const mockResult = createMockDuplicateResult();
      vi.mocked(mockClient.generateStructuredOutput).mockResolvedValue(mockResult);

      const items = createMockActionItems();
      await service.detectDuplicateActionItems(items);

      const usage = service.getTokenUsage();
      expect(usage.inputTokens).toBeGreaterThan(0);
      expect(usage.outputTokens).toBeGreaterThan(0);
      expect(usage.totalTokens).toBe(usage.inputTokens + usage.outputTokens);
    });

    it('should throw AIEnhancementError on API failure', async () => {
      vi.mocked(mockClient.generateStructuredOutput).mockRejectedValue(
        new ClaudeApiError('API rate limit exceeded', 429)
      );

      const items = createMockActionItems();
      await expect(
        service.detectDuplicateActionItems(items)
      ).rejects.toThrow(AIEnhancementError);
    });

    it('should set error code to API_ERROR on ClaudeApiError', async () => {
      vi.mocked(mockClient.generateStructuredOutput).mockRejectedValue(
        new ClaudeApiError('API rate limit exceeded', 429)
      );

      const items = createMockActionItems();
      try {
        await service.detectDuplicateActionItems(items);
      } catch (error) {
        expect((error as AIEnhancementError).code).toBe('API_ERROR');
      }
    });

    it('should set error code to PARSE_ERROR on ClaudeParseError', async () => {
      vi.mocked(mockClient.generateStructuredOutput).mockRejectedValue(
        new ClaudeParseError('Invalid JSON')
      );

      const items = createMockActionItems();
      try {
        await service.detectDuplicateActionItems(items);
      } catch (error) {
        expect((error as AIEnhancementError).code).toBe('PARSE_ERROR');
      }
    });

    it('should set error code to UNKNOWN_ERROR on unexpected errors', async () => {
      vi.mocked(mockClient.generateStructuredOutput).mockRejectedValue(
        new Error('Network error')
      );

      const items = createMockActionItems();
      try {
        await service.detectDuplicateActionItems(items);
      } catch (error) {
        expect((error as AIEnhancementError).code).toBe('UNKNOWN_ERROR');
      }
    });
  });

  // ===========================================================================
  // Follow-Up Detection
  // ===========================================================================

  describe('detectFollowUpItems', () => {
    it('should return empty array when currentItems is empty', async () => {
      const previousMinutes = [createMockMinutes()];
      const result = await service.detectFollowUpItems([], previousMinutes);
      expect(result).toEqual([]);
    });

    it('should return empty array when previousMinutes is empty', async () => {
      const currentItems = createMockActionItems();
      const result = await service.detectFollowUpItems(currentItems, []);
      expect(result).toEqual([]);
    });

    it('should call Claude API with correct parameters', async () => {
      const mockRelations = createMockFollowUpRelations();
      vi.mocked(mockClient.generateStructuredOutput).mockResolvedValue(mockRelations);

      const currentItems = createMockActionItems();
      const previousMinutes = [createMockMinutes()];

      await service.detectFollowUpItems(currentItems, previousMinutes);

      expect(mockClient.generateStructuredOutput).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(mockClient.generateStructuredOutput).mock.calls[0];
      const messages = callArgs![0];
      expect(messages[0]!.content).toContain('action_1');
      expect(messages[0]!.content).toContain('min_test_001');
    });

    it('should return follow-up relations from API response', async () => {
      const mockRelations = createMockFollowUpRelations();
      vi.mocked(mockClient.generateStructuredOutput).mockResolvedValue(mockRelations);

      const currentItems = createMockActionItems();
      const previousMinutes = [createMockMinutes()];
      const result = await service.detectFollowUpItems(currentItems, previousMinutes);

      expect(result).toHaveLength(1);
      expect(result[0]!.currentItemId).toBe('action_1');
      expect(result[0]!.relationType).toBe('follow_up');
      expect(result[0]!.relevanceScore).toBe(0.8);
    });

    it('should throw AIEnhancementError on failure', async () => {
      vi.mocked(mockClient.generateStructuredOutput).mockRejectedValue(
        new ClaudeApiError('Service unavailable', 503)
      );

      const currentItems = createMockActionItems();
      const previousMinutes = [createMockMinutes()];

      await expect(
        service.detectFollowUpItems(currentItems, previousMinutes)
      ).rejects.toThrow(AIEnhancementError);
    });
  });

  // ===========================================================================
  // Quality Scoring
  // ===========================================================================

  describe('scoreMinutesQuality', () => {
    it('should call Claude API with minutes markdown', async () => {
      const mockScore = createMockQualityScore();
      vi.mocked(mockClient.generateStructuredOutput).mockResolvedValue(mockScore);

      const minutes = createMockMinutes();
      await service.scoreMinutesQuality(minutes);

      expect(mockClient.generateStructuredOutput).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(mockClient.generateStructuredOutput).mock.calls[0];
      const messages = callArgs![0];
      // The prompt should contain the markdown representation
      expect(messages[0]!.content).toContain('週次開発定例会議');
    });

    it('should return quality score from API response', async () => {
      const mockScore = createMockQualityScore();
      vi.mocked(mockClient.generateStructuredOutput).mockResolvedValue(mockScore);

      const minutes = createMockMinutes();
      const result = await service.scoreMinutesQuality(minutes);

      expect(result.overallScore).toBe(78);
      expect(result.level).toBe('good');
      expect(result.criteria).toHaveLength(10);
      expect(result.summary).toContain('良質な議事録');
    });

    it('should validate all 10 criteria are present', async () => {
      const mockScore = createMockQualityScore();
      vi.mocked(mockClient.generateStructuredOutput).mockResolvedValue(mockScore);

      const minutes = createMockMinutes();
      const result = await service.scoreMinutesQuality(minutes);

      expect(result.criteria).toHaveLength(10);
      for (const criterion of result.criteria) {
        expect(criterion.score).toBeGreaterThanOrEqual(0);
        expect(criterion.score).toBeLessThanOrEqual(10);
        expect(criterion.maxScore).toBe(10);
        expect(criterion.name.length).toBeGreaterThan(0);
        expect(criterion.comment.length).toBeGreaterThan(0);
      }
    });

    it('should throw AIEnhancementError on API failure', async () => {
      vi.mocked(mockClient.generateStructuredOutput).mockRejectedValue(
        new ClaudeApiError('Model overloaded', 529)
      );

      const minutes = createMockMinutes();
      await expect(
        service.scoreMinutesQuality(minutes)
      ).rejects.toThrow(AIEnhancementError);
    });

    it('should throw AIEnhancementError on parse failure', async () => {
      vi.mocked(mockClient.generateStructuredOutput).mockRejectedValue(
        new ClaudeParseError('Invalid response format', '{"invalid": true}')
      );

      const minutes = createMockMinutes();
      await expect(
        service.scoreMinutesQuality(minutes)
      ).rejects.toThrow(AIEnhancementError);
    });
  });

  // ===========================================================================
  // Improvement Suggestions
  // ===========================================================================

  describe('suggestImprovements', () => {
    it('should call Claude API with minutes markdown', async () => {
      const mockImprovements = createMockImprovements();
      vi.mocked(mockClient.generateStructuredOutput).mockResolvedValue(mockImprovements);

      const minutes = createMockMinutes();
      await service.suggestImprovements(minutes);

      expect(mockClient.generateStructuredOutput).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(mockClient.generateStructuredOutput).mock.calls[0];
      const messages = callArgs![0];
      expect(messages[0]!.content).toContain('週次開発定例会議');
    });

    it('should return improvements from API response', async () => {
      const mockImprovements = createMockImprovements();
      vi.mocked(mockClient.generateStructuredOutput).mockResolvedValue(mockImprovements);

      const minutes = createMockMinutes();
      const result = await service.suggestImprovements(minutes);

      expect(result).toHaveLength(3);
      expect(result[0]!.category).toBe('action_items');
      expect(result[0]!.priority).toBe('high');
      expect(result[0]!.description).toContain('期日');
    });

    it('should include optional fields when present', async () => {
      const mockImprovements = createMockImprovements();
      vi.mocked(mockClient.generateStructuredOutput).mockResolvedValue(mockImprovements);

      const minutes = createMockMinutes();
      const result = await service.suggestImprovements(minutes);

      // First improvement has suggestion and targetSection
      expect(result[0]!.suggestion).toBeDefined();
      expect(result[0]!.targetSection).toBe('Action Items');

      // Third improvement does not have optional fields
      expect(result[2]!.suggestion).toBeUndefined();
      expect(result[2]!.targetSection).toBeUndefined();
    });

    it('should throw AIEnhancementError on API failure', async () => {
      vi.mocked(mockClient.generateStructuredOutput).mockRejectedValue(
        new ClaudeApiError('Unauthorized', 401)
      );

      const minutes = createMockMinutes();
      await expect(
        service.suggestImprovements(minutes)
      ).rejects.toThrow(AIEnhancementError);
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('error handling', () => {
    it('should preserve AIEnhancementError when re-thrown', async () => {
      const originalError = new AIEnhancementError(
        'Original error',
        'VALIDATION_ERROR'
      );
      vi.mocked(mockClient.generateStructuredOutput).mockRejectedValue(originalError);

      const items = createMockActionItems();
      try {
        await service.detectDuplicateActionItems(items);
      } catch (error) {
        expect(error).toBe(originalError);
      }
    });

    it('should wrap unknown errors with UNKNOWN_ERROR code', async () => {
      vi.mocked(mockClient.generateStructuredOutput).mockRejectedValue(
        'string error'
      );

      const items = createMockActionItems();
      try {
        await service.detectDuplicateActionItems(items);
      } catch (error) {
        expect(error).toBeInstanceOf(AIEnhancementError);
        expect((error as AIEnhancementError).code).toBe('UNKNOWN_ERROR');
      }
    });
  });

  // ===========================================================================
  // Cumulative Token Usage
  // ===========================================================================

  describe('cumulative token usage', () => {
    it('should accumulate token usage across multiple calls', async () => {
      const mockDuplicates = createMockDuplicateResult();
      const mockScore = createMockQualityScore();

      vi.mocked(mockClient.generateStructuredOutput)
        .mockResolvedValueOnce(mockDuplicates)
        .mockResolvedValueOnce(mockScore);

      const items = createMockActionItems();
      const minutes = createMockMinutes();

      await service.detectDuplicateActionItems(items);
      const usageAfterFirst = service.getTokenUsage();

      await service.scoreMinutesQuality(minutes);
      const usageAfterSecond = service.getTokenUsage();

      expect(usageAfterSecond.totalTokens).toBeGreaterThan(usageAfterFirst.totalTokens);
    });

    it('should reset to zero after resetTokenUsage', async () => {
      const mockDuplicates = createMockDuplicateResult();
      vi.mocked(mockClient.generateStructuredOutput).mockResolvedValue(mockDuplicates);

      const items = createMockActionItems();
      await service.detectDuplicateActionItems(items);

      expect(service.getTokenUsage().totalTokens).toBeGreaterThan(0);

      service.resetTokenUsage();
      expect(service.getTokenUsage().totalTokens).toBe(0);
    });
  });
});

// =============================================================================
// AIEnhancementError Tests
// =============================================================================

describe('AIEnhancementError', () => {
  it('should have correct name', () => {
    const error = new AIEnhancementError('test', 'API_ERROR');
    expect(error.name).toBe('AIEnhancementError');
  });

  it('should store error code', () => {
    const error = new AIEnhancementError('test', 'PARSE_ERROR');
    expect(error.code).toBe('PARSE_ERROR');
  });

  it('should store cause', () => {
    const cause = new Error('original');
    const error = new AIEnhancementError('test', 'UNKNOWN_ERROR', cause);
    expect(error.cause).toBe(cause);
  });

  it('should be instanceof Error', () => {
    const error = new AIEnhancementError('test', 'API_ERROR');
    expect(error).toBeInstanceOf(Error);
  });

  it('should be instanceof AIEnhancementError', () => {
    const error = new AIEnhancementError('test', 'API_ERROR');
    expect(error).toBeInstanceOf(AIEnhancementError);
  });
});
