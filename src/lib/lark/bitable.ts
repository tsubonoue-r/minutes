/**
 * Lark Bitable (Base) API Client and Types
 * @module lib/lark/bitable
 */

import { z } from 'zod';
import { LarkClient, LarkClientError } from './client';
import type { LarkApiResponse } from './types';
import { larkApiResponseSchema } from './types';

// =============================================================================
// Lark Bitable API Endpoints
// =============================================================================

/**
 * Lark Bitable API endpoints
 */
export const LarkBitableApiEndpoints = {
  /** Create a record in a table */
  RECORD_CREATE: '/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records',
  /** List records in a table */
  RECORD_LIST: '/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records',
  /** Get a single record */
  RECORD_GET: '/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/:record_id',
  /** Update a record */
  RECORD_UPDATE: '/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/:record_id',
  /** Delete a record */
  RECORD_DELETE: '/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/:record_id',
  /** Batch create records */
  RECORD_BATCH_CREATE: '/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/batch_create',
  /** Batch update records */
  RECORD_BATCH_UPDATE: '/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/batch_update',
  /** Batch delete records */
  RECORD_BATCH_DELETE: '/open-apis/bitable/v1/apps/:app_token/tables/:table_id/records/batch_delete',
  /** List tables in an app */
  TABLE_LIST: '/open-apis/bitable/v1/apps/:app_token/tables',
} as const;

export type LarkBitableApiEndpoint =
  (typeof LarkBitableApiEndpoints)[keyof typeof LarkBitableApiEndpoints];

// =============================================================================
// Field Types
// =============================================================================

/**
 * Bitable field types supported by Lark
 */
export type BitableFieldType =
  | 'Text'
  | 'Number'
  | 'SingleSelect'
  | 'MultiSelect'
  | 'DateTime'
  | 'Checkbox'
  | 'User'
  | 'Link'
  | 'Url'
  | 'AutoNumber'
  | 'Formula';

/**
 * User field value
 */
export const bitableUserValueSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  en_name: z.string().optional(),
  email: z.string().optional(),
  avatar_url: z.string().optional(),
});

export type BitableUserValue = z.infer<typeof bitableUserValueSchema>;

/**
 * Link field value (reference to another table)
 */
export const bitableLinkValueSchema = z.object({
  record_ids: z.array(z.string()),
  table_id: z.string().optional(),
});

export type BitableLinkValue = z.infer<typeof bitableLinkValueSchema>;

/**
 * Generic field value type
 */
export type BitableFieldValue =
  | string
  | number
  | boolean
  | string[]
  | BitableUserValue[]
  | BitableLinkValue
  | null;

/**
 * Record fields object
 */
export type BitableRecordFields = Record<string, BitableFieldValue>;

// =============================================================================
// Record Types
// =============================================================================

/**
 * Bitable record structure
 */
export const bitableRecordSchema = z.object({
  /** Record ID */
  record_id: z.string(),
  /** Record fields (key-value pairs) */
  fields: z.record(z.string(), z.unknown()),
});

export type BitableRecord = z.infer<typeof bitableRecordSchema>;

/**
 * Record with typed fields
 */
