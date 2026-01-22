/**
 * Template service for managing meeting templates
 * @module services/template.service
 */

import type {
  Template,
  TemplateCreateInput,
  TemplateUpdateInput,
  TemplateSelectResponse,
  TemplateExportData,
  MeetingType,
  TemplateCategory,
  TemplateStructure,
} from '@/types/template';
import {
  createTemplate,
  updateTemplate,
  generateTemplateId,
  MEETING_TYPES,
  validateTemplateExportData,
} from '@/types/template';

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Template service error
 */
export class TemplateServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'TemplateServiceError';
  }
}

// ============================================================================
// Default Templates Data
// ============================================================================

/**
 * Regular meeting structure
 */
const REGULAR_MEETING_STRUCTURE: TemplateStructure = {
  sections: [
    {
      id: 'progress',
      title: '前回からの進捗',
      description: '前回会議以降の進捗状況を記載',
      required: true,
      order: 1,
    },
    {
      id: 'issues',
      title: '課題・問題点',
      description: '現在直面している課題や問題点',
      required: true,
      order: 2,
    },
    {
      id: 'discussion',
      title: '議論内容',
      description: '会議での主な議論ポイント',
      required: true,
      order: 3,
    },
    {
      id: 'next_week',
      title: '次週予定',
      description: '次回までのアクションと予定',
      required: true,
      order: 4,
    },
  ],
  focusAreas: ['進捗報告', '課題共有', 'スケジュール確認'],
  extractionKeywords: ['進捗', '報告', '完了', '遅延', '予定', '来週', '次回'],
};

/**
 * Project meeting structure
 */
const PROJECT_MEETING_STRUCTURE: TemplateStructure = {
  sections: [
    {
      id: 'milestone',
      title: 'マイルストーン状況',
      description: 'プロジェクトマイルストーンの進捗',
      required: true,
      order: 1,
    },
    {
      id: 'risks',
      title: 'リスク・懸念事項',
      description: '識別されたリスクと対策',
      required: true,
      order: 2,
    },
    {
      id: 'dependencies',
      title: '依存関係',
      description: '他チーム・外部依存の状況',
      required: true,
      order: 3,
    },
    {
      id: 'decisions',
      title: '決定事項',
      description: '会議で決定された事項',
      required: true,
      order: 4,
    },
    {
      id: 'actions',
      title: 'アクションアイテム',
      description: '担当者と期限を明確にしたタスク',
      required: true,
      order: 5,
    },
  ],
  focusAreas: ['マイルストーン達成', 'リスク管理', '依存関係調整'],
  extractionKeywords: ['マイルストーン', 'リスク', '依存', 'ブロッカー', 'クリティカルパス', '遅延', '対策'],
};

/**
 * 1-on-1 meeting structure
 */
const ONE_ON_ONE_STRUCTURE: TemplateStructure = {
  sections: [
    {
      id: 'wellbeing',
      title: '近況・コンディション',
      description: 'メンバーの状態確認',
      required: true,
      order: 1,
    },
    {
      id: 'achievements',
      title: '成果・振り返り',
      description: '直近の成果と振り返り',
      required: true,
      order: 2,
    },
    {
      id: 'challenges',
      title: '課題・サポート依頼',
      description: '困っていることやサポートが必要な点',
      required: true,
      order: 3,
    },
    {
      id: 'career',
      title: 'キャリア・成長',
      description: 'キャリア目標や成長機会について',
      required: false,
      order: 4,
    },
    {
      id: 'feedback',
      title: 'フィードバック',
      description: '双方向のフィードバック',
      required: false,
      order: 5,
    },
    {
      id: 'goals',
      title: '目標設定',
      description: '次回までの目標や取り組み',
      required: true,
      order: 6,
    },
  ],
  focusAreas: ['キャリア開発', 'フィードバック', '目標設定', 'サポート'],
  extractionKeywords: ['キャリア', '目標', 'フィードバック', '成長', 'サポート', '困っている', 'チャレンジ'],
};

