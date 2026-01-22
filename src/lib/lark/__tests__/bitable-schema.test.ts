/**
 * Tests for Lark Bitable Schema Definitions
 * @module lib/lark/__tests__/bitable-schema.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BitableFieldTypeCode,
  MeetingsTableSchema,
  MinutesTableSchema,
  ActionItemsTableSchema,
  RequiredEnvVars,
  validateEnvironmentVariables,
  getAllTableSchemas,
  generateTableSetupDocumentation,
  FieldDefinitionSchema,
  TableSchemaDefinitionSchema,
} from '../bitable-schema';

describe('BitableFieldTypeCode', () => {
  it('should have correct type codes', () => {
    expect(BitableFieldTypeCode.TEXT).toBe(1);
    expect(BitableFieldTypeCode.NUMBER).toBe(2);
    expect(BitableFieldTypeCode.SINGLE_SELECT).toBe(3);
    expect(BitableFieldTypeCode.DATE_TIME).toBe(5);
    expect(BitableFieldTypeCode.CHECKBOX).toBe(7);
    expect(BitableFieldTypeCode.USER).toBe(11);
    expect(BitableFieldTypeCode.URL).toBe(15);
    expect(BitableFieldTypeCode.LINK).toBe(18);
  });
});

describe('Table Schemas', () => {
  describe('MeetingsTableSchema', () => {
    it('should have correct table name', () => {
      expect(MeetingsTableSchema.tableName).toBe('Meetings');
    });

    it('should have required fields', () => {
      const fieldNames = MeetingsTableSchema.fields.map((f) => f.fieldName);
      expect(fieldNames).toContain('meeting_id');
      expect(fieldNames).toContain('meeting_title');
      expect(fieldNames).toContain('meeting_type');
      expect(fieldNames).toContain('start_time');
      expect(fieldNames).toContain('end_time');
      expect(fieldNames).toContain('minutes_status');
      expect(fieldNames).toContain('host_id');
      expect(fieldNames).toContain('host_name');
    });

    it('should have correct meeting_type options', () => {
      const meetingTypeField = MeetingsTableSchema.fields.find(
        (f) => f.fieldName === 'meeting_type'
      );
      expect(meetingTypeField?.options).toEqual([
        'regular',
        'adhoc',
        'one_on_one',
        'all_hands',
      ]);
    });

    it('should have correct minutes_status options', () => {
      const statusField = MeetingsTableSchema.fields.find(
        (f) => f.fieldName === 'minutes_status'
      );
      expect(statusField?.options).toEqual([
        'not_created',
        'draft',
        'pending_approval',
        'approved',
      ]);
    });
  });

  describe('MinutesTableSchema', () => {
    it('should have correct table name', () => {
      expect(MinutesTableSchema.tableName).toBe('Minutes');
    });

    it('should have required fields', () => {
      const fieldNames = MinutesTableSchema.fields.map((f) => f.fieldName);
      expect(fieldNames).toContain('minutes_id');
      expect(fieldNames).toContain('meeting');
      expect(fieldNames).toContain('version');
      expect(fieldNames).toContain('title');
      expect(fieldNames).toContain('summary');
      expect(fieldNames).toContain('decisions_json');
      expect(fieldNames).toContain('topics_json');
      expect(fieldNames).toContain('action_items_json');
    });

    it('should have meeting link field', () => {
      const meetingField = MinutesTableSchema.fields.find(
        (f) => f.fieldName === 'meeting'
      );
      expect(meetingField?.type).toBe(BitableFieldTypeCode.LINK);
      expect(meetingField?.linkedTable).toBe('Meetings');
    });
  });

  describe('ActionItemsTableSchema', () => {
    it('should have correct table name', () => {
      expect(ActionItemsTableSchema.tableName).toBe('ActionItems');
    });

    it('should have required fields', () => {
      const fieldNames = ActionItemsTableSchema.fields.map((f) => f.fieldName);
      expect(fieldNames).toContain('action_id');
      expect(fieldNames).toContain('meeting');
      expect(fieldNames).toContain('title');
      expect(fieldNames).toContain('assignee');
      expect(fieldNames).toContain('due_date');
      expect(fieldNames).toContain('priority');
      expect(fieldNames).toContain('status');
    });

    it('should have correct priority options', () => {
      const priorityField = ActionItemsTableSchema.fields.find(
        (f) => f.fieldName === 'priority'
      );
      expect(priorityField?.options).toEqual(['high', 'medium', 'low']);
    });

    it('should have correct status options', () => {
      const statusField = ActionItemsTableSchema.fields.find(
        (f) => f.fieldName === 'status'
      );
      expect(statusField?.options).toEqual([
        'pending',
        'in_progress',
        'completed',
      ]);
    });
  });
});

describe('RequiredEnvVars', () => {
  it('should have all required environment variable names', () => {
    expect(RequiredEnvVars.LARK_BASE_APP_TOKEN).toBe('LARK_BASE_APP_TOKEN');
    expect(RequiredEnvVars.LARK_BASE_MEETINGS_TABLE_ID).toBe(
      'LARK_BASE_MEETINGS_TABLE_ID'
    );
    expect(RequiredEnvVars.LARK_BASE_MINUTES_TABLE_ID).toBe(
      'LARK_BASE_MINUTES_TABLE_ID'
    );
    expect(RequiredEnvVars.LARK_BASE_ACTION_ITEMS_TABLE_ID).toBe(
      'LARK_BASE_ACTION_ITEMS_TABLE_ID'
    );
  });
});

describe('validateEnvironmentVariables', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return valid when all env vars are set', () => {
    process.env.LARK_BASE_APP_TOKEN = 'test_token';
    process.env.LARK_BASE_MEETINGS_TABLE_ID = 'tbl_meetings';
    process.env.LARK_BASE_MINUTES_TABLE_ID = 'tbl_minutes';
    process.env.LARK_BASE_ACTION_ITEMS_TABLE_ID = 'tbl_actions';

    const result = validateEnvironmentVariables();

    expect(result.isValid).toBe(true);
    expect(result.missingVars).toHaveLength(0);
  });

  it('should return invalid when env vars are missing', () => {
    process.env.LARK_BASE_APP_TOKEN = 'test_token';
    process.env.LARK_BASE_MEETINGS_TABLE_ID = '';
    delete process.env.LARK_BASE_MINUTES_TABLE_ID;
    process.env.LARK_BASE_ACTION_ITEMS_TABLE_ID = 'tbl_actions';

    const result = validateEnvironmentVariables();

    expect(result.isValid).toBe(false);
    expect(result.missingVars).toContain('LARK_BASE_MEETINGS_TABLE_ID');
    expect(result.missingVars).toContain('LARK_BASE_MINUTES_TABLE_ID');
  });

  it('should return all missing vars when none are set', () => {
    delete process.env.LARK_BASE_APP_TOKEN;
    delete process.env.LARK_BASE_MEETINGS_TABLE_ID;
    delete process.env.LARK_BASE_MINUTES_TABLE_ID;
    delete process.env.LARK_BASE_ACTION_ITEMS_TABLE_ID;

    const result = validateEnvironmentVariables();

    expect(result.isValid).toBe(false);
    expect(result.missingVars).toHaveLength(4);
  });
});

describe('getAllTableSchemas', () => {
  it('should return all three table schemas', () => {
    const schemas = getAllTableSchemas();

    expect(schemas).toHaveLength(3);
    expect(schemas.map((s) => s.tableName)).toContain('Meetings');
    expect(schemas.map((s) => s.tableName)).toContain('Minutes');
    expect(schemas.map((s) => s.tableName)).toContain('ActionItems');
  });
});

describe('generateTableSetupDocumentation', () => {
  it('should generate markdown documentation', () => {
    const docs = generateTableSetupDocumentation();

    expect(docs).toContain('# Lark Base Table Setup Guide');
    expect(docs).toContain('## Required Tables');
    expect(docs).toContain('### Meetings');
    expect(docs).toContain('### Minutes');
    expect(docs).toContain('### ActionItems');
    expect(docs).toContain('## Environment Variables');
    expect(docs).toContain('LARK_BASE_APP_TOKEN');
  });

  it('should include field definitions in markdown table format', () => {
    const docs = generateTableSetupDocumentation();

    expect(docs).toContain('| Field Name | Type | Required | Description |');
    expect(docs).toContain('meeting_id');
    expect(docs).toContain('meeting_title');
  });
});

describe('Schema Validation', () => {
  describe('FieldDefinitionSchema', () => {
    it('should validate valid field definition', () => {
      const validField = {
        fieldName: 'test_field',
        type: 1,
        description: 'A test field',
        required: true,
      };

      const result = FieldDefinitionSchema.safeParse(validField);
      expect(result.success).toBe(true);
    });

    it('should reject field with empty name', () => {
      const invalidField = {
        fieldName: '',
        type: 1,
        description: 'A test field',
        required: true,
      };

      const result = FieldDefinitionSchema.safeParse(invalidField);
      expect(result.success).toBe(false);
    });

    it('should accept optional properties', () => {
      const fieldWithOptions = {
        fieldName: 'status',
        type: 3,
        description: 'Status field',
        required: true,
        options: ['pending', 'completed'],
        isPrimary: false,
      };

      const result = FieldDefinitionSchema.safeParse(fieldWithOptions);
      expect(result.success).toBe(true);
    });
  });

  describe('TableSchemaDefinitionSchema', () => {
    it('should validate valid table schema', () => {
      const validSchema = {
        tableName: 'TestTable',
        fields: [
          {
            fieldName: 'id',
            type: 1,
            description: 'ID field',
            required: true,
          },
        ],
      };

      const result = TableSchemaDefinitionSchema.safeParse(validSchema);
      expect(result.success).toBe(true);
    });

    it('should reject table with empty name', () => {
      const invalidSchema = {
        tableName: '',
        fields: [],
      };

      const result = TableSchemaDefinitionSchema.safeParse(invalidSchema);
      expect(result.success).toBe(false);
    });
  });
});