export interface TypedBitableRecord<T extends BitableRecordFields> {
  record_id: string;
  fields: T;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * Create record request body
 */
export interface CreateRecordRequest {
  fields: BitableRecordFields;
}

/**
 * Create record response data
 */
export const createRecordDataSchema = z.object({
  record: bitableRecordSchema,
});

export type CreateRecordData = z.infer<typeof createRecordDataSchema>;

/**
 * Create record response
 */
export const createRecordResponseSchema = larkApiResponseSchema(createRecordDataSchema);

export type CreateRecordResponse = z.infer<typeof createRecordResponseSchema>;

/**
 * List records request parameters
 */
export interface ListRecordsParams {
  /** View ID for filtering */
  view_id?: string;
  /** Filter formula */
  filter?: string;
  /** Sort configuration */
  sort?: string;
  /** Fields to return */
  field_names?: string;
  /** Page size */
  page_size?: number;
  /** Page token for pagination */
  page_token?: string;
}

/**
 * List records response data
 */
export const listRecordsDataSchema = z.object({
  /** Whether there are more pages */
  has_more: z.boolean(),
  /** Page token for next page */
  page_token: z.string().optional(),
  /** Total count of records */
  total: z.number().optional(),
  /** List of records */
  items: z.array(bitableRecordSchema),
});

export type ListRecordsData = z.infer<typeof listRecordsDataSchema>;

/**
 * List records response
 */
export const listRecordsResponseSchema = larkApiResponseSchema(listRecordsDataSchema);

export type ListRecordsResponse = z.infer<typeof listRecordsResponseSchema>;

/**
 * Get record response data
 */
export const getRecordDataSchema = z.object({
  record: bitableRecordSchema,
});

export type GetRecordData = z.infer<typeof getRecordDataSchema>;

/**
 * Get record response
 */
export const getRecordResponseSchema = larkApiResponseSchema(getRecordDataSchema);

export type GetRecordResponse = z.infer<typeof getRecordResponseSchema>;

/**
 * Update record request body
 */
export interface UpdateRecordRequest {
  fields: Partial<BitableRecordFields>;
}

/**
 * Update record response data
 */
export const updateRecordDataSchema = z.object({
  record: bitableRecordSchema,
});

export type UpdateRecordData = z.infer<typeof updateRecordDataSchema>;

/**
 * Update record response
 */
export const updateRecordResponseSchema = larkApiResponseSchema(updateRecordDataSchema);

export type UpdateRecordResponse = z.infer<typeof updateRecordResponseSchema>;

/**
 * Delete record response data
 */
export const deleteRecordDataSchema = z.object({
  deleted: z.boolean(),
  record_id: z.string(),
});

export type DeleteRecordData = z.infer<typeof deleteRecordDataSchema>;

/**
 * Delete record response
 */
export const deleteRecordResponseSchema = larkApiResponseSchema(deleteRecordDataSchema);

export type DeleteRecordResponse = z.infer<typeof deleteRecordResponseSchema>;

/**
 * Batch create records request
 */
export interface BatchCreateRecordsRequest {
  records: Array<{ fields: BitableRecordFields }>;
}

/**
 * Batch create records response data
 */
export const batchCreateRecordsDataSchema = z.object({
  records: z.array(bitableRecordSchema),
});

export type BatchCreateRecordsData = z.infer<typeof batchCreateRecordsDataSchema>;

/**
 * Batch update records request
 */
export interface BatchUpdateRecordsRequest {
  records: Array<{ record_id: string; fields: Partial<BitableRecordFields> }>;
}

/**
 * Batch update records response data
 */
export const batchUpdateRecordsDataSchema = z.object({
  records: z.array(bitableRecordSchema),
});

export type BatchUpdateRecordsData = z.infer<typeof batchUpdateRecordsDataSchema>;

/**
 * Batch delete records request
 */
export interface BatchDeleteRecordsRequest {
  records: string[];
}

/**
 * Batch delete records response data
 */
export const batchDeleteRecordsDataSchema = z.object({
  records: z.array(
    z.object({
      deleted: z.boolean(),
      record_id: z.string(),
    })
  ),
});

export type BatchDeleteRecordsData = z.infer<typeof batchDeleteRecordsDataSchema>;

// =============================================================================
// Table Schema Types
// =============================================================================

/**
 * Table field definition
 */
export const tableFieldSchema = z.object({
  field_id: z.string(),
  field_name: z.string(),
  type: z.number(),
  is_primary: z.boolean().optional(),
});

export type TableField = z.infer<typeof tableFieldSchema>;

/**
 * Table definition
 */
export const tableSchema = z.object({
  table_id: z.string(),
  name: z.string(),
  revision: z.number(),
});

export type Table = z.infer<typeof tableSchema>;

/**
 * List tables response data
 */
export const listTablesDataSchema = z.object({
  has_more: z.boolean(),
  page_token: z.string().optional(),
  items: z.array(tableSchema),
});

export type ListTablesData = z.infer<typeof listTablesDataSchema>;

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Bitable API error
 */
export class BitableApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly endpoint: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'BitableApiError';
  }
}

/**
 * Record not found error
 */
