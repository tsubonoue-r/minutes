/**
 * Tests for Lark Bitable Client
 * @module lib/lark/__tests__/bitable.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BitableClient,
  BitableApiError,
  RecordNotFoundError,
  createBitableClient,
  createBitableClientFromEnv,
  type BitableClientConfig,
  type BitableRecordFields,
} from '../bitable';
import { LarkClient } from '../client';

// =============================================================================
// Test Setup
// =============================================================================

interface TestFields extends BitableRecordFields {
  test_field: string;
  test_number: number;
}

const mockConfig: BitableClientConfig = {
  appToken: 'test_app_token',
  tableIds: {
    meetings: 'tbl_meetings',
    minutes: 'tbl_minutes',
    actionItems: 'tbl_action_items',
  },
};

const createMockLarkClient = () => ({
  authenticatedRequest: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  getConfig: vi.fn(() => ({
    appId: 'test_app_id',
    appSecret: 'test_secret',
    baseUrl: 'https://open.larksuite.com',
    redirectUri: 'http://localhost:3000/callback',
  })),
});

describe('BitableClient', () => {
  let mockClient: ReturnType<typeof createMockLarkClient>;
  let bitableClient: BitableClient;

  beforeEach(() => {
    mockClient = createMockLarkClient();
    bitableClient = new BitableClient(
      mockClient as unknown as LarkClient,
      'test_access_token',
      mockConfig
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getTableId', () => {
    it('should return correct table ID for meetings', () => {
      expect(bitableClient.getTableId('meetings')).toBe('tbl_meetings');
    });

    it('should return correct table ID for minutes', () => {
      expect(bitableClient.getTableId('minutes')).toBe('tbl_minutes');
    });

    it('should return correct table ID for actionItems', () => {
      expect(bitableClient.getTableId('actionItems')).toBe('tbl_action_items');
    });
  });

  describe('createRecord', () => {
    it('should create a record successfully', async () => {
      const fields: TestFields = { test_field: 'value', test_number: 42 };
      const mockResponse = {
        code: 0,
        msg: 'success',
        data: {
          record: {
            record_id: 'rec_123',
            fields,
          },
        },
      };

      mockClient.authenticatedRequest.mockResolvedValue(mockResponse);

      const result = await bitableClient.createRecord<TestFields>(
        'meetings',
        fields
      );

      expect(result).toEqual({
        record_id: 'rec_123',
        fields,
      });
      expect(mockClient.authenticatedRequest).toHaveBeenCalledWith(
        '/open-apis/bitable/v1/apps/test_app_token/tables/tbl_meetings/records',
        'test_access_token',
        {
          method: 'POST',
          body: { fields },
        }
      );
    });

    it('should throw BitableApiError when no data returned', async () => {
      mockClient.authenticatedRequest.mockResolvedValue({
        code: 0,
        msg: 'success',
        data: undefined,
      });

      await expect(
        bitableClient.createRecord<TestFields>('meetings', {
          test_field: 'value',
          test_number: 42,
        })
      ).rejects.toThrow(BitableApiError);
    });
  });

  describe('listRecords', () => {
    it('should list records successfully', async () => {
      const mockRecords = [
        { record_id: 'rec_1', fields: { test_field: 'a', test_number: 1 } },
        { record_id: 'rec_2', fields: { test_field: 'b', test_number: 2 } },
      ];
      const mockResponse = {
        code: 0,
        msg: 'success',
        data: {
          has_more: false,
          items: mockRecords,
          total: 2,
        },
      };

      mockClient.authenticatedRequest.mockResolvedValue(mockResponse);

      const result = await bitableClient.listRecords<TestFields>('meetings');

      expect(result.records).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.total).toBe(2);
    });

    it('should pass query parameters correctly', async () => {
      mockClient.authenticatedRequest.mockResolvedValue({
        code: 0,
        msg: 'success',
        data: { has_more: false, items: [] },
      });

      await bitableClient.listRecords<TestFields>('meetings', {
        page_size: 10,
        page_token: 'token_123',
        filter: 'CurrentValue.[field]="value"',
      });

      expect(mockClient.authenticatedRequest).toHaveBeenCalledWith(
        expect.any(String),
        'test_access_token',
        {
          method: 'GET',
          params: {
            page_size: '10',
            page_token: 'token_123',
            filter: 'CurrentValue.[field]="value"',
          },
        }
      );
    });
  });

  describe('getRecord', () => {
    it('should get a record successfully', async () => {
      const mockRecord = {
        record_id: 'rec_123',
        fields: { test_field: 'value', test_number: 42 },
      };
      mockClient.authenticatedRequest.mockResolvedValue({
        code: 0,
        msg: 'success',
        data: { record: mockRecord },
      });

      const result = await bitableClient.getRecord<TestFields>(
        'meetings',
        'rec_123'
      );

      expect(result).toEqual(mockRecord);
    });

    it('should throw RecordNotFoundError when record not found', async () => {
      mockClient.authenticatedRequest.mockResolvedValue({
        code: 0,
        msg: 'success',
        data: undefined,
      });

      await expect(
        bitableClient.getRecord<TestFields>('meetings', 'rec_notfound')
      ).rejects.toThrow(RecordNotFoundError);
    });
  });

  describe('updateRecord', () => {
    it('should update a record successfully', async () => {
      const updates = { test_field: 'updated' };
      const mockResponse = {
        code: 0,
        msg: 'success',
        data: {
          record: {
            record_id: 'rec_123',
            fields: { test_field: 'updated', test_number: 42 },
          },
        },
      };

      mockClient.authenticatedRequest.mockResolvedValue(mockResponse);

      const result = await bitableClient.updateRecord<TestFields>(
        'meetings',
        'rec_123',
        updates
      );

      expect(result.fields.test_field).toBe('updated');
      expect(mockClient.authenticatedRequest).toHaveBeenCalledWith(
        expect.stringContaining('rec_123'),
        'test_access_token',
        {
          method: 'PUT',
          body: { fields: updates },
        }
      );
    });
  });

  describe('deleteRecord', () => {
    it('should delete a record successfully', async () => {
      mockClient.authenticatedRequest.mockResolvedValue({
        code: 0,
        msg: 'success',
        data: { deleted: true, record_id: 'rec_123' },
      });

      const result = await bitableClient.deleteRecord('meetings', 'rec_123');

      expect(result).toBe(true);
    });
  });

  describe('batchCreateRecords', () => {
    it('should batch create records successfully', async () => {
      const records: TestFields[] = [
        { test_field: 'a', test_number: 1 },
        { test_field: 'b', test_number: 2 },
      ];
      const mockResponse = {
        code: 0,
        msg: 'success',
        data: {
          records: [
            { record_id: 'rec_1', fields: records[0] },
            { record_id: 'rec_2', fields: records[1] },
          ],
        },
      };

      mockClient.authenticatedRequest.mockResolvedValue(mockResponse);

      const result = await bitableClient.batchCreateRecords<TestFields>(
        'meetings',
        records
      );

      expect(result).toHaveLength(2);
      expect(result[0]!.record_id).toBe('rec_1');
      expect(result[1]!.record_id).toBe('rec_2');
    });
  });

  describe('findRecords', () => {
    it('should find records with filter', async () => {
      mockClient.authenticatedRequest.mockResolvedValue({
        code: 0,
        msg: 'success',
        data: {
          has_more: false,
          items: [
            {
              record_id: 'rec_1',
              fields: { test_field: 'value', test_number: 1 },
            },
          ],
        },
      });

      const result = await bitableClient.findRecords<TestFields>(
        'meetings',
        'CurrentValue.[test_field]="value"'
      );

      expect(result).toHaveLength(1);
      expect(result[0]!.fields.test_field).toBe('value');
    });
  });

  describe('findOneRecord', () => {
    it('should find one record with filter', async () => {
      mockClient.authenticatedRequest.mockResolvedValue({
        code: 0,
        msg: 'success',
        data: {
          has_more: false,
          items: [
            {
              record_id: 'rec_1',
              fields: { test_field: 'value', test_number: 1 },
            },
          ],
        },
      });

      const result = await bitableClient.findOneRecord<TestFields>(
        'meetings',
        'CurrentValue.[test_field]="value"'
      );

      expect(result).not.toBeNull();
      expect(result?.fields.test_field).toBe('value');
    });

    it('should return null when no record found', async () => {
      mockClient.authenticatedRequest.mockResolvedValue({
        code: 0,
        msg: 'success',
        data: { has_more: false, items: [] },
      });

      const result = await bitableClient.findOneRecord<TestFields>(
        'meetings',
        'CurrentValue.[test_field]="notfound"'
      );

      expect(result).toBeNull();
    });
  });
});

describe('createBitableClient', () => {
  it('should create a BitableClient instance', () => {
    const mockClient = createMockLarkClient();
    const client = createBitableClient(
      mockClient as unknown as LarkClient,
      'token',
      mockConfig
    );

    expect(client).toBeInstanceOf(BitableClient);
  });
});

describe('createBitableClientFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create client from environment variables', () => {
    process.env.LARK_BASE_APP_TOKEN = 'env_app_token';
    process.env.LARK_BASE_MEETINGS_TABLE_ID = 'env_meetings';
    process.env.LARK_BASE_MINUTES_TABLE_ID = 'env_minutes';
    process.env.LARK_BASE_ACTION_ITEMS_TABLE_ID = 'env_actions';

    const mockClient = createMockLarkClient();
    const client = createBitableClientFromEnv(
      mockClient as unknown as LarkClient,
      'token'
    );

    expect(client).toBeInstanceOf(BitableClient);
    expect(client.getTableId('meetings')).toBe('env_meetings');
  });

  it('should throw error when LARK_BASE_APP_TOKEN is missing', () => {
    process.env.LARK_BASE_APP_TOKEN = '';
    process.env.LARK_BASE_MEETINGS_TABLE_ID = 'env_meetings';
    process.env.LARK_BASE_MINUTES_TABLE_ID = 'env_minutes';
    process.env.LARK_BASE_ACTION_ITEMS_TABLE_ID = 'env_actions';

    const mockClient = createMockLarkClient();
    expect(() =>
      createBitableClientFromEnv(mockClient as unknown as LarkClient, 'token')
    ).toThrow('LARK_BASE_APP_TOKEN environment variable is required');
  });

  it('should throw error when table IDs are missing', () => {
    process.env.LARK_BASE_APP_TOKEN = 'env_app_token';
    process.env.LARK_BASE_MEETINGS_TABLE_ID = '';
    process.env.LARK_BASE_MINUTES_TABLE_ID = 'env_minutes';
    process.env.LARK_BASE_ACTION_ITEMS_TABLE_ID = 'env_actions';

    const mockClient = createMockLarkClient();
    expect(() =>
      createBitableClientFromEnv(mockClient as unknown as LarkClient, 'token')
    ).toThrow('LARK_BASE_MEETINGS_TABLE_ID environment variable is required');
  });
});

describe('Error Classes', () => {
  describe('BitableApiError', () => {
    it('should create error with correct properties', () => {
      const error = new BitableApiError('Test error', 500, '/test', {
        detail: 'info',
      });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(500);
      expect(error.endpoint).toBe('/test');
      expect(error.details).toEqual({ detail: 'info' });
      expect(error.name).toBe('BitableApiError');
    });
  });

  describe('RecordNotFoundError', () => {
    it('should create error with correct message', () => {
      const error = new RecordNotFoundError('rec_123', 'tbl_test');

      expect(error.message).toBe(
        "Record 'rec_123' not found in table 'tbl_test'"
      );
      expect(error.code).toBe(404);
      expect(error.name).toBe('RecordNotFoundError');
    });
  });
});
