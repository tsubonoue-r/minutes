'use client';

/**
 * Templates Management Page
 * @module app/(dashboard)/templates/page
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  TemplateList,
  TemplateEditor,
  TemplatePreview,
  TemplateCategoryFilter,
  TemplateImportExport,
  type TemplateFilterState,
} from '@/components/templates';
import type { Template, TemplateCreateInput } from '@/types/template';

// ============================================================================
// Types
// ============================================================================

type ViewMode = 'list' | 'create' | 'edit';

interface PageState {
  templates: Template[];
  selectedTemplate: Template | null;
  isLoading: boolean;
  error: string | null;
  viewMode: ViewMode;
  isSaving: boolean;
  isDuplicating: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export default function TemplatesPage(): JSX.Element {
  const [state, setState] = useState<PageState>({
    templates: [],
    selectedTemplate: null,
    isLoading: true,
    error: null,
    viewMode: 'list',
    isSaving: false,
    isDuplicating: false,
  });

  const [filters, setFilters] = useState<TemplateFilterState>({
    category: null,
    meetingType: null,
    searchQuery: '',
  });

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/templates');
      if (!response.ok) {
        throw new Error('テンプレートの取得に失敗しました');
      }
      const data = await response.json() as { data: Template[] };
      setState((prev) => ({
        ...prev,
        templates: data.data,
        isLoading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : '不明なエラー',
      }));
    }
  }, []);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  // Filter templates based on current filters
  const filteredTemplates = useMemo(() => {
    return state.templates.filter((template) => {
      // Category filter
      if (filters.category !== null && template.category !== filters.category) {
        return false;
      }

      // Meeting type filter
      if (filters.meetingType !== null && template.meetingType !== filters.meetingType) {
        return false;
      }

      // Search filter
      if (filters.searchQuery !== '') {
        const query = filters.searchQuery.toLowerCase();
        const nameMatch = template.name.toLowerCase().includes(query);
        const descMatch = template.description?.toLowerCase().includes(query) ?? false;
        const tagMatch = template.tags?.some((tag) => tag.toLowerCase().includes(query)) ?? false;
        if (!nameMatch && !descMatch && !tagMatch) {
          return false;
        }
      }

      return true;
    });
  }, [state.templates, filters]);

  // Select template
  const handleSelect = useCallback((template: Template) => {
    setState((prev) => ({
      ...prev,
      selectedTemplate: template,
      viewMode: 'list',
    }));
  }, []);

  // Start creating new template
  const handleCreate = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedTemplate: null,
      viewMode: 'create',
    }));
  }, []);

  // Start editing template
  const handleEdit = useCallback((template: Template) => {
    setState((prev) => ({
      ...prev,
      selectedTemplate: template,
      viewMode: 'edit',
    }));
  }, []);

  // Delete template
  const handleDelete = useCallback(async (template: Template) => {
    if (!confirm(`テンプレート「${template.name}」を削除しますか？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json() as { error: { message: string } };
        throw new Error(errorData.error.message);
      }

      setState((prev) => ({
        ...prev,
        templates: prev.templates.filter((t) => t.id !== template.id),
        selectedTemplate:
          prev.selectedTemplate?.id === template.id ? null : prev.selectedTemplate,
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました');
    }
  }, []);

  // Duplicate template
  const handleDuplicate = useCallback(async (template: Template) => {
    setState((prev) => ({ ...prev, isDuplicating: true }));

    try {
      const response = await fetch('/api/templates/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: template.id }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error: { message: string } };
        throw new Error(errorData.error.message);
      }

      const result = await response.json() as { data: Template };

      setState((prev) => ({
        ...prev,
        templates: [...prev.templates, result.data],
        selectedTemplate: result.data,
        isDuplicating: false,
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : '複製に失敗しました');
      setState((prev) => ({ ...prev, isDuplicating: false }));
    }
  }, []);

  // Handle import complete
  const handleImportComplete = useCallback((importedTemplates: Template[]) => {
    setState((prev) => ({
      ...prev,
      templates: [...prev.templates, ...importedTemplates],
    }));
  }, []);

  // Save template (create or update)
  const handleSave = useCallback(
    async (data: TemplateCreateInput) => {
      setState((prev) => ({ ...prev, isSaving: true }));

      try {
        let response: Response;

        if (state.viewMode === 'edit' && state.selectedTemplate !== null) {
          // Update
          response = await fetch(`/api/templates/${state.selectedTemplate.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
        } else {
          // Create
          response = await fetch('/api/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
        }

        if (!response.ok) {
          const errorData = await response.json() as { error: { message: string } };
          throw new Error(errorData.error.message);
        }

        const result = await response.json() as { data: Template };

        setState((prev) => {
          const templates =
            state.viewMode === 'edit'
              ? prev.templates.map((t) =>
                  t.id === result.data.id ? result.data : t
                )
              : [...prev.templates, result.data];

          return {
            ...prev,
            templates,
            selectedTemplate: result.data,
            viewMode: 'list',
            isSaving: false,
          };
        });
      } catch (err) {
        setState((prev) => ({ ...prev, isSaving: false }));
        throw err;
      }
    },
    [state.viewMode, state.selectedTemplate]
  );

  // Cancel editing
  const handleCancel = useCallback(() => {
    setState((prev) => ({
      ...prev,
      viewMode: 'list',
    }));
  }, []);

  return (
    <div className="min-h-screen bg-lark-background">
      {/* Header */}
      <header className="bg-white border-b border-lark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-lark-text">
                テンプレート管理
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                会議種別に応じた議事録テンプレートを管理します
              </p>
            </div>
            {state.viewMode === 'list' && (
              <button
                type="button"
                onClick={handleCreate}
                className="
                  px-4 py-2 text-sm font-medium text-white
                  bg-lark-primary rounded-lg
                  hover:bg-blue-600 transition-colors
                  flex items-center gap-2
                "
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                新規作成
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error state */}
        {state.error !== null && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{state.error}</p>
            <button
              type="button"
              onClick={() => void fetchTemplates()}
              className="mt-2 text-sm text-red-600 underline hover:no-underline"
            >
              再試行
            </button>
          </div>
        )}

        {/* List view */}
        {state.viewMode === 'list' && (
          <div className="space-y-6">
            {/* Import/Export section */}
            <div className="bg-white rounded-lg border border-lark-border p-4">
              <h2 className="text-sm font-medium text-gray-500 mb-3">
                インポート / エクスポート
              </h2>
              <TemplateImportExport
                templates={state.templates}
                onImportComplete={handleImportComplete}
                isLoading={state.isLoading}
              />
            </div>

            {/* Filter section */}
            <div className="bg-white rounded-lg border border-lark-border p-4">
              <h2 className="text-sm font-medium text-gray-500 mb-3">
                フィルター
              </h2>
              <TemplateCategoryFilter
                filters={filters}
                onFiltersChange={setFilters}
                disabled={state.isLoading}
              />
            </div>

            {/* Template list and preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Template list */}
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-3">
                  テンプレート一覧 ({filteredTemplates.length}件)
                </h2>
                <TemplateList
                  templates={filteredTemplates}
                  selectedId={state.selectedTemplate?.id}
                  isLoading={state.isLoading || state.isDuplicating}
                  onSelect={handleSelect}
                  onEdit={handleEdit}
                  onDelete={(template) => void handleDelete(template)}
                  onDuplicate={(template) => void handleDuplicate(template)}
                />
              </div>

              {/* Template preview */}
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-3">
                  プレビュー
                </h2>
                <TemplatePreview
                  template={state.selectedTemplate}
                  showPrompt={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit view */}
        {(state.viewMode === 'create' || state.viewMode === 'edit') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor */}
            <div>
              <TemplateEditor
                template={state.viewMode === 'edit' ? state.selectedTemplate : null}
                onSave={handleSave}
                onCancel={handleCancel}
                isLoading={state.isSaving}
              />
            </div>

            {/* Preview of current edit */}
            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-3">
                プレビュー
              </h2>
              <TemplatePreview
                template={state.viewMode === 'edit' ? state.selectedTemplate : null}
                showPrompt={true}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