export class RecordNotFoundError extends BitableApiError {
  constructor(recordId: string, tableId: string) {
    super(
      `Record '${recordId}' not found in table '${tableId}'`,
      404,
      'RECORD_GET',
      { recordId, tableId }
    );
    this.name = 'RecordNotFoundError';
  }
}

// =============================================================================
// Bitable Client
// =============================================================================

/**
 * Configuration for BitableClient
 */
export interface BitableClientConfig {
  /** Lark Base app token */
  appToken: string;
  /** Table IDs for different entities */
  tableIds: {
    meetings: string;
    minutes: string;
    actionItems: string;
  };
}

/**
 * Bitable (Lark Base) API Client
 *
 * Provides CRUD operations for Lark Base tables.
 *
 * @example
 * ```typescript
 * const client = new BitableClient(larkClient, accessToken, {
 *   appToken: 'app_xxx',
 *   tableIds: {
 *     meetings: 'tbl_xxx',
 *     minutes: 'tbl_yyy',
 *     actionItems: 'tbl_zzz',
 *   },
 * });
 *
 * // Create a record
 * const record = await client.createRecord('meetings', {
 *   meeting_id: 'meeting-123',
 *   meeting_title: 'Weekly Sync',
 * });
 * ```
 */
export class BitableClient {
  constructor(
    private readonly client: LarkClient,
    private readonly accessToken: string,
    private readonly config: BitableClientConfig
  ) {}

  /**
   * Build endpoint URL with path parameters replaced
   */
  private buildEndpoint(
    endpoint: string,
    tableId: string,
    recordId?: string
  ): string {
    let url = endpoint.replace(':app_token', this.config.appToken);
    url = url.replace(':table_id', tableId);
    if (recordId !== undefined) {
      url = url.replace(':record_id', recordId);
    }
    return url;
  }

  /**
   * Get table ID by entity type
   */
  getTableId(entity: keyof BitableClientConfig['tableIds']): string {
    return this.config.tableIds[entity];
  }

  /**
   * Create a record in a table
   *
   * @param entity - Entity type (meetings, minutes, actionItems)
   * @param fields - Record fields
   * @returns Created record
   */
  async createRecord<T extends BitableRecordFields>(
    entity: keyof BitableClientConfig['tableIds'],
    fields: T
  ): Promise<TypedBitableRecord<T>> {
    const tableId = this.getTableId(entity);
    const endpoint = this.buildEndpoint(
      LarkBitableApiEndpoints.RECORD_CREATE,
      tableId
    );

    try {
      const response = await this.client.authenticatedRequest<CreateRecordData>(
        endpoint,
        this.accessToken,
        {
          method: 'POST',
          body: { fields } satisfies CreateRecordRequest,
        }
      );

      if (response.data === undefined) {
        throw new BitableApiError(
          'No data returned from create record API',
          500,
          endpoint
        );
      }

      return {
        record_id: response.data.record.record_id,
        fields: response.data.record.fields as T,
      };
    } catch (error) {
      if (error instanceof BitableApiError) {
        throw error;
      }
      if (error instanceof LarkClientError) {
        throw new BitableApiError(
          error.message,
          error.code,
          endpoint,
          error.details
        );
      }
      throw new BitableApiError(
        'Failed to create record',
        500,
        endpoint,
        error
      );
    }
  }