/**
 * Brainstorming meeting structure
 */
const BRAINSTORM_STRUCTURE: TemplateStructure = {
  sections: [
    {
      id: 'theme',
      title: 'テーマ・目的',
      description: 'ブレストのテーマと目的',
      required: true,
      order: 1,
    },
    {
      id: 'ideas',
      title: 'アイデア一覧',
      description: '出されたアイデアの一覧',
      required: true,
      order: 2,
    },
    {
      id: 'grouping',
      title: 'グルーピング・分類',
      description: 'アイデアの整理・グループ化',
      required: false,
      order: 3,
    },
    {
      id: 'voting',
      title: '投票・評価結果',
      description: '投票や評価の結果',
      required: false,
      order: 4,
    },
    {
      id: 'adopted',
      title: '採用案',
      description: '採用が決まったアイデア',
      required: true,
      order: 5,
    },
    {
      id: 'next_steps',
      title: '次のステップ',
      description: '採用案の実行計画',
      required: true,
      order: 6,
    },
  ],
  focusAreas: ['アイデア創出', '創造的思考', '合意形成'],
  extractionKeywords: ['アイデア', '案', '提案', '投票', '採用', '賛成', '面白い', 'いいね'],
};

/**
 * Decision meeting structure
 */
const DECISION_MEETING_STRUCTURE: TemplateStructure = {
  sections: [
    {
      id: 'background',
      title: '背景・経緯',
      description: '意思決定が必要になった背景',
      required: true,
      order: 1,
    },
    {
      id: 'options',
      title: '選択肢',
      description: '検討された選択肢の一覧',
      required: true,
      order: 2,
    },
    {
      id: 'criteria',
      title: '判断基準',
      description: '意思決定の判断基準',
      required: true,
      order: 3,
    },
    {
      id: 'evaluation',
      title: '評価・比較',
      description: '各選択肢の評価',
      required: true,
      order: 4,
    },
    {
      id: 'decision',
      title: '決定事項',
      description: '最終的な決定内容',
      required: true,
      order: 5,
    },
    {
      id: 'rationale',
      title: '決定理由',
      description: 'なぜその決定に至ったか',
      required: true,
      order: 6,
    },
    {
      id: 'actions',
      title: '実行計画',
      description: '決定後のアクションプラン',
      required: true,
      order: 7,
    },
  ],
  focusAreas: ['選択肢の明確化', '判断基準の設定', '合理的決定'],
  extractionKeywords: ['選択肢', '案', '基準', '評価', '決定', '理由', '採用', '却下', 'メリット', 'デメリット'],
};

/**
 * Build AI prompt template for a meeting type
 */
function buildPromptTemplate(meetingType: MeetingType, structure: TemplateStructure): string {
  const sectionInstructions = structure.sections
    .map((s) => `- ${s.title}: ${s.description}${s.required ? ' (必須)' : ' (任意)'}`)
    .join('\n');

  const focusAreas = structure.focusAreas.join('、');
  const keywords = structure.extractionKeywords.join('、');

  return `この会議は「${getMeetingTypeName(meetingType)}」形式です。

## 重点的に抽出すべき内容
${focusAreas}

## 抽出キーワード
以下のキーワードに注目して情報を抽出してください：
${keywords}

## 議事録セクション
以下のセクション構成で議事録を作成してください：
${sectionInstructions}

## 注意事項
- ${getMeetingTypeSpecificInstructions(meetingType)}
- セクションごとに明確に分けて記載してください
- 重要な決定事項やアクションアイテムは漏らさず記載してください`;
}

/**
 * Get meeting type name in Japanese
 */
function getMeetingTypeName(type: MeetingType): string {
  const names: Record<MeetingType, string> = {
    regular: '定例会議',
    project: 'プロジェクト会議',
    one_on_one: '1on1ミーティング',
    brainstorm: 'ブレインストーミング',
    decision: '意思決定会議',
  };
  return names[type];
}

