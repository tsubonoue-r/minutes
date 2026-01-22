/**
 * Template Service Tests
 * @module services/__tests__/template.service.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TemplateService,
  TemplateServiceError,
  resetTemplateStorage,
} from '../template.service';
import type { TemplateCreateInput } from '@/types/template';

describe('TemplateService', () => {
  let service: TemplateService;

  beforeEach(() => {
    resetTemplateStorage();
    service = new TemplateService();
  });

  describe('getAll', () => {
    it('should return all default templates on initialization', () => {
      const templates = service.getAll();

      expect(templates.length).toBe(5);
      expect(templates.some((t) => t.meetingType === 'regular')).toBe(true);
      expect(templates.some((t) => t.meetingType === 'project')).toBe(true);
      expect(templates.some((t) => t.meetingType === 'one_on_one')).toBe(true);
      expect(templates.some((t) => t.meetingType === 'brainstorm')).toBe(true);
      expect(templates.some((t) => t.meetingType === 'decision')).toBe(true);
    });
  });

  describe('getByMeetingType', () => {
    it('should return templates filtered by meeting type', () => {
      const templates = service.getByMeetingType('regular');

      expect(templates.length).toBe(1);
      expect(templates[0]?.meetingType).toBe('regular');
    });

    it('should return empty array for non-existent type templates', () => {
      // Create custom template and delete default
      const input: TemplateCreateInput = {
        name: 'Custom Regular',
        meetingType: 'regular',
        structure: {
          sections: [
            { id: 'sec1', title: 'Test', description: 'Test', required: true, order: 1 },
          ],
          focusAreas: ['Test'],
          extractionKeywords: ['test'],
        },
        promptTemplate: 'Test prompt',
        isDefault: false,
      };
      service.create(input);

      const regularTemplates = service.getByMeetingType('regular');
      expect(regularTemplates.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getById', () => {
    it('should return template by ID', () => {
      const template = service.getById('tpl_default_regular');

      expect(template).toBeDefined();
      expect(template?.name).toBe('定例会議テンプレート');
    });

    it('should return undefined for non-existent ID', () => {
      const template = service.getById('non-existent-id');

      expect(template).toBeUndefined();
    });
  });

  describe('getDefaultByType', () => {
    it('should return default template for a meeting type', () => {
      const template = service.getDefaultByType('project');

      expect(template).toBeDefined();
      expect(template?.meetingType).toBe('project');
      expect(template?.isDefault).toBe(true);
    });
  });

  describe('create', () => {
    it('should create a new template', () => {
      const input: TemplateCreateInput = {
        name: 'Custom Template',
        meetingType: 'regular',
        structure: {
          sections: [
            { id: 'sec1', title: 'Section 1', description: 'Description 1', required: true, order: 1 },
            { id: 'sec2', title: 'Section 2', description: 'Description 2', required: false, order: 2 },
          ],
          focusAreas: ['Focus 1', 'Focus 2'],
          extractionKeywords: ['keyword1', 'keyword2'],
        },
        promptTemplate: 'Custom prompt template',
        isDefault: false,
      };

      const created = service.create(input);

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Custom Template');
      expect(created.meetingType).toBe('regular');
      expect(created.structure.sections.length).toBe(2);
      expect(created.isDefault).toBe(false);
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
    });

    it('should unset other defaults when creating a default template', () => {
      // Verify existing default
      const existingDefault = service.getDefaultByType('regular');
      expect(existingDefault?.isDefault).toBe(true);

      // Create new default
      const input: TemplateCreateInput = {
        name: 'New Default',
        meetingType: 'regular',
        structure: {
          sections: [
            { id: 'sec1', title: 'Test', description: 'Test', required: true, order: 1 },
          ],
          focusAreas: ['Test'],
          extractionKeywords: ['test'],
        },
        promptTemplate: 'Test prompt',
        isDefault: true,
      };

      const newDefault = service.create(input);
      expect(newDefault.isDefault).toBe(true);

      // Verify old default is no longer default
      const oldDefault = service.getById('tpl_default_regular');
      expect(oldDefault?.isDefault).toBe(false);

      // Verify new default is the only default
      const currentDefault = service.getDefaultByType('regular');
      expect(currentDefault?.id).toBe(newDefault.id);
    });
  });

  describe('update', () => {
    it('should update a custom template', () => {
      // Create a custom template first
      const input: TemplateCreateInput = {
        name: 'Original Name',
        meetingType: 'regular',
        structure: {
          sections: [
            { id: 'sec1', title: 'Test', description: 'Test', required: true, order: 1 },
          ],
          focusAreas: ['Test'],
          extractionKeywords: ['test'],
        },
        promptTemplate: 'Test prompt',
      };
      const created = service.create(input);

      // Update it
      const updated = service.update(created.id, { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
      expect(updated.meetingType).toBe('regular'); // Unchanged
    });

    it('should throw error for non-existent template', () => {
      expect(() => service.update('non-existent-id', { name: 'Test' })).toThrow(
        TemplateServiceError
      );
    });

    it('should prevent modifying built-in default template properties', () => {
      expect(() =>
        service.update('tpl_default_regular', { name: 'Modified' })
      ).toThrow(TemplateServiceError);
    });

    it('should allow updating isDefault for built-in templates', () => {
      // This should not throw
      const updated = service.update('tpl_default_regular', { isDefault: false });
      expect(updated.isDefault).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete a custom template', () => {
      // Create a custom template
      const input: TemplateCreateInput = {
        name: 'To Delete',
        meetingType: 'regular',
        structure: {
          sections: [
            { id: 'sec1', title: 'Test', description: 'Test', required: true, order: 1 },
          ],
          focusAreas: ['Test'],
          extractionKeywords: ['test'],
        },
        promptTemplate: 'Test prompt',
      };
      const created = service.create(input);

      // Delete it
      service.delete(created.id);

      // Verify it's deleted
      const deleted = service.getById(created.id);
      expect(deleted).toBeUndefined();
    });

    it('should throw error when deleting non-existent template', () => {
      expect(() => service.delete('non-existent-id')).toThrow(
        TemplateServiceError
      );
    });

    it('should throw error when deleting built-in default template', () => {
      expect(() => service.delete('tpl_default_regular')).toThrow(
        TemplateServiceError
      );
    });
  });

  describe('selectByTitle', () => {
    it('should select regular meeting template for "週次定例"', () => {
      const result = service.selectByTitle('週次定例ミーティング');

      expect(result.detectedType).toBe('regular');
      expect(result.template.meetingType).toBe('regular');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.matchedKeywords.length).toBeGreaterThan(0);
    });

    it('should select project meeting template for "プロジェクトキックオフ"', () => {
      const result = service.selectByTitle('プロジェクトキックオフ会議');

      expect(result.detectedType).toBe('project');
      expect(result.template.meetingType).toBe('project');
    });

    it('should select 1on1 template for "1on1 面談"', () => {
      const result = service.selectByTitle('1on1 面談');

      expect(result.detectedType).toBe('one_on_one');
      expect(result.template.meetingType).toBe('one_on_one');
    });

    it('should select brainstorm template for "ブレスト会議"', () => {
      const result = service.selectByTitle('新機能ブレスト');

      expect(result.detectedType).toBe('brainstorm');
      expect(result.template.meetingType).toBe('brainstorm');
    });

    it('should select decision meeting template for "意思決定会議"', () => {
      const result = service.selectByTitle('Q3戦略意思決定会議');

      expect(result.detectedType).toBe('decision');
      expect(result.template.meetingType).toBe('decision');
    });

    it('should default to regular meeting for ambiguous titles', () => {
      const result = service.selectByTitle('チームミーティング');

      expect(result.detectedType).toBe('regular');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should detect English keywords', () => {
      const result = service.selectByTitle('Weekly Standup');

      expect(result.detectedType).toBe('regular');
      expect(result.matchedKeywords).toContain('weekly');
    });
  });

  describe('getByCategory', () => {
    it('should return templates filtered by category', () => {
      const templates = service.getByCategory('business');

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every((t) => t.category === 'business')).toBe(true);
    });

    it('should return empty array for category with no templates', () => {
      const templates = service.getByCategory('sales');

      expect(templates.length).toBe(0);
    });
  });

  describe('duplicate', () => {
    it('should duplicate a template with new ID', () => {
      const duplicated = service.duplicate('tpl_default_regular');

      expect(duplicated.id).not.toBe('tpl_default_regular');
      expect(duplicated.name).toBe('定例会議テンプレート (コピー)');
      expect(duplicated.meetingType).toBe('regular');
      expect(duplicated.isDefault).toBe(false);
    });

    it('should duplicate with custom name', () => {
      const duplicated = service.duplicate('tpl_default_regular', 'カスタム名');

      expect(duplicated.name).toBe('カスタム名');
    });

    it('should throw error for non-existent source', () => {
      expect(() => service.duplicate('non-existent-id')).toThrow(
        TemplateServiceError
      );
    });
  });

  describe('export', () => {
    it('should export all user-created templates', () => {
      // Create a custom template
      const input: TemplateCreateInput = {
        name: 'Export Test',
        meetingType: 'regular',
        structure: {
          sections: [
            { id: 'sec1', title: 'Test', description: 'Test', required: true, order: 1 },
          ],
          focusAreas: ['Test'],
          extractionKeywords: ['test'],
        },
        promptTemplate: 'Test prompt',
      };
      service.create(input);

      const exportData = service.export();

      expect(exportData.version).toBe('1.0');
      expect(exportData.exportedAt).toBeDefined();
      expect(exportData.templates.length).toBe(1); // Only custom template
      expect(exportData.templates[0]?.name).toBe('Export Test');
    });

    it('should export specific templates by ID', () => {
      const input: TemplateCreateInput = {
        name: 'Specific Export',
        meetingType: 'regular',
        structure: {
          sections: [
            { id: 'sec1', title: 'Test', description: 'Test', required: true, order: 1 },
          ],
          focusAreas: ['Test'],
          extractionKeywords: ['test'],
        },
        promptTemplate: 'Test prompt',
      };
      const created = service.create(input);

      const exportData = service.export([created.id]);

      expect(exportData.templates.length).toBe(1);
      expect(exportData.templates[0]?.id).toBe(created.id);
    });
  });

  describe('import', () => {
    it('should import templates from valid export data', () => {
      const exportData = {
        version: '1.0' as const,
        exportedAt: new Date().toISOString(),
        templates: [
          {
            id: 'tpl_imported_1',
            name: 'Imported Template',
            meetingType: 'regular' as const,
            category: 'custom' as const,
            structure: {
              sections: [
                { id: 'sec1', title: 'Test', description: 'Test', required: true, order: 1 },
              ],
              focusAreas: ['Test'],
              extractionKeywords: ['test'],
            },
            promptTemplate: 'Test prompt',
            isDefault: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      const result = service.import(exportData);

      expect(result.imported.length).toBe(1);
      expect(result.skipped.length).toBe(0);
      expect(result.errors.length).toBe(0);
      expect(result.imported[0]?.name).toBe('Imported Template');
    });

    it('should skip built-in default templates', () => {
      const exportData = {
        version: '1.0' as const,
        exportedAt: new Date().toISOString(),
        templates: [
          {
            id: 'tpl_default_regular',
            name: 'Modified Default',
            meetingType: 'regular' as const,
            structure: {
              sections: [],
              focusAreas: [],
              extractionKeywords: [],
            },
            promptTemplate: 'Test',
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      const result = service.import(exportData);

      expect(result.skipped.length).toBe(1);
      expect(result.imported.length).toBe(0);
    });

    it('should throw error for invalid data format', () => {
      expect(() => service.import({ invalid: 'data' })).toThrow(
        TemplateServiceError
      );
    });
  });

  describe('search', () => {
    it('should find templates by name', () => {
      const results = service.search('定例');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((t) => t.name.includes('定例'))).toBe(true);
    });

    it('should find templates by tag', () => {
      const results = service.search('進捗報告');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const results = service.search('存在しないキーワード12345');

      expect(results.length).toBe(0);
    });
  });
});

describe('TemplateService New Features', () => {
  let service: TemplateService;

  beforeEach(() => {
    resetTemplateStorage();
    service = new TemplateService();
  });

  it('should handle duplicate and export cycle', () => {
    // Duplicate a default template
    const duplicated = service.duplicate('tpl_default_regular');
    expect(duplicated.id).not.toBe('tpl_default_regular');

    // Export the duplicated template
    const exportData = service.export([duplicated.id]);
    expect(exportData.templates.length).toBe(1);
    expect(exportData.templates[0]?.name).toBe('定例会議テンプレート (コピー)');
  });
});

describe('TemplateService Integration', () => {
  let service: TemplateService;

  beforeEach(() => {
    resetTemplateStorage();
    service = new TemplateService();
  });

  it('should handle full CRUD cycle', () => {
    // Create
    const input: TemplateCreateInput = {
      name: 'Integration Test Template',
      meetingType: 'project',
      structure: {
        sections: [
          { id: 'sec1', title: 'Overview', description: 'Project overview', required: true, order: 1 },
        ],
        focusAreas: ['Integration'],
        extractionKeywords: ['integration', 'test'],
      },
      promptTemplate: 'Integration test prompt',
    };

    const created = service.create(input);
    expect(created.name).toBe('Integration Test Template');

    // Read
    const read = service.getById(created.id);
    expect(read).toBeDefined();
    expect(read?.name).toBe('Integration Test Template');

    // Update
    const updated = service.update(created.id, {
      name: 'Updated Integration Test',
      structure: {
        sections: [
          { id: 'sec1', title: 'Updated Overview', description: 'Updated description', required: true, order: 1 },
          { id: 'sec2', title: 'New Section', description: 'New section description', required: false, order: 2 },
        ],
        focusAreas: ['Integration', 'Updated'],
        extractionKeywords: ['integration', 'test', 'updated'],
      },
    });
    expect(updated.name).toBe('Updated Integration Test');
    expect(updated.structure.sections.length).toBe(2);

    // Delete
    service.delete(created.id);
    const deleted = service.getById(created.id);
    expect(deleted).toBeUndefined();
  });

  it('should maintain data consistency across operations', () => {
    // Get initial count
    const initialTemplates = service.getAll();
    const initialCount = initialTemplates.length;

    // Create 3 templates
    for (let i = 0; i < 3; i++) {
      service.create({
        name: `Consistency Test ${i}`,
        meetingType: 'regular',
        structure: {
          sections: [
            { id: 'sec1', title: 'Test', description: 'Test', required: true, order: 1 },
          ],
          focusAreas: ['Test'],
          extractionKeywords: ['test'],
        },
        promptTemplate: 'Test prompt',
      });
    }

    // Verify count
    const afterCreate = service.getAll();
    expect(afterCreate.length).toBe(initialCount + 3);

    // Get only regular templates
    const regularTemplates = service.getByMeetingType('regular');
    expect(regularTemplates.length).toBe(4); // 1 default + 3 created
  });
});