  /**
   * List records from a table
   *
   * @param entity - Entity type
   * @param params - Query parameters
   * @returns List of records with pagination info
   */
  async listRecords<T extends BitableRecordFields>(
    entity: keyof BitableClientConfig['tableIds'],
    params?: ListRecordsParams
  ): Promise<{
    records: Array<TypedBitableRecord<T>>;
    hasMore: boolean;
    pageToken?: string;
    total?: number;
  }> {
    const tableId = this.getTableId(entity);
    const endpoint = this.buildEndpoint(
      LarkBitableApiEndpoints.RECORD_LIST,
      tableId
    );

    const queryParams: Record<string, string> = {};
    if (params !== undefined) {
      if (params.view_id !== undefined) {
        queryParams['view_id'] = params.view_id;
      }
      if (params.filter !== undefined) {
        queryParams['filter'] = params.filter;
      }
      if (params.sort !== undefined) {
        queryParams['sort'] = params.sort;
      }
      if (params.field_names !== undefined) {
        queryParams['field_names'] = params.field_names;
      }
      if (params.page_size !== undefined) {
        queryParams['page_size'] = String(params.page_size);
      }
      if (params.page_token !== undefined) {
        queryParams['page_token'] = params.page_token;
      }
    }

    try {
      const requestParams =
        Object.keys(queryParams).length > 0 ? queryParams : undefined;
      const response = await this.client.authenticatedRequest<ListRecordsData>(
        endpoint,
        this.accessToken,
        requestParams !== undefined
          ? { method: 'GET', params: requestParams }
          : { method: 'GET' }
      );

      if (response.data === undefined) {
        throw new BitableApiError(
          'No data returned from list records API',
          500,
          endpoint
        );
      }

      const result: {
        records: Array<TypedBitableRecord<T>>;
        hasMore: boolean;
        pageToken?: string;
        total?: number;
      } = {
        records: response.data.items.map((item) => ({
          record_id: item.record_id,
          fields: item.fields as T,
        })),
        hasMore: response.data.has_more,
      };

      if (response.data.page_token !== undefined) {
        result.pageToken = response.data.page_token;
      }
      if (response.data.total !== undefined) {
        result.total = response.data.total;
      }

      return result;
    } catch (error) {
      if (error instanceof BitableApiError) {
        throw error;
      }
      if (error instanceof LarkClientError) {
        throw new BitableApiError(
          error.message,
          error.code,
          endpoint,
          error.details
        );
      }
      throw new BitableApiError(
        'Failed to list records',
        500,
        endpoint,
        error
      );
    }
  }

  /**
   * Get a single record by ID
   *
   * @param entity - Entity type
   * @param recordId - Record ID
   * @returns Record or throws RecordNotFoundError
   */
  async getRecord<T extends BitableRecordFields>(
    entity: keyof BitableClientConfig['tableIds'],
    recordId: string
  ): Promise<TypedBitableRecord<T>> {
    const tableId = this.getTableId(entity);
    const endpoint = this.buildEndpoint(
      LarkBitableApiEndpoints.RECORD_GET,
      tableId,
      recordId
    );

    try {
      const response = await this.client.authenticatedRequest<GetRecordData>(
        endpoint,
        this.accessToken,
        { method: 'GET' }
      );

      if (response.data === undefined) {
        throw new RecordNotFoundError(recordId, tableId);
      }

      return {
        record_id: response.data.record.record_id,
        fields: response.data.record.fields as T,
      };
    } catch (error) {
      if (error instanceof BitableApiError) {
        throw error;
      }
      if (error instanceof LarkClientError) {
        if (error.code === 404 || error.code === 1254043) {
          throw new RecordNotFoundError(recordId, tableId);
        }
        throw new BitableApiError(
          error.message,
          error.code,
          endpoint,
          error.details
        );
      }
      throw new BitableApiError(
        'Failed to get record',
        500,
        endpoint,
        error
      );
    }
  }

  /**
   * Update a record
   *
   * @param entity - Entity type
   * @param recordId - Record ID to update
   * @param fields - Fields to update
   * @returns Updated record
   */
  async updateRecord<T extends BitableRecordFields>(
    entity: keyof BitableClientConfig['tableIds'],
    recordId: string,
    fields: Partial<T>
  ): Promise<TypedBitableRecord<T>> {
    const tableId = this.getTableId(entity);
    const endpoint = this.buildEndpoint(
      LarkBitableApiEndpoints.RECORD_UPDATE,
      tableId,
      recordId
    );

    try {
      const response = await this.client.authenticatedRequest<UpdateRecordData>(
        endpoint,
        this.accessToken,
        {
          method: 'PUT',
          body: { fields } satisfies UpdateRecordRequest,
        }
      );

      if (response.data === undefined) {
        throw new RecordNotFoundError(recordId, tableId);
      }

      return {
        record_id: response.data.record.record_id,
        fields: response.data.record.fields as T,
      };
    } catch (error) {
      if (error instanceof BitableApiError) {
        throw error;
      }
      if (error instanceof LarkClientError) {
        if (error.code === 404 || error.code === 1254043) {
          throw new RecordNotFoundError(recordId, tableId);
        }
        throw new BitableApiError(
          error.message,
          error.code,
          endpoint,
          error.details
        );
      }
      throw new BitableApiError(
        'Failed to update record',
        500,
        endpoint,
        error
      );
    }
  }

