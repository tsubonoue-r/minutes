/**
 * Template type definitions for meeting minutes
 * @module types/template
 */

import { z, type ZodSafeParseResult } from 'zod';

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * Meeting type enum values
 */
export const MEETING_TYPES = [
  'regular',
  'project',
  'one_on_one',
  'brainstorm',
  'decision',
] as const;

/**
 * Template category enum values
 */
export const TEMPLATE_CATEGORIES = [
  'business',
  'engineering',
  'hr',
  'sales',
  'custom',
] as const;

/**
 * Template category enum
 */
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

/**
 * Template category labels (Japanese)
 */
export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  business: 'ビジネス',
  engineering: 'エンジニアリング',
  hr: '人事',
  sales: '営業',
  custom: 'カスタム',
};

/**
 * Template category labels (English)
 */
export const TEMPLATE_CATEGORY_LABELS_EN: Record<TemplateCategory, string> = {
  business: 'Business',
  engineering: 'Engineering',
  hr: 'Human Resources',
  sales: 'Sales',
  custom: 'Custom',
};

/**
 * Meeting type enum
 */
export type MeetingType = (typeof MEETING_TYPES)[number];

/**
 * Meeting type labels (Japanese)
 */
export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  regular: '定例会議',
  project: 'プロジェクト会議',
  one_on_one: '1on1',
  brainstorm: 'ブレスト',
  decision: '意思決定会議',
};

/**
 * Meeting type labels (English)
 */
export const MEETING_TYPE_LABELS_EN: Record<MeetingType, string> = {
  regular: 'Regular Meeting',
  project: 'Project Meeting',
  one_on_one: '1-on-1',
  brainstorm: 'Brainstorming',
  decision: 'Decision Meeting',
};

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Meeting type schema
 */
export const MeetingTypeSchema = z.enum(MEETING_TYPES);

/**
 * Template category schema
 */
export const TemplateCategorySchema = z.enum(TEMPLATE_CATEGORIES);

/**
 * Template section schema
 */
export const TemplateSectionSchema = z.object({
  /** Section ID */
  id: z.string().min(1),
  /** Section title */
  title: z.string().min(1),
  /** Section description/hint */
  description: z.string(),
  /** Whether this section is required */
  required: z.boolean(),
  /** Display order (lower = first) */
  order: z.number().int().nonnegative(),
});

/**
 * Template structure schema
 */
export const TemplateStructureSchema = z.object({
  /** Sections to include in the minutes */
  sections: z.array(TemplateSectionSchema),
  /** Key focus areas for this meeting type */
  focusAreas: z.array(z.string()),
  /** Suggested extraction keywords */
  extractionKeywords: z.array(z.string()),
});

/**
 * Template schema
 */
export const TemplateSchema = z.object({
  /** Unique template identifier */
  id: z.string().min(1),
  /** Template name */
  name: z.string().min(1),
  /** Meeting type this template is for */
  meetingType: MeetingTypeSchema,
  /** Template category for organization */
  category: TemplateCategorySchema.optional(),
  /** Template structure */
  structure: TemplateStructureSchema,
  /** AI prompt template for generation */
  promptTemplate: z.string().min(1),
  /** Whether this is the default template for the meeting type */
  isDefault: z.boolean(),
  /** Template description */
  description: z.string().optional(),
  /** Template tags for search */
  tags: z.array(z.string()).optional(),
  /** Creation timestamp */
  createdAt: z.string().datetime({ offset: true }),
  /** Last update timestamp */
  updatedAt: z.string().datetime({ offset: true }),
});

/**
 * Template creation input schema (without id and timestamps)
 */
export const TemplateCreateInputSchema = z.object({
  /** Template name */
  name: z.string().min(1),
  /** Meeting type */
  meetingType: MeetingTypeSchema,
  /** Template category */
  category: TemplateCategorySchema.optional(),
  /** Template structure */
  structure: TemplateStructureSchema,
  /** AI prompt template */
  promptTemplate: z.string().min(1),
  /** Is default for this meeting type */
  isDefault: z.boolean().optional(),
  /** Template description */
  description: z.string().optional(),
  /** Template tags */
  tags: z.array(z.string()).optional(),
});

