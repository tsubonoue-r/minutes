/**
 * Lark Bitable (Base) Table Schema Definitions
 * @module lib/lark/bitable-schema
 *
 * This file defines the expected table schemas for Lark Base integration.
 * Use these schemas as reference when creating tables in Lark Base.
 */

import { z } from 'zod';

// =============================================================================
// Field Type Definitions
// =============================================================================

/**
 * Lark Bitable field type codes
 * @see https://open.larksuite.com/document/server-docs/docs/bitable-v1/field-type-guide-v1
 */
export const BitableFieldTypeCode = {
  /** Text (single line or multi-line) */
  TEXT: 1,
  /** Number */
  NUMBER: 2,
  /** Single select */
  SINGLE_SELECT: 3,
  /** Multi select */
  MULTI_SELECT: 4,
  /** Date / DateTime */
  DATE_TIME: 5,
  /** Checkbox (boolean) */
  CHECKBOX: 7,
  /** User (Lark user reference) */
  USER: 11,
  /** Phone */
  PHONE: 13,
  /** URL */
  URL: 15,
  /** Attachment */
  ATTACHMENT: 17,
  /** Link (reference to another table) */
  LINK: 18,
  /** Formula */
  FORMULA: 20,
  /** Lookup */
  LOOKUP: 21,
  /** Auto number */
  AUTO_NUMBER: 1005,
  /** Created time */
  CREATED_TIME: 1001,
  /** Modified time */
  MODIFIED_TIME: 1002,
  /** Created by */
  CREATED_BY: 1003,
  /** Modified by */
  MODIFIED_BY: 1004,
} as const;

export type BitableFieldTypeCode =
  (typeof BitableFieldTypeCode)[keyof typeof BitableFieldTypeCode];

// =============================================================================
// Meetings Table Schema
// =============================================================================

/**
 * Meetings table field definitions
 *
 * Table Name: Meetings
 * Description: Stores meeting metadata synchronized from Lark VC
 */
export const MeetingsTableSchema = {
  tableName: 'Meetings',
  fields: [
    {
      fieldName: 'meeting_id',
      type: BitableFieldTypeCode.TEXT,
      description: 'Unique meeting identifier from Lark VC',
      required: true,
      isPrimary: false,
    },
    {
      fieldName: 'meeting_title',
      type: BitableFieldTypeCode.TEXT,
      description: 'Meeting title',
      required: true,
      isPrimary: false,
    },
    {
      fieldName: 'meeting_type',
      type: BitableFieldTypeCode.SINGLE_SELECT,
      description: 'Meeting type',
      required: true,
      options: ['regular', 'adhoc', 'one_on_one', 'all_hands'],
    },
    {
      fieldName: 'start_time',
      type: BitableFieldTypeCode.DATE_TIME,
      description: 'Meeting start time (timestamp in ms)',
      required: true,
    },
    {
      fieldName: 'end_time',
      type: BitableFieldTypeCode.DATE_TIME,
      description: 'Meeting end time (timestamp in ms)',
      required: true,
    },
    {
      fieldName: 'participants',
      type: BitableFieldTypeCode.USER,
      description: 'Meeting participants (Lark users)',
      required: false,
      isMultiple: true,
    },
    {
      fieldName: 'minutes_status',
      type: BitableFieldTypeCode.SINGLE_SELECT,
      description: 'Minutes generation status',
      required: true,
      options: ['not_created', 'draft', 'pending_approval', 'approved'],
    },
    {
      fieldName: 'host_id',
      type: BitableFieldTypeCode.TEXT,
      description: 'Meeting host user ID',
      required: true,
    },
    {
      fieldName: 'host_name',
      type: BitableFieldTypeCode.TEXT,
      description: 'Meeting host display name',
      required: true,
    },
    {
      fieldName: 'participant_count',
      type: BitableFieldTypeCode.NUMBER,
      description: 'Number of participants',
      required: true,
    },
    {
      fieldName: 'has_recording',
      type: BitableFieldTypeCode.CHECKBOX,
      description: 'Whether the meeting has a recording',
      required: true,
    },
    {
      fieldName: 'recording_url',
      type: BitableFieldTypeCode.URL,
      description: 'Recording URL (if available)',
      required: false,
    },
    {
      fieldName: 'created_at',
      type: BitableFieldTypeCode.DATE_TIME,
      description: 'Record creation timestamp',
      required: true,
    },
    {
      fieldName: 'updated_at',
      type: BitableFieldTypeCode.DATE_TIME,
      description: 'Record last update timestamp',
      required: true,
    },
  ],
} as const;

// =============================================================================
// Minutes Table Schema
// =============================================================================

/**
 * Minutes table field definitions
 *
 * Table Name: Minutes
 * Description: Stores AI-generated meeting minutes with version control
 */