  /**
   * Delete a record
   *
   * @param entity - Entity type
   * @param recordId - Record ID to delete
   * @returns true if deleted successfully
   */
  async deleteRecord(
    entity: keyof BitableClientConfig['tableIds'],
    recordId: string
  ): Promise<boolean> {
    const tableId = this.getTableId(entity);
    const endpoint = this.buildEndpoint(
      LarkBitableApiEndpoints.RECORD_DELETE,
      tableId,
      recordId
    );

    try {
      const response = await this.client.authenticatedRequest<DeleteRecordData>(
        endpoint,
        this.accessToken,
        { method: 'DELETE' }
      );

      return response.data?.deleted ?? false;
    } catch (error) {
      if (error instanceof BitableApiError) {
        throw error;
      }
      if (error instanceof LarkClientError) {
        if (error.code === 404 || error.code === 1254043) {
          throw new RecordNotFoundError(recordId, tableId);
        }
        throw new BitableApiError(
          error.message,
          error.code,
          endpoint,
          error.details
        );
      }
      throw new BitableApiError(
        'Failed to delete record',
        500,
        endpoint,
        error
      );
    }
  }

  /**
   * Batch create records
   *
   * @param entity - Entity type
   * @param records - Array of field objects to create
   * @returns Array of created records
   */
  async batchCreateRecords<T extends BitableRecordFields>(
    entity: keyof BitableClientConfig['tableIds'],
    records: T[]
  ): Promise<Array<TypedBitableRecord<T>>> {
    const tableId = this.getTableId(entity);
    const endpoint = this.buildEndpoint(
      LarkBitableApiEndpoints.RECORD_BATCH_CREATE,
      tableId
    );

    try {
      const response =
        await this.client.authenticatedRequest<BatchCreateRecordsData>(
          endpoint,
          this.accessToken,
          {
            method: 'POST',
            body: {
              records: records.map((fields) => ({ fields })),
            } satisfies BatchCreateRecordsRequest,
          }
        );

      if (response.data === undefined) {
        throw new BitableApiError(
          'No data returned from batch create API',
          500,
          endpoint
        );
      }

      return response.data.records.map((record) => ({
        record_id: record.record_id,
        fields: record.fields as T,
      }));
    } catch (error) {
      if (error instanceof BitableApiError) {
        throw error;
      }
      if (error instanceof LarkClientError) {
        throw new BitableApiError(
          error.message,
          error.code,
          endpoint,
          error.details
        );
      }
      throw new BitableApiError(
        'Failed to batch create records',
        500,
        endpoint,
        error
      );
    }
  }

  /**
   * Batch update records
   *
   * @param entity - Entity type
   * @param updates - Array of record updates with IDs and fields
   * @returns Array of updated records
   */
  async batchUpdateRecords<T extends BitableRecordFields>(
    entity: keyof BitableClientConfig['tableIds'],
    updates: Array<{ record_id: string; fields: Partial<T> }>
  ): Promise<Array<TypedBitableRecord<T>>> {
    const tableId = this.getTableId(entity);
    const endpoint = this.buildEndpoint(
      LarkBitableApiEndpoints.RECORD_BATCH_UPDATE,
      tableId
    );

    try {
      const response =
        await this.client.authenticatedRequest<BatchUpdateRecordsData>(
          endpoint,
          this.accessToken,
          {
            method: 'POST',
            body: {
              records: updates,
            } satisfies BatchUpdateRecordsRequest,
          }
        );

      if (response.data === undefined) {
        throw new BitableApiError(
          'No data returned from batch update API',
          500,
          endpoint
        );
      }

      return response.data.records.map((record) => ({
        record_id: record.record_id,
        fields: record.fields as T,
      }));
    } catch (error) {
      if (error instanceof BitableApiError) {
        throw error;
      }
      if (error instanceof LarkClientError) {
        throw new BitableApiError(
          error.message,
          error.code,
          endpoint,
          error.details
        );
      }
      throw new BitableApiError(
        'Failed to batch update records',
        500,
        endpoint,
        error
      );
    }
  }