/**
 * Template update input schema (partial)
 */
export const TemplateUpdateInputSchema = z.object({
  /** Template name */
  name: z.string().min(1).optional(),
  /** Meeting type */
  meetingType: MeetingTypeSchema.optional(),
  /** Template category */
  category: TemplateCategorySchema.optional(),
  /** Template structure */
  structure: TemplateStructureSchema.optional(),
  /** AI prompt template */
  promptTemplate: z.string().min(1).optional(),
  /** Is default for this meeting type */
  isDefault: z.boolean().optional(),
  /** Template description */
  description: z.string().optional(),
  /** Template tags */
  tags: z.array(z.string()).optional(),
});

/**
 * Template selection request schema
 */
export const TemplateSelectRequestSchema = z.object({
  /** Meeting title to analyze */
  meetingTitle: z.string().min(1),
});

/**
 * Template selection response schema
 */
export const TemplateSelectResponseSchema = z.object({
  /** Selected template */
  template: TemplateSchema,
  /** Confidence score (0-1) */
  confidence: z.number().min(0).max(1),
  /** Detected meeting type */
  detectedType: MeetingTypeSchema,
  /** Matching keywords found */
  matchedKeywords: z.array(z.string()),
});

/**
 * Template export data schema (for import/export)
 */
export const TemplateExportDataSchema = z.object({
  /** Export version for compatibility */
  version: z.literal('1.0'),
  /** Export timestamp */
  exportedAt: z.string().datetime({ offset: true }),
  /** Exported templates */
  templates: z.array(TemplateSchema),
});

/**
 * Template duplicate request schema
 */
export const TemplateDuplicateRequestSchema = z.object({
  /** Source template ID to duplicate */
  sourceId: z.string().min(1),
  /** New name for the duplicated template */
  newName: z.string().min(1).optional(),
});

// ============================================================================
// Types (inferred from Zod schemas)
// ============================================================================

/**
 * Template section
 */
export type TemplateSection = z.infer<typeof TemplateSectionSchema>;

/**
 * Template structure
 */
export type TemplateStructure = z.infer<typeof TemplateStructureSchema>;

/**
 * Template
 */
export type Template = z.infer<typeof TemplateSchema>;

/**
 * Template creation input
 */
export type TemplateCreateInput = z.infer<typeof TemplateCreateInputSchema>;

/**
 * Template update input
 */
export type TemplateUpdateInput = z.infer<typeof TemplateUpdateInputSchema>;

/**
 * Template selection request
 */
export type TemplateSelectRequest = z.infer<typeof TemplateSelectRequestSchema>;

/**
 * Template selection response
 */
export type TemplateSelectResponse = z.infer<typeof TemplateSelectResponseSchema>;

/**
 * Template export data
 */
export type TemplateExportData = z.infer<typeof TemplateExportDataSchema>;

/**
 * Template duplicate request
 */
export type TemplateDuplicateRequest = z.infer<typeof TemplateDuplicateRequestSchema>;

// ============================================================================
// Read-only Types
// ============================================================================

/**
 * Read-only TemplateSection type
 */
export interface ReadonlyTemplateSection {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly required: boolean;
  readonly order: number;
}

/**
 * Read-only TemplateStructure type
 */
export interface ReadonlyTemplateStructure {
  readonly sections: readonly ReadonlyTemplateSection[];
  readonly focusAreas: readonly string[];
  readonly extractionKeywords: readonly string[];
}

/**
 * Read-only Template type
 */
