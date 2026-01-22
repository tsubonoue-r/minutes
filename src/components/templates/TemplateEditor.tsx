'use client';

/**
 * Template Editor Component - Create/Edit templates
 * @module components/templates/TemplateEditor
 */

import { memo, useState, useCallback, useEffect } from 'react';
import type {
  Template,
  TemplateCreateInput,
  TemplateSection,
  MeetingType,
} from '@/types/template';
import {
  MEETING_TYPES,
  MEETING_TYPE_LABELS,
  generateTemplateId,
} from '@/types/template';
import { Badge } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

/**
 * Template editor props
 */
export interface TemplateEditorProps {
  /** Template to edit (null for new) */
  readonly template?: Template | null | undefined;
  /** Callback when save is clicked */
  readonly onSave: (data: TemplateCreateInput) => Promise<void>;
  /** Callback when cancel is clicked */
  readonly onCancel: () => void;
  /** Loading state */
  readonly isLoading?: boolean | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * Editor form state
 */
interface FormState {
  name: string;
  meetingType: MeetingType;
  sections: TemplateSection[];
  focusAreas: string[];
  extractionKeywords: string[];
  promptTemplate: string;
  isDefault: boolean;
}

// ============================================================================
// Initial State
// ============================================================================

function createInitialState(template?: Template | null): FormState {
  if (template !== null && template !== undefined) {
    return {
      name: template.name,
      meetingType: template.meetingType,
      sections: [...template.structure.sections],
      focusAreas: [...template.structure.focusAreas],
      extractionKeywords: [...template.structure.extractionKeywords],
      promptTemplate: template.promptTemplate,
      isDefault: template.isDefault,
    };
  }

  return {
    name: '',
    meetingType: 'regular',
    sections: [],
    focusAreas: [],
    extractionKeywords: [],
    promptTemplate: '',
    isDefault: false,
  };
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Section editor component
 */
interface SectionEditorProps {
  readonly sections: TemplateSection[];
  readonly onChange: (sections: TemplateSection[]) => void;
  readonly disabled: boolean;
}

function SectionEditor({
  sections,
  onChange,
  disabled,
}: SectionEditorProps): JSX.Element {
  const handleAddSection = useCallback(() => {
    const newSection: TemplateSection = {
      id: generateTemplateId('sec'),
      title: '',
      description: '',
      required: false,
      order: sections.length + 1,
    };
    onChange([...sections, newSection]);
  }, [sections, onChange]);

  const handleUpdateSection = useCallback(
    (index: number, updates: Partial<TemplateSection>) => {
      const updated = sections.map((section, i) =>
        i === index ? { ...section, ...updates } : section
      );
      onChange(updated);
    },
    [sections, onChange]
  );

  const handleRemoveSection = useCallback(
    (index: number) => {
      const updated = sections.filter((_, i) => i !== index);
      // Reorder remaining sections
      const reordered = updated.map((section, i) => ({
        ...section,
        order: i + 1,
      }));
      onChange(reordered);
    },
    [sections, onChange]
  );

  const handleMoveSection = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= sections.length) return;

      const updated = [...sections];
      const temp = updated[index];
      const swapItem = updated[newIndex];
      if (temp !== undefined && swapItem !== undefined) {
        updated[index] = swapItem;
        updated[newIndex] = temp;
      }

      // Update order numbers
      const reordered = updated.map((section, i) => ({
        ...section,
        order: i + 1,
      }));
      onChange(reordered);
    },
    [sections, onChange]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-lark-text">
          セクション構成
        </label>
        <button
          type="button"
          onClick={handleAddSection}
          disabled={disabled}
          className="
            px-2 py-1 text-xs font-medium text-lark-primary
            border border-lark-primary rounded
            hover:bg-lark-primary hover:text-white
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          + セクション追加
        </button>
      </div>