/**
 * Get meeting type specific instructions
 */
function getMeetingTypeSpecificInstructions(type: MeetingType): string {
  const instructions: Record<MeetingType, string> = {
    regular: '進捗状況と次週予定を明確に記載してください',
    project: 'マイルストーンへの影響とリスクを重点的に記載してください',
    one_on_one: 'キャリアや成長に関する内容は特に丁寧に記載してください',
    brainstorm: '全てのアイデアを漏らさず記録し、採用理由を明確にしてください',
    decision: '選択肢、判断基準、決定理由を論理的に記載してください',
  };
  return instructions[type];
}

/**
 * Create default templates
 */
function createDefaultTemplates(): Template[] {
  const now = new Date().toISOString();
  const templates: Template[] = [];

  // Regular meeting template
  templates.push({
    id: 'tpl_default_regular',
    name: '定例会議テンプレート',
    meetingType: 'regular',
    category: 'business',
    structure: REGULAR_MEETING_STRUCTURE,
    promptTemplate: buildPromptTemplate('regular', REGULAR_MEETING_STRUCTURE),
    isDefault: true,
    description: '週次・月次の定例会議向けの標準テンプレート',
    tags: ['定例', '進捗報告', 'スタンダード'],
    createdAt: now,
    updatedAt: now,
  });

  // Project meeting template
  templates.push({
    id: 'tpl_default_project',
    name: 'プロジェクト会議テンプレート',
    meetingType: 'project',
    category: 'engineering',
    structure: PROJECT_MEETING_STRUCTURE,
    promptTemplate: buildPromptTemplate('project', PROJECT_MEETING_STRUCTURE),
    isDefault: true,
    description: 'プロジェクト進捗管理・リスク管理向けテンプレート',
    tags: ['プロジェクト', 'マイルストーン', 'リスク管理'],
    createdAt: now,
    updatedAt: now,
  });

  // 1-on-1 template
  templates.push({
    id: 'tpl_default_one_on_one',
    name: '1on1テンプレート',
    meetingType: 'one_on_one',
    category: 'hr',
    structure: ONE_ON_ONE_STRUCTURE,
    promptTemplate: buildPromptTemplate('one_on_one', ONE_ON_ONE_STRUCTURE),
    isDefault: true,
    description: '1対1のミーティング・キャリア面談向けテンプレート',
    tags: ['1on1', 'キャリア', 'フィードバック', '面談'],
    createdAt: now,
    updatedAt: now,
  });

  // Brainstorm template
  templates.push({
    id: 'tpl_default_brainstorm',
    name: 'ブレストテンプレート',
    meetingType: 'brainstorm',
    category: 'business',
    structure: BRAINSTORM_STRUCTURE,
    promptTemplate: buildPromptTemplate('brainstorm', BRAINSTORM_STRUCTURE),
    isDefault: true,
    description: 'アイデア出し・ブレインストーミング向けテンプレート',
    tags: ['ブレスト', 'アイデア', 'ワークショップ'],
    createdAt: now,
    updatedAt: now,
  });

  // Decision meeting template
  templates.push({
    id: 'tpl_default_decision',
    name: '意思決定会議テンプレート',
    meetingType: 'decision',
    category: 'business',
    structure: DECISION_MEETING_STRUCTURE,
    promptTemplate: buildPromptTemplate('decision', DECISION_MEETING_STRUCTURE),
    isDefault: true,
    description: '重要な意思決定を行う会議向けテンプレート',
    tags: ['意思決定', '判断', '承認'],
    createdAt: now,
    updatedAt: now,
  });

  return templates;
}

// ============================================================================
// In-Memory Storage
// ============================================================================

/**
 * In-memory template storage
 * In production, this would be replaced with a database
 */
let templateStorage: Map<string, Template> = new Map();
let initialized = false;