  /**
   * Batch delete records
   *
   * @param entity - Entity type
   * @param recordIds - Array of record IDs to delete
   * @returns Array of deletion results
   */
  async batchDeleteRecords(
    entity: keyof BitableClientConfig['tableIds'],
    recordIds: string[]
  ): Promise<Array<{ record_id: string; deleted: boolean }>> {
    const tableId = this.getTableId(entity);
    const endpoint = this.buildEndpoint(
      LarkBitableApiEndpoints.RECORD_BATCH_DELETE,
      tableId
    );

    try {
      const response =
        await this.client.authenticatedRequest<BatchDeleteRecordsData>(
          endpoint,
          this.accessToken,
          {
            method: 'POST',
            body: { records: recordIds } satisfies BatchDeleteRecordsRequest,
          }
        );

      if (response.data === undefined) {
        throw new BitableApiError(
          'No data returned from batch delete API',
          500,
          endpoint
        );
      }

      return response.data.records;
    } catch (error) {
      if (error instanceof BitableApiError) {
        throw error;
      }
      if (error instanceof LarkClientError) {
        throw new BitableApiError(
          error.message,
          error.code,
          endpoint,
          error.details
        );
      }
      throw new BitableApiError(
        'Failed to batch delete records',
        500,
        endpoint,
        error
      );
    }
  }

  /**
   * Find records by filter
   *
   * @param entity - Entity type
   * @param filter - Filter formula (e.g., 'CurrentValue.[field_name]="value"')
   * @returns Matching records
   */
  async findRecords<T extends BitableRecordFields>(
    entity: keyof BitableClientConfig['tableIds'],
    filter: string
  ): Promise<Array<TypedBitableRecord<T>>> {
    const result = await this.listRecords<T>(entity, { filter });
    return result.records;
  }

  /**
   * Find a single record by filter
   *
   * @param entity - Entity type
   * @param filter - Filter formula
   * @returns First matching record or null
   */
  async findOneRecord<T extends BitableRecordFields>(
    entity: keyof BitableClientConfig['tableIds'],
    filter: string
  ): Promise<TypedBitableRecord<T> | null> {
    const result = await this.listRecords<T>(entity, { filter, page_size: 1 });
    return result.records[0] ?? null;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a BitableClient instance
 *
 * @param client - Lark HTTP client
 * @param accessToken - User access token
 * @param config - Bitable configuration
 * @returns BitableClient instance
 */
export function createBitableClient(
  client: LarkClient,
  accessToken: string,
  config: BitableClientConfig
): BitableClient {
  return new BitableClient(client, accessToken, config);
}

/**
 * Create a BitableClient instance from environment variables
 *
 * @param client - Lark HTTP client
 * @param accessToken - User access token
 * @returns BitableClient instance
 * @throws Error if required environment variables are not set
 */
export function createBitableClientFromEnv(
  client: LarkClient,
  accessToken: string
): BitableClient {
  const appToken = process.env.LARK_BASE_APP_TOKEN;
  const meetingsTableId = process.env.LARK_BASE_MEETINGS_TABLE_ID;
  const minutesTableId = process.env.LARK_BASE_MINUTES_TABLE_ID;
  const actionItemsTableId = process.env.LARK_BASE_ACTION_ITEMS_TABLE_ID;

  if (appToken === undefined || appToken === '') {
    throw new Error('LARK_BASE_APP_TOKEN environment variable is required');
  }
  if (meetingsTableId === undefined || meetingsTableId === '') {
    throw new Error('LARK_BASE_MEETINGS_TABLE_ID environment variable is required');
  }
  if (minutesTableId === undefined || minutesTableId === '') {
    throw new Error('LARK_BASE_MINUTES_TABLE_ID environment variable is required');
  }
  if (actionItemsTableId === undefined || actionItemsTableId === '') {
    throw new Error('LARK_BASE_ACTION_ITEMS_TABLE_ID environment variable is required');
  }

  return createBitableClient(client, accessToken, {
    appToken,
    tableIds: {
      meetings: meetingsTableId,
      minutes: minutesTableId,
      actionItems: actionItemsTableId,
    },
  });
}