export interface ReadonlyTemplate {
  readonly id: string;
  readonly name: string;
  readonly meetingType: MeetingType;
  readonly category?: TemplateCategory;
  readonly structure: ReadonlyTemplateStructure;
  readonly promptTemplate: string;
  readonly isDefault: boolean;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique template ID
 *
 * @param prefix - Optional prefix (default: 'tpl')
 * @returns Unique template ID
 */
export function generateTemplateId(prefix: string = 'tpl'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Create a new Template object
 *
 * @param input - Template creation input
 * @returns New Template object with generated ID and timestamps
 */
export function createTemplate(input: TemplateCreateInput): Template {
  const now = new Date().toISOString();
  return {
    id: generateTemplateId(),
    name: input.name,
    meetingType: input.meetingType,
    category: input.category,
    structure: input.structure,
    promptTemplate: input.promptTemplate,
    isDefault: input.isDefault ?? false,
    description: input.description,
    tags: input.tags,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update a Template object
 *
 * @param template - Existing template
 * @param input - Update input
 * @returns Updated Template object
 */
export function updateTemplate(
  template: Template,
  input: TemplateUpdateInput
): Template {
  const now = new Date().toISOString();
  return {
    ...template,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.meetingType !== undefined && { meetingType: input.meetingType }),
    ...(input.category !== undefined && { category: input.category }),
    ...(input.structure !== undefined && { structure: input.structure }),
    ...(input.promptTemplate !== undefined && { promptTemplate: input.promptTemplate }),
    ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.tags !== undefined && { tags: input.tags }),
    updatedAt: now,
  };
}

/**
 * Create a TemplateSection object
 *
 * @param id - Section ID
 * @param title - Section title
 * @param description - Section description
 * @param required - Whether required
 * @param order - Display order
 * @returns TemplateSection object
 */
export function createTemplateSection(
  id: string,
  title: string,
  description: string,
  required: boolean,
  order: number
): TemplateSection {
  return {
    id,
    title,
    description,
    required,
    order,
  };
}

/**
 * Sort sections by order
 *
 * @param sections - Sections to sort
 * @returns Sorted sections array
 */
export function sortSectionsByOrder(
  sections: readonly TemplateSection[]
): TemplateSection[] {
  return [...sections].sort((a, b) => a.order - b.order);
}

/**
 * Get meeting type label
 *
 * @param type - Meeting type
 * @param language - Language ('ja' or 'en')
 * @returns Localized label
 */
export function getMeetingTypeLabel(
  type: MeetingType,
  language: 'ja' | 'en' = 'ja'
): string {
  return language === 'ja'
    ? MEETING_TYPE_LABELS[type]
    : MEETING_TYPE_LABELS_EN[type];
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a Template object
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateTemplate(
  data: unknown
): ZodSafeParseResult<Template> {
  return TemplateSchema.safeParse(data);
}

/**
 * Validate a TemplateCreateInput object
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateTemplateCreateInput(
  data: unknown
): ZodSafeParseResult<TemplateCreateInput> {
  return TemplateCreateInputSchema.safeParse(data);
}

/**
 * Validate a TemplateUpdateInput object
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateTemplateUpdateInput(
  data: unknown
): ZodSafeParseResult<TemplateUpdateInput> {
  return TemplateUpdateInputSchema.safeParse(data);
}

/**
 * Validate a TemplateSelectRequest object
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateTemplateSelectRequest(
  data: unknown
): ZodSafeParseResult<TemplateSelectRequest> {
  return TemplateSelectRequestSchema.safeParse(data);
}

/**
 * Validate a TemplateExportData object
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateTemplateExportData(
  data: unknown
): ZodSafeParseResult<TemplateExportData> {
  return TemplateExportDataSchema.safeParse(data);
}

/**
 * Validate a TemplateDuplicateRequest object
 *
 * @param data - Data to validate
 * @returns Validation result
 */
export function validateTemplateDuplicateRequest(
  data: unknown
): ZodSafeParseResult<TemplateDuplicateRequest> {
  return TemplateDuplicateRequestSchema.safeParse(data);
}

/**
 * Get template category label
 *
 * @param category - Template category
 * @param language - Language ('ja' or 'en')
 * @returns Localized label
 */
export function getTemplateCategoryLabel(
  category: TemplateCategory,
  language: 'ja' | 'en' = 'ja'
): string {
  return language === 'ja'
    ? TEMPLATE_CATEGORY_LABELS[category]
    : TEMPLATE_CATEGORY_LABELS_EN[category];
}