/**
 * Initialize storage with default templates
 */
function initializeStorage(): void {
  if (initialized) return;

  const defaultTemplates = createDefaultTemplates();
  for (const template of defaultTemplates) {
    templateStorage.set(template.id, template);
  }
  initialized = true;
}

/**
 * Reset storage (for testing)
 */
export function resetTemplateStorage(): void {
  templateStorage = new Map();
  initialized = false;
  initializeStorage();
}

// ============================================================================
// Auto-Selection Logic
// ============================================================================

/**
 * Keywords for meeting type detection
 */
const MEETING_TYPE_KEYWORDS: Record<MeetingType, string[]> = {
  regular: [
    '定例', '週次', '月次', 'weekly', 'monthly', 'regular',
    '朝会', '夕会', 'standup', 'スタンドアップ',
  ],
  project: [
    'プロジェクト', 'PJ', 'project', 'キックオフ', 'kickoff',
    'スプリント', 'sprint', 'イテレーション', 'マイルストーン',
  ],
  one_on_one: [
    '1on1', '1:1', 'one on one', 'oneOnOne', '面談', '個別',
    'キャリア相談', 'メンタリング', 'mentoring',
  ],
  brainstorm: [
    'ブレスト', 'brainstorm', 'ブレインストーミング', 'アイデア',
    'idea', '発想', 'ideation', 'ワークショップ', 'workshop',
  ],
  decision: [
    '意思決定', '決定', 'decision', '判断', '承認',
    'approval', '審議', 'review', '検討会', '方針',
  ],
};

/**
 * Detect meeting type from title
 *
 * @param title - Meeting title
 * @returns Detected meeting type and matched keywords
 */
function detectMeetingType(
  title: string
): { type: MeetingType; matchedKeywords: string[]; confidence: number } {
  const titleLower = title.toLowerCase();
  let bestMatch: {
    type: MeetingType;
    matchedKeywords: string[];
    confidence: number;
  } = {
    type: 'regular',
    matchedKeywords: [],
    confidence: 0.3, // Default confidence for regular meeting
  };

  for (const meetingType of MEETING_TYPES) {
    const keywords = MEETING_TYPE_KEYWORDS[meetingType];
    const matchedKeywords: string[] = [];

    for (const keyword of keywords) {
      if (titleLower.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length > 0) {
      // Calculate confidence based on number of matches and keyword specificity
      const confidence = Math.min(0.5 + matchedKeywords.length * 0.2, 0.95);

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          type: meetingType,
          matchedKeywords,
          confidence,
        };
      }
    }
  }

  return bestMatch;
}

// ============================================================================
// Template Service
// ============================================================================

/**
 * Template service for CRUD operations and auto-selection
 */
export class TemplateService {
  constructor() {
    initializeStorage();
  }

  /**
   * Get all templates
   *
   * @returns Array of all templates
   */
  getAll(): Template[] {
    return Array.from(templateStorage.values());
  }

  /**
   * Get templates by meeting type
   *
   * @param meetingType - Meeting type to filter by
   * @returns Array of templates for the specified type
   */
  getByMeetingType(meetingType: MeetingType): Template[] {
    return Array.from(templateStorage.values()).filter(
      (t) => t.meetingType === meetingType
    );
  }

  /**
   * Get template by ID
   *
   * @param id - Template ID
   * @returns Template if found, undefined otherwise
   */
  getById(id: string): Template | undefined {
    return templateStorage.get(id);
  }

  /**
   * Get default template for a meeting type
   *
   * @param meetingType - Meeting type
   * @returns Default template for the type
   */
  getDefaultByType(meetingType: MeetingType): Template | undefined {
    return Array.from(templateStorage.values()).find(
      (t) => t.meetingType === meetingType && t.isDefault
    );
  }