export const MinutesTableSchema = {
  tableName: 'Minutes',
  fields: [
    {
      fieldName: 'minutes_id',
      type: BitableFieldTypeCode.TEXT,
      description: 'Unique minutes identifier',
      required: true,
      isPrimary: false,
    },
    {
      fieldName: 'meeting',
      type: BitableFieldTypeCode.LINK,
      description: 'Link to Meetings table',
      required: true,
      linkedTable: 'Meetings',
    },
    {
      fieldName: 'version',
      type: BitableFieldTypeCode.NUMBER,
      description: 'Minutes version number (increments with each regeneration)',
      required: true,
    },
    {
      fieldName: 'title',
      type: BitableFieldTypeCode.TEXT,
      description: 'Minutes title',
      required: true,
    },
    {
      fieldName: 'summary',
      type: BitableFieldTypeCode.TEXT,
      description: 'AI-generated meeting summary (multi-line)',
      required: true,
    },
    {
      fieldName: 'decisions_json',
      type: BitableFieldTypeCode.TEXT,
      description: 'JSON-encoded array of DecisionItem objects',
      required: false,
    },
    {
      fieldName: 'topics_json',
      type: BitableFieldTypeCode.TEXT,
      description: 'JSON-encoded array of TopicSegment objects',
      required: false,
    },
    {
      fieldName: 'action_items_json',
      type: BitableFieldTypeCode.TEXT,
      description: 'JSON-encoded array of ActionItem objects',
      required: false,
    },
    {
      fieldName: 'attendees_json',
      type: BitableFieldTypeCode.TEXT,
      description: 'JSON-encoded array of Speaker objects',
      required: false,
    },
    {
      fieldName: 'doc_url',
      type: BitableFieldTypeCode.URL,
      description: 'URL to generated Lark Docs document',
      required: false,
    },
    {
      fieldName: 'generated_at',
      type: BitableFieldTypeCode.TEXT,
      description: 'ISO datetime when minutes were generated',
      required: true,
    },
    {
      fieldName: 'model',
      type: BitableFieldTypeCode.TEXT,
      description: 'AI model used for generation (e.g., claude-sonnet-4-20250514)',
      required: true,
    },
    {
      fieldName: 'confidence',
      type: BitableFieldTypeCode.NUMBER,
      description: 'AI confidence score (0-1)',
      required: true,
    },
    {
      fieldName: 'created_at',
      type: BitableFieldTypeCode.DATE_TIME,
      description: 'Record creation timestamp',
      required: true,
    },
    {
      fieldName: 'updated_at',
      type: BitableFieldTypeCode.DATE_TIME,
      description: 'Record last update timestamp',
      required: true,
    },
  ],
} as const;

// =============================================================================
// Action Items Table Schema
// =============================================================================

/**
 * ActionItems table field definitions
 *
 * Table Name: ActionItems
 * Description: Stores extracted action items from meeting minutes
 */
export const ActionItemsTableSchema = {
  tableName: 'ActionItems',
  fields: [
    {
      fieldName: 'action_id',
      type: BitableFieldTypeCode.TEXT,
      description: 'Unique action item identifier',
      required: true,
      isPrimary: false,
    },
    {
      fieldName: 'meeting',
      type: BitableFieldTypeCode.LINK,
      description: 'Link to Meetings table',
      required: true,
      linkedTable: 'Meetings',
    },
    {
      fieldName: 'title',
      type: BitableFieldTypeCode.TEXT,
      description: 'Action item content/task description',
      required: true,
    },
    {
      fieldName: 'assignee',
      type: BitableFieldTypeCode.USER,
      description: 'Assigned Lark user (single)',
      required: false,
      isMultiple: false,
    },
    {
      fieldName: 'assignee_name',
      type: BitableFieldTypeCode.TEXT,
      description: 'Assignee display name (for non-Lark users)',
      required: false,
    },
    {
      fieldName: 'due_date',
      type: BitableFieldTypeCode.DATE_TIME,
      description: 'Due date for the action item',
      required: false,
    },
    {
      fieldName: 'priority',
      type: BitableFieldTypeCode.SINGLE_SELECT,
      description: 'Priority level',
      required: true,
      options: ['high', 'medium', 'low'],
    },
    {
      fieldName: 'status',
      type: BitableFieldTypeCode.SINGLE_SELECT,
      description: 'Current status',
      required: true,
      options: ['pending', 'in_progress', 'completed'],
    },
    {
      fieldName: 'meeting_title',
      type: BitableFieldTypeCode.TEXT,
      description: 'Title of the source meeting',
      required: true,
    },
    {
      fieldName: 'meeting_date',
      type: BitableFieldTypeCode.TEXT,
      description: 'Date of the source meeting (YYYY-MM-DD)',
      required: true,
    },
    {
      fieldName: 'source_text',
      type: BitableFieldTypeCode.TEXT,
      description: 'Original text from which item was extracted',
      required: false,
    },
    {
      fieldName: 'related_topic_id',
      type: BitableFieldTypeCode.TEXT,
      description: 'Related topic segment ID',
      required: false,
    },
    {
      fieldName: 'extracted_at',
      type: BitableFieldTypeCode.TEXT,
      description: 'ISO datetime when action item was extracted',
      required: true,
    },
    {
      fieldName: 'created_at',
      type: BitableFieldTypeCode.DATE_TIME,
      description: 'Record creation timestamp',
      required: true,
    },
    {
      fieldName: 'updated_at',
      type: BitableFieldTypeCode.DATE_TIME,
      description: 'Record last update timestamp',
      required: true,
    },
    {
      fieldName: 'completed_at',
      type: BitableFieldTypeCode.DATE_TIME,
      description: 'Timestamp when action item was completed',
      required: false,
    },
  ],
} as const;