      <div className="space-y-2">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-start gap-2">
              {/* Order controls */}
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => handleMoveSection(index, 'up')}
                  disabled={disabled || index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  aria-label="上へ移動"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveSection(index, 'down')}
                  disabled={disabled || index === sections.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  aria-label="下へ移動"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Section fields */}
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => handleUpdateSection(index, { title: e.target.value })}
                  disabled={disabled}
                  placeholder="セクションタイトル"
                  className="
                    w-full px-2 py-1 text-sm
                    border border-gray-300 rounded
                    focus:outline-none focus:ring-1 focus:ring-lark-primary
                    disabled:bg-gray-100 disabled:cursor-not-allowed
                  "
                />
                <input
                  type="text"
                  value={section.description}
                  onChange={(e) => handleUpdateSection(index, { description: e.target.value })}
                  disabled={disabled}
                  placeholder="説明"
                  className="
                    w-full px-2 py-1 text-sm
                    border border-gray-300 rounded
                    focus:outline-none focus:ring-1 focus:ring-lark-primary
                    disabled:bg-gray-100 disabled:cursor-not-allowed
                  "
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={section.required}
                    onChange={(e) => handleUpdateSection(index, { required: e.target.checked })}
                    disabled={disabled}
                    className="rounded border-gray-300 text-lark-primary focus:ring-lark-primary"
                  />
                  <span className="text-xs text-gray-600">必須セクション</span>
                </label>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemoveSection(index)}
                disabled={disabled}
                className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30"
                aria-label="セクションを削除"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {sections.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            セクションを追加してください
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Tags input component
 */
interface TagsInputProps {
  readonly label: string;
  readonly values: string[];
  readonly onChange: (values: string[]) => void;
  readonly placeholder: string;
  readonly disabled: boolean;
}

function TagsInput({
  label,
  values,
  onChange,
  placeholder,
  disabled,
}: TagsInputProps): JSX.Element {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && inputValue.trim() !== '') {
        e.preventDefault();
        if (!values.includes(inputValue.trim())) {
          onChange([...values, inputValue.trim()]);
        }
        setInputValue('');
      }
    },
    [inputValue, values, onChange]
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(values.filter((_, i) => i !== index));
    },
    [values, onChange]
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-lark-text">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((value, index) => (
          <Badge key={`${value}-${index}`} variant="default" className="pr-1">
            {value}
            <button
              type="button"
              onClick={() => handleRemove(index)}
              disabled={disabled}
              className="ml-1 text-gray-400 hover:text-gray-600"
              aria-label={`${value}を削除`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Badge>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="
          w-full px-3 py-2 text-sm
          border border-gray-300 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
        "
      />
      <p className="text-xs text-gray-500">Enterキーで追加</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Template Editor Component
 *
 * @description Form for creating or editing meeting templates
 *
 * @example
 * ```tsx
 * <TemplateEditor
 *   template={selectedTemplate}
 *   onSave={handleSave}
 *   onCancel={handleCancel}
 * />
 * ```
 */
function TemplateEditorInner({
  template = null,
  onSave,
  onCancel,
  isLoading = false,
  className = '',
}: TemplateEditorProps): JSX.Element {
  const [formState, setFormState] = useState<FormState>(() =>
    createInitialState(template)
  );
  const [error, setError] = useState<string | null>(null);

  // Reset form when template changes
  useEffect(() => {
    setFormState(createInitialState(template));
    setError(null);
  }, [template]);

  const isEditing = template !== null;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Validation
      if (formState.name.trim() === '') {
        setError('テンプレート名を入力してください');
        return;
      }
      if (formState.sections.length === 0) {
        setError('少なくとも1つのセクションを追加してください');
        return;
      }
      if (formState.promptTemplate.trim() === '') {
        setError('AIプロンプトを入力してください');
        return;
      }

      const data: TemplateCreateInput = {
        name: formState.name.trim(),
        meetingType: formState.meetingType,
        structure: {
          sections: formState.sections,
          focusAreas: formState.focusAreas,
          extractionKeywords: formState.extractionKeywords,
        },
        promptTemplate: formState.promptTemplate.trim(),
        isDefault: formState.isDefault,
      };

      try {
        await onSave(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '保存に失敗しました');
      }
    },
    [formState, onSave]
  );

  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className={`bg-white rounded-lg border border-lark-border ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-lark-border">
        <h3 className="text-base font-semibold text-lark-text">
          {isEditing ? 'テンプレート編集' : '新規テンプレート作成'}
        </h3>
      </div>

      {/* Form fields */}
      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Error message */}
        {error !== null && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Template name */}
        <div>
          <label className="block text-sm font-medium text-lark-text mb-1">
            テンプレート名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formState.name}
            onChange={(e) => updateField('name', e.target.value)}
            disabled={isLoading}
            placeholder="例: カスタム定例会議テンプレート"
            className="
              w-full px-3 py-2 text-sm
              border border-gray-300 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
            "
          />
        </div>

        {/* Meeting type */}
        <div>
          <label className="block text-sm font-medium text-lark-text mb-1">
            会議種別
          </label>
          <div className="flex flex-wrap gap-2">
            {MEETING_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateField('meetingType', type)}
                disabled={isLoading}
                className={`
                  px-3 py-1.5 text-xs font-medium rounded-full transition-colors
                  ${formState.meetingType === type
                    ? 'bg-lark-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {MEETING_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Sections */}
        <SectionEditor
          sections={formState.sections}
          onChange={(sections) => updateField('sections', sections)}
          disabled={isLoading}
        />

        {/* Focus areas */}
        <TagsInput
          label="フォーカスエリア"
          values={formState.focusAreas}
          onChange={(values) => updateField('focusAreas', values)}
          placeholder="例: 進捗報告"
          disabled={isLoading}
        />

        {/* Extraction keywords */}
        <TagsInput
          label="抽出キーワード"
          values={formState.extractionKeywords}
          onChange={(values) => updateField('extractionKeywords', values)}
          placeholder="例: 完了"
          disabled={isLoading}
        />

        {/* Prompt template */}
        <div>
          <label className="block text-sm font-medium text-lark-text mb-1">
            AIプロンプト <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formState.promptTemplate}
            onChange={(e) => updateField('promptTemplate', e.target.value)}
            disabled={isLoading}
            rows={6}
            placeholder="AIへの指示を入力..."
            className="
              w-full px-3 py-2 text-sm
              border border-gray-300 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-lark-primary focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              resize-y
            "
          />
        </div>

        {/* Is default */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formState.isDefault}
            onChange={(e) => updateField('isDefault', e.target.checked)}
            disabled={isLoading}
            className="rounded border-gray-300 text-lark-primary focus:ring-lark-primary"
          />
          <span className="text-sm text-gray-700">この会議種別のデフォルトにする</span>
        </label>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-lark-border flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="
            px-4 py-2 text-sm font-medium text-gray-600
            border border-gray-300 rounded-lg
            hover:bg-gray-50 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="
            px-4 py-2 text-sm font-medium text-white
            bg-lark-primary rounded-lg
            hover:bg-blue-600 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-2
          "
        >
          {isLoading && (
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {isEditing ? '更新' : '作成'}
        </button>
      </div>
    </form>
  );
}

export const TemplateEditor = memo(TemplateEditorInner);
export default TemplateEditor;
