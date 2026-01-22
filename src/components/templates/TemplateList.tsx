'use client';

/**
 * Template List Component - Display list of templates
 * @module components/templates/TemplateList
 */

import { memo } from 'react';
import type { Template, MeetingType } from '@/types/template';
import { MEETING_TYPE_LABELS } from '@/types/template';
import { Badge } from '@/components/ui';

// ============================================================================
// Types
// ============================================================================

/**
 * Template list props
 */
export interface TemplateListProps {
  /** List of templates to display */
  readonly templates: readonly Template[];
  /** Currently selected template ID */
  readonly selectedId?: string | undefined;
  /** Loading state */
  readonly isLoading?: boolean | undefined;
  /** Callback when template is selected */
  readonly onSelect?: ((template: Template) => void) | undefined;
  /** Callback when edit is clicked */
  readonly onEdit?: ((template: Template) => void) | undefined;
  /** Callback when delete is clicked */
  readonly onDelete?: ((template: Template) => void) | undefined;
  /** Callback when duplicate is clicked */
  readonly onDuplicate?: ((template: Template) => void) | undefined;
  /** Custom class name */
  readonly className?: string | undefined;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get meeting type badge color
 */
function getMeetingTypeVariant(
  type: MeetingType
): 'default' | 'success' | 'warning' | 'error' {
  const variants: Record<MeetingType, 'default' | 'success' | 'warning' | 'error'> = {
    regular: 'default',
    project: 'success',
    one_on_one: 'warning',
    brainstorm: 'error',
    decision: 'default',
  };
  return variants[type];
}

// ============================================================================
// Skeleton Component
// ============================================================================

/**
 * Loading skeleton for template list
 */
function TemplateListSkeleton(): JSX.Element {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-4 bg-white rounded-lg border border-lark-border animate-pulse"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-24" />
            </div>
            <div className="h-6 bg-gray-200 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Template Card Component
// ============================================================================

interface TemplateCardProps {
  readonly template: Template;
  readonly isSelected: boolean;
  readonly onSelect?: ((template: Template) => void) | undefined;
  readonly onEdit?: ((template: Template) => void) | undefined;
  readonly onDelete?: ((template: Template) => void) | undefined;
  readonly onDuplicate?: ((template: Template) => void) | undefined;
}

function TemplateCardInner({
  template,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
}: TemplateCardProps): JSX.Element {
  const isBuiltIn = template.id.startsWith('tpl_default_');

  return (
    <div
      className={`
        p-4 bg-white rounded-lg border transition-all cursor-pointer
        ${isSelected
          ? 'border-lark-primary ring-2 ring-lark-primary/20'
          : 'border-lark-border hover:border-gray-300'
        }
      `}
      onClick={() => onSelect?.(template)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(template);
        }
      }}
      role="option"
      tabIndex={0}
      aria-selected={isSelected}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Template Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-lark-text truncate">
              {template.name}
            </h3>
            {template.isDefault && (
              <Badge variant="success" className="text-xs">
                デフォルト
              </Badge>
            )}
            {isBuiltIn && (
              <Badge variant="default" className="text-xs">
                組込み
              </Badge>
            )}
          </div>
          <Badge variant={getMeetingTypeVariant(template.meetingType)}>
            {MEETING_TYPE_LABELS[template.meetingType]}
          </Badge>
          <p className="mt-2 text-xs text-gray-500">
            {template.structure.sections.length}セクション
            {' / '}
            {template.structure.focusAreas.length}フォーカスエリア
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Duplicate button - available for all templates */}
          {onDuplicate !== undefined && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(template);
              }}
              className="
                p-1.5 text-gray-400 hover:text-green-500
                rounded transition-colors
              "
              aria-label={`${template.name}を複製`}
              title="複製"
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
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          )}
          {onEdit !== undefined && !isBuiltIn && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(template);
              }}
              className="
                p-1.5 text-gray-400 hover:text-lark-primary
                rounded transition-colors
              "
              aria-label={`${template.name}を編集`}
              title="編集"
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          )}
          {onDelete !== undefined && !isBuiltIn && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(template);
              }}
              className="
                p-1.5 text-gray-400 hover:text-red-500
                rounded transition-colors
              "
              aria-label={`${template.name}を削除`}
              title="削除"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const TemplateCard = memo(TemplateCardInner);

// ============================================================================
// Empty State
// ============================================================================

function EmptyState(): JSX.Element {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">
        <svg
          className="w-16 h-16 mx-auto text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-lark-text mb-2">
        テンプレートがありません
      </h3>
      <p className="text-sm text-gray-500">
        新しいテンプレートを作成してください。
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Template List Component
 *
 * @description Displays a list of meeting templates with selection and action support
 *
 * @example
 * ```tsx
 * <TemplateList
 *   templates={templates}
 *   selectedId="tpl_123"
 *   onSelect={handleSelect}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 * />
 * ```
 */
function TemplateListInner({
  templates,
  selectedId,
  isLoading = false,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  className = '',
}: TemplateListProps): JSX.Element {
  if (isLoading) {
    return (
      <div className={className}>
        <TemplateListSkeleton />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className={className}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`} role="listbox" aria-label="テンプレート一覧">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isSelected={template.id === selectedId}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      ))}
    </div>
  );
}

export const TemplateList = memo(TemplateListInner);
export default TemplateList;