// =============================================================================
// Schema Validation
// =============================================================================

/**
 * Zod schema for validating field definitions
 */
export const FieldDefinitionSchema = z.object({
  fieldName: z.string().min(1),
  type: z.number(),
  description: z.string(),
  required: z.boolean(),
  isPrimary: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  isMultiple: z.boolean().optional(),
  linkedTable: z.string().optional(),
});

/**
 * Zod schema for validating table schema
 */
export const TableSchemaDefinitionSchema = z.object({
  tableName: z.string().min(1),
  fields: z.array(FieldDefinitionSchema),
});

export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;
export type TableSchemaDefinition = z.infer<typeof TableSchemaDefinitionSchema>;

// =============================================================================
// Environment Variable Configuration
// =============================================================================

/**
 * Required environment variables for Lark Base integration
 */
export const RequiredEnvVars = {
  /** Lark Base App Token (the base/app identifier) */
  LARK_BASE_APP_TOKEN: 'LARK_BASE_APP_TOKEN',
  /** Meetings table ID */
  LARK_BASE_MEETINGS_TABLE_ID: 'LARK_BASE_MEETINGS_TABLE_ID',
  /** Minutes table ID */
  LARK_BASE_MINUTES_TABLE_ID: 'LARK_BASE_MINUTES_TABLE_ID',
  /** Action Items table ID */
  LARK_BASE_ACTION_ITEMS_TABLE_ID: 'LARK_BASE_ACTION_ITEMS_TABLE_ID',
} as const;

/**
 * Validate that all required environment variables are set
 *
 * @returns Object with validation result and any missing variables
 */
export function validateEnvironmentVariables(): {
  isValid: boolean;
  missingVars: string[];
} {
  const missingVars: string[] = [];

  for (const varName of Object.values(RequiredEnvVars)) {
    const value = process.env[varName];
    if (value === undefined || value === '') {
      missingVars.push(varName);
    }
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
}

/**
 * Get all table schemas
 *
 * @returns Array of all table schema definitions
 */
export function getAllTableSchemas(): readonly TableSchemaDefinition[] {
  return [
    MeetingsTableSchema as unknown as TableSchemaDefinition,
    MinutesTableSchema as unknown as TableSchemaDefinition,
    ActionItemsTableSchema as unknown as TableSchemaDefinition,
  ];
}

/**
 * Generate documentation for table setup
 *
 * @returns Markdown documentation string
 */
export function generateTableSetupDocumentation(): string {
  const schemas = getAllTableSchemas();
  const lines: string[] = [];

  lines.push('# Lark Base Table Setup Guide');
  lines.push('');
  lines.push('## Required Tables');
  lines.push('');

  for (const schema of schemas) {
    lines.push(`### ${schema.tableName}`);
    lines.push('');
    lines.push('| Field Name | Type | Required | Description |');
    lines.push('|------------|------|----------|-------------|');

    for (const field of schema.fields) {
      const typeName = getFieldTypeName(field.type);
      const required = field.required ? 'Yes' : 'No';
      lines.push(`| ${field.fieldName} | ${typeName} | ${required} | ${field.description} |`);
    }

    lines.push('');
  }

  lines.push('## Environment Variables');
  lines.push('');
  lines.push('Set the following environment variables after creating the tables:');
  lines.push('');
  lines.push('```bash');
  for (const [key, value] of Object.entries(RequiredEnvVars)) {
    lines.push(`${value}=your_${key.toLowerCase()}_here`);
  }
  lines.push('```');

  return lines.join('\n');
}

/**
 * Get human-readable field type name
 */
function getFieldTypeName(typeCode: number): string {
  const typeNames: Record<number, string> = {
    [BitableFieldTypeCode.TEXT]: 'Text',
    [BitableFieldTypeCode.NUMBER]: 'Number',
    [BitableFieldTypeCode.SINGLE_SELECT]: 'Single Select',
    [BitableFieldTypeCode.MULTI_SELECT]: 'Multi Select',
    [BitableFieldTypeCode.DATE_TIME]: 'DateTime',
    [BitableFieldTypeCode.CHECKBOX]: 'Checkbox',
    [BitableFieldTypeCode.USER]: 'User',
    [BitableFieldTypeCode.URL]: 'URL',
    [BitableFieldTypeCode.LINK]: 'Link',
  };
  return typeNames[typeCode] ?? 'Unknown';
}
