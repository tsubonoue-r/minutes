'use client';

/**
 * Template Selector Component - Select template for minutes generation
 * @module components/templates/TemplateSelector
 */

import { memo, useState, useCallback, useEffect } from 'react';
import type { Template, MeetingType, TemplateSelectResponse } from '@/types/template';
import { MEETING_TYPE_LABELS, MEETING_TYPES } from '@/types/template';
import { Badge } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

/**
 * Template selector props
 */
export interface TemplateSelectorProps {
  /** Currently selected template */
  readonly selectedTemplate: Template | null;
  /** Meeting title for auto-selection */
  readonly meetingTitle?: string | undefined;
  /** Callback when template is selected */
  readonly onSelect: (template: Template) => void;
  /** Loading state */
  readonly isLoading?: boolean | undefined;
  /** Disabled state */
  readonly disabled?: boolean | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

/**
 * Auto-selection state
 */
interface AutoSelectState {
  readonly isSelecting: boolean;
  readonly result: TemplateSelectResponse | null;
  readonly error: string | null;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook result type for useTemplates
 */
interface UseTemplatesResult {
  templates: Template[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch templates
 */
function useTemplates(): UseTemplatesResult {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchTemplates(): Promise<void> {
      try {
        const response = await fetch('/api/templates');
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        const data = await response.json() as { data: Template[] };
        if (isMounted) {
          setTemplates(data.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

  return { templates, isLoading, error };
}

/**
 * Hook for auto-selection
 */
function useAutoSelect(
  meetingTitle: string | undefined,
  onSelect: (template: Template) => void
): AutoSelectState {
  const [state, setState] = useState<AutoSelectState>({
    isSelecting: false,
    result: null,
    error: null,
  });

  useEffect(() => {
    if (meetingTitle === undefined || meetingTitle.trim() === '') {
      return;
    }

    let isMounted = true;

    async function selectTemplate(): Promise<void> {
      setState((prev) => ({ ...prev, isSelecting: true, error: null }));

      try {
        const response = await fetch('/api/templates/select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingTitle }),
        });

        if (!response.ok) {
          throw new Error('Failed to auto-select template');
        }

        const data = await response.json() as { data: TemplateSelectResponse };

        if (isMounted) {
          setState({
            isSelecting: false,
            result: data.data,
            error: null,
          });
          onSelect(data.data.template);
        }
      } catch (err) {
        if (isMounted) {
          setState({
            isSelecting: false,
            result: null,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }

    void selectTemplate();

    return () => {
      isMounted = false;
    };
  }, [meetingTitle, onSelect]);

  return state;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Template option component
 */
interface TemplateOptionProps {
  readonly template: Template;
  readonly isSelected: boolean;
  readonly onSelect: (template: Template) => void;
  readonly disabled: boolean;
}

function TemplateOption({
  template,
  isSelected,
  onSelect,
  disabled,
}: TemplateOptionProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      disabled={disabled}
      className={`
        w-full p-3 text-left rounded-lg border transition-all
        ${isSelected
          ? 'border-lark-primary bg-lark-primary/5 ring-2 ring-lark-primary/20'
          : 'border-lark-border bg-white hover:border-gray-300'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      aria-pressed={isSelected}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-lark-text">
            {template.name}
          </span>
          {template.isDefault && (
            <Badge variant="success" className="text-xs">
              デフォルト
            </Badge>
          )}
        </div>
        {isSelected && (
          <svg
            className="w-5 h-5 text-lark-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {template.structure.sections.length}セクション
      </p>
    </button>
  );
}

/**
 * Meeting type filter tabs
 */
interface TypeFilterProps {
  readonly selectedType: MeetingType | null;
  readonly onTypeChange: (type: MeetingType | null) => void;
  readonly disabled: boolean;
}

function TypeFilter({
  selectedType,
  onTypeChange,
  disabled,
}: TypeFilterProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        type="button"
        onClick={() => onTypeChange(null)}
        disabled={disabled}
        className={`
          px-3 py-1.5 text-xs font-medium rounded-full transition-colors
          ${selectedType === null
            ? 'bg-lark-primary text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        すべて
      </button>
      {MEETING_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onTypeChange(type)}
          disabled={disabled}
          className={`
            px-3 py-1.5 text-xs font-medium rounded-full transition-colors
            ${selectedType === type
              ? 'bg-lark-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {MEETING_TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  );
}

/**
 * Auto-selection result display
 */
interface AutoSelectResultProps {
  readonly result: TemplateSelectResponse;
}

function AutoSelectResult({ result }: AutoSelectResultProps): JSX.Element {
  const confidencePercent = Math.round(result.confidence * 100);

  return (
    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
      <div className="flex items-start gap-2">
        <svg
          className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800">
            自動選択: {MEETING_TYPE_LABELS[result.detectedType]}
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            信頼度: {confidencePercent}%
            {result.matchedKeywords.length > 0 && (
              <>
                {' / '}
                キーワード: {result.matchedKeywords.join(', ')}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Template Selector Component
 *
 * @description Allows users to select a template for minutes generation
 * with auto-selection based on meeting title
 *
 * @example
 * ```tsx
 * <TemplateSelector
 *   selectedTemplate={template}
 *   meetingTitle="Weekly Team Standup"
 *   onSelect={handleSelect}
 * />
 * ```
 */
function TemplateSelectorInner({
  selectedTemplate,
  meetingTitle,
  onSelect,
  isLoading = false,
  disabled = false,
  className = '',
}: TemplateSelectorProps): JSX.Element {
  const { templates, isLoading: isLoadingTemplates, error } = useTemplates();
  const autoSelectState = useAutoSelect(meetingTitle, onSelect);
  const [filterType, setFilterType] = useState<MeetingType | null>(null);

  const handleTypeChange = useCallback((type: MeetingType | null) => {
    setFilterType(type);
  }, []);

  const filteredTemplates = filterType !== null
    ? templates.filter((t) => t.meetingType === filterType)
    : templates;

  const isDisabled = disabled || isLoading || isLoadingTemplates || autoSelectState.isSelecting;

  // Loading state
  if (isLoadingTemplates) {
    return (
      <div className={`p-4 bg-white rounded-lg border border-lark-border ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-200 rounded w-full" />
          <div className="h-16 bg-gray-200 rounded" />
          <div className="h-16 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Error state
  if (error !== null) {
    return (
      <div className={`p-4 bg-white rounded-lg border border-red-200 ${className}`}>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white rounded-lg border border-lark-border ${className}`}>
      {/* Header */}
      <h4 className="text-sm font-medium text-lark-text mb-3">
        テンプレート選択
      </h4>

      {/* Auto-selection result */}
      {autoSelectState.result !== null && (
        <AutoSelectResult result={autoSelectState.result} />
      )}

      {/* Auto-selection loading */}
      {autoSelectState.isSelecting && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mb-4">
          <svg
            className="w-4 h-4 text-lark-primary animate-spin"
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
          <span className="text-sm text-gray-600">テンプレートを自動選択中...</span>
        </div>
      )}

      {/* Type filter */}
      <TypeFilter
        selectedType={filterType}
        onTypeChange={handleTypeChange}
        disabled={isDisabled}
      />

      {/* Template list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredTemplates.map((template) => (
          <TemplateOption
            key={template.id}
            template={template}
            isSelected={selectedTemplate?.id === template.id}
            onSelect={onSelect}
            disabled={isDisabled}
          />
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          該当するテンプレートがありません
        </p>
      )}
    </div>
  );
}

export const TemplateSelector = memo(TemplateSelectorInner);
export default TemplateSelector;