  /**
   * Create a new template
   *
   * @param input - Template creation input
   * @returns Created template
   */
  create(input: TemplateCreateInput): Template {
    const template = createTemplate(input);

    // If this is set as default, unset other defaults for the same type
    if (template.isDefault) {
      this.unsetDefaultsForType(template.meetingType);
    }

    templateStorage.set(template.id, template);
    return template;
  }

  /**
   * Update an existing template
   *
   * @param id - Template ID
   * @param input - Update input
   * @returns Updated template
   * @throws TemplateServiceError if template not found
   */
  update(id: string, input: TemplateUpdateInput): Template {
    const existing = templateStorage.get(id);
    if (existing === undefined) {
      throw new TemplateServiceError(
        `Template not found: ${id}`,
        'TEMPLATE_NOT_FOUND',
        404
      );
    }

    // Prevent modifying default templates' core properties
    if (existing.id.startsWith('tpl_default_')) {
      // Only allow updating isDefault for built-in templates
      if (
        input.name !== undefined ||
        input.meetingType !== undefined ||
        input.structure !== undefined ||
        input.promptTemplate !== undefined
      ) {
        throw new TemplateServiceError(
          'Cannot modify built-in default templates. Create a new template instead.',
          'CANNOT_MODIFY_DEFAULT',
          400
        );
      }
    }

    const updated = updateTemplate(existing, input);

    // If this is set as default, unset other defaults for the same type
    if (input.isDefault === true) {
      this.unsetDefaultsForType(updated.meetingType);
    }

    templateStorage.set(id, updated);
    return updated;
  }

  /**
   * Delete a template
   *
   * @param id - Template ID
   * @throws TemplateServiceError if template not found or is a default
   */
  delete(id: string): void {
    const existing = templateStorage.get(id);
    if (existing === undefined) {
      throw new TemplateServiceError(
        `Template not found: ${id}`,
        'TEMPLATE_NOT_FOUND',
        404
      );
    }

    // Prevent deleting built-in default templates
    if (existing.id.startsWith('tpl_default_')) {
      throw new TemplateServiceError(
        'Cannot delete built-in default templates',
        'CANNOT_DELETE_DEFAULT',
        400
      );
    }

    templateStorage.delete(id);
  }

  /**
   * Auto-select template based on meeting title
   *
   * @param meetingTitle - Meeting title to analyze
   * @returns Selected template with confidence and details
   */
  selectByTitle(meetingTitle: string): TemplateSelectResponse {
    const { type, matchedKeywords, confidence } = detectMeetingType(meetingTitle);

    const template = this.getDefaultByType(type);
    if (template === undefined) {
      throw new TemplateServiceError(
        `No default template found for type: ${type}`,
        'NO_DEFAULT_TEMPLATE',
        500
      );
    }

    return {
      template,
      confidence,
      detectedType: type,
      matchedKeywords,
    };
  }

  /**
   * Get templates by category
   *
   * @param category - Template category to filter by
   * @returns Array of templates for the specified category
   */
  getByCategory(category: TemplateCategory): Template[] {
    return Array.from(templateStorage.values()).filter(
      (t) => t.category === category
    );
  }

  /**
   * Duplicate an existing template
   *
   * @param sourceId - Source template ID
   * @param newName - Optional new name for the duplicate
   * @returns Duplicated template with new ID
   * @throws TemplateServiceError if source template not found
   */
  duplicate(sourceId: string, newName?: string): Template {
    const source = templateStorage.get(sourceId);
    if (source === undefined) {
      throw new TemplateServiceError(
        `Template not found: ${sourceId}`,
        'TEMPLATE_NOT_FOUND',
        404
      );
    }

    const now = new Date().toISOString();
    const duplicated: Template = {
      ...source,
      id: generateTemplateId(),
      name: newName ?? `${source.name} (コピー)`,
      isDefault: false, // Duplicates are never default
      category: source.category ?? 'custom',
      createdAt: now,
      updatedAt: now,
    };

    templateStorage.set(duplicated.id, duplicated);
    return duplicated;
  }

  /**
   * Export templates to JSON format
   *
   * @param templateIds - Optional array of template IDs to export. If empty, exports all non-default templates.
   * @returns Export data object
   */
  export(templateIds?: string[]): TemplateExportData {
    let templatesToExport: Template[];

    if (templateIds !== undefined && templateIds.length > 0) {
      templatesToExport = templateIds
        .map((id) => templateStorage.get(id))
        .filter((t): t is Template => t !== undefined);
    } else {
      // Export all user-created templates (non-default)
      templatesToExport = Array.from(templateStorage.values()).filter(
        (t) => !t.id.startsWith('tpl_default_')
      );
    }

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      templates: templatesToExport,
    };
  }

  /**
   * Import templates from JSON data
   *
   * @param data - Export data to import
   * @param options - Import options
   * @returns Array of imported templates
   * @throws TemplateServiceError if data is invalid
   */
  import(
    data: unknown,
    options: { overwriteExisting?: boolean } = {}
  ): { imported: Template[]; skipped: string[]; errors: string[] } {
    const validation = validateTemplateExportData(data);
    if (!validation.success) {
      throw new TemplateServiceError(
        'Invalid import data format',
        'INVALID_IMPORT_DATA',
        400
      );
    }

    const exportData = validation.data;
    const imported: Template[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const template of exportData.templates) {
      try {
        // Skip built-in default templates
        if (template.id.startsWith('tpl_default_')) {
          skipped.push(`${template.name} (組込みテンプレートはスキップ)`);
          continue;
        }

        const existing = templateStorage.get(template.id);
        if (existing !== undefined) {
          if (options.overwriteExisting === true) {
            const now = new Date().toISOString();
            const updated = { ...template, updatedAt: now };
            templateStorage.set(template.id, updated);
            imported.push(updated);
          } else {
            // Create as new template with new ID
            const now = new Date().toISOString();
            const newTemplate: Template = {
              ...template,
              id: generateTemplateId(),
              name: `${template.name} (インポート)`,
              isDefault: false,
              createdAt: now,
              updatedAt: now,
            };
            templateStorage.set(newTemplate.id, newTemplate);
            imported.push(newTemplate);
          }
        } else {
          // Import as-is (preserving ID)
          const now = new Date().toISOString();
          const newTemplate: Template = {
            ...template,
            isDefault: false, // Never import as default
            updatedAt: now,
          };
          templateStorage.set(newTemplate.id, newTemplate);
          imported.push(newTemplate);
        }
      } catch (err) {
        errors.push(`${template.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Search templates by name, description, or tags
   *
   * @param query - Search query
   * @returns Matching templates
   */
  search(query: string): Template[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(templateStorage.values()).filter((t) => {
      const nameMatch = t.name.toLowerCase().includes(lowerQuery);
      const descMatch = t.description?.toLowerCase().includes(lowerQuery) ?? false;
      const tagMatch = t.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)) ?? false;
      return nameMatch || descMatch || tagMatch;
    });
  }

  /**
   * Unset default flag for all templates of a given type
   */
  private unsetDefaultsForType(meetingType: MeetingType): void {
    const entries = Array.from(templateStorage.entries());
    for (const [id, template] of entries) {
      if (template.meetingType === meetingType && template.isDefault) {
        const updated = updateTemplate(template, { isDefault: false });
        templateStorage.set(id, updated);
      }
    }
  }
}

/**
 * Create a template service instance
 *
 * @returns Template service instance
 */
export function createTemplateService(): TemplateService {
  return new TemplateService();
}

// ============================================================================
// Singleton Instance
// ============================================================================

let serviceInstance: TemplateService | null = null;

/**
 * Get the singleton template service instance
 *
 * @returns Template service instance
 */
export function getTemplateService(): TemplateService {
  if (serviceInstance === null) {
    serviceInstance = new TemplateService();
  }
  return serviceInstance;
}
